-- =============================================================================
-- Migration: 0016_ludo.sql
-- Project:   EVOAIQU — JE Labs
-- Purpose:   Ludo 1 vs 1 friend matches.
--
-- Rules live in TypeScript (src/lib/ludo/engine.ts). The API routes load the
-- state, roll the die on the server, validate every move with the engine and
-- save the result through apply_ludo_state(), which only the service role may
-- call. Clients can read their own match but never write to it directly.
--
-- Design:
--   - public.matches stays the source of truth for whether a match is live, so
--     the shared lifecycle RPCs from 0014 and the dare system work unchanged.
--   - ludo_matches.state is the engine's LudoState as JSONB. version is bumped
--     on every write (optimistic concurrency).
--   - Online games: player1 is red, player2 is yellow; red moves first.
--   - Every mutation locks public.matches first, then public.ludo_matches.
--
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS.
-- =============================================================================

-- ── 1. Allow the new game type on public.matches ─────────────────────────────

DO $$
DECLARE
  v_con RECORD;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%game_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.matches DROP CONSTRAINT %I', v_con.conname);
  END LOOP;
END $$;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_game_type_check
  CHECK (game_type IN ('rps', 'chess', 'hand_cricket', 'ludo'));

-- ── 2. ludo_matches ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ludo_matches (
  id              UUID         PRIMARY KEY
                               REFERENCES public.matches(id) ON DELETE CASCADE,

  player1_id      UUID         NOT NULL
                               REFERENCES public.profiles(id) ON DELETE RESTRICT,
  player2_id      UUID         NOT NULL
                               REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Both players must open the match before the first turn clock starts
  player1_joined  BOOLEAN      NOT NULL DEFAULT FALSE,
  player2_joined  BOOLEAN      NOT NULL DEFAULT FALSE,

  status          TEXT         NOT NULL DEFAULT 'waiting'
                               CHECK (status IN ('waiting', 'playing', 'finished')),

  -- LudoState from src/lib/ludo/engine.ts
  state           JSONB        NOT NULL,
  version         INT          NOT NULL DEFAULT 0 CHECK (version >= 0),

  -- Current player must roll or move before this; then anyone may claim it
  turn_deadline   TIMESTAMPTZ  NULL,

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_ludo_match CHECK (player1_id <> player2_id),
  CONSTRAINT ludo_state_is_object CHECK (jsonb_typeof(state) = 'object')
);

DROP TRIGGER IF EXISTS ludo_matches_set_updated_at ON public.ludo_matches;
CREATE TRIGGER ludo_matches_set_updated_at
  BEFORE UPDATE ON public.ludo_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ludo_matches_player1_idx
  ON public.ludo_matches (player1_id, status);
CREATE INDEX IF NOT EXISTS ludo_matches_player2_idx
  ON public.ludo_matches (player2_id, status);

-- ── 3. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.ludo_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ludo_matches_select" ON public.ludo_matches;
CREATE POLICY "ludo_matches_select"
  ON public.ludo_matches FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- All writes go through the SECURITY DEFINER RPCs below
DROP POLICY IF EXISTS "ludo_matches_insert" ON public.ludo_matches;
CREATE POLICY "ludo_matches_insert" ON public.ludo_matches FOR INSERT WITH CHECK (FALSE);
DROP POLICY IF EXISTS "ludo_matches_update" ON public.ludo_matches;
CREATE POLICY "ludo_matches_update" ON public.ludo_matches FOR UPDATE USING (FALSE);
DROP POLICY IF EXISTS "ludo_matches_delete" ON public.ludo_matches;
CREATE POLICY "ludo_matches_delete" ON public.ludo_matches FOR DELETE USING (FALSE);

REVOKE INSERT, UPDATE, DELETE ON public.ludo_matches FROM anon, authenticated;

-- ── 4. RPC: create_ludo_match() ──────────────────────────────────────────────
-- Accepted friends only. Returns the open match if the pair already has one.

CREATE OR REPLACE FUNCTION public.create_ludo_match(p_opponent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_existing  UUID;
  v_match_id  UUID;
  v_state     JSONB;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated', 'message', 'Must be logged in.');
  END IF;

  IF p_opponent_id IS NULL OR p_opponent_id = v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_opponent', 'message', 'Invalid opponent.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_opponent_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'opponent_not_found', 'message', 'Opponent not found.');
  END IF;

  IF NOT public.are_friends(v_caller, p_opponent_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_friends',
      'message', 'You can only challenge accepted friends.');
  END IF;

  IF public.is_blocked(v_caller, p_opponent_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked',
      'message', 'Cannot start a game while blocked.');
  END IF;

  -- Serialize creates for this pair so a double click cannot open two matches
  PERFORM pg_advisory_xact_lock(
    hashtext('ludo:' || LEAST(v_caller, p_opponent_id)::TEXT || ':' || GREATEST(v_caller, p_opponent_id)::TEXT)
  );

  SELECT m.id INTO v_existing
  FROM public.matches m
  WHERE m.game_type = 'ludo'
    AND m.phase IN ('waiting', 'active', 'reconnecting')
    AND (
      (m.player1_id = v_caller AND m.player2_id = p_opponent_id)
      OR (m.player1_id = p_opponent_id AND m.player2_id = v_caller)
    )
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'existing_match', 'match_id', v_existing);
  END IF;

  -- Same as engine createGame([red = player1, yellow = player2])
  v_state := jsonb_build_object(
    'players', jsonb_build_array(
      jsonb_build_object('color', 'red',    'kind', 'human', 'userId', v_caller,      'label', ''),
      jsonb_build_object('color', 'yellow', 'kind', 'human', 'userId', p_opponent_id, 'label', '')
    ),
    'tokens', jsonb_build_object(
      'red',    '[-1, -1, -1, -1]'::jsonb,
      'yellow', '[-1, -1, -1, -1]'::jsonb
    ),
    'turn',       0,
    'dice',       NULL,
    'sixesInRow', 0,
    'status',     'playing',
    'winner',     NULL,
    'moveCount',  0,
    'lastEvent',  NULL
  );

  INSERT INTO public.matches (
    game_type, player1_id, player2_id, phase,
    started_at, last_activity_at, waiting_deadline
  ) VALUES (
    'ludo', v_caller, p_opponent_id, 'waiting',
    NOW(), NOW(), NOW() + INTERVAL '10 minutes'
  )
  RETURNING id INTO v_match_id;

  INSERT INTO public.ludo_matches (
    id, player1_id, player2_id, player1_joined, status, state, version
  ) VALUES (
    v_match_id, v_caller, p_opponent_id, TRUE, 'waiting', v_state, 0
  );

  RETURN jsonb_build_object('ok', TRUE, 'code', 'match_created', 'match_id', v_match_id);
END;
$$;

-- ── 5. RPC: join_ludo_match() ────────────────────────────────────────────────
-- Called when a player opens the match. Once both have joined, the match goes
-- 'active' and red's first turn clock starts.

CREATE OR REPLACE FUNCTION public.join_ludo_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_match   RECORD;
  v_ludo    public.ludo_matches%ROWTYPE;
  v_is_p1   BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'ludo'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  SELECT * INTO v_ludo FROM public.ludo_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.phase NOT IN ('waiting', 'active', 'reconnecting') THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'match_over', 'phase', v_match.phase);
  END IF;

  v_is_p1 := (v_match.player1_id = v_caller);

  UPDATE public.ludo_matches
  SET player1_joined = player1_joined OR v_is_p1,
      player2_joined = player2_joined OR (NOT v_is_p1),
      updated_at     = NOW()
  WHERE id = p_match_id
  RETURNING * INTO v_ludo;

  IF NOT (v_ludo.player1_joined AND v_ludo.player2_joined) THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'waiting_for_opponent', 'phase', v_match.phase);
  END IF;

  IF v_ludo.status = 'waiting' THEN
    UPDATE public.ludo_matches
    SET status        = 'playing',
        turn_deadline = NOW() + INTERVAL '20 seconds',
        updated_at    = NOW()
    WHERE id = p_match_id;

    UPDATE public.matches
    SET phase            = CASE WHEN phase = 'waiting' THEN 'active'::public.match_phase ELSE phase END,
        game_started_at  = COALESCE(game_started_at, NOW()),
        waiting_deadline = NULL,
        last_activity_at = NOW(),
        updated_at       = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('ok', TRUE, 'code', 'match_started', 'phase', 'active');
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'already_started', 'phase', v_match.phase);
END;
$$;

-- ── 6. RPC: cancel_ludo_match() ──────────────────────────────────────────────
-- Either player can call off a challenge before both have joined.

CREATE OR REPLACE FUNCTION public.cancel_ludo_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_match   RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'ludo'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  IF v_match.phase <> 'waiting' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_waiting',
      'message', 'Only a match that has not started can be cancelled.', 'phase', v_match.phase);
  END IF;

  PERFORM 1 FROM public.ludo_matches WHERE id = p_match_id FOR UPDATE;

  UPDATE public.matches
  SET phase            = 'cancelled',
      waiting_deadline = NULL,
      completed_at     = NOW(),
      updated_at       = NOW()
  WHERE id = p_match_id;

  UPDATE public.ludo_matches
  SET status        = 'finished',
      turn_deadline = NULL,
      updated_at    = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'cancelled');
END;
$$;

-- ── 7. RPC: get_ludo_state() ─────────────────────────────────────────────────
-- The caller's view of the match. Participants only.

CREATE OR REPLACE FUNCTION public.get_ludo_state(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_match   RECORD;
  v_ludo    public.ludo_matches%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'ludo';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  SELECT * INTO v_ludo FROM public.ludo_matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'match', jsonb_build_object(
      'id',                         v_match.id,
      'phase',                      v_match.phase,
      'end_reason',                 v_match.end_reason,
      'player1_id',                 v_match.player1_id,
      'player2_id',                 v_match.player2_id,
      'winner_id',                  v_match.winner_id,
      'loser_id',                   v_match.loser_id,
      'is_draw',                    v_match.is_draw,
      'last_activity_at',           v_match.last_activity_at,
      'waiting_deadline',           v_match.waiting_deadline,
      'completed_at',               v_match.completed_at,
      'player1_disconnected_at',    v_match.player1_disconnected_at,
      'player2_disconnected_at',    v_match.player2_disconnected_at,
      'player1_reconnect_deadline', v_match.player1_reconnect_deadline,
      'player2_reconnect_deadline', v_match.player2_reconnect_deadline
    ),
    'game', jsonb_build_object(
      'status',         v_ludo.status,
      'version',        v_ludo.version,
      'state',          v_ludo.state,
      'turn_deadline',  v_ludo.turn_deadline,
      'player1_joined', v_ludo.player1_joined,
      'player2_joined', v_ludo.player2_joined
    ),
    'server_now', NOW()
  );
END;
$$;

-- ── 8. Service-role RPC: apply_ludo_state() ──────────────────────────────────
-- Saves a state the API computed with the TypeScript engine. Not callable by
-- clients: a participant could otherwise write any board they like.

CREATE OR REPLACE FUNCTION public.apply_ludo_state(
  p_match_id          UUID,
  p_caller_id         UUID,
  p_expected_version  INT,
  p_state             JSONB,
  p_turn_deadline     TIMESTAMPTZ,
  p_winner_id         UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_match    RECORD;
  v_ludo     public.ludo_matches%ROWTYPE;
  v_loser    UUID;
  v_version  INT;
BEGIN
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'ludo'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF p_caller_id IS NULL
     OR (p_caller_id <> v_match.player1_id AND p_caller_id <> v_match.player2_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  SELECT * INTO v_ludo FROM public.ludo_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.phase NOT IN ('active', 'reconnecting') OR v_ludo.status <> 'playing' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_active', 'phase', v_match.phase);
  END IF;

  IF p_expected_version IS NULL OR v_ludo.version <> p_expected_version THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'stale_version', 'version', v_ludo.version);
  END IF;

  IF p_state IS NULL OR jsonb_typeof(p_state) <> 'object' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_state');
  END IF;

  IF p_winner_id IS NOT NULL
     AND p_winner_id <> v_match.player1_id AND p_winner_id <> v_match.player2_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_winner');
  END IF;

  v_version := v_ludo.version + 1;

  UPDATE public.ludo_matches
  SET state         = p_state,
      version       = v_version,
      status        = CASE WHEN p_winner_id IS NOT NULL THEN 'finished' ELSE status END,
      turn_deadline = CASE WHEN p_winner_id IS NOT NULL THEN NULL ELSE p_turn_deadline END,
      updated_at    = NOW()
  WHERE id = p_match_id;

  IF p_winner_id IS NOT NULL THEN
    v_loser := CASE WHEN p_winner_id = v_match.player1_id THEN v_match.player2_id ELSE v_match.player1_id END;

    UPDATE public.matches
    SET phase            = 'completed',
        end_reason       = 'completed',
        winner_id        = p_winner_id,
        loser_id         = v_loser,
        is_draw          = FALSE,
        last_activity_at = NOW(),
        completed_at     = NOW(),
        updated_at       = NOW()
    WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
    SET last_activity_at = NOW(),
        updated_at       = NOW()
    WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', CASE WHEN p_winner_id IS NOT NULL THEN 'game_over' ELSE 'state_applied' END,
    'version', v_version
  );
END;
$$;

-- ── 9. Realtime ──────────────────────────────────────────────────────────────

ALTER TABLE public.ludo_matches REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ludo_matches;
EXCEPTION WHEN duplicate_object THEN
  NULL;
WHEN undefined_object THEN
  NULL;
END $$;

-- ── 10. Permissions ──────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.create_ludo_match(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_ludo_match(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_ludo_match(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_ludo_state(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_ludo_state(UUID, UUID, INT, JSONB, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_ludo_match(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_ludo_match(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_ludo_match(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_ludo_state(UUID) TO authenticated, service_role;
-- Service role only: the API validates every move before calling it
GRANT EXECUTE ON FUNCTION public.apply_ludo_state(UUID, UUID, INT, JSONB, TIMESTAMPTZ, UUID) TO service_role;

-- ── End of migration 0016_ludo.sql ───────────────────────────────────────────
