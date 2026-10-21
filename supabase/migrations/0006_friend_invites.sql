-- =============================================================================
-- Migration: 0006_friend_invites.sql
-- Project:   Evoora — JE Labs
-- Purpose:   Secure, user-specific invitation links for friend onboarding:
--            - friend_invites table with cryptographically random tokens
--            - Expiry and active state tracking
--            - RLS policies preventing token enumeration
--            - get_or_create_friend_invite() RPC
--            - rotate_friend_invite() RPC
--            - resolve_friend_invite() RPC (safe public profile resolution)
--            - accept_friend_invite() RPC (atomic friend request initiation)
-- =============================================================================

-- ── 1. friend_invites table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.friend_invites (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID           NOT NULL
                             REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       TEXT           NOT NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ    NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  is_active   BOOLEAN        NOT NULL DEFAULT TRUE,

  CONSTRAINT unique_friend_invite_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS friend_invites_user_idx
  ON public.friend_invites (user_id);

CREATE INDEX IF NOT EXISTS friend_invites_token_idx
  ON public.friend_invites (token)
  WHERE is_active = TRUE;

-- ── 2. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;

-- Users can only view their own invites
DROP POLICY IF EXISTS "fi_select_own" ON public.friend_invites;
CREATE POLICY "fi_select_own"
  ON public.friend_invites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Direct client modifications are blocked; all actions go through SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "fi_insert" ON public.friend_invites;
CREATE POLICY "fi_insert"
  ON public.friend_invites
  FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "fi_update" ON public.friend_invites;
CREATE POLICY "fi_update"
  ON public.friend_invites
  FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "fi_delete" ON public.friend_invites;
CREATE POLICY "fi_delete"
  ON public.friend_invites
  FOR DELETE
  USING (FALSE);

-- ── 3. get_or_create_friend_invite() ──────────────────────────────────────────
-- Returns the caller's active invite token or generates a new one.

CREATE OR REPLACE FUNCTION public.get_or_create_friend_invite()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_token      TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated', 'message', 'You must be logged in.');
  END IF;

  -- Check for existing active, unexpired invite
  SELECT fi.token, fi.expires_at INTO v_token, v_expires_at
  FROM public.friend_invites fi
  WHERE fi.user_id = v_caller
    AND fi.is_active = TRUE
    AND fi.expires_at > NOW()
  ORDER BY fi.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'token', v_token,
      'expires_at', v_expires_at
    );
  END IF;

  -- Generate unguessable 32-character hex token (128-bit cryptographically secure randomness)
  v_token := encode(gen_random_bytes(16), 'hex');
  v_expires_at := NOW() + INTERVAL '30 days';

  INSERT INTO public.friend_invites (user_id, token, expires_at, is_active)
  VALUES (v_caller, v_token, v_expires_at, TRUE);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$$;

-- ── 4. rotate_friend_invite() ─────────────────────────────────────────────────
-- Deactivates all previous tokens and creates a new one.

CREATE OR REPLACE FUNCTION public.rotate_friend_invite()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_token      TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated', 'message', 'You must be logged in.');
  END IF;

  -- Deactivate previous tokens
  UPDATE public.friend_invites
  SET is_active = FALSE
  WHERE user_id = v_caller;

  -- Generate new token
  v_token := encode(gen_random_bytes(16), 'hex');
  v_expires_at := NOW() + INTERVAL '30 days';

  INSERT INTO public.friend_invites (user_id, token, expires_at, is_active)
  VALUES (v_caller, v_token, v_expires_at, TRUE);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$$;

-- ── 5. resolve_friend_invite(p_token) ─────────────────────────────────────────
-- Resolves an invitation token. Accessible to both anon and authenticated users.
-- Returns inviter's public profile and the relationship to the caller.
-- Never exposes internal user UUIDs.

CREATE OR REPLACE FUNCTION public.resolve_friend_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_clean_token  TEXT := lower(trim(p_token));
  v_inviter_id   UUID;
  v_expires_at   TIMESTAMPTZ;
  v_is_active    BOOLEAN;
  v_display_name TEXT;
  v_avatar_url   TEXT;
  v_evoora_id    TEXT;
  v_relationship TEXT := 'unauthenticated';
  v_fr_status    TEXT;
BEGIN
  IF v_clean_token IS NULL OR length(v_clean_token) < 16 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_token', 'message', 'Invalid invite token.');
  END IF;

  SELECT fi.user_id, fi.expires_at, fi.is_active,
         p.display_name, p.avatar_url, p.evoora_id
  INTO v_inviter_id, v_expires_at, v_is_active,
       v_display_name, v_avatar_url, v_evoora_id
  FROM public.friend_invites fi
  JOIN public.profiles p ON p.id = fi.user_id
  WHERE fi.token = v_clean_token;

  IF NOT FOUND OR NOT v_is_active OR v_expires_at <= NOW() THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_or_expired', 'message', 'This invite link is invalid or has expired.');
  END IF;

  IF v_caller IS NULL THEN
    v_relationship := 'unauthenticated';
  ELSIF v_caller = v_inviter_id THEN
    v_relationship := 'self';
  ELSIF public.is_blocked(v_caller, v_inviter_id) THEN
    v_relationship := 'blocked';
  ELSE
    -- Check relationship in friend_requests
    SELECT status INTO v_fr_status
    FROM public.friend_requests
    WHERE LEAST(sender_id, receiver_id) = LEAST(v_caller, v_inviter_id)
      AND GREATEST(sender_id, receiver_id) = GREATEST(v_caller, v_inviter_id);

    IF FOUND THEN
      IF v_fr_status = 'accepted' THEN
        v_relationship := 'already_friends';
      ELSIF v_fr_status = 'pending' THEN
        v_relationship := 'request_pending';
      ELSE
        v_relationship := 'can_send';
      END IF;
    ELSE
      v_relationship := 'can_send';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'relationship', v_relationship,
    'inviter', jsonb_build_object(
      'display_name', v_display_name,
      'avatar_url', v_avatar_url,
      'evoora_id', v_evoora_id
    )
  );
END;
$$;

-- ── 6. accept_friend_invite(p_token) ──────────────────────────────────────────
-- Authenticated caller sends a friend request to the inviter.
-- Reuses existing friend request architecture and block validation.
-- Does not automatically create friendship; sets status to 'pending'.

CREATE OR REPLACE FUNCTION public.accept_friend_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_clean_token  TEXT := lower(trim(p_token));
  v_inviter_id   UUID;
  v_expires_at   TIMESTAMPTZ;
  v_is_active    BOOLEAN;
  v_existing     RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated', 'message', 'You must be logged in.');
  END IF;

  IF v_clean_token IS NULL OR length(v_clean_token) < 16 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_token', 'message', 'Invalid invite token.');
  END IF;

  SELECT fi.user_id, fi.expires_at, fi.is_active
  INTO v_inviter_id, v_expires_at, v_is_active
  FROM public.friend_invites fi
  WHERE fi.token = v_clean_token;

  IF NOT FOUND OR NOT v_is_active OR v_expires_at <= NOW() THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_or_expired', 'message', 'This invite link is invalid or has expired.');
  END IF;

  IF v_caller = v_inviter_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'self_request', 'message', 'You cannot send a friend request to yourself.');
  END IF;

  IF public.is_blocked(v_caller, v_inviter_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked', 'message', 'Cannot connect with this user.');
  END IF;

  -- Check existing friend request row
  SELECT * INTO v_existing
  FROM public.friend_requests
  WHERE LEAST(sender_id, receiver_id) = LEAST(v_caller, v_inviter_id)
    AND GREATEST(sender_id, receiver_id) = GREATEST(v_caller, v_inviter_id);

  IF FOUND THEN
    IF v_existing.status = 'accepted' THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'already_friends', 'message', 'You are already friends with this user.');
    END IF;

    IF v_existing.status = 'pending' THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'request_pending', 'message', 'A friend request is already pending.');
    END IF;

    -- If rejected or cancelled, revive request to pending
    UPDATE public.friend_requests
    SET sender_id = v_caller,
        receiver_id = v_inviter_id,
        status = 'pending',
        updated_at = NOW()
    WHERE id = v_existing.id;

    RETURN jsonb_build_object('ok', TRUE, 'code', 'sent', 'message', 'Friend request sent.');
  END IF;

  -- Insert fresh pending request
  INSERT INTO public.friend_requests (sender_id, receiver_id, status)
  VALUES (v_caller, v_inviter_id, 'pending');

  RETURN jsonb_build_object('ok', TRUE, 'code', 'sent', 'message', 'Friend request sent.');

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'request_pending', 'message', 'A friend request is already pending.');
END;
$$;

-- ── 7. Permissions ───────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_or_create_friend_invite() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rotate_friend_invite()        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_friend_invite(TEXT)   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_friend_invite(TEXT)    FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_or_create_friend_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_friend_invite()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_invite(TEXT)    TO authenticated;

-- resolve_friend_invite is safe for both public visitors and authenticated members
GRANT EXECUTE ON FUNCTION public.resolve_friend_invite(TEXT)   TO anon, authenticated;
GRANT SELECT ON public.friend_invites                          TO authenticated;
