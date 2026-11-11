-- =============================================================================
-- Migration: 0017_ludo_forfeit_and_cleanup.sql
-- Project:   EVOAIQU — JE Labs
-- Purpose:   Ludo follow-ups to 0016.
--
--   1. apply_ludo_state() gets p_end_reason so the API can end a match as a
--      'forfeit' (a player let the turn clock run out 3 turns in a row).
--   2. A trigger keeps public.ludo_matches in step with public.matches: when
--      the shared lifecycle (cleanup_game_timeouts, disconnects, cancels...)
--      ends a Ludo match, the game row is marked 'finished' with no turn clock.
--
-- Idempotent: CREATE OR REPLACE / DROP ... IF EXISTS.
-- =============================================================================

-- ── 1. apply_ludo_state with an end reason ───────────────────────────────────

DROP FUNCTION IF EXISTS public.apply_ludo_state(UUID, UUID, INT, JSONB, TIMESTAMPTZ, UUID);

CREATE OR REPLACE FUNCTION public.apply_ludo_state(
  p_match_id          UUID,
  p_caller_id         UUID,
  p_expected_version  INT,
  p_state             JSONB,
  p_turn_deadline     TIMESTAMPTZ,
  p_winner_id         UUID DEFAULT NULL,
  p_end_reason        TEXT DEFAULT 'completed'
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

  IF p_end_reason IS NULL OR p_end_reason NOT IN ('completed', 'forfeit') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_end_reason');
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
        end_reason       = p_end_reason,
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

REVOKE ALL ON FUNCTION public.apply_ludo_state(UUID, UUID, INT, JSONB, TIMESTAMPTZ, UUID, TEXT) FROM PUBLIC, anon, authenticated;
-- Service role only: the API validates every move before calling it
GRANT EXECUTE ON FUNCTION public.apply_ludo_state(UUID, UUID, INT, JSONB, TIMESTAMPTZ, UUID, TEXT) TO service_role;

-- ── 2. Keep ludo_matches in step when the shared lifecycle ends a match ──────

CREATE OR REPLACE FUNCTION public.sync_ludo_match_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.ludo_matches
  SET status        = 'finished',
      turn_deadline = NULL,
      updated_at    = NOW()
  WHERE id = NEW.id
    AND status <> 'finished';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_ludo_match_end() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS matches_sync_ludo_end ON public.matches;
CREATE TRIGGER matches_sync_ludo_end
  AFTER UPDATE OF phase ON public.matches
  FOR EACH ROW
  WHEN (
    NEW.game_type = 'ludo'
    AND NEW.phase IN ('completed', 'aborted', 'forfeited', 'cancelled')
    AND OLD.phase IS DISTINCT FROM NEW.phase
  )
  EXECUTE FUNCTION public.sync_ludo_match_end();

-- Repair rows already ended by the lifecycle but still marked 'playing'
UPDATE public.ludo_matches l
SET status = 'finished', turn_deadline = NULL
FROM public.matches m
WHERE m.id = l.id
  AND m.game_type = 'ludo'
  AND m.phase IN ('completed', 'aborted', 'forfeited', 'cancelled')
  AND l.status <> 'finished';

-- ── End of migration 0017_ludo_forfeit_and_cleanup.sql ───────────────────────
