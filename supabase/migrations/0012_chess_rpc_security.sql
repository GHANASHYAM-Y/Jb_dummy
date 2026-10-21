-- =============================================================================
-- Migration: 0012_chess_rpc_security.sql
-- Project:   EVOAIQU — JE Labs
-- Purpose:   Harden Supabase Chess RPC Security & Server Authoritativeness:
--            1. Revoke all EXECUTE permissions from 'anon' and 'PUBLIC' across
--               all chess RPCs.
--            2. Restrict apply_chess_move_atomic to 'service_role' ONLY, preventing
--               authenticated clients from bypassing chess.js validation or forging
--               board FEN, PGN, clocks, checkmate, or winner_id.
--            3. Make claim_chess_timeout authoritative by deriving the true winner
--               and FIDE 6.9 insufficient material draw status in SQL rather than
--               trusting caller-supplied parameters.
--            4. Enforce explicit search_path = public, pg_catalog across all RPCs
--               to prevent search-path injection.
--            5. Handle NULL-safe auth.role() and auth.uid() comparisons to prevent
--               three-valued logic bypasses.
-- =============================================================================

-- ── 1. create_chess_match() ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_chess_match(
  p_opponent_id          UUID,
  p_time_control_seconds INT  DEFAULT 300,
  p_increment_seconds    INT  DEFAULT 3,
  p_preferred_color      TEXT DEFAULT 'random'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_white_id      UUID;
  v_black_id      UUID;
  v_match_id      UUID;
  v_time_ctrl     INT := LEAST(GREATEST(COALESCE(p_time_control_seconds, 300), 60), 3600);
  v_inc_secs      INT := LEAST(GREATEST(COALESCE(p_increment_seconds, 3), 0), 60);
  v_initial_time  INT := v_time_ctrl * 1000;
  v_pref          TEXT := COALESCE(p_preferred_color, 'random');
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated', 'message', 'Must be logged in.');
  END IF;

  IF p_opponent_id IS NULL OR p_opponent_id = v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_opponent', 'message', 'Invalid opponent.');
  END IF;

  -- Ensure opponent profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_opponent_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'opponent_not_found', 'message', 'Opponent not found.');
  END IF;

  -- Check blocking
  IF public.is_blocked(v_caller, p_opponent_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked', 'message', 'Cannot start a game while blocked.');
  END IF;

  -- Color assignment
  IF v_pref = 'white' THEN
    v_white_id := v_caller;
    v_black_id := p_opponent_id;
  ELSIF v_pref = 'black' THEN
    v_white_id := p_opponent_id;
    v_black_id := v_caller;
  ELSE
    -- Fair random assignment
    IF random() < 0.5 THEN
      v_white_id := v_caller;
      v_black_id := p_opponent_id;
    ELSE
      v_white_id := p_opponent_id;
      v_black_id := v_caller;
    END IF;
  END IF;

  -- 1. Create root match entry in public.matches
  INSERT INTO public.matches (
    game_type,
    player1_id,
    player2_id,
    phase,
    started_at
  ) VALUES (
    'chess',
    v_white_id,
    v_black_id,
    'active',
    NOW()
  )
  RETURNING id INTO v_match_id;

  -- 2. Create isolated chess match entry in public.chess_matches
  INSERT INTO public.chess_matches (
    id,
    white_player_id,
    black_player_id,
    time_control_seconds,
    increment_seconds,
    white_time_remaining_ms,
    black_time_remaining_ms,
    last_move_at,
    game_status
  ) VALUES (
    v_match_id,
    v_white_id,
    v_black_id,
    v_time_ctrl,
    v_inc_secs,
    v_initial_time,
    v_initial_time,
    NOW(),
    'active'
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'match_created',
    'match_id', v_match_id,
    'white_player_id', v_white_id,
    'black_player_id', v_black_id,
    'time_control_seconds', v_time_ctrl,
    'increment_seconds', v_inc_secs
  );
END;
$$;

-- ── 2. apply_chess_move_atomic() ─────────────────────────────────────────────
-- Concurrency-safe, atomic move commit. Restricted strictly to service_role so
-- that moves MUST pass through authoritative server-side chess.js validation.

CREATE OR REPLACE FUNCTION public.apply_chess_move_atomic(
  p_match_id            UUID,
  p_caller_id           UUID,
  p_expected_ply        INT,
  p_fen                 TEXT,
  p_pgn                 TEXT,
  p_turn                TEXT,
  p_san                 TEXT,
  p_from                TEXT,
  p_to                  TEXT,
  p_promotion           TEXT DEFAULT NULL,
  p_captured            TEXT DEFAULT NULL,
  p_white_time_ms       INT  DEFAULT 300000,
  p_black_time_ms       INT  DEFAULT 300000,
  p_time_spent_ms       INT  DEFAULT 0,
  p_game_status         TEXT DEFAULT 'active',
  p_winner_id           UUID DEFAULT NULL,
  p_win_reason          TEXT DEFAULT NULL,
  p_is_check            BOOLEAN DEFAULT FALSE,
  p_is_checkmate        BOOLEAN DEFAULT FALSE,
  p_is_stalemate        BOOLEAN DEFAULT FALSE,
  p_is_draw             BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_match        RECORD;
  v_next_ply     INT;
  v_elapsed_ms   INT;
BEGIN
  -- Strict Service Role authorization: moves must originate from the authoritative game server
  IF COALESCE(auth.role(), '') <> 'service_role' AND (auth.role() IS NOT NULL OR SESSION_USER NOT LIKE 'postgres%') THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'forbidden',
      'message', 'Direct move submission is forbidden. Moves must be submitted through the authoritative game server.'
    );
  END IF;

  -- Row-level lock on chess match to serialize moves atomically
  SELECT * INTO v_match
  FROM public.chess_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_found', 'message', 'Match not found.');
  END IF;

  -- Verify participant
  IF p_caller_id IS NULL OR (p_caller_id <> v_match.white_player_id AND p_caller_id <> v_match.black_player_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Not a participant.');
  END IF;

  -- Turn enforcement: Only the active player may submit a move
  IF (v_match.turn = 'w' AND p_caller_id <> v_match.white_player_id) OR
     (v_match.turn = 'b' AND p_caller_id <> v_match.black_player_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'out_of_turn', 'message', 'It is not your turn to move.');
  END IF;

  -- Reject if game is already concluded
  IF v_match.game_status NOT IN ('active', 'check') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'game_already_over', 'message', 'Game is already finished.');
  END IF;

  -- Optimistic concurrency check: Ply MUST match exactly
  IF v_match.ply <> p_expected_ply THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'stale_ply',
      'message', 'Board state changed concurrently.',
      'current_ply', v_match.ply
    );
  END IF;

  -- Clock verification: ensure active player has not exceeded time (with 1s tolerance)
  v_elapsed_ms := EXTRACT(EPOCH FROM (NOW() - v_match.last_move_at)) * 1000;
  IF v_match.turn = 'w' AND (v_match.white_time_remaining_ms - v_elapsed_ms) < -1000 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'timeout', 'message', 'White has run out of time.');
  ELSIF v_match.turn = 'b' AND (v_match.black_time_remaining_ms - v_elapsed_ms) < -1000 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'timeout', 'message', 'Black has run out of time.');
  END IF;

  v_next_ply := v_match.ply + 1;

  -- 1. Atomically update chess_matches state
  UPDATE public.chess_matches
  SET fen                     = p_fen,
      pgn                     = p_pgn,
      turn                    = p_turn,
      ply                     = v_next_ply,
      white_time_remaining_ms = p_white_time_ms,
      black_time_remaining_ms = p_black_time_ms,
      last_move_at            = NOW(),
      is_check                = p_is_check,
      is_checkmate            = p_is_checkmate,
      is_stalemate            = p_is_stalemate,
      is_draw                 = p_is_draw,
      game_status             = p_game_status,
      draw_offered_by         = NULL,
      updated_at              = NOW()
  WHERE id = p_match_id;

  -- 2. Record move in immutable chess_moves log
  INSERT INTO public.chess_moves (
    match_id,
    ply,
    player_id,
    san,
    from_square,
    to_square,
    promotion,
    captured,
    fen_after,
    time_spent_ms,
    white_time_remaining_ms,
    black_time_remaining_ms
  ) VALUES (
    p_match_id,
    v_next_ply,
    p_caller_id,
    p_san,
    p_from,
    p_to,
    p_promotion,
    p_captured,
    p_fen,
    p_time_spent_ms,
    p_white_time_ms,
    p_black_time_ms
  );

  -- 3. If game is over, update public.matches to complete the match and enable dares
  IF p_game_status NOT IN ('active', 'check') THEN
    UPDATE public.matches
    SET phase        = 'completed',
        winner_id    = p_winner_id,
        is_draw      = p_is_draw,
        completed_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'move_committed',
    'ply', v_next_ply,
    'game_status', p_game_status,
    'winner_id', p_winner_id
  );
END;
$$;

-- ── 3. resign_chess_match() ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resign_chess_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller      UUID := auth.uid();
  v_match       RECORD;
  v_winner_id   UUID;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match
  FROM public.chess_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_caller <> v_match.white_player_id AND v_caller <> v_match.black_player_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  IF v_match.game_status NOT IN ('active', 'check') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'game_already_over');
  END IF;

  -- Derive winner authoritatively as the opponent of the resigning player
  v_winner_id := CASE WHEN v_caller = v_match.white_player_id THEN v_match.black_player_id ELSE v_match.white_player_id END;

  UPDATE public.chess_matches
  SET game_status     = 'resigned',
      resigned_by     = v_caller,
      draw_offered_by = NULL,
      updated_at      = NOW()
  WHERE id = p_match_id;

  UPDATE public.matches
  SET phase        = 'completed',
      winner_id    = v_winner_id,
      is_draw      = FALSE,
      completed_at = NOW(),
      updated_at   = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'resigned',
    'winner_id', v_winner_id,
    'resigned_by', v_caller
  );
END;
$$;

-- ── 4. respond_chess_draw() ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.respond_chess_draw(
  p_match_id UUID,
  p_action   TEXT -- 'offer' | 'accept' | 'decline'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_match  RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match
  FROM public.chess_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_caller <> v_match.white_player_id AND v_caller <> v_match.black_player_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  IF v_match.game_status NOT IN ('active', 'check') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'game_already_over');
  END IF;

  IF p_action = 'offer' THEN
    IF v_match.draw_offered_by = v_caller THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'already_offered');
    END IF;

    UPDATE public.chess_matches
    SET draw_offered_by = v_caller, updated_at = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('ok', TRUE, 'code', 'draw_offered');

  ELSIF p_action = 'decline' THEN
    IF v_match.draw_offered_by IS NULL OR v_match.draw_offered_by = v_caller THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'cannot_decline');
    END IF;

    UPDATE public.chess_matches
    SET draw_offered_by = NULL, updated_at = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('ok', TRUE, 'code', 'draw_declined');

  ELSIF p_action = 'accept' THEN
    IF v_match.draw_offered_by IS NULL OR v_match.draw_offered_by = v_caller THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'cannot_accept');
    END IF;

    UPDATE public.chess_matches
    SET game_status     = 'draw_agreed',
        is_draw         = TRUE,
        draw_offered_by = NULL,
        updated_at      = NOW()
    WHERE id = p_match_id;

    UPDATE public.matches
    SET phase        = 'completed',
        winner_id    = NULL,
        is_draw      = TRUE,
        completed_at = NOW(),
        updated_at   = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('ok', TRUE, 'code', 'draw_agreed');
  ELSE
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_action');
  END IF;
END;
$$;

-- ── 5. claim_chess_timeout() ─────────────────────────────────────────────────
-- Authoritative timeout adjudication: winner and draw status are derived directly
-- from clock state and FIDE Article 6.9 material rules, NEVER trusting caller parameters.

CREATE OR REPLACE FUNCTION public.claim_chess_timeout(
  p_match_id              UUID,
  p_timed_out_color       TEXT    DEFAULT NULL,
  p_winner_id             UUID    DEFAULT NULL,
  p_is_draw               BOOLEAN DEFAULT FALSE,
  p_reason                TEXT    DEFAULT 'timeout'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller               UUID := auth.uid();
  v_match                RECORD;
  v_elapsed_ms           INT;
  v_remaining_ms         INT;
  v_timed_out_color      TEXT;
  v_potential_winner_id  UUID;
  v_opp_color            TEXT;
  v_board_pieces         TEXT;
  v_opp_has_sufficient   BOOLEAN;
  v_final_winner_id      UUID;
  v_final_is_draw        BOOLEAN;
  v_final_status         TEXT;
BEGIN
  SELECT * INTO v_match
  FROM public.chess_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  -- Only participants or service_role can claim timeout
  IF COALESCE(auth.role(), '') <> 'service_role' AND (auth.role() IS NOT NULL OR SESSION_USER NOT LIKE 'postgres%') THEN
    IF v_caller IS NULL THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
    END IF;
    IF v_caller <> v_match.white_player_id AND v_caller <> v_match.black_player_id THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
    END IF;
  END IF;

  IF v_match.game_status NOT IN ('active', 'check') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'game_already_over');
  END IF;

  -- 1. Server-side elapsed time & active player calculation
  v_elapsed_ms := EXTRACT(EPOCH FROM (NOW() - v_match.last_move_at)) * 1000;
  v_timed_out_color := v_match.turn;

  IF v_timed_out_color = 'w' THEN
    v_remaining_ms := v_match.white_time_remaining_ms - v_elapsed_ms;
    v_potential_winner_id := v_match.black_player_id;
    v_opp_color := 'b';
  ELSE
    v_remaining_ms := v_match.black_time_remaining_ms - v_elapsed_ms;
    v_potential_winner_id := v_match.white_player_id;
    v_opp_color := 'w';
  END IF;

  -- Tolerance window of 1000ms for network latency
  IF v_remaining_ms > 1000 THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'not_timed_out',
      'remaining_ms', v_remaining_ms,
      'timed_out_color', v_timed_out_color
    );
  END IF;

  -- 2. Authoritative FIDE Article 6.9 Outcome Adjudication:
  -- If opponent does not have sufficient mating material to checkmate by any legal series of moves, the game is a draw.
  v_board_pieces := split_part(v_match.fen, ' ', 1);

  IF v_opp_color = 'w' THEN
    -- White has sufficient material if:
    -- Pawns, rooks, queens exist, OR at least 2 minor pieces exist, OR 1 minor piece exists and Black has any non-king piece
    v_opp_has_sufficient := (
      v_board_pieces ~ '[PRQ]'
      OR COALESCE((SELECT count(*) FROM regexp_matches(v_board_pieces, '[NB]', 'g')), 0) >= 2
      OR (v_board_pieces ~ '[NB]' AND v_board_pieces ~ '[prqnb]')
    );
  ELSE
    -- Black has sufficient material if:
    v_opp_has_sufficient := (
      v_board_pieces ~ '[prq]'
      OR COALESCE((SELECT count(*) FROM regexp_matches(v_board_pieces, '[nb]', 'g')), 0) >= 2
      OR (v_board_pieces ~ '[nb]' AND v_board_pieces ~ '[PRQNB]')
    );
  END IF;

  IF NOT v_opp_has_sufficient THEN
    v_final_is_draw   := TRUE;
    v_final_winner_id := NULL;
    v_final_status    := 'insufficient_material';
  ELSE
    v_final_is_draw   := FALSE;
    v_final_winner_id := v_potential_winner_id;
    v_final_status    := 'timeout';
  END IF;

  -- 3. Atomic commit with derived authoritative values (ignoring any caller parameters)
  UPDATE public.chess_matches
  SET game_status     = v_final_status,
      is_draw         = v_final_is_draw,
      draw_offered_by = NULL,
      updated_at      = NOW()
  WHERE id = p_match_id;

  UPDATE public.matches
  SET phase        = 'completed',
      winner_id    = v_final_winner_id,
      is_draw      = v_final_is_draw,
      completed_at = NOW(),
      updated_at   = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'timeout_confirmed',
    'winner_id', v_final_winner_id,
    'is_draw', v_final_is_draw,
    'game_status', v_final_status,
    'timed_out_color', v_timed_out_color
  );
END;
$$;

-- ── 6. Permissions & Role Hardening ──────────────────────────────────────────

-- Revoke all execution permissions from 'PUBLIC' and 'anon' on all 5 chess RPCs
REVOKE ALL ON FUNCTION public.create_chess_match(UUID, INT, INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_chess_move_atomic(UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, INT, TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resign_chess_match(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_chess_draw(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_chess_timeout(UUID, TEXT, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;

-- Grant execution to authenticated and service_role where appropriate
GRANT EXECUTE ON FUNCTION public.create_chess_match(UUID, INT, INT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resign_chess_match(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_chess_draw(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_chess_timeout(UUID, TEXT, UUID, BOOLEAN, TEXT) TO authenticated, service_role;

-- Strictly grant apply_chess_move_atomic ONLY to service_role (the authoritative backend server)
GRANT EXECUTE ON FUNCTION public.apply_chess_move_atomic(UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, INT, TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO service_role;

-- ── End of migration 0012_chess_rpc_security.sql ─────────────────────────────
