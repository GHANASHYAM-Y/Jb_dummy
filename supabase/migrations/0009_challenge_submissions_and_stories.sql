-- =============================================================================
-- Migration: 0009_challenge_submissions_and_stories.sql
-- Project:   EVOAIQU
-- Purpose:   Complete 24-Hour Challenge Video Submission, Loser-Controlled
--            Story Visibility, One-Time Authorized Winner Review Session,
--            Two-Phase Retry-Safe Retention Cleanup Engine, and RLS Policies.
-- =============================================================================

-- ── 1. Update challenges status constraint ───────────────────────────────────
-- Include 'submitted' and 'retry_requested' states in the lifecycle.
-- Rerun-safe: drops only status check constraints on challenges, preserving all others.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.challenges'::regclass
      AND contype = 'c'
      AND (conname = 'challenges_status_check' OR pg_get_constraintdef(oid) ILIKE '%status%in%')
  ) LOOP
    EXECUTE 'ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE public.challenges

  ADD CONSTRAINT challenges_status_check
  CHECK (status IN (
    'pending',
    'accepted',
    'submitted',
    'retry_requested',
    'completed',
    'skipped',
    'declined',
    'cancelled'
  ));

-- ── 2. Helper: are_friends(a, b) ─────────────────────────────────────────────
-- Preserves existing parameter names (a UUID, b UUID) and plpgsql language from 0003_rps.sql.
-- Do NOT change input parameter names or language to avoid PostgreSQL CREATE OR REPLACE errors.

CREATE OR REPLACE FUNCTION public.are_friends(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
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

-- ── 3. Table: challenge_submissions (Stories) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID           NOT NULL
                               REFERENCES public.challenges(id) ON DELETE CASCADE,
  match_id      UUID           NOT NULL
                               REFERENCES public.matches(id) ON DELETE CASCADE,
  loser_id      UUID           NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,
  winner_id     UUID           NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Storage information
  storage_path  TEXT           NOT NULL,
  media_type    TEXT           NOT NULL DEFAULT 'video/webm',
  duration_seconds NUMERIC     NOT NULL DEFAULT 10,

  -- Loser-controlled visibility ('private' | 'public')
  visibility    TEXT           NOT NULL DEFAULT 'private'
                               CHECK (visibility IN ('private', 'public')),

  -- Submission lifecycle status
  status        TEXT           NOT NULL DEFAULT 'submitted'
                               CHECK (status IN ('submitted', 'approved', 'retry_requested', 'expired', 'deleted')),
  retry_note    TEXT,

  -- Authoritative One-Time Winner Review Session tracking
  view_session_status TEXT     NOT NULL DEFAULT 'unviewed'
                               CHECK (view_session_status IN ('unviewed', 'in_progress', 'consumed', 'expired')),
  view_session_token  UUID,
  view_session_started_at          TIMESTAMPTZ,
  view_session_playback_started_at TIMESTAMPTZ,
  view_session_expires_at          TIMESTAMPTZ,
  view_session_consumed_at         TIMESTAMPTZ,
  view_count          INT      NOT NULL DEFAULT 0,

  -- 24-hour Story lifecycle timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  deleted_at       TIMESTAMPTZ,
  media_deleted_at TIMESTAMPTZ
);

-- Idempotent column additions in case table was partially created in earlier attempts
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS loser_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'video/webm';
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC NOT NULL DEFAULT 10;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted';
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS retry_note TEXT;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS view_session_status TEXT NOT NULL DEFAULT 'unviewed';
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS view_session_token UUID;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS view_session_started_at TIMESTAMPTZ;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS view_session_playback_started_at TIMESTAMPTZ;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS view_session_expires_at TIMESTAMPTZ;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS view_session_consumed_at TIMESTAMPTZ;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours');
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS media_deleted_at TIMESTAMPTZ;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS challenge_submissions_set_updated_at ON public.challenge_submissions;
CREATE TRIGGER challenge_submissions_set_updated_at
  BEFORE UPDATE ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for fast filtering, expiration, and unpurged media cleanup
CREATE INDEX IF NOT EXISTS ch_sub_challenge_idx ON public.challenge_submissions (challenge_id);
CREATE INDEX IF NOT EXISTS ch_sub_loser_idx ON public.challenge_submissions (loser_id, status);
CREATE INDEX IF NOT EXISTS ch_sub_winner_idx ON public.challenge_submissions (winner_id, status);
CREATE INDEX IF NOT EXISTS ch_sub_expires_idx ON public.challenge_submissions (expires_at) WHERE status <> 'deleted';
CREATE INDEX IF NOT EXISTS ch_sub_unpurged_idx ON public.challenge_submissions (expires_at) WHERE media_deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ch_sub_token_idx ON public.challenge_submissions (view_session_token) WHERE view_session_token IS NOT NULL;

-- ── 4. Private Storage Bucket Setup ──────────────────────────────────────────

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'challenge-stories',
    'challenge-stories',
    FALSE,
    52428800, -- 50 MB
    ARRAY['video/webm', 'video/mp4', 'video/quicktime', 'video/ogg']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['video/webm', 'video/mp4', 'video/quicktime', 'video/ogg'];
EXCEPTION WHEN OTHERS THEN
  NULL; -- Gracefully proceed if storage schema is not present in local test DB
END $$;

-- ── 5. Row Level Security for challenge_submissions ──────────────────────────

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- SELECT policy:
-- 1. Loser (creator) can always see their own submission history.
-- 2. Winner can see it as long as not deleted, not blocked.
-- 3. Public Story: unblocked users can see while not deleted and unexpired.
-- 4. Private Story: accepted friends who are not blocked can see while not deleted and unexpired.
DROP POLICY IF EXISTS "ch_sub_select" ON public.challenge_submissions;
CREATE POLICY "ch_sub_select"
  ON public.challenge_submissions FOR SELECT
  USING (
    -- Author always has access to their own record
    auth.uid() = loser_id
    -- Match winner has access (subject to blocking and deletion)
    OR (
      auth.uid() = winner_id
      AND status <> 'deleted'
      AND NOT public.is_blocked(auth.uid(), loser_id)
    )
    -- Public Story: unblocked users can see while active and unexpired
    OR (
      visibility = 'public'
      AND status NOT IN ('deleted', 'expired')
      AND expires_at > NOW()
      AND (auth.uid() IS NULL OR NOT public.is_blocked(auth.uid(), loser_id))
    )
    -- Private Story: accepted friends who are not blocked can see while active and unexpired
    OR (
      visibility = 'private'
      AND status NOT IN ('deleted', 'expired')
      AND expires_at > NOW()
      AND auth.uid() IS NOT NULL
      AND public.are_friends(auth.uid(), loser_id)
      AND NOT public.is_blocked(auth.uid(), loser_id)
    )
  );

-- Direct client mutations forbidden. Handled via vetted SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "ch_sub_insert" ON public.challenge_submissions;
CREATE POLICY "ch_sub_insert" ON public.challenge_submissions FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "ch_sub_update" ON public.challenge_submissions;
CREATE POLICY "ch_sub_update" ON public.challenge_submissions FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "ch_sub_delete" ON public.challenge_submissions;
CREATE POLICY "ch_sub_delete" ON public.challenge_submissions FOR DELETE USING (FALSE);

-- ── 6. RPC: submit_challenge_video ───────────────────────────────────────────
-- Called when the loser submits their recorded or uploaded video to Story.
-- Loser chooses visibility ('private' | 'public').

CREATE OR REPLACE FUNCTION public.submit_challenge_video(
  p_challenge_id      UUID,
  p_storage_path      TEXT,
  p_visibility        TEXT DEFAULT 'private',
  p_duration_seconds  NUMERIC DEFAULT 10,
  p_media_type        TEXT DEFAULT 'video/webm'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_challenge     RECORD;
  v_submission_id UUID;
  v_expires_at    TIMESTAMPTZ := NOW() + INTERVAL '24 hours';
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated', 'message', 'Must be logged in.');
  END IF;

  -- Validate visibility parameter strictly
  IF p_visibility IS NULL OR p_visibility NOT IN ('private', 'public') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_visibility', 'message', 'Visibility must be private or public.');
  END IF;

  IF p_storage_path IS NULL OR length(trim(p_storage_path)) < 3 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_storage_path', 'message', 'Invalid storage path.');
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found', 'message', 'Challenge not found.');
  END IF;

  -- Only the loser can submit their challenge video
  IF v_challenge.loser_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Only the assigned recipient can submit this challenge.');
  END IF;

  -- Blocked check
  IF public.is_blocked(v_caller, v_challenge.winner_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked', 'message', 'Cannot submit challenge while users are blocked.');
  END IF;

  -- Challenge must be in accepted or retry_requested status
  IF v_challenge.status NOT IN ('accepted', 'retry_requested', 'submitted') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_status', 'message', 'Challenge must be accepted or in retry status to submit video.');
  END IF;

  -- Mark previous submissions for this challenge as superseded if retrying
  UPDATE public.challenge_submissions
  SET status = 'retry_requested', updated_at = NOW()
  WHERE challenge_id = p_challenge_id AND status = 'submitted';

  -- Insert new active submission
  INSERT INTO public.challenge_submissions (
    challenge_id,
    match_id,
    loser_id,
    winner_id,
    storage_path,
    media_type,
    duration_seconds,
    visibility,
    status,
    expires_at
  ) VALUES (
    v_challenge.id,
    v_challenge.match_id,
    v_challenge.loser_id,
    v_challenge.winner_id,
    trim(p_storage_path),
    COALESCE(p_media_type, 'video/webm'),
    COALESCE(p_duration_seconds, 10),
    p_visibility,
    'submitted',
    v_expires_at
  )
  RETURNING id INTO v_submission_id;

  -- Update challenge status to submitted and set story visibility
  UPDATE public.challenges
  SET status = 'submitted',
      visibility = p_visibility,
      updated_at = NOW()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'submitted',
    'submission_id', v_submission_id,
    'visibility', p_visibility,
    'expires_at', v_expires_at
  );
END;
$$;

-- ── 7. RPC: update_story_visibility ──────────────────────────────────────────
-- Enforces: "The loser alone chooses Public or Private... The winner must NOT
-- be able to change the loser's Story visibility."

CREATE OR REPLACE FUNCTION public.update_story_visibility(
  p_submission_id UUID,
  p_visibility    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_submission RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  IF p_visibility IS NULL OR p_visibility NOT IN ('private', 'public') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_visibility', 'message', 'Visibility must be private or public.');
  END IF;

  SELECT * INTO v_submission
  FROM public.challenge_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found', 'message', 'Submission not found.');
  END IF;

  -- Strictly: only the loser (creator) can change visibility!
  IF v_submission.loser_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Only the story creator can update story visibility.');
  END IF;

  UPDATE public.challenge_submissions
  SET visibility = p_visibility, updated_at = NOW()
  WHERE id = p_submission_id;

  -- Sync with challenge record
  UPDATE public.challenges
  SET visibility = p_visibility, updated_at = NOW()
  WHERE id = v_submission.challenge_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'visibility_updated', 'visibility', p_visibility);
END;
$$;

-- ── 8. RPC: delete_challenge_story ───────────────────────────────────────────
-- Allows the creator (loser) to delete their Story at any time.

CREATE OR REPLACE FUNCTION public.delete_challenge_story(
  p_submission_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_submission RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_submission
  FROM public.challenge_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  -- Only creator can delete
  IF v_submission.loser_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Only the creator can delete their story.');
  END IF;

  UPDATE public.challenge_submissions
  SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'deleted',
    'storage_path', v_submission.storage_path
  );
END;
$$;

-- ── 9. RPC: start_winner_review_session ──────────────────────────────────────
-- Atomically initiates or resumes the verified winner's one-time viewing session.
-- Handles interruptions gracefully (doesn't permanently consume until playback starts).
-- Strictly rejects expired submissions, deleted stories, and unauthorized review attempts.

CREATE OR REPLACE FUNCTION public.start_winner_review_session(
  p_challenge_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_challenge     RECORD;
  v_submission    RECORD;
  v_session_token UUID;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated', 'message', 'Must be logged in.');
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found', 'message', 'Challenge not found.');
  END IF;

  -- Only verified match winner can review
  IF v_challenge.winner_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Only the verified match winner can review this submission.');
  END IF;

  -- Verify against matches table
  IF NOT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = v_challenge.match_id
      AND winner_id = v_caller
      AND phase = 'completed'
  ) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Only the verified match winner can review this submission.');
  END IF;

  -- Check blocking
  IF public.is_blocked(v_caller, v_challenge.loser_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked', 'message', 'Unable to view submission due to user blocking.');
  END IF;

  -- Lock submission row for atomic session evaluation
  SELECT * INTO v_submission
  FROM public.challenge_submissions
  WHERE challenge_id = p_challenge_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'no_submission', 'message', 'No challenge submission found.');
  END IF;

  -- Ensure submission winner matches caller as well
  IF v_submission.winner_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Only the verified match winner can review this submission.');
  END IF;

  -- Reject deleted submissions
  IF v_submission.status = 'deleted' OR v_submission.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'submission_deleted', 'message', 'This submission was deleted by the creator.');
  END IF;

  -- Reject expired submissions
  IF v_submission.expires_at <= NOW() OR v_submission.status = 'expired' THEN
    IF v_submission.status = 'submitted' THEN
      UPDATE public.challenge_submissions
      SET status = 'expired', updated_at = NOW()
      WHERE id = v_submission.id;
    END IF;

    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'submission_expired',
      'message', 'This challenge submission has expired after 24 hours and can no longer be viewed.'
    );
  END IF;

  -- ── Check one-time viewing status ──
  IF v_submission.view_session_status = 'consumed' THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'already_viewed',
      'message', 'You have already completed your one-time viewing session for this submission.'
    );
  END IF;

  -- If session is in_progress:
  IF v_submission.view_session_status = 'in_progress' THEN
    -- Check if playback started and window expired (3 minutes)
    IF v_submission.view_session_playback_started_at IS NOT NULL
       AND v_submission.view_session_expires_at IS NOT NULL
       AND NOW() > v_submission.view_session_expires_at THEN
      UPDATE public.challenge_submissions
      SET view_session_status = 'consumed',
          view_session_consumed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_submission.id;

      RETURN jsonb_build_object(
        'ok', FALSE,
        'code', 'session_expired',
        'message', 'Your viewing session window has expired.'
      );
    END IF;

    -- Resuming active session before playback expired or after network interruption
    RETURN jsonb_build_object(
      'ok', TRUE,
      'code', 'session_resumed',
      'submission_id', v_submission.id,
      'session_token', v_submission.view_session_token,
      'storage_path', v_submission.storage_path,
      'duration_seconds', v_submission.duration_seconds,
      'media_type', v_submission.media_type,
      'playback_started', v_submission.view_session_playback_started_at IS NOT NULL
    );
  END IF;

  -- ── Fresh session start: unviewed -> in_progress ──
  v_session_token := gen_random_uuid();

  UPDATE public.challenge_submissions
  SET view_session_status = 'in_progress',
      view_session_token = v_session_token,
      view_session_started_at = NOW(),
      view_session_expires_at = NOW() + INTERVAL '10 minutes',
      view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = v_submission.id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'session_started',
    'submission_id', v_submission.id,
    'session_token', v_session_token,
    'storage_path', v_submission.storage_path,
    'duration_seconds', v_submission.duration_seconds,
    'media_type', v_submission.media_type,
    'playback_started', FALSE
  );
END;
$$;

-- ── 10. RPC: ack_playback_start ──────────────────────────────────────────────
-- Called by client when video element actually fires 'play'.
-- Arms the 3-minute playback window.

CREATE OR REPLACE FUNCTION public.ack_playback_start(
  p_submission_id UUID,
  p_token         UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_submission RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_submission
  FROM public.challenge_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_submission.winner_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  IF v_submission.view_session_token <> p_token THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_token');
  END IF;

  -- Reject if expired
  IF v_submission.expires_at <= NOW() OR v_submission.status = 'expired' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'submission_expired');
  END IF;

  IF v_submission.view_session_status <> 'in_progress' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_in_progress');
  END IF;

  -- Set authoritative playback start and arm 3-minute expiration window
  IF v_submission.view_session_playback_started_at IS NULL THEN
    UPDATE public.challenge_submissions
    SET view_session_playback_started_at = NOW(),
        view_session_expires_at = NOW() + INTERVAL '3 minutes',
        updated_at = NOW()
    WHERE id = p_submission_id;
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'playback_acknowledged');
END;
$$;

-- ── 11. RPC: finish_winner_review_session ────────────────────────────────────
-- Consumes the viewing session once video finishes or winner closes player.

CREATE OR REPLACE FUNCTION public.finish_winner_review_session(
  p_submission_id UUID,
  p_token         UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_submission RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_submission
  FROM public.challenge_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  IF v_submission.winner_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  IF v_submission.view_session_token <> p_token THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_token');
  END IF;

  -- Atomically consume session
  UPDATE public.challenge_submissions
  SET view_session_status = 'consumed',
      view_session_consumed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_submission_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'consumed');
END;
$$;

-- ── 12. RPC: review_challenge_submission ─────────────────────────────────────
-- Winner approves the dare (completes challenge) or requests a retry with feedback.
-- Notice: Allowed after viewing session is consumed, but strictly rejected if expired or deleted.

CREATE OR REPLACE FUNCTION public.review_challenge_submission(
  p_challenge_id UUID,
  p_action       TEXT,      -- 'approve' | 'request_retry'
  p_retry_note   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_challenge     RECORD;
  v_submission    RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  IF p_action IS NULL OR p_action NOT IN ('approve', 'request_retry') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_action', 'message', 'Action must be approve or request_retry.');
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  -- Only verified match winner can review
  IF v_challenge.winner_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Only the match winner can review this challenge.');
  END IF;

  -- Verify match record as well
  IF NOT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = v_challenge.match_id
      AND winner_id = v_caller
      AND phase = 'completed'
  ) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Only the verified match winner can review this challenge.');
  END IF;

  -- Check blocking
  IF public.is_blocked(v_caller, v_challenge.loser_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked', 'message', 'Unable to review challenge due to user blocking.');
  END IF;

  SELECT * INTO v_submission
  FROM public.challenge_submissions
  WHERE challenge_id = p_challenge_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'no_submission', 'message', 'No submission found to review.');
  END IF;

  -- Reject deleted submissions
  IF v_submission.status = 'deleted' OR v_submission.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'submission_deleted', 'message', 'This submission was deleted by the creator.');
  END IF;

  -- Reject expired submissions
  IF v_submission.expires_at <= NOW() OR v_submission.status = 'expired' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'submission_expired', 'message', 'This submission has expired and can no longer be reviewed.');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.challenge_submissions
    SET status = 'approved',
        view_session_status = 'consumed',
        updated_at = NOW()
    WHERE id = v_submission.id;

    UPDATE public.challenges
    SET status = 'completed', updated_at = NOW()
    WHERE id = p_challenge_id;

    RETURN jsonb_build_object('ok', TRUE, 'code', 'approved', 'status', 'completed');
  ELSE
    UPDATE public.challenge_submissions
    SET status = 'retry_requested',
        retry_note = trim(COALESCE(p_retry_note, '')),
        view_session_status = 'consumed',
        updated_at = NOW()
    WHERE id = v_submission.id;

    UPDATE public.challenges
    SET status = 'retry_requested', updated_at = NOW()
    WHERE id = p_challenge_id;

    RETURN jsonb_build_object('ok', TRUE, 'code', 'retry_requested', 'status', 'retry_requested');
  END IF;
END;
$$;

-- ── 13. RPC: get_challenge_story ─────────────────────────────────────────────
-- Returns submission details and authorized viewing status for the caller.
-- Preserves creator's ability to view their story history without exposing expired media to viewers.

CREATE OR REPLACE FUNCTION public.get_challenge_story(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_submission RECORD;
  v_challenge  RECORD;
  v_can_view   BOOLEAN := FALSE;
  v_is_winner  BOOLEAN := FALSE;
  v_is_loser   BOOLEAN := FALSE;
  v_is_expired BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found');
  END IF;

  SELECT * INTO v_submission
  FROM public.challenge_submissions
  WHERE challenge_id = p_challenge_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_submission', FALSE);
  END IF;

  v_is_winner  := v_caller IS NOT NULL AND v_caller = v_challenge.winner_id;
  v_is_loser   := v_caller IS NOT NULL AND v_caller = v_challenge.loser_id;
  v_is_expired := v_submission.expires_at <= NOW() OR v_submission.status = 'expired';

  -- Blocked check: If caller and creator have blocked each other, reject immediately (unless caller is creator)
  IF v_caller IS NOT NULL AND NOT v_is_loser AND public.is_blocked(v_caller, v_challenge.loser_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked');
  END IF;

  -- Deleted check: If story was deleted by creator, no media is viewable by anyone
  IF v_submission.status = 'deleted' OR v_submission.deleted_at IS NOT NULL THEN
    v_can_view := FALSE;
  ELSIF v_is_expired THEN
    -- Expired media must NOT be exposed to viewers!
    v_can_view := FALSE;
  ELSIF v_is_loser THEN
    -- Creator can view active unexpired media
    v_can_view := TRUE;
  ELSIF v_is_winner THEN
    -- Winner can view active unexpired media if session is not consumed
    v_can_view := v_submission.view_session_status <> 'consumed';
  ELSIF v_submission.visibility = 'public' THEN
    v_can_view := TRUE;
  ELSIF v_submission.visibility = 'private' AND v_caller IS NOT NULL THEN
    v_can_view := public.are_friends(v_caller, v_challenge.loser_id);
  END IF;

  -- Private Story authorization: Only creator, winner, or accepted unblocked friends can view or discover metadata
  IF v_submission.visibility = 'private' AND NOT v_is_loser AND NOT v_is_winner THEN
    IF v_caller IS NULL OR NOT public.are_friends(v_caller, v_challenge.loser_id) THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden', 'message', 'Private story is only accessible to accepted friends.');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'has_submission', TRUE,
    'submission', jsonb_build_object(
      'id', v_submission.id,
      'challenge_id', v_submission.challenge_id,
      'loser_id', v_submission.loser_id,
      'winner_id', v_submission.winner_id,
      'storage_path', CASE WHEN v_can_view THEN v_submission.storage_path ELSE NULL END,
      'visibility', v_submission.visibility,
      'status', CASE WHEN v_is_expired AND v_submission.status <> 'deleted' THEN 'expired' ELSE v_submission.status END,
      'retry_note', v_submission.retry_note,
      'view_session_status', v_submission.view_session_status,
      'is_winner', v_is_winner,
      'is_loser', v_is_loser,
      'can_view', v_can_view,
      'is_expired', v_is_expired,
      'created_at', v_submission.created_at,
      'expires_at', v_submission.expires_at,
      'duration_seconds', v_submission.duration_seconds
    )
  );
END;
$$;

-- ── 14. RPC: cleanup_expired_stories ─────────────────────────────────────────
-- Finds submissions where expires_at has passed and media hasn't been confirmed deleted.
-- Returns list of storage paths to delete. Failed deletions remain eligible for retry!
-- Preserves challenge records, match records, and submission history in the database.

CREATE OR REPLACE FUNCTION public.cleanup_expired_stories(p_batch_size INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_limit INT := LEAST(GREATEST(COALESCE(p_batch_size, 50), 1), 200);
  v_paths       JSONB;
BEGIN
  -- Mark unreviewed submitted submissions as expired if expires_at <= NOW()
  -- (Preserves completed/approved challenge history while expiring pending reviews)
  UPDATE public.challenge_submissions
  SET status = 'expired',
      updated_at = NOW()
  WHERE expires_at <= NOW()
    AND status = 'submitted';

  -- Simulated paths in local testing don't exist in Supabase storage; mark media purged directly
  UPDATE public.challenge_submissions
  SET media_deleted_at = NOW(),
      deleted_at = COALESCE(deleted_at, NOW()),
      updated_at = NOW()
  WHERE (expires_at <= NOW() OR status IN ('expired', 'deleted'))
    AND media_deleted_at IS NULL
    AND storage_path LIKE 'simulated/%';

  -- Collect paths that need storage deletion (expired or deleted, but media not yet purged)
  SELECT COALESCE(jsonb_agg(storage_path), '[]'::jsonb)
  INTO v_paths
  FROM (
    SELECT DISTINCT storage_path
    FROM public.challenge_submissions
    WHERE (expires_at <= NOW() OR status IN ('expired', 'deleted'))
      AND media_deleted_at IS NULL
      AND storage_path IS NOT NULL
      AND storage_path NOT LIKE 'simulated/%'
    ORDER BY storage_path
    LIMIT v_batch_limit
  ) s;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'expired_paths', v_paths
  );
END;
$$;

-- ── 15. RPC: confirm_story_media_deleted ──────────────────────────────────────
-- Called by cleanup worker ONLY AFTER Supabase Storage has confirmed file deletion.
-- Ensures that if Storage deletion fails, files remain eligible for retry on next run.

CREATE OR REPLACE FUNCTION public.confirm_story_media_deleted(p_storage_paths TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  IF p_storage_paths IS NULL OR array_length(p_storage_paths, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', TRUE, 'purged_count', 0);
  END IF;

  UPDATE public.challenge_submissions
  SET media_deleted_at = NOW(),
      deleted_at = COALESCE(deleted_at, NOW()),
      updated_at = NOW()
  WHERE storage_path = ANY(p_storage_paths)
    AND media_deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'purged_count', v_count
  );
END;
$$;

-- ── 16. Realtime Replica Identity ────────────────────────────────────────────

ALTER TABLE public.challenge_submissions REPLICA IDENTITY FULL;

-- ── 17. Permissions ──────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.submit_challenge_video(UUID, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_story_visibility(UUID, TEXT)                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_challenge_story(UUID)                            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_winner_review_session(UUID)                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ack_playback_start(UUID, UUID)                          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finish_winner_review_session(UUID, UUID)                 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_challenge_submission(UUID, TEXT, TEXT)           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_challenge_story(UUID)                               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_stories(INT)                            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_story_media_deleted(TEXT[])                      FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_challenge_video(UUID, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_story_visibility(UUID, TEXT)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_challenge_story(UUID)                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_winner_review_session(UUID)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.ack_playback_start(UUID, UUID)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_winner_review_session(UUID, UUID)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_challenge_submission(UUID, TEXT, TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_challenge_story(UUID)                               TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_stories(INT)                            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_story_media_deleted(TEXT[])                      TO authenticated, service_role;

-- Helper functions required for RLS policy evaluation
GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID)                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked(UUID, UUID)                                   TO authenticated, anon;

-- ── End of migration 0009_challenge_submissions_and_stories.sql ──────────────
