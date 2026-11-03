-- =============================================================================
-- Migration: 0014_game_lifecycle_and_timeouts.sql
-- Project:   EVOAIQU — JE Labs
-- Purpose:   Multiplayer Game Lifecycle and Authoritative Timeout System:
--            1. Matchmaking waiting timeout (10m waiting, 10m ready)
--            2. Game inactivity timeout (10m no-valid-action abort; no max duration)
--            3. Voluntary player departure (Leave Game -> forfeit/both_left)
--            4. Disconnection & 60s reconnection grace period
--            5. Dual disconnection & graceful session resumption
--            6. Server-authoritative RPCs with FOR UPDATE concurrency locks
--            7. Scheduled cleanup function cleanup_game_timeouts()
-- =============================================================================

-- ── 1. Expand match_phase ENUM ───────────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE public.match_phase ADD VALUE IF NOT EXISTS 'waiting';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.match_phase ADD VALUE IF NOT EXISTS 'ready';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.match_phase ADD VALUE IF NOT EXISTS 'reconnecting';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.match_phase ADD VALUE IF NOT EXISTS 'aborted';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.match_phase ADD VALUE IF NOT EXISTS 'forfeited';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Add Lifecycle & History Columns to public.matches ─────────────────────

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS end_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS game_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waiting_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS player1_left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS player2_left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS player1_disconnected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS player2_disconnected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS player1_reconnect_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS player2_reconnect_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS loser_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.matches
    ADD CONSTRAINT matches_end_reason_check
    CHECK (end_reason IS NULL OR end_reason IN (
      'completed',
      'forfeit',
      'inactivity_timeout',
      'waiting_timeout',
      'start_timeout',
      'disconnect_timeout',
      'both_left'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS matches_phase_activity_idx
  ON public.matches (phase, last_activity_at)
  WHERE phase = 'active';

CREATE INDEX IF NOT EXISTS matches_phase_reconnect_idx
  ON public.matches (phase, player1_reconnect_deadline, player2_reconnect_deadline)
  WHERE phase IN ('reconnecting', 'active');

CREATE INDEX IF NOT EXISTS matches_phase_deadlines_idx
  ON public.matches (phase, waiting_deadline, start_deadline)
  WHERE phase IN ('waiting', 'ready');

-- ── 3. Update Matchmaking Queue 10-Minute Timeout ────────────────────────────

ALTER TABLE public.matchmaking_queue
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '10 minutes');

-- ── 4. RPC: leave_game(p_match_id UUID) ──────────────────────────────────────
--
-- Server-authoritative voluntary departure:
--  - Records departure timestamp (player1_left_at or player2_left_at)
--  - If opponent remains: declares opponent winner, caller loser, reason 'forfeit'
--  - If both have left: aborts match, reason 'both_left'
--  - Atomically locks match row with FOR UPDATE to prevent race conditions
--  - Rejects all future moves from a player who has left

CREATE OR REPLACE FUNCTION public.leave_game(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_match         RECORD;
  v_opponent_id   UUID;
  v_is_p1         BOOLEAN;
  v_opp_left      BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated', 'message', 'Must be logged in.');
  END IF;

  IF p_match_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_match_id', 'message', 'Match ID is required.');
  END IF;

  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found', 'message', 'Match not found.');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Not a participant in this match.');
  END IF;

  v_is_p1 := (v_match.player1_id = v_caller);
  v_opponent_id := CASE WHEN v_is_p1 THEN v_match.player2_id ELSE v_match.player1_id END;

  -- If caller already left, return idempotently
  IF (v_is_p1 AND v_match.player1_left_at IS NOT NULL) OR ((NOT v_is_p1) AND v_match.player2_left_at IS NOT NULL) THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'code', 'already_left',
      'phase', v_match.phase,
      'winner_id', v_match.winner_id,
      'loser_id', v_match.loser_id,
      'end_reason', v_match.end_reason
    );
  END IF;

  -- If match is already in completed/aborted/cancelled, return idempotently
  IF v_match.phase IN ('completed', 'aborted', 'cancelled') THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'code', 'already_ended',
      'phase', v_match.phase,
      'winner_id', v_match.winner_id,
      'loser_id', v_match.loser_id,
      'end_reason', v_match.end_reason
    );
  END IF;

  v_opp_left := CASE WHEN v_is_p1 THEN (v_match.player2_left_at IS NOT NULL) ELSE (v_match.player1_left_at IS NOT NULL) END;

  IF v_is_p1 THEN
    UPDATE public.matches
    SET player1_left_at = NOW(),
        updated_at = NOW()
    WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
    SET player2_left_at = NOW(),
        updated_at = NOW()
    WHERE id = p_match_id;
  END IF;

  IF v_opp_left OR v_match.phase = 'forfeited' THEN
    -- Both players have explicitly left -> abort match
    UPDATE public.matches
    SET phase        = 'aborted',
        end_reason   = 'both_left',
        winner_id    = NULL,
        loser_id     = NULL,
        completed_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_match_id;

    -- Update chess_matches status if applicable
    IF v_match.game_type = 'chess' THEN
      UPDATE public.chess_matches
      SET game_status = 'abandoned',
          updated_at = NOW()
      WHERE id = p_match_id;
    END IF;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'code', 'both_left',
      'phase', 'aborted',
      'end_reason', 'both_left',
      'winner_id', NULL,
      'loser_id', NULL
    );
  ELSE
    -- Opponent remains -> declare opponent winner, caller loser
    UPDATE public.matches
    SET phase        = 'forfeited',
        end_reason   = 'forfeit',
        winner_id    = v_opponent_id,
        loser_id     = v_caller,
        completed_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_match_id;

    -- Update chess_matches status if applicable
    IF v_match.game_type = 'chess' THEN
      UPDATE public.chess_matches
      SET game_status = 'resigned',
          resigned_by = v_caller,
          updated_at = NOW()
      WHERE id = p_match_id;
    END IF;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'code', 'forfeit',
      'phase', 'forfeited',
      'end_reason', 'forfeit',
      'winner_id', v_opponent_id,
      'loser_id', v_caller
    );
  END IF;
END;
$$;

-- ── 5. RPC: report_disconnect(p_match_id UUID) ──────────────────────────────
--
-- Records unexpected player disconnection and starts 60-second grace period.
-- Does NOT declare forfeiture immediately (browser refreshes & drops are treated as temporary).

CREATE OR REPLACE FUNCTION public.report_disconnect(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_match         RECORD;
  v_is_p1         BOOLEAN;
  v_deadline      TIMESTAMPTZ := NOW() + INTERVAL '60 seconds';
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

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

  IF v_match.phase IN ('completed', 'aborted', 'forfeited', 'cancelled') THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'already_ended', 'phase', v_match.phase);
  END IF;

  v_is_p1 := (v_match.player1_id = v_caller);

  IF v_is_p1 THEN
    UPDATE public.matches
    SET player1_disconnected_at = NOW(),
        player1_reconnect_deadline = v_deadline,
        phase = CASE WHEN phase = 'active' THEN 'reconnecting'::public.match_phase ELSE phase END,
        updated_at = NOW()
    WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
    SET player2_disconnected_at = NOW(),
        player2_reconnect_deadline = v_deadline,
        phase = CASE WHEN phase = 'active' THEN 'reconnecting'::public.match_phase ELSE phase END,
        updated_at = NOW()
    WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'disconnect_recorded',
    'phase', 'reconnecting',
    'reconnect_deadline', v_deadline,
    'server_now', NOW()
  );
END;
$$;

-- ── 6. RPC: reconnect_game(p_match_id UUID) ──────────────────────────────────
--
-- Restores session on browser refresh / network recovery:
--  - Validates player authentication & match membership
--  - Validates match has not ended
--  - Validates 60-second reconnection deadline has not expired
--  - Clears disconnection timestamp & restores 'active' phase
--  - Rejects expired players with deadline_expired

CREATE OR REPLACE FUNCTION public.reconnect_game(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_match         RECORD;
  v_is_p1         BOOLEAN;
  v_my_deadline   TIMESTAMPTZ;
  v_opp_dc        BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

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

  IF v_match.phase IN ('completed', 'aborted', 'forfeited', 'cancelled') THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'match_already_ended',
      'message', 'Match has already ended.',
      'phase', v_match.phase,
      'winner_id', v_match.winner_id,
      'end_reason', v_match.end_reason
    );
  END IF;

  v_is_p1 := (v_match.player1_id = v_caller);
  v_my_deadline := CASE WHEN v_is_p1 THEN v_match.player1_reconnect_deadline ELSE v_match.player2_reconnect_deadline END;

  -- Check if 60-second reconnection grace period has expired
  IF v_my_deadline IS NOT NULL AND NOW() > v_my_deadline THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'deadline_expired',
      'message', 'Reconnection deadline has expired.'
    );
  END IF;

  v_opp_dc := CASE WHEN v_is_p1 THEN (v_match.player2_disconnected_at IS NOT NULL) ELSE (v_match.player1_disconnected_at IS NOT NULL) END;

  -- Clear disconnect flags for caller
  IF v_is_p1 THEN
    UPDATE public.matches
    SET player1_disconnected_at = NULL,
        player1_reconnect_deadline = NULL,
        phase = CASE WHEN v_opp_dc THEN 'reconnecting'::public.match_phase ELSE 'active'::public.match_phase END,
        updated_at = NOW()
    WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
    SET player2_disconnected_at = NULL,
        player2_reconnect_deadline = NULL,
        phase = CASE WHEN v_opp_dc THEN 'reconnecting'::public.match_phase ELSE 'active'::public.match_phase END,
        updated_at = NOW()
    WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'reconnected',
    'phase', CASE WHEN v_opp_dc THEN 'reconnecting' ELSE 'active' END,
    'opponent_disconnected', v_opp_dc,
    'server_now', NOW()
  );
END;
$$;

-- ── 7. RPC: cleanup_game_timeouts() ──────────────────────────────────────────
--
-- Authoritative background cleanup engine:
--  1. Waiting timeout: matches waiting for 2nd player > 10m -> aborted ('waiting_timeout')
--  2. Start timeout: ready matches not started within 10m -> aborted ('start_timeout')
--  3. Inactivity timeout: active games with no valid action for 10m -> aborted ('inactivity_timeout')
--  4. Disconnect timeout:
--     - Both players fail to reconnect within 60s -> aborted ('both_left')
--     - One player fails to reconnect within 60s, other connected -> declare connected winner ('disconnect_timeout')
--  5. Matchmaking queue entries searching > 10m -> expired

CREATE OR REPLACE FUNCTION public.cleanup_game_timeouts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rec                 RECORD;
  v_aborted_waiting     INT := 0;
  v_aborted_start       INT := 0;
  v_aborted_inactivity  INT := 0;
  v_resolved_disconnect INT := 0;
  v_aborted_both_dc     INT := 0;
  v_expired_queues      INT := 0;
BEGIN
  -- 1. Matches waiting for 2nd player beyond 10 minutes
  FOR v_rec IN
    SELECT id FROM public.matches
    WHERE phase = 'waiting'
      AND (
        (waiting_deadline IS NOT NULL AND NOW() > waiting_deadline)
        OR created_at < NOW() - INTERVAL '10 minutes'
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.matches
    SET phase = 'aborted',
        end_reason = 'waiting_timeout',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_rec.id;
    v_aborted_waiting := v_aborted_waiting + 1;
  END LOOP;

  -- 2. Ready matches that have not started within 10 minutes
  FOR v_rec IN
    SELECT id FROM public.matches
    WHERE phase = 'ready'
      AND (
        (start_deadline IS NOT NULL AND NOW() > start_deadline)
        OR updated_at < NOW() - INTERVAL '10 minutes'
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.matches
    SET phase = 'aborted',
        end_reason = 'start_timeout',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_rec.id;
    v_aborted_start := v_aborted_start + 1;
  END LOOP;

  -- 3. Active games with no valid game activity for 10 consecutive minutes
  FOR v_rec IN
    SELECT id, game_type FROM public.matches
    WHERE phase = 'active'
      AND last_activity_at < NOW() - INTERVAL '10 minutes'
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.matches
    SET phase = 'aborted',
        end_reason = 'inactivity_timeout',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_rec.id;

    IF v_rec.game_type = 'chess' THEN
      UPDATE public.chess_matches
      SET game_status = 'abandoned',
          updated_at = NOW()
      WHERE id = v_rec.id;
    END IF;

    v_aborted_inactivity := v_aborted_inactivity + 1;
  END LOOP;

  -- 4. Disconnected players whose 60-second reconnection deadlines have expired
  FOR v_rec IN
    SELECT id, game_type, player1_id, player2_id,
           player1_disconnected_at, player2_disconnected_at,
           player1_reconnect_deadline, player2_reconnect_deadline
    FROM public.matches
    WHERE phase IN ('reconnecting', 'active')
      AND (
        (player1_reconnect_deadline IS NOT NULL AND NOW() > player1_reconnect_deadline)
        OR (player2_reconnect_deadline IS NOT NULL AND NOW() > player2_reconnect_deadline)
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Case A: Both disconnected and both deadlines expired -> abort match (no winner)
    IF (v_rec.player1_reconnect_deadline IS NOT NULL AND NOW() > v_rec.player1_reconnect_deadline)
       AND (v_rec.player2_reconnect_deadline IS NOT NULL AND NOW() > v_rec.player2_reconnect_deadline) THEN
      UPDATE public.matches
      SET phase        = 'aborted',
          end_reason   = 'both_left',
          winner_id    = NULL,
          loser_id     = NULL,
          completed_at = NOW(),
          updated_at   = NOW()
      WHERE id = v_rec.id;

      IF v_rec.game_type = 'chess' THEN
        UPDATE public.chess_matches
        SET game_status = 'abandoned', updated_at = NOW()
        WHERE id = v_rec.id;
      END IF;

      v_aborted_both_dc := v_aborted_both_dc + 1;

    -- Case B: Player 1 expired, Player 2 is connected / eligible -> declare Player 2 winner
    ELSIF (v_rec.player1_reconnect_deadline IS NOT NULL AND NOW() > v_rec.player1_reconnect_deadline)
          AND (v_rec.player2_disconnected_at IS NULL OR (v_rec.player2_reconnect_deadline IS NOT NULL AND NOW() <= v_rec.player2_reconnect_deadline)) THEN
      UPDATE public.matches
      SET phase        = 'completed',
          end_reason   = 'disconnect_timeout',
          winner_id    = v_rec.player2_id,
          loser_id     = v_rec.player1_id,
          completed_at = NOW(),
          updated_at   = NOW()
      WHERE id = v_rec.id;

      IF v_rec.game_type = 'chess' THEN
        UPDATE public.chess_matches
        SET game_status = 'timeout', updated_at = NOW()
        WHERE id = v_rec.id;
      END IF;

      v_resolved_disconnect := v_resolved_disconnect + 1;

    -- Case C: Player 2 expired, Player 1 is connected / eligible -> declare Player 1 winner
    ELSIF (v_rec.player2_reconnect_deadline IS NOT NULL AND NOW() > v_rec.player2_reconnect_deadline)
          AND (v_rec.player1_disconnected_at IS NULL OR (v_rec.player1_reconnect_deadline IS NOT NULL AND NOW() <= v_rec.player1_reconnect_deadline)) THEN
      UPDATE public.matches
      SET phase        = 'completed',
          end_reason   = 'disconnect_timeout',
          winner_id    = v_rec.player1_id,
          loser_id     = v_rec.player2_id,
          completed_at = NOW(),
          updated_at   = NOW()
      WHERE id = v_rec.id;

      IF v_rec.game_type = 'chess' THEN
        UPDATE public.chess_matches
        SET game_status = 'timeout', updated_at = NOW()
        WHERE id = v_rec.id;
      END IF;

      v_resolved_disconnect := v_resolved_disconnect + 1;
    END IF;
  END LOOP;

  -- 5. Expire matchmaking queue entries searching beyond 10 minutes
  UPDATE public.matchmaking_queue
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'searching'
    AND expires_at < NOW();
  GET DIAGNOSTICS v_expired_queues = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'aborted_waiting', v_aborted_waiting,
    'aborted_start', v_aborted_start,
    'aborted_inactivity', v_aborted_inactivity,
    'resolved_disconnect', v_resolved_disconnect,
    'aborted_both_disconnect', v_aborted_both_dc,
    'expired_queues', v_expired_queues,
    'timestamp', NOW()
  );
END;
$$;

-- ── 8. Update submit_rps_move with Inactivity & Leave Guard ──────────────────

CREATE OR REPLACE FUNCTION public.submit_rps_move(
  p_match_id UUID,
  p_move     TEXT   -- 'rock' | 'paper' | 'scissors'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
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

  -- Validate move value strictly.
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

  v_is_p1       := (v_match.player1_id = v_caller);
  v_opponent_id := CASE WHEN v_is_p1 THEN v_match.player2_id ELSE v_match.player1_id END;

  -- Reject if player has left
  IF (v_is_p1 AND v_match.player1_left_at IS NOT NULL) OR ((NOT v_is_p1) AND v_match.player2_left_at IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'player_left',
      'message', 'You have voluntarily left this match.');
  END IF;

  IF v_match.phase <> 'active' AND v_match.phase <> 'reconnecting' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_active',
      'message', 'Match is not in an active phase.', 'phase', v_match.phase);
  END IF;

  -- 10-Minute Game Inactivity Check: If no valid activity for 10 minutes, abort game
  IF v_match.last_activity_at IS NOT NULL AND NOW() > v_match.last_activity_at + INTERVAL '10 minutes' THEN
    UPDATE public.matches
    SET phase = 'aborted',
        end_reason = 'inactivity_timeout',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('ok', FALSE, 'code', 'inactivity_timeout',
      'message', 'Match aborted due to 10 minutes of inactivity.');
  END IF;

  -- Round move deadline check (if per-round timer active)
  IF v_match.round_deadline IS NOT NULL AND NOW() > v_match.round_deadline THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'move_timeout',
      'message', 'The move deadline has expired for this round.');
  END IF;

  v_my_move := p_move::public.rps_move;

  -- Check for existing move (idempotency: same move accepted, different move rejected)
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

    -- VALID GAME ACTION: Resets the 10-minute inactivity timer
    UPDATE public.matches
    SET last_activity_at = NOW(),
        updated_at = NOW()
    WHERE id = p_match_id;
  END IF;

  -- Check if opponent has also submitted
  SELECT move INTO v_opp_move
  FROM public.game_moves
  WHERE match_id = p_match_id
    AND player_id = v_opponent_id
    AND round_number = v_match.current_round;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'waiting',
      'message', 'Move submitted. Waiting for opponent.');
  END IF;

  -- Both moves are in: Resolve round atomically
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

  IF v_round_result = 'player1_wins' THEN v_p1_delta := 1;
  ELSIF v_round_result = 'player2_wins' THEN v_p2_delta := 1;
  END IF;

  UPDATE public.matches
  SET player1_wins     = player1_wins + v_p1_delta,
      player2_wins     = player2_wins + v_p2_delta,
      current_round    = current_round + 1,
      last_activity_at = NOW(),
      updated_at       = NOW()
  WHERE id = p_match_id;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  -- FIRST TO 5 WINS: Check completion
  IF v_match.player1_wins >= 5 OR v_match.player2_wins >= 5 THEN
    UPDATE public.matches
    SET phase          = 'completed',
        end_reason     = 'completed',
        winner_id      = CASE
          WHEN v_match.player1_wins > v_match.player2_wins THEN v_match.player1_id
          ELSE v_match.player2_id END,
        loser_id       = CASE
          WHEN v_match.player1_wins > v_match.player2_wins THEN v_match.player2_id
          ELSE v_match.player1_id END,
        is_draw        = FALSE,
        round_deadline = NULL,
        completed_at   = NOW(),
        updated_at     = NOW()
    WHERE id = p_match_id;
  ELSE
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

-- ── 9. Update get_rps_match_state with Full Lifecycle Data ───────────────────

CREATE OR REPLACE FUNCTION public.get_rps_match_state(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
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

  -- Resolved rounds
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

  -- Caller's move this round
  SELECT move::TEXT INTO v_my_move
  FROM public.game_moves
  WHERE match_id = p_match_id
    AND player_id = v_caller
    AND round_number = v_match.current_round;

  -- Opponent submitted indicator (boolean only)
  SELECT EXISTS (
    SELECT 1 FROM public.game_moves
    WHERE match_id = p_match_id
      AND player_id = v_opponent_id
      AND round_number = v_match.current_round
  ) INTO v_opp_submitted;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'match', jsonb_build_object(
      'id',                         v_match.id,
      'phase',                      v_match.phase,
      'end_reason',                 v_match.end_reason,
      'game_type',                  v_match.game_type,
      'player1_id',                 v_match.player1_id,
      'player2_id',                 v_match.player2_id,
      'player1_wins',               v_match.player1_wins,
      'player2_wins',               v_match.player2_wins,
      'current_round',              v_match.current_round,
      'target_wins',                5,
      'winner_id',                  v_match.winner_id,
      'loser_id',                   v_match.loser_id,
      'is_draw',                    v_match.is_draw,
      'round_deadline',             v_deadline,
      'last_activity_at',           v_match.last_activity_at,
      'started_at',                 v_match.started_at,
      'game_started_at',            v_match.game_started_at,
      'completed_at',               v_match.completed_at,
      'player1_left_at',            v_match.player1_left_at,
      'player2_left_at',            v_match.player2_left_at,
      'player1_disconnected_at',    v_match.player1_disconnected_at,
      'player2_disconnected_at',    v_match.player2_disconnected_at,
      'player1_reconnect_deadline', v_match.player1_reconnect_deadline,
      'player2_reconnect_deadline', v_match.player2_reconnect_deadline
    ),
    'rounds',                 v_rounds,
    'my_move_this_round',     v_my_move,
    'opponent_has_submitted', v_opp_submitted,
    'server_now',             NOW()
  );
END;
$$;

-- ── 10. Update get_rps_history to Return End Reason & Status ─────────────────

CREATE OR REPLACE FUNCTION public.get_rps_history()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
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
      'loser_id',           m.loser_id,
      'is_draw',            m.is_draw,
      'phase',              m.phase,
      'end_reason',         m.end_reason,
      'completed_at',       m.completed_at,
      'started_at',         m.started_at,
      'last_activity_at',   m.last_activity_at
    ) AS item
    FROM public.matches m
    JOIN public.profiles p1 ON p1.id = m.player1_id
    JOIN public.profiles p2 ON p2.id = m.player2_id
    WHERE (m.player1_id = v_caller OR m.player2_id = v_caller)
      AND m.phase IN ('completed', 'forfeited', 'aborted')
      AND m.game_type = 'rps'
    ORDER BY COALESCE(m.completed_at, m.updated_at) DESC
    LIMIT 50
  ) sub;

  RETURN jsonb_build_object('ok', TRUE, 'history', v_result);
END;
$$;

-- ── 11. Security Grants ──────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.leave_game(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.report_disconnect(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reconnect_game(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_game_timeouts() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.leave_game(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_disconnect(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconnect_game(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_game_timeouts() TO authenticated, service_role;

-- ── End of migration 0014_game_lifecycle_and_timeouts.sql ─────────────────────
