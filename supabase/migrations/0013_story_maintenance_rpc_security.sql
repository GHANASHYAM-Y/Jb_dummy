-- =============================================================================
-- Migration: 0013_story_maintenance_rpc_security.sql
-- Project:   EVOAIQU — JE Labs
-- Purpose:   Harden Challenge Story Maintenance RPCs:
--            1. Revoke all EXECUTE permissions from 'anon', 'PUBLIC', and
--               'authenticated' on cleanup_expired_stories and
--               confirm_story_media_deleted.
--            2. Restrict execution strictly to 'service_role' (the trusted backend
--               cron runner and maintenance processes).
--            3. Add independent server-role authorization checks in PL/pgSQL
--               to prevent direct PostgREST invocation even if grants change.
--            4. Ensure confirm_story_media_deleted validates eligibility: only
--               submissions that are expired or already marked deleted can have
--               media purged, preventing arbitrary deletion of active stories.
--            5. Configure safe search_path = public, pg_catalog across both RPCs.
-- =============================================================================

-- ── 1. cleanup_expired_stories() ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_expired_stories(p_batch_size INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_batch_limit INT := LEAST(GREATEST(COALESCE(p_batch_size, 50), 1), 200);
  v_paths       JSONB;
BEGIN
  -- Strict defense-in-depth: only service_role (trusted server/cron) can run maintenance cleanup
  IF COALESCE(auth.role(), '') <> 'service_role' AND (auth.role() IS NOT NULL OR SESSION_USER NOT LIKE 'postgres%') THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'forbidden',
      'message', 'This maintenance function can only be executed by the authoritative server (service_role).'
    );
  END IF;

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

-- ── 2. confirm_story_media_deleted() ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.confirm_story_media_deleted(p_storage_paths TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  -- Strict defense-in-depth: only service_role can confirm storage media deletions
  IF COALESCE(auth.role(), '') <> 'service_role' AND (auth.role() IS NOT NULL OR SESSION_USER NOT LIKE 'postgres%') THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'forbidden',
      'message', 'This maintenance function can only be executed by the authoritative server (service_role).'
    );
  END IF;

  IF p_storage_paths IS NULL OR array_length(p_storage_paths, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', TRUE, 'purged_count', 0);
  END IF;

  -- Authoritative verification: Only submissions that are expired OR already marked deleted
  -- are eligible to have media confirmed as deleted. Active, unexpired stories can NEVER be purged.
  UPDATE public.challenge_submissions
  SET media_deleted_at = NOW(),
      deleted_at = COALESCE(deleted_at, NOW()),
      updated_at = NOW()
  WHERE storage_path = ANY(p_storage_paths)
    AND media_deleted_at IS NULL
    AND (expires_at <= NOW() OR status IN ('expired', 'deleted') OR deleted_at IS NOT NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'purged_count', v_count
  );
END;
$$;

-- ── 3. Role Permissions & Grant Hardening ────────────────────────────────────

-- Revoke all execution permissions from 'PUBLIC', 'anon', and 'authenticated'
REVOKE ALL ON FUNCTION public.cleanup_expired_stories(INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_story_media_deleted(TEXT[]) FROM PUBLIC, anon, authenticated;

-- Strictly grant execution ONLY to 'service_role'
GRANT EXECUTE ON FUNCTION public.cleanup_expired_stories(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_story_media_deleted(TEXT[]) TO service_role;

-- ── End of migration 0013_story_maintenance_rpc_security.sql ────────────────
