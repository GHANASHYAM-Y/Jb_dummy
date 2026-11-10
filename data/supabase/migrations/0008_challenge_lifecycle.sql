-- =============================================================================
-- Migration: 0008_challenge_lifecycle.sql
-- Description: EVOAIQU Challenge Lifecycle, Status Synchronization & Completion
--
-- Enhancements:
--   1. Expands challenges status check constraint to include 'declined'.
--   2. Updates respond_challenge() to accept 'accept', 'skip', and 'decline'.
--   3. Adds complete_challenge() to allow authorized recipients to complete
--      accepted challenges.
--   4. Adds cancel_challenge() to allow authorized senders to cancel pending
--      challenges.
--   5. Updates get_user_challenges() to return authoritative winner_id and
--      loser_id in addition to the perspective role.
--   6. Configures REPLICA IDENTITY FULL on public.challenges for complete
--      Realtime payload delivery.
--   7. Strictly enforces RLS and SECURITY DEFINER access control.
-- =============================================================================

-- ── 1. Status Constraint Update ──────────────────────────────────────────────

DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.challenges'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.challenges DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END $$;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_status_check
  CHECK (status IN (
    'pending',
    'accepted',
    'completed',
    'skipped',
    'declined',
    'cancelled'
  ));

-- ── 2. respond_challenge() ───────────────────────────────────────────────────
-- Allows the recipient (loser) to accept, skip, or decline an assigned challenge.
-- Actions: 'accept' | 'skip' | 'decline'

CREATE OR REPLACE FUNCTION public.respond_challenge(
  p_challenge_id UUID,
  p_action       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_challenge RECORD;
  v_new_status TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'Must be logged in.');
  END IF;

  -- Validate action parameter
  IF p_action IS NULL OR p_action NOT IN ('accept', 'skip', 'decline') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_action',
      'message', 'Action must be accept, skip, or decline.');
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found',
      'message', 'Challenge not found.');
  END IF;

  -- Only the assigned recipient can respond
  IF v_challenge.loser_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden',
      'message', 'Only the assigned recipient can accept or decline this challenge.');
  END IF;

  -- Map action to status
  IF p_action = 'accept' THEN
    v_new_status := 'accepted';
  ELSIF p_action = 'decline' THEN
    v_new_status := 'declined';
  ELSE
    v_new_status := 'skipped';
  END IF;

  -- Idempotency: if already in target state, return success
  IF v_challenge.status = v_new_status THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', v_new_status);
  END IF;

  -- Also consider skipped and declined mutually idempotent if already resolved
  IF (v_challenge.status = 'skipped' OR v_challenge.status = 'declined') AND
     (p_action = 'skip' OR p_action = 'decline') THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', v_challenge.status);
  END IF;

  -- Must be in pending status to transition
  IF v_challenge.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_pending',
      'message', 'Challenge is no longer pending.');
  END IF;

  UPDATE public.challenges
  SET status = v_new_status, updated_at = NOW()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', v_new_status);
END;
$$;

-- ── 3. complete_challenge() ──────────────────────────────────────────────────
-- Allows the recipient (loser) to mark an accepted challenge as completed.

CREATE OR REPLACE FUNCTION public.complete_challenge(
  p_challenge_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_challenge RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'Must be logged in.');
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found',
      'message', 'Challenge not found.');
  END IF;

  -- Only the assigned recipient can complete the challenge
  IF v_challenge.loser_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden',
      'message', 'Only the assigned recipient can complete this challenge.');
  END IF;

  -- Idempotency: already completed
  IF v_challenge.status = 'completed' THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'completed');
  END IF;

  -- Must be accepted before completing
  IF v_challenge.status <> 'accepted' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_accepted',
      'message', 'Challenge must be accepted before it can be marked as completed.');
  END IF;

  UPDATE public.challenges
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'completed');
END;
$$;

-- ── 4. cancel_challenge() ────────────────────────────────────────────────────
-- Allows the assigner (winner) to cancel a challenge while still pending.

CREATE OR REPLACE FUNCTION public.cancel_challenge(
  p_challenge_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_challenge RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'Must be logged in.');
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found',
      'message', 'Challenge not found.');
  END IF;

  -- Only the challenge creator (winner) can cancel
  IF v_challenge.winner_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden',
      'message', 'Only the challenge assigner can cancel this challenge.');
  END IF;

  -- Idempotency: already cancelled
  IF v_challenge.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'cancelled');
  END IF;

  -- Can only cancel while pending
  IF v_challenge.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_pending',
      'message', 'Only pending challenges can be cancelled.');
  END IF;

  UPDATE public.challenges
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'cancelled');
END;
$$;

-- ── 5. get_user_challenges() ─────────────────────────────────────────────────
-- Updated to include authoritative winner_id and loser_id fields in the output.

CREATE OR REPLACE FUNCTION public.get_user_challenges(p_filter TEXT DEFAULT 'all')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_filter TEXT := COALESCE(p_filter, 'all');
  v_result JSONB;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  IF v_filter NOT IN ('received', 'sent', 'all') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_filter');
  END IF;

  SELECT COALESCE(jsonb_agg(sub.item), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id',             c.id,
      'match_id',       c.match_id,
      'winner_id',      c.winner_id,
      'loser_id',       c.loser_id,
      'role',           CASE WHEN c.winner_id = v_caller THEN 'winner' ELSE 'loser' END,
      'opponent_id',    CASE WHEN c.winner_id = v_caller THEN c.loser_id ELSE c.winner_id END,
      'opponent_name',  CASE WHEN c.winner_id = v_caller THEN p_loser.display_name ELSE p_winner.display_name END,
      'opponent_evoora_id', CASE WHEN c.winner_id = v_caller THEN p_loser.evoora_id ELSE p_winner.evoora_id END,
      'opponent_avatar', CASE WHEN c.winner_id = v_caller THEN p_loser.avatar_url ELSE p_winner.avatar_url END,
      'challenge_id',   c.challenge_id,
      'category',       c.category,
      'title',          c.title,
      'description',    c.description,
      'instructions',   c.instructions,
      'visibility',     c.visibility,
      'status',         c.status,
      'created_at',     c.created_at,
      'updated_at',     c.updated_at
    ) AS item
    FROM public.challenges c
    JOIN public.profiles p_winner ON p_winner.id = c.winner_id
    JOIN public.profiles p_loser  ON p_loser.id  = c.loser_id
    WHERE (
      (v_filter = 'all'      AND (c.winner_id = v_caller OR c.loser_id = v_caller)) OR
      (v_filter = 'received' AND c.loser_id = v_caller) OR
      (v_filter = 'sent'     AND c.winner_id = v_caller)
    )
    ORDER BY c.created_at DESC
    LIMIT 50
  ) sub;

  RETURN jsonb_build_object('ok', TRUE, 'challenges', v_result);
END;
$$;

-- ── 6. Permissions ───────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.respond_challenge(UUID, TEXT)  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_challenge(UUID)        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_challenge(UUID)          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_challenges(TEXT)      FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.respond_challenge(UUID, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_challenge(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_challenge(UUID)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_challenges(TEXT)      TO authenticated;

-- ── 7. Realtime Replica Identity ─────────────────────────────────────────────

ALTER TABLE public.challenges REPLICA IDENTITY FULL;

-- ── End of migration 0008_challenge_lifecycle.sql ────────────────────────────
