-- =============================================================================
-- Migration: 0015_hand_cricket.sql
-- Project:   EVOAIQU — JE Labs
-- Purpose:   Hand Cricket (quick classic) friend matches.
--
-- Rules (mirrored in src/lib/hand-cricket/engine.ts):
--   - Server flips the toss; the toss winner chooses to bat or bowl.
--   - 11 players a side. Overs per innings: 2, 3, 5 or 10 (chosen at create).
--     An innings ends at 10 wickets or when the overs run out.
--   - Every ball, batter and bowler both throw 0–6 within a 5-second shot
--     clock (0 is called DOK). Same number (incl. both DOK): OUT. Batter DOK:
--     the batter scores the bowler's number. Otherwise the batter scores the
--     number they threw.
--   - Shot clock expiry: no hand from the batter is a dot ball; no hand from
--     the bowler means the batter's number counts.
--   - Second innings chases first-innings runs + 1. Equal totals are a tie.
--
-- Design:
--   - public.matches stays the source of truth for whether a match is live
--     (phase, winner, loser, end_reason), so the shared lifecycle RPCs from
--     0014 (leave_game, report_disconnect, reconnect_game,
--     cleanup_game_timeouts) and the challenge/dare system work unchanged.
--   - hand_cricket_matches holds game progress; hand_cricket_balls is the
--     public ball-by-ball log; hand_cricket_throws holds hidden throws that no
--     client can read (all reads go through get_hand_cricket_state()).
--   - A match starts in phase 'waiting' and only goes 'active' once BOTH
--     players have opened it, so nobody bowls at an empty crease.
--   - Every mutation runs in a SECURITY DEFINER RPC that locks
--     public.matches first, then public.hand_cricket_matches.
--
-- Also hardens the RPS tables: rows in game_moves / game_rounds are rejected
-- unless the match is an RPS match (see section 6).
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
  CHECK (game_type IN ('rps', 'chess', 'hand_cricket'));

-- ── 2. hand_cricket_matches ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hand_cricket_matches (
  id                  UUID         PRIMARY KEY
                                   REFERENCES public.matches(id) ON DELETE CASCADE,

  player1_id          UUID         NOT NULL
                                   REFERENCES public.profiles(id) ON DELETE RESTRICT,
  player2_id          UUID         NOT NULL
                                   REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Both players must open the match before the toss window starts
  player1_joined      BOOLEAN      NOT NULL DEFAULT FALSE,
  player2_joined      BOOLEAN      NOT NULL DEFAULT FALSE,

  -- Each side names its 11 players (batting order; the last five bowl)
  player1_squad       TEXT[]       NOT NULL DEFAULT ARRAY['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Player 8', 'Player 9', 'Player 10', 'Player 11']::TEXT[],
  player2_squad       TEXT[]       NOT NULL DEFAULT ARRAY['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Player 8', 'Player 9', 'Player 10', 'Player 11']::TEXT[],

  -- Game progress only. Whether the match is still live is public.matches.phase.
  status              TEXT         NOT NULL DEFAULT 'toss'
                                   CHECK (status IN ('toss', 'in_play', 'finished')),

  -- Toss: flipped by the server at creation; the winner picks bat or bowl
  toss_winner_id      UUID         NOT NULL
                                   REFERENCES public.profiles(id) ON DELETE RESTRICT,
  toss_decision       TEXT         NULL CHECK (toss_decision IN ('bat', 'bowl')),
  toss_deadline       TIMESTAMPTZ  NULL,

  -- 2, 3, 5 or 10 overs a side
  balls_per_innings   SMALLINT     NOT NULL DEFAULT 12
                                   CHECK (balls_per_innings IN (12, 18, 30, 60)),
  innings             SMALLINT     NOT NULL DEFAULT 1 CHECK (innings IN (1, 2)),
  batting_player_id   UUID         NULL
                                   REFERENCES public.profiles(id) ON DELETE RESTRICT,
  bowling_player_id   UUID         NULL
                                   REFERENCES public.profiles(id) ON DELETE RESTRICT,
  -- Next ball to be bowled in the current innings (1-based)
  ball_number         SMALLINT     NOT NULL DEFAULT 1 CHECK (ball_number >= 1),

  innings1_runs       SMALLINT     NOT NULL DEFAULT 0 CHECK (innings1_runs >= 0),
  innings1_balls      SMALLINT     NOT NULL DEFAULT 0 CHECK (innings1_balls >= 0),
  innings1_wickets    SMALLINT     NOT NULL DEFAULT 0 CHECK (innings1_wickets BETWEEN 0 AND 10),
  innings2_runs       SMALLINT     NOT NULL DEFAULT 0 CHECK (innings2_runs >= 0),
  innings2_balls      SMALLINT     NOT NULL DEFAULT 0 CHECK (innings2_balls >= 0),
  innings2_wickets    SMALLINT     NOT NULL DEFAULT 0 CHECK (innings2_wickets BETWEEN 0 AND 10),
  target              SMALLINT     NULL,

  -- Shot clock for the current ball. Throws are accepted until
  -- ball_deadline + 1 second (network tolerance).
  ball_opens_at       TIMESTAMPTZ  NULL,
  ball_deadline       TIMESTAMPTZ  NULL,

  -- Whether each player has thrown for the current ball (never the value)
  player1_thrown      BOOLEAN      NOT NULL DEFAULT FALSE,
  player2_thrown      BOOLEAN      NOT NULL DEFAULT FALSE,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_hand_cricket_match CHECK (player1_id <> player2_id),
  CONSTRAINT hand_cricket_toss_winner_is_player
    CHECK (toss_winner_id = player1_id OR toss_winner_id = player2_id),
  CONSTRAINT hand_cricket_squads_have_11
    CHECK (array_length(player1_squad, 1) = 11 AND array_length(player2_squad, 1) = 11)
);

DROP TRIGGER IF EXISTS hand_cricket_matches_set_updated_at ON public.hand_cricket_matches;
CREATE TRIGGER hand_cricket_matches_set_updated_at
  BEFORE UPDATE ON public.hand_cricket_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS hand_cricket_matches_player1_idx
  ON public.hand_cricket_matches (player1_id, status);
CREATE INDEX IF NOT EXISTS hand_cricket_matches_player2_idx
  ON public.hand_cricket_matches (player2_id, status);

-- ── 3. hand_cricket_balls (resolved, public to both players) ─────────────────

CREATE TABLE IF NOT EXISTS public.hand_cricket_balls (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID         NOT NULL
                             REFERENCES public.matches(id) ON DELETE CASCADE,
  innings       SMALLINT     NOT NULL CHECK (innings IN (1, 2)),
  ball_number   SMALLINT     NOT NULL CHECK (ball_number >= 1),
  batter_id     UUID         NOT NULL
                             REFERENCES public.profiles(id) ON DELETE CASCADE,
  bowler_id     UUID         NOT NULL
                             REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- NULL means that player did not throw before the shot clock expired
  batter_throw  SMALLINT     NULL CHECK (batter_throw BETWEEN 0 AND 6),
  bowler_throw  SMALLINT     NULL CHECK (bowler_throw BETWEEN 0 AND 6),
  runs          SMALLINT     NOT NULL DEFAULT 0 CHECK (runs BETWEEN 0 AND 6),
  is_out        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (match_id, innings, ball_number)
);

-- ── 4. hand_cricket_throws (hidden until the ball is resolved) ───────────────

CREATE TABLE IF NOT EXISTS public.hand_cricket_throws (
  match_id      UUID         NOT NULL
                             REFERENCES public.matches(id) ON DELETE CASCADE,
  innings       SMALLINT     NOT NULL CHECK (innings IN (1, 2)),
  ball_number   SMALLINT     NOT NULL CHECK (ball_number >= 1),
  player_id     UUID         NOT NULL
                             REFERENCES public.profiles(id) ON DELETE CASCADE,
  throw_value   SMALLINT     NOT NULL CHECK (throw_value BETWEEN 0 AND 6),  -- 0 = DOK
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (match_id, innings, ball_number, player_id)
);

-- ── 5. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.hand_cricket_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hand_cricket_balls   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hand_cricket_throws  ENABLE ROW LEVEL SECURITY;

-- Participants can read match progress and the resolved ball log
DROP POLICY IF EXISTS "hand_cricket_matches_select" ON public.hand_cricket_matches;
CREATE POLICY "hand_cricket_matches_select"
  ON public.hand_cricket_matches FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "hand_cricket_balls_select" ON public.hand_cricket_balls;
CREATE POLICY "hand_cricket_balls_select"
  ON public.hand_cricket_balls FOR SELECT
  USING (auth.uid() = batter_id OR auth.uid() = bowler_id);

-- Throws are never readable by clients, not even your own
DROP POLICY IF EXISTS "hand_cricket_throws_select" ON public.hand_cricket_throws;
CREATE POLICY "hand_cricket_throws_select"
  ON public.hand_cricket_throws FOR SELECT USING (FALSE);

-- All writes go through the SECURITY DEFINER RPCs below
DROP POLICY IF EXISTS "hand_cricket_matches_insert" ON public.hand_cricket_matches;
CREATE POLICY "hand_cricket_matches_insert" ON public.hand_cricket_matches FOR INSERT WITH CHECK (FALSE);
DROP POLICY IF EXISTS "hand_cricket_matches_update" ON public.hand_cricket_matches;
CREATE POLICY "hand_cricket_matches_update" ON public.hand_cricket_matches FOR UPDATE USING (FALSE);
DROP POLICY IF EXISTS "hand_cricket_matches_delete" ON public.hand_cricket_matches;
CREATE POLICY "hand_cricket_matches_delete" ON public.hand_cricket_matches FOR DELETE USING (FALSE);

DROP POLICY IF EXISTS "hand_cricket_balls_insert" ON public.hand_cricket_balls;
CREATE POLICY "hand_cricket_balls_insert" ON public.hand_cricket_balls FOR INSERT WITH CHECK (FALSE);
DROP POLICY IF EXISTS "hand_cricket_balls_update" ON public.hand_cricket_balls;
CREATE POLICY "hand_cricket_balls_update" ON public.hand_cricket_balls FOR UPDATE USING (FALSE);
DROP POLICY IF EXISTS "hand_cricket_balls_delete" ON public.hand_cricket_balls;
CREATE POLICY "hand_cricket_balls_delete" ON public.hand_cricket_balls FOR DELETE USING (FALSE);

DROP POLICY IF EXISTS "hand_cricket_throws_insert" ON public.hand_cricket_throws;
CREATE POLICY "hand_cricket_throws_insert" ON public.hand_cricket_throws FOR INSERT WITH CHECK (FALSE);
DROP POLICY IF EXISTS "hand_cricket_throws_update" ON public.hand_cricket_throws;
CREATE POLICY "hand_cricket_throws_update" ON public.hand_cricket_throws FOR UPDATE USING (FALSE);
DROP POLICY IF EXISTS "hand_cricket_throws_delete" ON public.hand_cricket_throws;
CREATE POLICY "hand_cricket_throws_delete" ON public.hand_cricket_throws FOR DELETE USING (FALSE);

-- Belt and braces: no direct table access to hidden throws at all
REVOKE ALL ON public.hand_cricket_throws FROM anon, authenticated;

-- ── 6. Cross-game guard for the Rock, Paper, Scissors tables ─────────────────
-- submit_rps_move() and resolve_rps_timeout() look a match up by id only.
-- Without this guard a participant could call them on a Hand Cricket (or
-- Chess) match id, win five "RPS rounds" against an opponent who never
-- submits, and be recorded as the winner, which unlocks a dare.
-- RPS move and round rows are now only accepted for RPS matches.

CREATE OR REPLACE FUNCTION public._enforce_rps_match_rows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = NEW.match_id
      AND game_type = 'rps'
  ) THEN
    RAISE EXCEPTION 'Rock, Paper, Scissors moves can only be recorded for RPS matches.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS game_moves_rps_only ON public.game_moves;
CREATE TRIGGER game_moves_rps_only
  BEFORE INSERT ON public.game_moves
  FOR EACH ROW EXECUTE FUNCTION public._enforce_rps_match_rows();

DROP TRIGGER IF EXISTS game_rounds_rps_only ON public.game_rounds;
CREATE TRIGGER game_rounds_rps_only
  BEFORE INSERT ON public.game_rounds
  FOR EACH ROW EXECUTE FUNCTION public._enforce_rps_match_rows();

-- ── 7. Internal helper: _hc_start_play() ─────────────────────────────────────
-- Applies the toss decision and opens ball 1. Caller must hold the row locks.

CREATE OR REPLACE FUNCTION public._hc_start_play(p_match_id UUID, p_decision TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hc      public.hand_cricket_matches%ROWTYPE;
  v_other   UUID;
  v_batter  UUID;
  v_bowler  UUID;
BEGIN
  SELECT * INTO v_hc FROM public.hand_cricket_matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_hc.status <> 'toss' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'toss_already_decided');
  END IF;

  v_other := CASE WHEN v_hc.toss_winner_id = v_hc.player1_id THEN v_hc.player2_id ELSE v_hc.player1_id END;

  IF p_decision = 'bat' THEN
    v_batter := v_hc.toss_winner_id;
    v_bowler := v_other;
  ELSE
    v_batter := v_other;
    v_bowler := v_hc.toss_winner_id;
  END IF;

  UPDATE public.hand_cricket_matches
  SET toss_decision     = p_decision,
      status            = 'in_play',
      innings           = 1,
      ball_number       = 1,
      batting_player_id = v_batter,
      bowling_player_id = v_bowler,
      player1_thrown    = FALSE,
      player2_thrown    = FALSE,
      ball_opens_at     = NOW() + INTERVAL '2 seconds',
      ball_deadline     = NOW() + INTERVAL '7 seconds',
      updated_at        = NOW()
  WHERE id = p_match_id;

  UPDATE public.matches
  SET last_activity_at = NOW(),
      updated_at       = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'toss_decided',
    'toss_decision', p_decision,
    'batting_player_id', v_batter,
    'bowling_player_id', v_bowler
  );
END;
$$;

-- ── 8. Internal helper: _hc_resolve_ball() ───────────────────────────────────
-- Adjudicates the current ball from whatever throws exist (NULL = no hand),
-- logs it, advances the innings, and completes public.matches when the game
-- ends. Caller must hold the row locks.

CREATE OR REPLACE FUNCTION public._hc_resolve_ball(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hc          public.hand_cricket_matches%ROWTYPE;
  v_bat         SMALLINT;
  v_bowl        SMALLINT;
  v_runs        SMALLINT := 0;
  v_out         BOOLEAN  := FALSE;
  v_inn_runs    INT;
  v_inn_balls   INT;
  v_inn_wkts    INT;
  v_inn_over    BOOLEAN  := FALSE;
  v_match_over  BOOLEAN  := FALSE;
  v_winner      UUID;
  v_loser       UUID;
  v_draw        BOOLEAN  := FALSE;
BEGIN
  SELECT * INTO v_hc FROM public.hand_cricket_matches WHERE id = p_match_id;
  IF NOT FOUND OR v_hc.status <> 'in_play' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_in_play');
  END IF;

  SELECT throw_value INTO v_bat
  FROM public.hand_cricket_throws
  WHERE match_id = p_match_id
    AND innings = v_hc.innings
    AND ball_number = v_hc.ball_number
    AND player_id = v_hc.batting_player_id;

  SELECT throw_value INTO v_bowl
  FROM public.hand_cricket_throws
  WHERE match_id = p_match_id
    AND innings = v_hc.innings
    AND ball_number = v_hc.ball_number
    AND player_id = v_hc.bowling_player_id;

  IF v_bat IS NULL THEN
    v_runs := 0;                    -- no hand from the batter: dot ball
  ELSIF v_bowl IS NOT NULL AND v_bat = v_bowl THEN
    v_out := TRUE;                  -- same number (including both DOK): OUT
  ELSIF v_bat = 0 THEN
    v_runs := COALESCE(v_bowl, 0);  -- DOK: the batter takes the bowler's number
  ELSIF v_bowl IS NULL THEN
    v_runs := v_bat;                -- no hand from the bowler: batter's number counts
  ELSE
    v_runs := v_bat;
  END IF;

  INSERT INTO public.hand_cricket_balls (
    match_id, innings, ball_number, batter_id, bowler_id,
    batter_throw, bowler_throw, runs, is_out
  ) VALUES (
    p_match_id, v_hc.innings, v_hc.ball_number, v_hc.batting_player_id, v_hc.bowling_player_id,
    v_bat, v_bowl, v_runs, v_out
  )
  ON CONFLICT (match_id, innings, ball_number) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'already_resolved');
  END IF;

  IF v_hc.innings = 1 THEN
    v_inn_runs  := v_hc.innings1_runs + v_runs;
    v_inn_balls := v_hc.innings1_balls + 1;
    v_inn_wkts  := v_hc.innings1_wickets + CASE WHEN v_out THEN 1 ELSE 0 END;
    v_inn_over  := v_inn_wkts >= 10 OR v_inn_balls >= v_hc.balls_per_innings;

    IF v_inn_over THEN
      -- Innings break: swap roles and set the target
      UPDATE public.hand_cricket_matches
      SET innings1_runs     = v_inn_runs,
          innings1_balls    = v_inn_balls,
          innings1_wickets  = v_inn_wkts,
          innings           = 2,
          target            = v_inn_runs + 1,
          batting_player_id = v_hc.bowling_player_id,
          bowling_player_id = v_hc.batting_player_id,
          ball_number       = 1,
          player1_thrown    = FALSE,
          player2_thrown    = FALSE,
          ball_opens_at     = NOW() + INTERVAL '4 seconds',
          ball_deadline     = NOW() + INTERVAL '9 seconds',
          updated_at        = NOW()
      WHERE id = p_match_id;
    ELSE
      UPDATE public.hand_cricket_matches
      SET innings1_runs    = v_inn_runs,
          innings1_balls   = v_inn_balls,
          innings1_wickets = v_inn_wkts,
          ball_number      = v_hc.ball_number + 1,
          player1_thrown = FALSE,
          player2_thrown = FALSE,
          ball_opens_at  = NOW() + INTERVAL '2 seconds',
          ball_deadline  = NOW() + INTERVAL '7 seconds',
          updated_at     = NOW()
      WHERE id = p_match_id;
    END IF;
  ELSE
    v_inn_runs  := v_hc.innings2_runs + v_runs;
    v_inn_balls := v_hc.innings2_balls + 1;
    v_inn_wkts  := v_hc.innings2_wickets + CASE WHEN v_out THEN 1 ELSE 0 END;

    IF v_inn_runs >= v_hc.target THEN
      -- Target chased down
      v_match_over := TRUE;
      v_winner     := v_hc.batting_player_id;
      v_loser      := v_hc.bowling_player_id;
    ELSIF v_inn_wkts >= 10 OR v_inn_balls >= v_hc.balls_per_innings THEN
      v_match_over := TRUE;
      IF v_inn_runs = v_hc.target - 1 THEN
        v_draw := TRUE;            -- scores level: tie
      ELSE
        v_winner := v_hc.bowling_player_id;
        v_loser  := v_hc.batting_player_id;
      END IF;
    END IF;
    v_inn_over := v_match_over;

    IF v_match_over THEN
      UPDATE public.hand_cricket_matches
      SET innings2_runs  = v_inn_runs,
          innings2_balls = v_inn_balls,
          innings2_wickets = v_inn_wkts,
          status         = 'finished',
          player1_thrown = FALSE,
          player2_thrown = FALSE,
          ball_opens_at  = NULL,
          ball_deadline  = NULL,
          updated_at     = NOW()
      WHERE id = p_match_id;
    ELSE
      UPDATE public.hand_cricket_matches
      SET innings2_runs    = v_inn_runs,
          innings2_balls   = v_inn_balls,
          innings2_wickets = v_inn_wkts,
          ball_number      = v_hc.ball_number + 1,
          player1_thrown = FALSE,
          player2_thrown = FALSE,
          ball_opens_at  = NOW() + INTERVAL '2 seconds',
          ball_deadline  = NOW() + INTERVAL '7 seconds',
          updated_at     = NOW()
      WHERE id = p_match_id;
    END IF;
  END IF;

  IF v_match_over THEN
    UPDATE public.matches
    SET phase            = 'completed',
        end_reason       = 'completed',
        winner_id        = v_winner,
        loser_id         = v_loser,
        is_draw          = v_draw,
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
    'code', 'ball_resolved',
    'innings', v_hc.innings,
    'ball_number', v_hc.ball_number,
    'batter_throw', v_bat,
    'bowler_throw', v_bowl,
    'runs', v_runs,
    'is_out', v_out,
    'innings_over', v_inn_over,
    'match_over', v_match_over,
    'winner_id', v_winner,
    'is_draw', v_draw
  );
END;
$$;

-- ── 9. RPC: create_hand_cricket_match() ──────────────────────────────────────
-- Accepted friends only. Returns the open match if the pair already has one.

CREATE OR REPLACE FUNCTION public.create_hand_cricket_match(p_opponent_id UUID, p_overs INT DEFAULT 2)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_existing  UUID;
  v_match_id  UUID;
  v_toss      UUID;
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

  IF p_overs IS NULL OR p_overs NOT IN (2, 3, 5, 10) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_overs', 'message', 'Overs must be 2, 3, 5 or 10.');
  END IF;

  IF NOT public.are_friends(v_caller, p_opponent_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_friends',
      'message', 'You can only challenge accepted friends.');
  END IF;

  IF public.is_blocked(v_caller, p_opponent_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked',
      'message', 'Cannot start a game while blocked.');
  END IF;

  -- Serialize creates for this pair so a double click (or both friends
  -- challenging each other at once) cannot open two matches.
  PERFORM pg_advisory_xact_lock(
    hashtext('hand_cricket:' || LEAST(v_caller, p_opponent_id)::TEXT || ':' || GREATEST(v_caller, p_opponent_id)::TEXT)
  );

  SELECT m.id INTO v_existing
  FROM public.matches m
  WHERE m.game_type = 'hand_cricket'
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

  v_toss := CASE WHEN random() < 0.5 THEN v_caller ELSE p_opponent_id END;

  INSERT INTO public.matches (
    game_type, player1_id, player2_id, phase,
    started_at, last_activity_at, waiting_deadline
  ) VALUES (
    'hand_cricket', v_caller, p_opponent_id, 'waiting',
    NOW(), NOW(), NOW() + INTERVAL '10 minutes'
  )
  RETURNING id INTO v_match_id;

  INSERT INTO public.hand_cricket_matches (
    id, player1_id, player2_id, player1_joined, toss_winner_id, balls_per_innings
  ) VALUES (
    v_match_id, v_caller, p_opponent_id, TRUE, v_toss, p_overs * 6
  );

  RETURN jsonb_build_object('ok', TRUE, 'code', 'match_created', 'match_id', v_match_id);
END;
$$;

-- ── 10. RPC: join_hand_cricket_match() ───────────────────────────────────────
-- Called when a player opens the match. Once both have joined, the match goes
-- 'active' and the 20-second toss window starts.

CREATE OR REPLACE FUNCTION public.join_hand_cricket_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_match   RECORD;
  v_hc      public.hand_cricket_matches%ROWTYPE;
  v_is_p1   BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'hand_cricket'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  SELECT * INTO v_hc FROM public.hand_cricket_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.phase NOT IN ('waiting', 'active', 'reconnecting') THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'match_over', 'phase', v_match.phase);
  END IF;

  v_is_p1 := (v_match.player1_id = v_caller);

  UPDATE public.hand_cricket_matches
  SET player1_joined = player1_joined OR v_is_p1,
      player2_joined = player2_joined OR (NOT v_is_p1),
      updated_at     = NOW()
  WHERE id = p_match_id
  RETURNING * INTO v_hc;

  IF NOT (v_hc.player1_joined AND v_hc.player2_joined) THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'waiting_for_opponent', 'phase', v_match.phase);
  END IF;

  IF v_hc.toss_deadline IS NULL THEN
    UPDATE public.hand_cricket_matches
    SET toss_deadline = NOW() + INTERVAL '20 seconds',
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

-- ── 11. RPC: cancel_hand_cricket_match() ─────────────────────────────────────
-- Either player can call off a challenge before both have joined.

CREATE OR REPLACE FUNCTION public.cancel_hand_cricket_match(p_match_id UUID)
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
  WHERE id = p_match_id AND game_type = 'hand_cricket'
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

  PERFORM 1 FROM public.hand_cricket_matches WHERE id = p_match_id FOR UPDATE;

  UPDATE public.matches
  SET phase            = 'cancelled',
      waiting_deadline = NULL,
      completed_at     = NOW(),
      updated_at       = NOW()
  WHERE id = p_match_id;

  UPDATE public.hand_cricket_matches
  SET status     = 'finished',
      updated_at = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'cancelled');
END;
$$;

-- ── 12. RPC: choose_hand_cricket_toss() ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.choose_hand_cricket_toss(p_match_id UUID, p_decision TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_match   RECORD;
  v_hc      public.hand_cricket_matches%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  IF p_decision IS NULL OR p_decision NOT IN ('bat', 'bowl') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_decision',
      'message', 'Decision must be bat or bowl.');
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'hand_cricket'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  IF v_match.phase NOT IN ('active', 'reconnecting') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_active', 'phase', v_match.phase);
  END IF;

  SELECT * INTO v_hc FROM public.hand_cricket_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF NOT (v_hc.player1_joined AND v_hc.player2_joined) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'waiting_for_opponent');
  END IF;

  IF v_hc.status <> 'toss' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'toss_already_decided');
  END IF;

  IF v_hc.toss_winner_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_toss_winner',
      'message', 'Only the toss winner can choose.');
  END IF;

  RETURN public._hc_start_play(p_match_id, p_decision);
END;
$$;

-- ── 13. RPC: submit_hand_cricket_throw() ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_hand_cricket_throw(
  p_match_id     UUID,
  p_innings      INT,
  p_ball_number  INT,
  p_value        INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_match     RECORD;
  v_hc        public.hand_cricket_matches%ROWTYPE;
  v_is_p1     BOOLEAN;
  v_existing  SMALLINT;
  v_both_in   BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  IF p_value IS NULL OR p_value < 0 OR p_value > 6 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_throw',
      'message', 'A throw must be a whole number from 0 (DOK) to 6.');
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'hand_cricket'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  v_is_p1 := (v_match.player1_id = v_caller);

  IF (v_is_p1 AND v_match.player1_left_at IS NOT NULL)
     OR ((NOT v_is_p1) AND v_match.player2_left_at IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'player_left',
      'message', 'You have left this match.');
  END IF;

  IF v_match.phase NOT IN ('active', 'reconnecting') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_active', 'phase', v_match.phase);
  END IF;

  -- 10-minute inactivity rule shared with the other games
  IF v_match.last_activity_at IS NOT NULL AND NOW() > v_match.last_activity_at + INTERVAL '10 minutes' THEN
    UPDATE public.matches
    SET phase        = 'aborted',
        end_reason   = 'inactivity_timeout',
        completed_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('ok', FALSE, 'code', 'inactivity_timeout',
      'message', 'Match aborted after 10 minutes of inactivity.');
  END IF;

  SELECT * INTO v_hc FROM public.hand_cricket_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF NOT (v_hc.player1_joined AND v_hc.player2_joined) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'waiting_for_opponent');
  END IF;

  IF v_hc.status <> 'in_play' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_in_play', 'status', v_hc.status);
  END IF;

  IF p_innings IS DISTINCT FROM v_hc.innings::INT OR p_ball_number IS DISTINCT FROM v_hc.ball_number::INT THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'stale_ball',
      'message', 'That ball has already been played.',
      'innings', v_hc.innings,
      'ball_number', v_hc.ball_number
    );
  END IF;

  IF v_hc.ball_deadline IS NOT NULL AND NOW() > v_hc.ball_deadline + INTERVAL '1 second' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'ball_timed_out',
      'message', 'The shot clock has expired for this ball.');
  END IF;

  SELECT throw_value INTO v_existing
  FROM public.hand_cricket_throws
  WHERE match_id = p_match_id
    AND innings = v_hc.innings
    AND ball_number = v_hc.ball_number
    AND player_id = v_caller;

  IF FOUND THEN
    IF v_existing <> p_value THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'throw_locked',
        'message', 'You already threw a different number for this ball.');
    END IF;
    RETURN jsonb_build_object('ok', TRUE, 'code', 'already_thrown');
  END IF;

  INSERT INTO public.hand_cricket_throws (match_id, innings, ball_number, player_id, throw_value)
  VALUES (p_match_id, v_hc.innings, v_hc.ball_number, v_caller, p_value);

  IF v_is_p1 THEN
    UPDATE public.hand_cricket_matches
    SET player1_thrown = TRUE, updated_at = NOW()
    WHERE id = p_match_id;
    v_both_in := v_hc.player2_thrown;
  ELSE
    UPDATE public.hand_cricket_matches
    SET player2_thrown = TRUE, updated_at = NOW()
    WHERE id = p_match_id;
    v_both_in := v_hc.player1_thrown;
  END IF;

  -- A throw is a valid game action: resets the inactivity timer
  UPDATE public.matches
  SET last_activity_at = NOW(),
      updated_at       = NOW()
  WHERE id = p_match_id;

  IF NOT v_both_in THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'waiting',
      'message', 'Throw locked in. Waiting for your opponent.');
  END IF;

  RETURN public._hc_resolve_ball(p_match_id);
END;
$$;

-- ── 14. RPC: claim_hand_cricket_timeout() ────────────────────────────────────
-- Either player may call this once a clock has expired:
--   toss: the toss winner is sent in to bat
--   ball: the ball is resolved with whatever throws arrived

CREATE OR REPLACE FUNCTION public.claim_hand_cricket_timeout(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_match   RECORD;
  v_hc      public.hand_cricket_matches%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'hand_cricket'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  IF v_match.phase NOT IN ('active', 'reconnecting') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_active', 'phase', v_match.phase);
  END IF;

  SELECT * INTO v_hc FROM public.hand_cricket_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF NOT (v_hc.player1_joined AND v_hc.player2_joined) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'waiting_for_opponent');
  END IF;

  IF v_hc.status = 'toss' THEN
    IF v_hc.toss_deadline IS NULL OR NOW() <= v_hc.toss_deadline + INTERVAL '1 second' THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'code', 'not_timed_out',
        'remaining_ms', GREATEST(0, (EXTRACT(EPOCH FROM (COALESCE(v_hc.toss_deadline, NOW()) + INTERVAL '1 second' - NOW())) * 1000)::INT)
      );
    END IF;
    RETURN public._hc_start_play(p_match_id, 'bat') || jsonb_build_object('code', 'toss_auto_decided');
  END IF;

  IF v_hc.status = 'in_play' THEN
    IF v_hc.ball_deadline IS NULL OR NOW() <= v_hc.ball_deadline + INTERVAL '1 second' THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'code', 'not_timed_out',
        'remaining_ms', GREATEST(0, (EXTRACT(EPOCH FROM (COALESCE(v_hc.ball_deadline, NOW()) + INTERVAL '1 second' - NOW())) * 1000)::INT)
      );
    END IF;
    RETURN public._hc_resolve_ball(p_match_id) || jsonb_build_object('timed_out', TRUE);
  END IF;

  RETURN jsonb_build_object('ok', FALSE, 'code', 'game_already_over');
END;
$$;

-- ── 15. RPC: get_hand_cricket_state() ────────────────────────────────────────
-- The only read path that touches hidden throws: returns the caller's own
-- throw for the current ball and just a boolean for the opponent's.

CREATE OR REPLACE FUNCTION public.get_hand_cricket_state(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_match        RECORD;
  v_hc           public.hand_cricket_matches%ROWTYPE;
  v_balls        JSONB;
  v_my_throw     SMALLINT;
  v_opp_thrown   BOOLEAN := FALSE;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'hand_cricket';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  SELECT * INTO v_hc FROM public.hand_cricket_matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'innings',      b.innings,
      'ball_number',  b.ball_number,
      'batter_id',    b.batter_id,
      'bowler_id',    b.bowler_id,
      'batter_throw', b.batter_throw,
      'bowler_throw', b.bowler_throw,
      'runs',         b.runs,
      'is_out',       b.is_out,
      'created_at',   b.created_at
    ) ORDER BY b.innings, b.ball_number
  ), '[]'::jsonb)
  INTO v_balls
  FROM public.hand_cricket_balls b
  WHERE b.match_id = p_match_id;

  IF v_hc.status = 'in_play' THEN
    SELECT throw_value INTO v_my_throw
    FROM public.hand_cricket_throws
    WHERE match_id = p_match_id
      AND innings = v_hc.innings
      AND ball_number = v_hc.ball_number
      AND player_id = v_caller;

    v_opp_thrown := CASE
      WHEN v_match.player1_id = v_caller THEN v_hc.player2_thrown
      ELSE v_hc.player1_thrown
    END;
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
      'status',            v_hc.status,
      'player1_squad',     to_jsonb(v_hc.player1_squad),
      'player2_squad',     to_jsonb(v_hc.player2_squad),
      'player1_joined',    v_hc.player1_joined,
      'player2_joined',    v_hc.player2_joined,
      'toss_winner_id',    v_hc.toss_winner_id,
      'toss_decision',     v_hc.toss_decision,
      'toss_deadline',     v_hc.toss_deadline,
      'balls_per_innings', v_hc.balls_per_innings,
      'innings',           v_hc.innings,
      'batting_player_id', v_hc.batting_player_id,
      'bowling_player_id', v_hc.bowling_player_id,
      'ball_number',       v_hc.ball_number,
      'innings1_runs',     v_hc.innings1_runs,
      'innings1_balls',    v_hc.innings1_balls,
      'innings1_wickets',  v_hc.innings1_wickets,
      'innings2_runs',     v_hc.innings2_runs,
      'innings2_balls',    v_hc.innings2_balls,
      'innings2_wickets',  v_hc.innings2_wickets,
      'target',            v_hc.target,
      'ball_opens_at',     v_hc.ball_opens_at,
      'ball_deadline',     v_hc.ball_deadline
    ),
    'balls',               v_balls,
    'my_throw',            v_my_throw,
    'opponent_has_thrown', v_opp_thrown,
    'server_now',          NOW()
  );
END;
$$;

-- ── 15b. RPC: set_hand_cricket_squad() ─────────────────────────────────────
-- Each player renames their OWN 11 players. Allowed until the match ends.

CREATE OR REPLACE FUNCTION public.set_hand_cricket_squad(p_match_id UUID, p_names TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_match   RECORD;
  v_clean   TEXT[] := ARRAY[]::TEXT[];
  v_name    TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  IF p_names IS NULL OR array_length(p_names, 1) IS DISTINCT FROM 11 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_squad',
      'message', 'A squad needs exactly 11 player names.');
  END IF;

  FOREACH v_name IN ARRAY p_names LOOP
    v_name := btrim(regexp_replace(COALESCE(v_name, ''), '[[:cntrl:]]', '', 'g'));
    IF char_length(v_name) < 1 OR char_length(v_name) > 20 THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_squad',
        'message', 'Each player name must be 1 to 20 characters.');
    END IF;
    v_clean := v_clean || v_name;
  END LOOP;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id AND game_type = 'hand_cricket'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  IF v_match.phase NOT IN ('waiting', 'active', 'reconnecting') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_active', 'phase', v_match.phase);
  END IF;

  IF v_match.player1_id = v_caller THEN
    UPDATE public.hand_cricket_matches SET player1_squad = v_clean, updated_at = NOW() WHERE id = p_match_id;
  ELSE
    UPDATE public.hand_cricket_matches SET player2_squad = v_clean, updated_at = NOW() WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'squad_saved', 'squad', to_jsonb(v_clean));
END;
$$;

-- ── 16. Realtime ─────────────────────────────────────────────────────────────
-- Only match progress is broadcast. Throws never are.

ALTER TABLE public.hand_cricket_matches REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.hand_cricket_matches;
EXCEPTION WHEN duplicate_object THEN
  NULL;
WHEN undefined_object THEN
  NULL;
END $$;

-- ── 17. Permissions ──────────────────────────────────────────────────────────

-- Internal helpers: callable only from the RPCs above (which run as owner)
REVOKE ALL ON FUNCTION public._hc_start_play(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._hc_resolve_ball(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._enforce_rps_match_rows() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_hand_cricket_match(UUID, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_hand_cricket_squad(UUID, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_hand_cricket_match(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_hand_cricket_match(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.choose_hand_cricket_toss(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_hand_cricket_throw(UUID, INT, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_hand_cricket_timeout(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_hand_cricket_state(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_hand_cricket_match(UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_hand_cricket_squad(UUID, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_hand_cricket_match(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_hand_cricket_match(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.choose_hand_cricket_toss(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_hand_cricket_throw(UUID, INT, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_hand_cricket_timeout(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_hand_cricket_state(UUID) TO authenticated, service_role;

-- ── End of migration 0015_hand_cricket.sql ───────────────────────────────────
