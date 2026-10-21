-- =============================================================================
-- Migration: 0002_friends.sql
-- Project:   Evoora — JE Labs
-- Purpose:   Friend-request system: table, DB functions (send / accept /
--            reject / cancel / remove), RLS policies, and indexes.
--
-- Design decisions:
--  - Two-column (sender_id, receiver_id) model with a UNIQUE constraint
--    across the normalised pair (min, max) to prevent duplicate requests
--    in either direction.
--  - Only one pending row can exist per pair at any time.
--  - Accepted friendships are symmetrically queryable from either side.
--  - All state transitions go through SECURITY DEFINER functions that
--    validate ownership server-side — clients cannot forge transitions.
--  - RLS is kept lean: SELECT is opened to the two participants only;
--    INSERT/UPDATE/DELETE are all blocked for direct client operations.
--
-- Apply with:
--   supabase db push            (local dev via Supabase CLI)
--   Or paste into Supabase SQL editor and run as the postgres role.
-- =============================================================================

-- ── 1. friend_requests table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who initiated the request.
  sender_id     UUID        NOT NULL
                            REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- The user who received the request.
  receiver_id   UUID        NOT NULL
                            REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Lifecycle status.
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent self-friendship.
  CONSTRAINT no_self_friend CHECK (sender_id <> receiver_id)
);

-- ── 2. updated_at trigger ──────────────────────────────────────────────────

-- Reuse the existing set_updated_at function (created in 0001_profiles.sql).
-- The function is already defined; we just attach a new trigger.
DROP TRIGGER IF EXISTS friend_requests_set_updated_at ON public.friend_requests;
CREATE TRIGGER friend_requests_set_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Indexes ────────────────────────────────────────────────────────────

-- Prevent duplicate or bidirectional duplicate requests.
-- We normalise so that lesser(a,b) is always "left" and greater(a,b) is "right".
-- This means (A→B) and (B→A) cannot coexist.
-- In PostgreSQL, functional expressions like LEAST/GREATEST must be defined via
-- CREATE UNIQUE INDEX rather than a table-level CONSTRAINT.
CREATE UNIQUE INDEX IF NOT EXISTS unique_friend_pair
  ON public.friend_requests (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id)
  );

-- Fast lookups of all requests involving a user (incoming + outgoing).
CREATE INDEX IF NOT EXISTS friend_requests_sender_idx
  ON public.friend_requests (sender_id, status);

CREATE INDEX IF NOT EXISTS friend_requests_receiver_idx
  ON public.friend_requests (receiver_id, status);

-- ── 4. Row Level Security ─────────────────────────────────────────────────

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Only the two participants can see a request row.
DROP POLICY IF EXISTS "fr_select" ON public.friend_requests;
CREATE POLICY "fr_select"
  ON public.friend_requests
  FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
  );

-- All mutations (INSERT / UPDATE / DELETE) go through SECURITY DEFINER
-- functions. Direct client writes are denied.
DROP POLICY IF EXISTS "fr_insert" ON public.friend_requests;
CREATE POLICY "fr_insert"
  ON public.friend_requests
  FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "fr_update" ON public.friend_requests;
CREATE POLICY "fr_update"
  ON public.friend_requests
  FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "fr_delete" ON public.friend_requests;
CREATE POLICY "fr_delete"
  ON public.friend_requests
  FOR DELETE
  USING (FALSE);

-- ── 5. send_friend_request(target_evoora_id) ─────────────────────────────
--
-- Called by the authenticated user to send a request to another user
-- identified by their public Evoora ID (not their UUID — avoids UUID guessing).
--
-- Returns a result JSON with {ok, code, message}.
-- Codes: sent | already_friends | request_pending | self_request | not_found

CREATE OR REPLACE FUNCTION public.send_friend_request(p_target_evoora_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_target_id   UUID;
  v_existing    RECORD;
BEGIN
  -- Caller must be authenticated.
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'You must be logged in.');
  END IF;

  -- Resolve target Evoora ID → UUID.
  SELECT id INTO v_target_id
  FROM public.profiles
  WHERE evoora_id = upper(trim(p_target_evoora_id));

  IF v_target_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found',
      'message', 'No user found with that Evoora ID.');
  END IF;

  -- Prevent self-request.
  IF v_caller_id = v_target_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'self_request',
      'message', 'You cannot send a friend request to yourself.');
  END IF;

  -- Check for any existing row between this pair.
  SELECT * INTO v_existing
  FROM public.friend_requests
  WHERE LEAST(sender_id, receiver_id)    = LEAST(v_caller_id, v_target_id)
    AND GREATEST(sender_id, receiver_id) = GREATEST(v_caller_id, v_target_id);

  IF FOUND THEN
    IF v_existing.status = 'accepted' THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'already_friends',
        'message', 'You are already friends with this user.');
    END IF;

    IF v_existing.status = 'pending' THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'request_pending',
        'message', 'A friend request is already pending between you two.');
    END IF;

    -- Status is 'rejected' or 'cancelled' — allow re-sending by updating.
    UPDATE public.friend_requests
    SET sender_id = v_caller_id,
        receiver_id = v_target_id,
        status = 'pending',
        updated_at = NOW()
    WHERE id = v_existing.id;

    RETURN jsonb_build_object('ok', TRUE, 'code', 'sent',
      'message', 'Friend request sent.');
  END IF;

  -- Insert a fresh request.
  INSERT INTO public.friend_requests (sender_id, receiver_id, status)
  VALUES (v_caller_id, v_target_id, 'pending');

  RETURN jsonb_build_object('ok', TRUE, 'code', 'sent',
    'message', 'Friend request sent.');

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'request_pending',
      'message', 'A friend request is already pending between you two.');
END;
$$;

-- ── 6. respond_friend_request(request_id, action) ────────────────────────
--
-- Allows the RECEIVER of a pending request to accept or reject it.
-- The caller is verified server-side: only the actual receiver can act.
-- action: 'accept' | 'reject'

CREATE OR REPLACE FUNCTION public.respond_friend_request(
  p_request_id UUID,
  p_action     TEXT   -- 'accept' | 'reject'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_req       RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'You must be logged in.');
  END IF;

  IF p_action NOT IN ('accept', 'reject') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_action',
      'message', 'Action must be accept or reject.');
  END IF;

  -- Fetch the request.
  SELECT * INTO v_req
  FROM public.friend_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found',
      'message', 'Request not found.');
  END IF;

  -- Only the receiver can respond.
  IF v_req.receiver_id <> v_caller_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden',
      'message', 'You are not the recipient of this request.');
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_pending',
      'message', 'This request is no longer pending.');
  END IF;

  UPDATE public.friend_requests
  SET status = CASE p_action WHEN 'accept' THEN 'accepted' ELSE 'rejected' END,
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', p_action || 'ed',
    'message', 'Request ' || p_action || 'ed.');
END;
$$;

-- ── 7. cancel_friend_request(request_id) ─────────────────────────────────
--
-- Allows the SENDER to cancel their own pending request.

CREATE OR REPLACE FUNCTION public.cancel_friend_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_req       RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'You must be logged in.');
  END IF;

  SELECT * INTO v_req
  FROM public.friend_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found',
      'message', 'Request not found.');
  END IF;

  -- Only the sender can cancel.
  IF v_req.sender_id <> v_caller_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden',
      'message', 'You did not send this request.');
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_pending',
      'message', 'This request is no longer pending.');
  END IF;

  UPDATE public.friend_requests
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'cancelled',
    'message', 'Request cancelled.');
END;
$$;

-- ── 8. remove_friend(friend_profile_id) ──────────────────────────────────
--
-- Removes an accepted friendship. Either participant can remove.
-- Uses profile UUID (not Evoora ID) since the UI already has the ID.

CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_rows      INT;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'You must be logged in.');
  END IF;

  IF v_caller_id = p_friend_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'self_request',
      'message', 'Invalid operation.');
  END IF;

  DELETE FROM public.friend_requests
  WHERE LEAST(sender_id, receiver_id)    = LEAST(v_caller_id, p_friend_id)
    AND GREATEST(sender_id, receiver_id) = GREATEST(v_caller_id, p_friend_id)
    AND status = 'accepted';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_friends',
      'message', 'You are not friends with this user.');
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'removed',
    'message', 'Friend removed.');
END;
$$;

-- ── 9. get_friends() ──────────────────────────────────────────────────────
--
-- Returns accepted friends with their profile data.
-- Returns TABLE to allow Supabase client to type the response.

CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS TABLE (
  request_id   UUID,
  friend_id    UUID,
  evoora_id    TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  is_public    BOOLEAN,
  since        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    fr.id                                                         AS request_id,
    CASE WHEN fr.sender_id = v_caller_id THEN fr.receiver_id
         ELSE fr.sender_id END                                    AS friend_id,
    p.evoora_id,
    p.display_name,
    p.avatar_url,
    p.is_public,
    fr.updated_at                                                 AS since
  FROM public.friend_requests fr
  JOIN public.profiles p ON p.id = CASE
      WHEN fr.sender_id = v_caller_id THEN fr.receiver_id
      ELSE fr.sender_id
    END
  WHERE (fr.sender_id = v_caller_id OR fr.receiver_id = v_caller_id)
    AND fr.status = 'accepted';
END;
$$;

-- ── 10. Revoke direct function execution from unprivileged roles ──────────

REVOKE EXECUTE ON FUNCTION public.send_friend_request(TEXT)       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.respond_friend_request(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_friend_request(UUID)     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_friend(UUID)             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_friends()                   FROM PUBLIC;

-- Grant only to authenticated role so anon cannot call them.
GRANT EXECUTE ON FUNCTION public.send_friend_request(TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_friend_request(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(UUID)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends()                    TO authenticated;

-- Grant SELECT on friend_requests to authenticated (RLS further restricts).
GRANT SELECT ON public.friend_requests TO authenticated;

-- ── End of migration ───────────────────────────────────────────────────────
