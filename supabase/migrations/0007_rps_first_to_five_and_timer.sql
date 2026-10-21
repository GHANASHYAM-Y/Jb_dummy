-- =============================================================================
-- Migration: 0007_rps_first_to_five_and_timer.sql
-- Project:   EVOAIQU
-- Purpose:   Upgrade Rock, Paper, Scissors match format to FIRST TO 5 wins
--            and introduce authoritative 10-second per-move timer with atomic
--            server-side timeout resolution.
-- =============================================================================

-- ── 1. Support 'timeout' move type ───────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE public.rps_move ADD VALUE IF NOT EXISTS 'timeout';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Add round_deadline column to matches ──────────────────────────────────

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS round_deadline TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS matches_deadline_idx
  ON public.matches (round_deadline)
  WHERE phase = 'active';

-- Initialize round_deadline for any active matches that don't have one
UPDATE public.matches
SET round_deadline = NOW() + INTERVAL '10 seconds'
WHERE phase = 'active' AND round_deadline IS NULL;

-- Re-activate any in-progress RPS matches that were closed prematurely under the old 2-win rule
UPDATE public.matches
SET phase = 'active',
    winner_id = NULL,
    completed_at = NULL,
    round_deadline = NOW() + INTERVAL '10 seconds'
WHERE phase = 'completed'
  AND player1_wins < 5
  AND player2_wins < 5
  AND game_type = 'rps';

-- ── 3. Update get_rps_match_state to return deadline & opponent submission ───

CREATE OR REPLACE FUNCTION public.get_rps_match_state(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller         UUID := auth.uid();
  v_match          RECORD;
  v_rounds         JSONB;
  v_my_move        TEXT;
  v_opponent_id    UUID;
  v_opp_submitted  BOOLEAN := FALSE;
  v_deadline       TIMESTAMPTZ;
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

  v_opponent_id := CASE WHEN v_match.player1_id = v_caller THEN v_match.player2_id ELSE v_match.player1_id END;
  v_deadline    := v_match.round_deadline;

  -- If match is active and deadline is missing, initialize a 10s deadline
  IF v_match.phase = 'active' AND v_deadline IS NULL THEN
    v_deadline := NOW() + INTERVAL '10 seconds';
    UPDATE public.matches
    SET round_deadline = v_deadline, updated_at = NOW()
    WHERE id = p_match_id;
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

  -- Did opponent submit this round? (Status boolean ONLY; does NOT leak move value)
  SELECT EXISTS (
    SELECT 1 FROM public.game_moves
    WHERE match_id = p_match_id
      AND player_id = v_opponent_id
      AND round_number = v_match.current_round
  ) INTO v_opp_submitted;

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
      'target_wins',  5,
      'winner_id',    v_match.winner_id,
      'is_draw',      v_match.is_draw,
      'round_deadline', v_deadline,
      'started_at',   v_match.started_at,
      'completed_at', v_match.completed_at
    ),
    'rounds',                 v_rounds,
    'my_move_this_round',     v_my_move,
    'opponent_has_submitted', v_opp_submitted,
    'server_now',             NOW()
  );
END;
$$;

-- ── 4. Update submit_rps_move for FIRST TO 5 and move deadline ───────────────

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

  -- Lock match row for update
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

  -- Check if 10-second round deadline has expired
  IF v_match.round_deadline IS NOT NULL AND NOW() > v_match.round_deadline THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'move_timeout',
      'message', 'The 10-second move deadline has expired for this round.');
  END IF;

  v_is_p1       := v_match.player1_id = v_caller;
  v_opponent_id := CASE WHEN v_is_p1 THEN v_match.player2_id ELSE v_match.player1_id END;
  v_my_move     := p_move::public.rps_move;

  -- Check for existing move (idempotency: same move is accepted, different is rejected)
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
    IF EXISTS (
      SELECT 1 FROM public.game_rounds
      WHERE match_id = p_match_id AND round_number = v_match.current_round
    ) THEN
      RETURN jsonb_build_object('ok', TRUE, 'code', 'already_submitted',
        'message', 'Move already recorded and round already resolved.');
    END IF;
  ELSE
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
    RETURN jsonb_build_object('ok', TRUE, 'code', 'waiting',
      'message', 'Move submitted. Waiting for opponent.');
  END IF;

  -- ── Both moves are in. Resolve round atomically. ───────────────────────────

  IF v_is_p1 THEN
    v_round_result := public._rps_result(v_my_move, v_opp_move);
  ELSE
    v_round_result := public._rps_result(v_opp_move, v_my_move);
  END IF;

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

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'resolved_by_peer',
      'message', 'Round already resolved.');
  END IF;

  -- Update running scores
  IF v_round_result = 'player1_wins' THEN v_p1_delta := 1;
  ELSIF v_round_result = 'player2_wins' THEN v_p2_delta := 1;
  END IF;

  UPDATE public.matches
  SET player1_wins  = player1_wins + v_p1_delta,
      player2_wins  = player2_wins + v_p2_delta,
      current_round = current_round + 1,
      updated_at    = NOW()
  WHERE id = p_match_id;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  -- FIRST TO 5 WINS: Check if either player has reached 5 points
  IF v_match.player1_wins >= 5 OR v_match.player2_wins >= 5 THEN
    UPDATE public.matches
    SET phase          = 'completed',
        winner_id      = CASE
          WHEN v_match.player1_wins > v_match.player2_wins THEN v_match.player1_id
          ELSE v_match.player2_id END,
        is_draw        = FALSE,
        round_deadline = NULL,
        completed_at   = NOW(),
        updated_at     = NOW()
    WHERE id = p_match_id;
  ELSE
    -- Reset 10-second deadline for the next round
    UPDATE public.matches
    SET round_deadline = NOW() + INTERVAL '10 seconds',
        updated_at    = NOW()
    WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'round_resolved',
    'round_result', v_round_result,
    'player1_wins', v_match.player1_wins,
    'player2_wins', v_match.player2_wins,
    'is_completed', (v_match.player1_wins >= 5 OR v_match.player2_wins >= 5)
  );
END;
$$;

-- ── 5. New function: resolve_rps_timeout(p_match_id) ─────────────────────────
--
-- Atomically resolves an expired move deadline:
--   - Policy:
--     - Neither submitted -> draw / no-contest (0 points to either)
--     - Only player 1 submitted -> player 1 wins round (1 point to P1)
--     - Only player 2 submitted -> player 2 wins round (1 point to P2)
--     - Both submitted at expiration -> normal move comparison
--   - Idempotent: protected by FOR UPDATE on matches and UNIQUE on game_rounds.

CREATE OR REPLACE FUNCTION public.resolve_rps_timeout(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_match        RECORD;
  v_p1_move      public.rps_move;
  v_p2_move      public.rps_move;
  v_round_result public.round_result;
  v_p1_delta     SMALLINT := 0;
  v_p2_delta     SMALLINT := 0;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  -- Lock match row
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
      'message', 'Match is already completed or inactive.');
  END IF;

  -- Verify deadline has actually elapsed
  IF v_match.round_deadline IS NOT NULL AND NOW() < v_match.round_deadline THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'deadline_not_reached',
      'message', 'Round deadline has not expired yet.',
      'seconds_remaining', GREATEST(0, EXTRACT(EPOCH FROM (v_match.round_deadline - NOW())))::INT);
  END IF;

  -- Idempotency check: already resolved?
  IF EXISTS (
    SELECT 1 FROM public.game_rounds
    WHERE match_id = p_match_id AND round_number = v_match.current_round
  ) THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'already_resolved',
      'message', 'Round was already resolved.');
  END IF;

  -- Check moves submitted for this round
  SELECT move INTO v_p1_move
  FROM public.game_moves
  WHERE match_id = p_match_id
    AND player_id = v_match.player1_id
    AND round_number = v_match.current_round;

  SELECT move INTO v_p2_move
  FROM public.game_moves
  WHERE match_id = p_match_id
    AND player_id = v_match.player2_id
    AND round_number = v_match.current_round;

  -- 1) Neither submitted -> draw
  IF v_p1_move IS NULL AND v_p2_move IS NULL THEN
    v_p1_move      := 'timeout'::public.rps_move;
    v_p2_move      := 'timeout'::public.rps_move;
    v_round_result := 'draw';
    v_p1_delta     := 0;
    v_p2_delta     := 0;

  -- 2) Player 1 submitted, Player 2 timed out -> Player 1 wins round
  ELSIF v_p1_move IS NOT NULL AND v_p2_move IS NULL THEN
    v_p2_move      := 'timeout'::public.rps_move;
    v_round_result := 'player1_wins';
    v_p1_delta     := 1;
    v_p2_delta     := 0;

  -- 3) Player 2 submitted, Player 1 timed out -> Player 2 wins round
  ELSIF v_p1_move IS NULL AND v_p2_move IS NOT NULL THEN
    v_p1_move      := 'timeout'::public.rps_move;
    v_round_result := 'player2_wins';
    v_p1_delta     := 0;
    v_p2_delta     := 1;

  -- 4) Both submitted right at deadline -> normal resolution
  ELSE
    v_round_result := public._rps_result(v_p1_move, v_p2_move);
    IF v_round_result = 'player1_wins' THEN v_p1_delta := 1;
    ELSIF v_round_result = 'player2_wins' THEN v_p2_delta := 1;
    END IF;
  END IF;

  -- Record resolved round
  INSERT INTO public.game_rounds (
    match_id, round_number, player1_move, player2_move, result
  )
  VALUES (
    p_match_id, v_match.current_round, v_p1_move, v_p2_move, v_round_result
  )
  ON CONFLICT (match_id, round_number) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'already_resolved');
  END IF;

  -- Update scores and advance round
  UPDATE public.matches
  SET player1_wins  = player1_wins + v_p1_delta,
      player2_wins  = player2_wins + v_p2_delta,
      current_round = current_round + 1,
      updated_at    = NOW()
  WHERE id = p_match_id;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  -- FIRST TO 5 WINS check
  IF v_match.player1_wins >= 5 OR v_match.player2_wins >= 5 THEN
    UPDATE public.matches
    SET phase          = 'completed',
        winner_id      = CASE
          WHEN v_match.player1_wins > v_match.player2_wins THEN v_match.player1_id
          ELSE v_match.player2_id END,
        is_draw        = FALSE,
        round_deadline = NULL,
        completed_at   = NOW(),
        updated_at     = NOW()
    WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
    SET round_deadline = NOW() + INTERVAL '10 seconds'
    WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'ok',           TRUE,
    'code',         'timeout_resolved',
    'result',       v_round_result,
    'player1_wins', v_match.player1_wins,
    'player2_wins', v_match.player2_wins,
    'is_completed', (v_match.player1_wins >= 5 OR v_match.player2_wins >= 5)
  );
END;
$$;

-- ── 6. Grant Permissions ─────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.resolve_rps_timeout(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_rps_timeout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rps_move(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rps_match_state(UUID) TO authenticated;
