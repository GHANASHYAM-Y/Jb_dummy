-- =============================================================================
-- Migration: 0003_rps.sql
-- Project:   Evoora — JE Labs
-- Purpose:   Rock, Paper, Scissors multiplayer: game_invites, matches,
--            game_rounds (atomic resolution), RLS, and SECURITY DEFINER
--            functions for all state transitions.
--
-- Design decisions:
--   Hidden moves: Moves are stored in game_moves but the RLS SELECT policy
--   only allows a player to read their OWN row until the round is resolved.
--   Once both moves are committed and the round row exists (resolved), both
--   moves become visible. Clients must NEVER be trusted with move values for
--   adjudication — all logic runs in the resolve_rps_round() DB function.
--
--   Atomic resolution: resolve_rps_round() uses a FOR UPDATE lock on the
--   match row and INSERT … ON CONFLICT DO NOTHING on game_rounds to ensure
--   simultaneous submissions cannot double-resolve a round.
--
--   Invitations: Only accepted friends can send game invites. The function
--   checks the friend_requests table before creating an invite.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.
-- =============================================================================

-- ── 0. Shared utility: set_updated_at already exists from 0001 ───────────────
-- (Do not redefine it here — it's already in public namespace.)

-- ── 1. ENUMs ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.rps_move   AS ENUM ('rock', 'paper', 'scissors');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.round_result AS ENUM ('player1_wins', 'player2_wins', 'draw');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.match_phase AS ENUM ('invited', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. game_invites ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.game_invites (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Must be an accepted friend pair (enforced in send_game_invite() function).
  inviter_id    UUID           NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id    UUID           NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,

  game_type     TEXT           NOT NULL DEFAULT 'rps'
                               CHECK (game_type IN ('rps', 'chess')),

  -- Linked match (populated when accepted).
  match_id      UUID           NULL,

  status        public.invite_status NOT NULL DEFAULT 'pending',

  -- Invitation auto-expires after 10 minutes.
  expires_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_invite CHECK (inviter_id <> invitee_id)
);

DROP TRIGGER IF EXISTS game_invites_set_updated_at ON public.game_invites;
CREATE TRIGGER game_invites_set_updated_at
  BEFORE UPDATE ON public.game_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS game_invites_inviter_idx ON public.game_invites (inviter_id, status);
CREATE INDEX IF NOT EXISTS game_invites_invitee_idx ON public.game_invites (invitee_id, status);

-- Only one pending invite allowed per pair per game type.
-- Normalised pair prevents A→B and B→A coexisting.
-- In PostgreSQL, functional expressions like LEAST/GREATEST and partial index conditions
-- (WHERE status = 'pending') must be defined via CREATE UNIQUE INDEX rather than a table constraint.
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_game_invite
  ON public.game_invites (
    LEAST(inviter_id, invitee_id),
    GREATEST(inviter_id, invitee_id),
    game_type
  )
  WHERE status = 'pending';

-- Each accepted invitation links to at most one match.
CREATE UNIQUE INDEX IF NOT EXISTS game_invites_match_id_unique
  ON public.game_invites (match_id)
  WHERE match_id IS NOT NULL;

-- ── 3. matches ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.matches (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type       TEXT          NOT NULL DEFAULT 'rps'
                                CHECK (game_type IN ('rps', 'chess')),

  -- player1 is the inviter, player2 is the invitee.
  player1_id      UUID          NOT NULL
                                REFERENCES public.profiles(id) ON DELETE RESTRICT,
  player2_id      UUID          NOT NULL
                                REFERENCES public.profiles(id) ON DELETE RESTRICT,

  phase           public.match_phase NOT NULL DEFAULT 'active',

  -- Running scores (server-computed only — never client-writable).
  player1_wins    SMALLINT      NOT NULL DEFAULT 0,
  player2_wins    SMALLINT      NOT NULL DEFAULT 0,
  current_round   SMALLINT      NOT NULL DEFAULT 1,

  winner_id       UUID          NULL
                                REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_draw         BOOLEAN       NOT NULL DEFAULT FALSE,

  started_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ   NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_match CHECK (player1_id <> player2_id),
  CONSTRAINT valid_scores   CHECK (player1_wins >= 0 AND player2_wins >= 0),
  CONSTRAINT winner_or_draw CHECK (
    (phase <> 'completed') OR (winner_id IS NOT NULL OR is_draw = TRUE)
  )
);

DROP TRIGGER IF EXISTS matches_set_updated_at ON public.matches;
CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS matches_player1_idx ON public.matches (player1_id, phase);
CREATE INDEX IF NOT EXISTS matches_player2_idx ON public.matches (player2_id, phase);

-- ── 4. game_moves ─────────────────────────────────────────────────────────────
--
-- Stores one row per player per round.
-- RLS: A player can only SELECT their own pending moves.
-- Both moves become readable once game_rounds has a resolved row for that round.

CREATE TABLE IF NOT EXISTS public.game_moves (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID              NOT NULL
                                  REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id     UUID              NOT NULL
                                  REFERENCES public.profiles(id) ON DELETE CASCADE,
  round_number  SMALLINT          NOT NULL CHECK (round_number >= 1),
  move          public.rps_move   NOT NULL,
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  -- Each player submits exactly one move per round.
  UNIQUE (match_id, player_id, round_number)
);

CREATE INDEX IF NOT EXISTS game_moves_match_round_idx
  ON public.game_moves (match_id, round_number);

-- ── 5. game_rounds ────────────────────────────────────────────────────────────
--
-- One row per completed (resolved) round.
-- Both moves and the result are visible after resolution.
-- Used for score display and match history.

CREATE TABLE IF NOT EXISTS public.game_rounds (
  id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID                 NOT NULL
                                       REFERENCES public.matches(id) ON DELETE CASCADE,
  round_number    SMALLINT             NOT NULL CHECK (round_number >= 1),
  player1_move    public.rps_move      NOT NULL,
  player2_move    public.rps_move      NOT NULL,
  result          public.round_result  NOT NULL,
  resolved_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

  UNIQUE (match_id, round_number)
);

CREATE INDEX IF NOT EXISTS game_rounds_match_idx ON public.game_rounds (match_id);

-- ── 6. Row Level Security ─────────────────────────────────────────────────────

-- game_invites
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gi_select" ON public.game_invites;
CREATE POLICY "gi_select"
  ON public.game_invites FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Block all direct mutations (functions handle everything)
DROP POLICY IF EXISTS "gi_insert" ON public.game_invites;
CREATE POLICY "gi_insert" ON public.game_invites FOR INSERT WITH CHECK (FALSE);
DROP POLICY IF EXISTS "gi_update" ON public.game_invites;
CREATE POLICY "gi_update" ON public.game_invites FOR UPDATE USING (FALSE);
DROP POLICY IF EXISTS "gi_delete" ON public.game_invites;
CREATE POLICY "gi_delete" ON public.game_invites FOR DELETE USING (FALSE);

-- matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "m_select" ON public.matches;
CREATE POLICY "m_select"
  ON public.matches FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "m_insert" ON public.matches;
CREATE POLICY "m_insert" ON public.matches FOR INSERT WITH CHECK (FALSE);
DROP POLICY IF EXISTS "m_update" ON public.matches;
CREATE POLICY "m_update" ON public.matches FOR UPDATE USING (FALSE);
DROP POLICY IF EXISTS "m_delete" ON public.matches;
CREATE POLICY "m_delete" ON public.matches FOR DELETE USING (FALSE);

-- game_moves: hidden move protection
-- A player can only SELECT their OWN move unless the round is resolved.
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_select_own" ON public.game_moves;
CREATE POLICY "gm_select_own"
  ON public.game_moves FOR SELECT
  USING (
    -- Always see your own moves
    auth.uid() = player_id
    OR
    -- See opponent's moves only after round is resolved
    EXISTS (
      SELECT 1 FROM public.game_rounds gr
      WHERE gr.match_id = game_moves.match_id
        AND gr.round_number = game_moves.round_number
      -- Also verify caller is a participant
      AND EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = game_moves.match_id
          AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "gm_insert" ON public.game_moves;
CREATE POLICY "gm_insert" ON public.game_moves FOR INSERT WITH CHECK (FALSE);
DROP POLICY IF EXISTS "gm_update" ON public.game_moves;
CREATE POLICY "gm_update" ON public.game_moves FOR UPDATE USING (FALSE);
DROP POLICY IF EXISTS "gm_delete" ON public.game_moves;
CREATE POLICY "gm_delete" ON public.game_moves FOR DELETE USING (FALSE);

-- game_rounds: readable by both participants
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gr_select" ON public.game_rounds;
CREATE POLICY "gr_select"
  ON public.game_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = game_rounds.match_id
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "gr_insert" ON public.game_rounds;
CREATE POLICY "gr_insert" ON public.game_rounds FOR INSERT WITH CHECK (FALSE);
DROP POLICY IF EXISTS "gr_update" ON public.game_rounds;
CREATE POLICY "gr_update" ON public.game_rounds FOR UPDATE USING (FALSE);
DROP POLICY IF EXISTS "gr_delete" ON public.game_rounds;
CREATE POLICY "gr_delete" ON public.game_rounds FOR DELETE USING (FALSE);

-- ── 7. Helper: are_friends(a, b) ─────────────────────────────────────────────
-- Private helper to verify accepted friendship.
-- Privacy guard: callers cannot enumerate arbitrary third-party relationships.

CREATE OR REPLACE FUNCTION public.are_friends(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Defense-in-depth: only allow checking friendship if caller is a participant or in system context
  IF auth.uid() IS NOT NULL AND auth.uid() <> a AND auth.uid() <> b THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE LEAST(sender_id, receiver_id)    = LEAST(a, b)
      AND GREATEST(sender_id, receiver_id) = GREATEST(a, b)
      AND status = 'accepted'
  );
END;
$$;

-- ── 8. send_game_invite(invitee_id) ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.send_game_invite(p_invitee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_invite  RECORD;
  v_id      UUID;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'Must be logged in.');
  END IF;
  IF v_caller = p_invitee_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'self_invite',
      'message', 'Cannot invite yourself.');
  END IF;
  -- Must be accepted friends.
  IF NOT public.are_friends(v_caller, p_invitee_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_friends',
      'message', 'You must be friends to send a game invite.');
  END IF;

  -- Expire stale pending invites for this pair first so they do not block a new invite.
  UPDATE public.game_invites
  SET status = 'expired', updated_at = NOW()
  WHERE LEAST(inviter_id, invitee_id)    = LEAST(v_caller, p_invitee_id)
    AND GREATEST(inviter_id, invitee_id) = GREATEST(v_caller, p_invitee_id)
    AND game_type = 'rps'
    AND status = 'pending'
    AND expires_at <= NOW();

  -- Check for an unexpired pending invite between this pair.
  SELECT id INTO v_invite
  FROM public.game_invites
  WHERE LEAST(inviter_id, invitee_id)    = LEAST(v_caller, p_invitee_id)
    AND GREATEST(inviter_id, invitee_id) = GREATEST(v_caller, p_invitee_id)
    AND game_type = 'rps'
    AND status = 'pending'
    AND expires_at > NOW();

  IF FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invite_pending',
      'message', 'There is already a pending invite between you two.');
  END IF;

  -- Check for an active match between this pair.
  IF EXISTS (
    SELECT 1 FROM public.matches
    WHERE ((player1_id = v_caller AND player2_id = p_invitee_id)
        OR (player1_id = p_invitee_id AND player2_id = v_caller))
      AND game_type = 'rps'
      AND phase = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_active',
      'message', 'You already have an active match with this player.');
  END IF;

  -- Insert invite, catching concurrent race conditions gracefully without throwing SQL errors.
  BEGIN
    INSERT INTO public.game_invites (inviter_id, invitee_id, game_type)
    VALUES (v_caller, p_invitee_id, 'rps')
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent transaction created a pending invite between this pair first.
    SELECT id INTO v_id
    FROM public.game_invites
    WHERE LEAST(inviter_id, invitee_id)    = LEAST(v_caller, p_invitee_id)
      AND GREATEST(inviter_id, invitee_id) = GREATEST(v_caller, p_invitee_id)
      AND game_type = 'rps'
      AND status = 'pending';

    RETURN jsonb_build_object('ok', FALSE, 'code', 'invite_pending',
      'message', 'There is already a pending invite between you two.',
      'invite_id', v_id);
  END;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'sent',
    'invite_id', v_id);
END;
$$;

-- ── 9. respond_game_invite(invite_id, action) ─────────────────────────────────
-- action: 'accept' | 'decline'

CREATE OR REPLACE FUNCTION public.respond_game_invite(
  p_invite_id UUID,
  p_action    TEXT  -- 'accept' | 'decline'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_invite    RECORD;
  v_match_id  UUID;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('accept', 'decline') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_action');
  END IF;

  -- Lock the invite row to serialize concurrent responses and prevent duplicate matches.
  SELECT * INTO v_invite
  FROM public.game_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;
  -- Only invitee can respond.
  IF v_invite.invitee_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  -- Idempotency: if already accepted and match created, return accepted.
  IF v_invite.status = 'accepted' AND p_action = 'accept' THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'accepted', 'match_id', v_invite.match_id);
  END IF;

  -- Idempotency: if already declined.
  IF v_invite.status = 'declined' AND p_action = 'decline' THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'declined');
  END IF;

  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_pending',
      'message', 'Invite is no longer pending.');
  END IF;
  IF v_invite.expires_at < NOW() THEN
    UPDATE public.game_invites SET status = 'expired', updated_at = NOW()
    WHERE id = p_invite_id;
    RETURN jsonb_build_object('ok', FALSE, 'code', 'expired',
      'message', 'Invite has expired.');
  END IF;

  IF p_action = 'decline' THEN
    UPDATE public.game_invites SET status = 'declined', updated_at = NOW()
    WHERE id = p_invite_id;
    RETURN jsonb_build_object('ok', TRUE, 'code', 'declined');
  END IF;

  -- Accept: verify no active match between this pair before creating a new one.
  IF EXISTS (
    SELECT 1 FROM public.matches
    WHERE ((player1_id = v_invite.inviter_id AND player2_id = v_invite.invitee_id)
        OR (player1_id = v_invite.invitee_id AND player2_id = v_invite.inviter_id))
      AND game_type = 'rps'
      AND phase = 'active'
  ) THEN
    IF v_invite.match_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', TRUE, 'code', 'accepted', 'match_id', v_invite.match_id);
    END IF;
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_active',
      'message', 'You already have an active match with this player.');
  END IF;

  -- Accept: create match.
  INSERT INTO public.matches (game_type, player1_id, player2_id, phase)
  VALUES ('rps', v_invite.inviter_id, v_invite.invitee_id, 'active')
  RETURNING id INTO v_match_id;

  UPDATE public.game_invites
  SET status = 'accepted', match_id = v_match_id, updated_at = NOW()
  WHERE id = p_invite_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'accepted', 'match_id', v_match_id);
END;
$$;

-- ── 10. cancel_game_invite(invite_id) ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_game_invite(p_invite_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_invite RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  -- Lock invite row to prevent race conditions with concurrent acceptance.
  SELECT * INTO v_invite
  FROM public.game_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;
  IF v_invite.inviter_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;
  -- Idempotency: already cancelled.
  IF v_invite.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'cancelled');
  END IF;
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_pending');
  END IF;

  UPDATE public.game_invites
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_invite_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'cancelled');
END;
$$;

-- ── 11. get_rps_match_state(match_id) ─────────────────────────────────────────
--
-- Returns the caller's authorised view of a match:
--   - Match metadata (phase, scores, round)
--   - Resolved rounds (both moves + result)
--   - Whether the caller has already submitted for the current round
--   - Does NOT expose the opponent's pending move

CREATE OR REPLACE FUNCTION public.get_rps_match_state(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_match   RECORD;
  v_rounds  JSONB;
  v_my_move TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;
  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  -- Resolved rounds (both moves visible).
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'round_number', gr.round_number,
      'player1_move', gr.player1_move,
      'player2_move', gr.player2_move,
      'result',       gr.result,
      'resolved_at',  gr.resolved_at
    ) ORDER BY gr.round_number
  ), '[]'::jsonb)
  INTO v_rounds
  FROM public.game_rounds gr
  WHERE gr.match_id = p_match_id;

  -- Did caller already submit this round?
  SELECT move::TEXT INTO v_my_move
  FROM public.game_moves
  WHERE match_id = p_match_id
    AND player_id = v_caller
    AND round_number = v_match.current_round;

  RETURN jsonb_build_object(
    'ok',           TRUE,
    'match', jsonb_build_object(
      'id',           v_match.id,
      'phase',        v_match.phase,
      'game_type',    v_match.game_type,
      'player1_id',   v_match.player1_id,
      'player2_id',   v_match.player2_id,
      'player1_wins', v_match.player1_wins,
      'player2_wins', v_match.player2_wins,
      'current_round',v_match.current_round,
      'winner_id',    v_match.winner_id,
      'is_draw',      v_match.is_draw,
      'started_at',   v_match.started_at,
      'completed_at', v_match.completed_at
    ),
    'rounds',         v_rounds,
    'my_move_this_round', v_my_move   -- null if not yet submitted
  );
END;
$$;

-- ── 12. submit_rps_move(match_id, move) ──────────────────────────────────────
--
-- Critical path. Enforces:
--   - Caller is a participant.
--   - Match is active.
--   - No existing move for this player this round (idempotent on same move).
--   - After insert: if both players have submitted, atomically resolves round.
--   - Round resolution uses advisory lock on match row to prevent double-resolve.

CREATE OR REPLACE FUNCTION public.submit_rps_move(
  p_match_id UUID,
  p_move     TEXT   -- 'rock' | 'paper' | 'scissors'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       UUID    := auth.uid();
  v_match        RECORD;
  v_opponent_id  UUID;
  v_opp_move     public.rps_move;
  v_my_move      public.rps_move;
  v_round_result public.round_result;
  v_existing     public.rps_move;
  v_p1_delta     SMALLINT := 0;
  v_p2_delta     SMALLINT := 0;
  v_is_p1        BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  -- Validate move value.
  IF p_move IS NULL OR p_move NOT IN ('rock', 'paper', 'scissors') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_move',
      'message', 'Move must be rock, paper, or scissors.');
  END IF;

  -- Lock match row for the duration of this transaction.
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;
  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;
  IF v_match.phase <> 'active' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_active',
      'message', 'Match is not in active phase.');
  END IF;

  v_is_p1       := v_match.player1_id = v_caller;
  v_opponent_id := CASE WHEN v_is_p1 THEN v_match.player2_id ELSE v_match.player1_id END;
  v_my_move     := p_move::public.rps_move;

  -- Check for existing move (idempotent: same move is fine, different move is error).
  SELECT move INTO v_existing
  FROM public.game_moves
  WHERE match_id = p_match_id
    AND player_id = v_caller
    AND round_number = v_match.current_round;

  IF FOUND THEN
    IF v_existing <> v_my_move THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'move_locked',
        'message', 'You have already submitted a different move for this round.');
    END IF;
    -- If this player's move is already recorded, check whether this round is already resolved.
    IF EXISTS (
      SELECT 1 FROM public.game_rounds
      WHERE match_id = p_match_id AND round_number = v_match.current_round
    ) THEN
      RETURN jsonb_build_object('ok', TRUE, 'code', 'already_submitted',
        'message', 'Move already recorded and round already resolved.');
    END IF;
    -- Round not yet resolved: proceed to check if opponent has submitted so a retry can safely complete resolution.
  ELSE
    -- Record this player's move.
    INSERT INTO public.game_moves (match_id, player_id, round_number, move)
    VALUES (p_match_id, v_caller, v_match.current_round, v_my_move);
  END IF;

  -- Check if opponent has also submitted.
  SELECT move INTO v_opp_move
  FROM public.game_moves
  WHERE match_id = p_match_id
    AND player_id = v_opponent_id
    AND round_number = v_match.current_round;

  IF NOT FOUND THEN
    -- Waiting for opponent.
    RETURN jsonb_build_object('ok', TRUE, 'code', 'waiting',
      'message', 'Move submitted. Waiting for opponent.');
  END IF;

  -- ── Both moves are in. Resolve the round. ──────────────────────────────────

  -- Determine result (from player1's perspective).
  IF v_is_p1 THEN
    v_round_result := public._rps_result(v_my_move, v_opp_move);
  ELSE
    v_round_result := public._rps_result(v_opp_move, v_my_move);
  END IF;

  -- Insert round record atomically (ON CONFLICT prevents double-resolve).
  INSERT INTO public.game_rounds (
    match_id, round_number,
    player1_move, player2_move,
    result
  )
  VALUES (
    p_match_id, v_match.current_round,
    CASE WHEN v_is_p1 THEN v_my_move ELSE v_opp_move END,
    CASE WHEN v_is_p1 THEN v_opp_move ELSE v_my_move END,
    v_round_result
  )
  ON CONFLICT (match_id, round_number) DO NOTHING;

  -- If another concurrent transaction already inserted the round row, nothing to do.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'resolved_by_peer',
      'message', 'Round already resolved.');
  END IF;

  -- Update scores.
  IF v_round_result = 'player1_wins' THEN v_p1_delta := 1;
  ELSIF v_round_result = 'player2_wins' THEN v_p2_delta := 1;
  END IF;

  -- Advance state.
  UPDATE public.matches
  SET player1_wins  = player1_wins + v_p1_delta,
      player2_wins  = player2_wins + v_p2_delta,
      current_round = current_round + 1,
      updated_at    = NOW()
  WHERE id = p_match_id;

  -- Re-read updated match.
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  -- Check if match is finished (first to 2 wins).
  IF v_match.player1_wins >= 2 OR v_match.player2_wins >= 2 THEN
    UPDATE public.matches
    SET phase        = 'completed',
        winner_id    = CASE
          WHEN v_match.player1_wins > v_match.player2_wins THEN v_match.player1_id
          ELSE v_match.player2_id END,
        is_draw      = FALSE,
        completed_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'round_resolved',
    'round_result', v_round_result);
END;
$$;

-- ── 13. _rps_result(p1_move, p2_move) ────────────────────────────────────────
-- Pure helper: returns the round result from player1's perspective.

CREATE OR REPLACE FUNCTION public._rps_result(
  p1 public.rps_move,
  p2 public.rps_move
)
RETURNS public.round_result
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p1 = p2 THEN
    RETURN 'draw';
  END IF;
  IF (p1 = 'rock'     AND p2 = 'scissors')
  OR (p1 = 'scissors' AND p2 = 'paper')
  OR (p1 = 'paper'    AND p2 = 'rock') THEN
    RETURN 'player1_wins';
  END IF;
  RETURN 'player2_wins';
END;
$$;

-- ── 14. get_rps_history() ─────────────────────────────────────────────────────
-- Returns completed RPS matches for the caller with opponent profile data.

CREATE OR REPLACE FUNCTION public.get_rps_history()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT COALESCE(jsonb_agg(sub.item), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'match_id',           m.id,
      'opponent_id',        CASE WHEN m.player1_id = v_caller THEN m.player2_id ELSE m.player1_id END,
      'opponent_name',      CASE WHEN m.player1_id = v_caller THEN p2.display_name ELSE p1.display_name END,
      'opponent_evoora_id', CASE WHEN m.player1_id = v_caller THEN p2.evoora_id ELSE p1.evoora_id END,
      'opponent_avatar',    CASE WHEN m.player1_id = v_caller THEN p2.avatar_url ELSE p1.avatar_url END,
      'my_wins',            CASE WHEN m.player1_id = v_caller THEN m.player1_wins ELSE m.player2_wins END,
      'opp_wins',           CASE WHEN m.player1_id = v_caller THEN m.player2_wins ELSE m.player1_wins END,
      'winner_id',          m.winner_id,
      'is_draw',            m.is_draw,
      'completed_at',       m.completed_at,
      'started_at',         m.started_at
    ) AS item
    FROM public.matches m
    JOIN public.profiles p1 ON p1.id = m.player1_id
    JOIN public.profiles p2 ON p2.id = m.player2_id
    WHERE (m.player1_id = v_caller OR m.player2_id = v_caller)
      AND m.phase = 'completed'
      AND m.game_type = 'rps'
    ORDER BY m.completed_at DESC
    LIMIT 50
  ) sub;

  RETURN jsonb_build_object('ok', TRUE, 'history', v_result);
END;
$$;

-- ── 15. get_game_invites() ────────────────────────────────────────────────────
-- Returns pending invites (incoming + outgoing) with profile data.

CREATE OR REPLACE FUNCTION public.get_game_invites()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  -- Expire stale pending invites first.
  UPDATE public.game_invites
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW()
    AND (inviter_id = v_caller OR invitee_id = v_caller);

  SELECT COALESCE(jsonb_agg(sub.item), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'invite_id',        gi.id,
      'direction',        CASE WHEN gi.inviter_id = v_caller THEN 'outgoing' ELSE 'incoming' END,
      'other_id',         CASE WHEN gi.inviter_id = v_caller THEN gi.invitee_id ELSE gi.inviter_id END,
      'other_name',       CASE WHEN gi.inviter_id = v_caller THEN p2.display_name ELSE p1.display_name END,
      'other_evoora_id',  CASE WHEN gi.inviter_id = v_caller THEN p2.evoora_id ELSE p1.evoora_id END,
      'other_avatar',     CASE WHEN gi.inviter_id = v_caller THEN p2.avatar_url ELSE p1.avatar_url END,
      'status',           gi.status,
      'expires_at',       gi.expires_at,
      'match_id',         gi.match_id,
      'created_at',       gi.created_at
    ) AS item
    FROM public.game_invites gi
    JOIN public.profiles p1 ON p1.id = gi.inviter_id
    JOIN public.profiles p2 ON p2.id = gi.invitee_id
    WHERE (gi.inviter_id = v_caller OR gi.invitee_id = v_caller)
      AND gi.status IN ('pending', 'accepted')
    ORDER BY gi.created_at DESC
    LIMIT 50
  ) sub;

  RETURN jsonb_build_object('ok', TRUE, 'invites', v_result);
END;
$$;

-- ── 16. Privileges ────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.are_friends(UUID, UUID)             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_game_invite(UUID)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.respond_game_invite(UUID, TEXT)     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_game_invite(UUID)            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rps_match_state(UUID)           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_rps_move(UUID, TEXT)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rps_history()                   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_game_invites()                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._rps_result(public.rps_move, public.rps_move) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.send_game_invite(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_game_invite(UUID, TEXT)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_game_invite(UUID)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rps_match_state(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rps_move(UUID, TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rps_history()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_invites()                   TO authenticated;
-- are_friends and _rps_result are private helpers; do not grant to authenticated.

GRANT SELECT ON public.game_invites TO authenticated;
GRANT SELECT ON public.matches      TO authenticated;
GRANT SELECT ON public.game_moves   TO authenticated;
GRANT SELECT ON public.game_rounds  TO authenticated;

-- ── 17. Realtime publication (enables Realtime for these tables) ──────────────
-- Automatically and idempotently adds matches, game_rounds, and game_invites to Realtime.
-- Note: game_moves is intentionally excluded from Realtime publication
-- because broadcasting opponent moves before both submit would leak secrets.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matches'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'game_rounds'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'game_invites'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;
    END IF;
  END IF;
END $$;

-- ── End of migration ──────────────────────────────────────────────────────────
