-- =============================================================================
-- Migration: 0005_matchmaking.sql
-- Project:   Evoora — JE Labs
-- Purpose:   Secure random matchmaking for Rock, Paper, Scissors with:
--            - User blocks table & bidirectional exclusion check
--            - Persistent matchmaking queue table & partial unique active constraints
--            - Atomic concurrency control via SELECT ... FOR UPDATE SKIP LOCKED
--            - Fair randomized pairing & self-matching prevention
--            - Active-match participation checks
--            - Refresh recovery & stale queue expiration
--            - Least privilege grants and RLS policies
--            - Idempotent Realtime publication
-- =============================================================================

-- ── 1. user_blocks table ──────────────────────────────────────────────────────
-- Minimal, secure blocking and unmatch-prevention mechanism.
-- Prevents blocked users from ever being paired in random matchmaking.

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID           NOT NULL
                             REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  UUID           NOT NULL
                             REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id),
  CONSTRAINT unique_user_block UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks (blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Blockers can only view their own outgoing blocks.
DROP POLICY IF EXISTS "ub_select" ON public.user_blocks;
CREATE POLICY "ub_select"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

-- Direct client mutations are blocked. Mutations occur through RPCs.
DROP POLICY IF EXISTS "ub_insert" ON public.user_blocks;
CREATE POLICY "ub_insert" ON public.user_blocks FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "ub_update" ON public.user_blocks;
CREATE POLICY "ub_update" ON public.user_blocks FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "ub_delete" ON public.user_blocks;
CREATE POLICY "ub_delete" ON public.user_blocks FOR DELETE USING (FALSE);

-- ── 2. is_blocked() helper ────────────────────────────────────────────────────
-- Returns TRUE if user_a has blocked user_b OR user_b has blocked user_a.

CREATE OR REPLACE FUNCTION public.is_blocked(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
       OR (blocker_id = p_user_b AND blocked_id = p_user_a)
  );
$$;

-- ── 3. block_user(), unblock_user(), and get_blocked_users() RPCs ─────────────

CREATE OR REPLACE FUNCTION public.block_user(p_blocked_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;
  IF p_blocked_id IS NULL OR v_caller = p_blocked_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_user',
      'message', 'Cannot block yourself or an invalid user.');
  END IF;

  -- Verify target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_blocked_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'user_not_found',
      'message', 'User to block not found.');
  END IF;

  -- Acquire pair advisory lock in canonical order to prevent deadlocks and race conditions with matchmaking
  PERFORM pg_advisory_xact_lock(hashtext('user_pair_' || LEAST(v_caller::text, p_blocked_id::text) || '_' || GREATEST(v_caller::text, p_blocked_id::text)));

  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (v_caller, p_blocked_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Clean up pending game invites between them
  UPDATE public.game_invites
  SET status = 'cancelled', updated_at = NOW()
  WHERE status = 'pending'
    AND ((inviter_id = v_caller AND invitee_id = p_blocked_id)
      OR (inviter_id = p_blocked_id AND invitee_id = v_caller));

  -- Clean up pending friend requests between them
  UPDATE public.friend_requests
  SET status = 'rejected', updated_at = NOW()
  WHERE status = 'pending'
    AND ((sender_id = v_caller AND receiver_id = p_blocked_id)
      OR (sender_id = p_blocked_id AND receiver_id = v_caller));

  RETURN jsonb_build_object('ok', TRUE, 'code', 'blocked');
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(p_blocked_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  -- Acquire pair advisory lock in canonical order
  PERFORM pg_advisory_xact_lock(hashtext('user_pair_' || LEAST(v_caller::text, p_blocked_id::text) || '_' || GREATEST(v_caller::text, p_blocked_id::text)));

  DELETE FROM public.user_blocks
  WHERE blocker_id = v_caller AND blocked_id = p_blocked_id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'unblocked');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'blocked_id',   p.id,
      'display_name', p.display_name,
      'evoora_id',    p.evoora_id,
      'avatar_url',   p.avatar_url,
      'blocked_at',   ub.created_at
    ) AS item
    FROM public.user_blocks ub
    JOIN public.profiles p ON p.id = ub.blocked_id
    WHERE ub.blocker_id = v_caller
    ORDER BY ub.created_at DESC
    LIMIT 50
  ) sub;

  RETURN jsonb_build_object('ok', TRUE, 'blocked_users', v_result);
END;
$$;

-- ── 4. matchmaking_queue table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID           NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type     TEXT           NOT NULL DEFAULT 'rps'
                               CHECK (game_type IN ('rps')),
  status        TEXT           NOT NULL DEFAULT 'searching'
                               CHECK (status IN ('searching', 'matched', 'cancelled', 'expired')),
  match_id      UUID           NULL
                               REFERENCES public.matches(id) ON DELETE SET NULL,
  matched_with  UUID           NULL
                               REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ    NOT NULL DEFAULT (NOW() + INTERVAL '2 minutes'),

  CONSTRAINT no_self_matched CHECK (user_id <> matched_with)
);

-- At most one active 'searching' entry per user per game_type:
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_queue_per_user
  ON public.matchmaking_queue (user_id, game_type)
  WHERE status = 'searching';

CREATE INDEX IF NOT EXISTS mm_queue_search_idx
  ON public.matchmaking_queue (game_type, status, created_at)
  WHERE status = 'searching';

CREATE INDEX IF NOT EXISTS mm_queue_user_idx
  ON public.matchmaking_queue (user_id, status);

DROP TRIGGER IF EXISTS matchmaking_queue_set_updated_at ON public.matchmaking_queue;
CREATE TRIGGER matchmaking_queue_set_updated_at
  BEFORE UPDATE ON public.matchmaking_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Privacy: Users can only see their own queue entries.
DROP POLICY IF EXISTS "mm_select" ON public.matchmaking_queue;
CREATE POLICY "mm_select"
  ON public.matchmaking_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Direct client mutations are forbidden; all runs via vetted RPCs.
DROP POLICY IF EXISTS "mm_insert" ON public.matchmaking_queue;
CREATE POLICY "mm_insert" ON public.matchmaking_queue FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "mm_update" ON public.matchmaking_queue;
CREATE POLICY "mm_update" ON public.matchmaking_queue FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "mm_delete" ON public.matchmaking_queue;
CREATE POLICY "mm_delete" ON public.matchmaking_queue FOR DELETE USING (FALSE);

-- ── 5. join_matchmaking() RPC ─────────────────────────────────────────────────
--
-- Atomically either:
--   1) Finds an existing eligible searching candidate, pairs both users, and creates a match.
--   2) Or registers the caller in the queue with status 'searching'.
--
-- Uses SELECT ... FOR UPDATE SKIP LOCKED to prevent double-matching and race conditions.

CREATE OR REPLACE FUNCTION public.join_matchmaking(p_game_type TEXT DEFAULT 'rps')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_candidate     RECORD;
  v_match_id      UUID;
  v_my_queue_id   UUID;
  v_p1            UUID;
  v_p2            UUID;
  v_active_match  RECORD;
  v_existing_q    RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'Must be logged in to join matchmaking.');
  END IF;

  -- Validate game_type strictly
  IF p_game_type IS NULL OR p_game_type <> 'rps' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_game_type',
      'message', 'Matchmaking is only available for Rock, Paper, Scissors.');
  END IF;

  -- Reliable per-user transaction-level lock to prevent concurrent active matches or duplicate entries
  PERFORM pg_advisory_xact_lock(hashtext('matchmaking_' || v_caller::text));

  -- 1. Check if caller already has a recent 'matched' queue entry (refresh recovery)
  SELECT * INTO v_existing_q
  FROM public.matchmaking_queue
  WHERE user_id = v_caller
    AND game_type = p_game_type
    AND status = 'matched'
    AND updated_at > NOW() - INTERVAL '3 minutes'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF FOUND AND v_existing_q.match_id IS NOT NULL THEN
    -- Verify the match is still active
    IF EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = v_existing_q.match_id AND phase = 'active'
    ) THEN
      RETURN jsonb_build_object(
        'ok', TRUE,
        'code', 'matched',
        'match_id', v_existing_q.match_id,
        'queue_id', v_existing_q.id
      );
    END IF;
  END IF;

  -- 2. Check if caller is already participating in an active match
  SELECT id INTO v_active_match
  FROM public.matches
  WHERE (player1_id = v_caller OR player2_id = v_caller)
    AND game_type = p_game_type
    AND phase = 'active'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'already_in_match',
      'message', 'You already have an active match in progress.',
      'match_id', v_active_match.id
    );
  END IF;

  -- 3. Rate limiting safeguard: prevent rapid join/cancel thrashing
  IF EXISTS (
    SELECT 1 FROM public.matchmaking_queue
    WHERE user_id = v_caller
      AND game_type = p_game_type
      AND status = 'cancelled'
      AND updated_at > NOW() - INTERVAL '2 seconds'
  ) THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'code', 'rate_limited',
      'message', 'Please wait a moment before rejoining the queue.'
    );
  END IF;

  -- 4. Clean up any stale searching entries for this user
  UPDATE public.matchmaking_queue
  SET status = 'expired', updated_at = NOW()
  WHERE user_id = v_caller
    AND game_type = p_game_type
    AND status = 'searching'
    AND expires_at < NOW();

  -- 5. Lock an eligible waiting candidate atomically
  -- - Not caller
  -- - Still searching and unexpired
  -- - Neither user has blocked the other
  -- - Candidate is not already in an active match
  -- - ORDER BY RANDOM() to ensure fair/randomized pairing (prevent queue sniping)
  -- - FOR UPDATE SKIP LOCKED ensures concurrent workers never pair the same candidate
  SELECT * INTO v_candidate
  FROM public.matchmaking_queue q
  WHERE q.game_type = p_game_type
    AND q.status = 'searching'
    AND q.user_id <> v_caller
    AND q.expires_at > NOW()
    AND NOT public.is_blocked(v_caller, q.user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE (m.player1_id = q.user_id OR m.player2_id = q.user_id)
        AND m.game_type = p_game_type
        AND m.phase = 'active'
    )
  ORDER BY RANDOM()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- 6. If candidate found, create match atomically
  IF FOUND THEN
    -- Acquire canonical pair lock to serialize with concurrent block_user operations
    PERFORM pg_advisory_xact_lock(hashtext('user_pair_' || LEAST(v_caller::text, v_candidate.user_id::text) || '_' || GREATEST(v_caller::text, v_candidate.user_id::text)));

    -- Double-check: re-verify neither user has blocked the other after acquiring the pair lock
    IF public.is_blocked(v_caller, v_candidate.user_id) THEN
      -- Candidate was blocked concurrently; abort pairing and fall through to adding caller to queue as searching
      v_candidate := NULL;
    ELSE
      -- Fairly randomize who is player1 vs player2
      IF random() < 0.5 THEN
        v_p1 := v_caller;
        v_p2 := v_candidate.user_id;
      ELSE
        v_p1 := v_candidate.user_id;
        v_p2 := v_caller;
      END IF;

      -- Create exactly one match record
      INSERT INTO public.matches (game_type, player1_id, player2_id, phase)
      VALUES (p_game_type, v_p1, v_p2, 'active')
      RETURNING id INTO v_match_id;

    -- Update candidate queue entry
    UPDATE public.matchmaking_queue
    SET status = 'matched',
        match_id = v_match_id,
        matched_with = v_caller,
        updated_at = NOW()
    WHERE id = v_candidate.id;

    -- Atomically transition caller's existing searching entry to matched, if present
    UPDATE public.matchmaking_queue
    SET status = 'matched',
        match_id = v_match_id,
        matched_with = v_candidate.user_id,
        expires_at = NOW() + INTERVAL '5 minutes',
        updated_at = NOW()
    WHERE user_id = v_caller
      AND game_type = p_game_type
      AND status = 'searching'
    RETURNING id INTO v_my_queue_id;

    -- If caller did not have an existing searching entry, insert a new matched record
    IF v_my_queue_id IS NULL THEN
      INSERT INTO public.matchmaking_queue (
        user_id,
        game_type,
        status,
        match_id,
        matched_with,
        expires_at
      ) VALUES (
        v_caller,
        p_game_type,
        'matched',
        v_match_id,
        v_candidate.user_id,
        NOW() + INTERVAL '5 minutes'
      )
      RETURNING id INTO v_my_queue_id;
    END IF;

      RETURN jsonb_build_object(
        'ok', TRUE,
        'code', 'matched',
        'match_id', v_match_id,
        'queue_id', v_my_queue_id
      );
    END IF;
  END IF;

  -- 7. No candidate found: add caller to queue as searching
  INSERT INTO public.matchmaking_queue (
    user_id,
    game_type,
    status,
    expires_at
  ) VALUES (
    v_caller,
    p_game_type,
    'searching',
    NOW() + INTERVAL '2 minutes'
  )
  ON CONFLICT (user_id, game_type) WHERE status = 'searching'
  DO UPDATE SET
    expires_at = NOW() + INTERVAL '2 minutes',
    updated_at = NOW()
  RETURNING id INTO v_my_queue_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'code', 'searching',
    'queue_id', v_my_queue_id
  );
END;
$$;

-- ── 6. get_matchmaking_status() RPC ───────────────────────────────────────────
-- Returns the caller's current status:
--   - 'in_active_match' + match_id
--   - 'matched' + match_id
--   - 'searching' + created_at + expires_at
--   - 'expired'
--   - 'idle'

CREATE OR REPLACE FUNCTION public.get_matchmaking_status(p_game_type TEXT DEFAULT 'rps')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        UUID := auth.uid();
  v_active_match  RECORD;
  v_queue         RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  IF p_game_type IS NULL OR p_game_type <> 'rps' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_game_type');
  END IF;

  -- Check if caller is already in an active match
  SELECT id INTO v_active_match
  FROM public.matches
  WHERE (player1_id = v_caller OR player2_id = v_caller)
    AND game_type = p_game_type
    AND phase = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'status', 'in_active_match',
      'match_id', v_active_match.id
    );
  END IF;

  -- Check caller's most recent queue entry
  SELECT * INTO v_queue
  FROM public.matchmaking_queue
  WHERE user_id = v_caller
    AND game_type = p_game_type
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'status', 'idle');
  END IF;

  IF v_queue.status = 'matched' AND v_queue.match_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = v_queue.match_id AND phase = 'active'
    ) THEN
      RETURN jsonb_build_object(
        'ok', TRUE,
        'status', 'matched',
        'match_id', v_queue.match_id
      );
    END IF;
  END IF;

  IF v_queue.status = 'searching' THEN
    IF v_queue.expires_at < NOW() THEN
      UPDATE public.matchmaking_queue
      SET status = 'expired', updated_at = NOW()
      WHERE id = v_queue.id;

      RETURN jsonb_build_object('ok', TRUE, 'status', 'expired');
    END IF;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'status', 'searching',
      'created_at', v_queue.created_at,
      'expires_at', v_queue.expires_at
    );
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'status', 'idle');
END;
$$;

-- ── 7. cancel_matchmaking() RPC ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_matchmaking(p_game_type TEXT DEFAULT 'rps')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller  UUID := auth.uid();
  v_queue   RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  IF p_game_type IS NULL OR p_game_type <> 'rps' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_game_type');
  END IF;

  -- Reliable per-user transaction-level lock for serialization with join_matchmaking
  PERFORM pg_advisory_xact_lock(hashtext('matchmaking_' || v_caller::text));

  SELECT * INTO v_queue
  FROM public.matchmaking_queue
  WHERE user_id = v_caller
    AND game_type = p_game_type
    AND status = 'searching'
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Check if it was matched right before cancel was processed
    SELECT * INTO v_queue
    FROM public.matchmaking_queue
    WHERE user_id = v_caller
      AND game_type = p_game_type
      AND status = 'matched'
      AND updated_at > NOW() - INTERVAL '15 seconds'
    LIMIT 1;

    IF FOUND AND v_queue.match_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', TRUE,
        'code', 'matched',
        'match_id', v_queue.match_id
      );
    END IF;

    RETURN jsonb_build_object('ok', TRUE, 'code', 'not_in_queue');
  END IF;

  UPDATE public.matchmaking_queue
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = v_queue.id;

  RETURN jsonb_build_object('ok', TRUE, 'code', 'cancelled');
END;
$$;

-- ── 8. Privileges ────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.join_matchmaking(TEXT)        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_matchmaking_status(TEXT)  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_matchmaking(TEXT)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.block_user(UUID)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unblock_user(UUID)            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_blocked_users()           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_blocked(UUID, UUID)        FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.join_matchmaking(TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_matchmaking_status(TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_matchmaking(TEXT)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_user(UUID)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocked_users()           TO authenticated;
-- is_blocked is a private helper; do not grant to authenticated.

GRANT SELECT ON public.matchmaking_queue TO authenticated;
GRANT SELECT ON public.user_blocks       TO authenticated;

-- ── 9. Realtime Publication ──────────────────────────────────────────────────
-- Adds matchmaking_queue to Realtime publication for immediate match notifications.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matchmaking_queue'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
    END IF;
  END IF;
END $$;

-- ── End of migration 0005_matchmaking.sql ─────────────────────────────────────
