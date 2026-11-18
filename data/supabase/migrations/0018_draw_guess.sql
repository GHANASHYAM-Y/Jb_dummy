-- =============================================================================
-- Migration: 0018_draw_guess.sql
-- Project:   EVOAIQU — JE Labs
-- Purpose:   Draw & Guess (Pictionary-style) rooms for two friends.
--
-- Rules:
--   - A host creates a room and shares its 5-character code. A friend joins.
--   - 4 rounds; the drawer alternates (host draws rounds 1 and 3).
--   - The drawer gets a secret word and 75 seconds. The guesser types guesses.
--   - A right guess ends the round: the guesser scores 50 + seconds left,
--     the drawer scores 25 + half the seconds left. No guess: the word is shown.
--   - Highest score after the last round wins; equal scores are a draw.
--
-- Design:
--   - The secret word is stored on the room row, but no client can read the
--     row: all reads go through draw_get_state(), which only returns the word
--     to the drawer, or to everyone once the round is over.
--   - The drawing itself is NOT stored. It travels over Supabase Realtime
--     broadcast between the two browsers.
--   - Every mutation runs in a SECURITY DEFINER RPC that locks the room row.
--   - This game is self-contained: it does not use public.matches, so the
--     shared lifecycle and dare system do not apply to it yet.
--
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS.
-- =============================================================================

-- ── 1. Word list (never readable by clients) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.draw_words (
  word        TEXT     PRIMARY KEY CHECK (word = lower(word) AND length(word) BETWEEN 2 AND 24),
  difficulty  SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3)
);

ALTER TABLE public.draw_words ENABLE ROW LEVEL SECURITY;

INSERT INTO public.draw_words (word, difficulty) VALUES
  ('cat', 1), ('dog', 1), ('sun', 1), ('moon', 1), ('star', 1), ('tree', 1),
  ('house', 1), ('car', 1), ('fish', 1), ('apple', 1), ('banana', 1), ('flower', 1),
  ('ball', 1), ('book', 1), ('shoe', 1), ('hat', 1), ('cup', 1), ('bird', 1),
  ('rain', 1), ('cake', 1), ('pizza', 1), ('clock', 1), ('key', 1), ('door', 1),
  ('bicycle', 2), ('elephant', 2), ('rainbow', 2), ('guitar', 2), ('umbrella', 2),
  ('butterfly', 2), ('spider', 2), ('rocket', 2), ('castle', 2), ('train', 2),
  ('snowman', 2), ('lighthouse', 2), ('pyramid', 2), ('cricket bat', 2), ('mango', 2),
  ('kite', 2), ('robot', 2), ('volcano', 2), ('dragon', 2), ('scooter', 2),
  ('windmill', 3), ('telescope', 3), ('skateboard', 3), ('submarine', 3), ('parachute', 3),
  ('dinosaur', 3), ('fireworks', 3), ('treasure map', 3), ('hot air balloon', 3),
  ('cellphone', 3), ('headphones', 3), ('chess board', 3), ('sandwich', 3), ('tornado', 3)
ON CONFLICT (word) DO NOTHING;

-- ── 2. draw_rooms ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.draw_rooms (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT         NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{5}$'),

  host_id         UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_id        UUID         NULL     REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- waiting: no guest yet · ready: both here, nobody drawing ·
  -- drawing: a round is live · round_over: word revealed · finished
  status          TEXT         NOT NULL DEFAULT 'waiting'
                               CHECK (status IN ('waiting', 'ready', 'drawing', 'round_over', 'finished')),

  rounds_total    SMALLINT     NOT NULL DEFAULT 4 CHECK (rounds_total BETWEEN 2 AND 10),
  round_number    SMALLINT     NOT NULL DEFAULT 0 CHECK (round_number >= 0),
  round_seconds   SMALLINT     NOT NULL DEFAULT 75 CHECK (round_seconds BETWEEN 30 AND 180),

  drawer_id       UUID         NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word            TEXT         NULL,
  used_words      TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  round_deadline  TIMESTAMPTZ  NULL,
  round_solved    BOOLEAN      NOT NULL DEFAULT FALSE,

  host_score      INTEGER      NOT NULL DEFAULT 0 CHECK (host_score >= 0),
  guest_score     INTEGER      NOT NULL DEFAULT 0 CHECK (guest_score >= 0),

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_draw_room CHECK (guest_id IS NULL OR host_id <> guest_id)
);

DROP TRIGGER IF EXISTS draw_rooms_set_updated_at ON public.draw_rooms;
CREATE TRIGGER draw_rooms_set_updated_at
  BEFORE UPDATE ON public.draw_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS draw_rooms_host_idx  ON public.draw_rooms (host_id, status);
CREATE INDEX IF NOT EXISTS draw_rooms_guest_idx ON public.draw_rooms (guest_id, status);

-- ── 3. draw_guesses (public to both players) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.draw_guesses (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID         NOT NULL REFERENCES public.draw_rooms(id) ON DELETE CASCADE,
  round       SMALLINT     NOT NULL,
  user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guess       TEXT         NOT NULL CHECK (length(guess) BETWEEN 1 AND 40),
  is_correct  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS draw_guesses_room_idx ON public.draw_guesses (room_id, round, created_at);

-- ── 4. Row Level Security ────────────────────────────────────────────────────
-- The room row holds the secret word, so clients cannot select it at all.

ALTER TABLE public.draw_rooms   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_guesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "draw_rooms_no_select" ON public.draw_rooms;
CREATE POLICY "draw_rooms_no_select" ON public.draw_rooms FOR SELECT USING (FALSE);
DROP POLICY IF EXISTS "draw_rooms_no_insert" ON public.draw_rooms;
CREATE POLICY "draw_rooms_no_insert" ON public.draw_rooms FOR INSERT WITH CHECK (FALSE);
DROP POLICY IF EXISTS "draw_rooms_no_update" ON public.draw_rooms;
CREATE POLICY "draw_rooms_no_update" ON public.draw_rooms FOR UPDATE USING (FALSE);
DROP POLICY IF EXISTS "draw_rooms_no_delete" ON public.draw_rooms;
CREATE POLICY "draw_rooms_no_delete" ON public.draw_rooms FOR DELETE USING (FALSE);

DROP POLICY IF EXISTS "draw_guesses_no_direct_access" ON public.draw_guesses;
CREATE POLICY "draw_guesses_no_direct_access" ON public.draw_guesses FOR ALL USING (FALSE) WITH CHECK (FALSE);

-- ── 5. RPCs ──────────────────────────────────────────────────────────────────

-- Picks the next word for a room, avoiding words already used in it.
CREATE OR REPLACE FUNCTION public.draw_pick_word(p_used TEXT[])
RETURNS TEXT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT word FROM public.draw_words
  WHERE NOT (word = ANY (p_used))
  ORDER BY random()
  LIMIT 1;
$$;

-- Ends a live round whose clock ran out. Caller must hold the row lock.
CREATE OR REPLACE FUNCTION public.draw_expire_round(p_room public.draw_rooms)
RETURNS public.draw_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_room.status = 'drawing' AND p_room.round_deadline IS NOT NULL AND NOW() >= p_room.round_deadline THEN
    UPDATE public.draw_rooms
       SET status = 'round_over'
     WHERE id = p_room.id
     RETURNING * INTO p_room;
  END IF;
  RETURN p_room;
END;
$$;

CREATE OR REPLACE FUNCTION public.draw_create_room()
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_alpha   CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code    TEXT;
  v_room_id UUID;
  v_try     INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  -- One open room at a time: close older waiting rooms by this host
  DELETE FROM public.draw_rooms WHERE host_id = v_uid AND status = 'waiting';

  LOOP
    v_code := '';
    FOR i IN 1..5 LOOP
      v_code := v_code || substr(v_alpha, 1 + floor(random() * length(v_alpha))::INT, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.draw_rooms (code, host_id) VALUES (v_code, v_uid) RETURNING id INTO v_room_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_try := v_try + 1;
      IF v_try > 8 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'code_unavailable');
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'room_id', v_room_id, 'room_code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.draw_join_room(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_room public.draw_rooms%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_room FROM public.draw_rooms WHERE code = upper(btrim(coalesce(p_code, ''))) FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  -- Re-opening your own room (as host or as the joined guest) is fine
  IF v_room.host_id = v_uid OR v_room.guest_id = v_uid THEN
    RETURN jsonb_build_object('ok', true, 'room_id', v_room.id);
  END IF;

  IF v_room.guest_id IS NOT NULL OR v_room.status <> 'waiting' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'room_full');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_blocks
     WHERE (blocker_id = v_uid AND blocked_id = v_room.host_id)
        OR (blocker_id = v_room.host_id AND blocked_id = v_uid)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'blocked');
  END IF;

  UPDATE public.draw_rooms SET guest_id = v_uid, status = 'ready' WHERE id = v_room.id;
  RETURN jsonb_build_object('ok', true, 'room_id', v_room.id);
END;
$$;

-- Starts the first round, or moves on after a round: next round or finish.
CREATE OR REPLACE FUNCTION public.draw_advance(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_room   public.draw_rooms%ROWTYPE;
  v_next   SMALLINT;
  v_drawer UUID;
  v_word   TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_room FROM public.draw_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF v_uid <> v_room.host_id AND v_uid IS DISTINCT FROM v_room.guest_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  v_room := public.draw_expire_round(v_room);

  IF v_room.status NOT IN ('ready', 'round_over') THEN
    -- Both players press "next" at once; the second call is a harmless no-op
    RETURN jsonb_build_object('ok', true, 'noop', true);
  END IF;

  v_next := v_room.round_number + 1;
  IF v_next > v_room.rounds_total THEN
    UPDATE public.draw_rooms SET status = 'finished', word = NULL WHERE id = v_room.id;
    RETURN jsonb_build_object('ok', true, 'finished', true);
  END IF;

  v_drawer := CASE WHEN v_next % 2 = 1 THEN v_room.host_id ELSE v_room.guest_id END;
  v_word := public.draw_pick_word(v_room.used_words);
  IF v_word IS NULL THEN
    -- Word list exhausted: allow repeats rather than stall the game
    v_word := public.draw_pick_word(ARRAY[]::TEXT[]);
  END IF;

  UPDATE public.draw_rooms
     SET status = 'drawing',
         round_number = v_next,
         drawer_id = v_drawer,
         word = v_word,
         used_words = array_append(used_words, v_word),
         round_solved = FALSE,
         round_deadline = NOW() + make_interval(secs => round_seconds)
   WHERE id = v_room.id;

  RETURN jsonb_build_object('ok', true, 'round', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.draw_guess(p_room_id UUID, p_guess TEXT)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_room    public.draw_rooms%ROWTYPE;
  v_clean   TEXT;
  v_correct BOOLEAN;
  v_left    INT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  v_clean := lower(btrim(regexp_replace(coalesce(p_guess, ''), '\s+', ' ', 'g')));
  IF length(v_clean) < 1 OR length(v_clean) > 40 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_guess');
  END IF;

  SELECT * INTO v_room FROM public.draw_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF v_uid <> v_room.host_id AND v_uid IS DISTINCT FROM v_room.guest_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  v_room := public.draw_expire_round(v_room);

  IF v_room.status <> 'drawing' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'round_not_active');
  END IF;
  IF v_uid = v_room.drawer_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'drawer_cannot_guess');
  END IF;

  v_correct := v_clean = v_room.word;

  INSERT INTO public.draw_guesses (room_id, round, user_id, guess, is_correct)
  VALUES (v_room.id, v_room.round_number, v_uid, v_clean, v_correct);

  IF v_correct THEN
    v_left := GREATEST(0, floor(extract(epoch FROM (v_room.round_deadline - NOW())))::INT);
    UPDATE public.draw_rooms
       SET status = 'round_over',
           round_solved = TRUE,
           host_score  = host_score  + CASE WHEN v_uid = host_id THEN 50 + v_left ELSE 25 + v_left / 2 END,
           guest_score = guest_score + CASE WHEN v_uid = host_id THEN 25 + v_left / 2 ELSE 50 + v_left END
     WHERE id = v_room.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'correct', v_correct);
END;
$$;

-- The only way clients read a room. The secret word is only included for the
-- drawer while drawing, and for everyone once the round is over.
CREATE OR REPLACE FUNCTION public.draw_get_state(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_room    public.draw_rooms%ROWTYPE;
  v_reveal  BOOLEAN;
  v_word    TEXT;
  v_guesses JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_room FROM public.draw_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF v_uid <> v_room.host_id AND v_uid IS DISTINCT FROM v_room.guest_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  v_room := public.draw_expire_round(v_room);

  v_reveal := v_room.status = 'round_over';
  v_word := CASE
    WHEN v_room.word IS NULL THEN NULL
    WHEN v_reveal OR (v_room.status = 'drawing' AND v_uid = v_room.drawer_id) THEN v_room.word
    ELSE NULL
  END;

  SELECT coalesce(jsonb_agg(g ORDER BY g.created_at), '[]'::JSONB) INTO v_guesses
  FROM (
    SELECT user_id, guess, is_correct, created_at
      FROM public.draw_guesses
     WHERE room_id = v_room.id AND round = v_room.round_number
     ORDER BY created_at DESC
     LIMIT 20
  ) g;

  RETURN jsonb_build_object(
    'ok', true,
    'room', jsonb_build_object(
      'id', v_room.id,
      'code', v_room.code,
      'host_id', v_room.host_id,
      'guest_id', v_room.guest_id,
      'status', v_room.status,
      'rounds_total', v_room.rounds_total,
      'round_number', v_room.round_number,
      'drawer_id', v_room.drawer_id,
      'word', v_word,
      'word_length', CASE WHEN v_room.status IN ('drawing', 'round_over') THEN length(v_room.word) ELSE NULL END,
      'round_deadline', v_room.round_deadline,
      'round_solved', v_room.round_solved,
      'host_score', v_room.host_score,
      'guest_score', v_room.guest_score
    ),
    'guesses', v_guesses,
    'server_now', NOW()
  );
END;
$$;

-- The caller's own unfinished rooms for the lobby list. Never returns the word.
CREATE OR REPLACE FUNCTION public.draw_list_my_rooms()
RETURNS TABLE (id UUID, code TEXT, status TEXT, host_id UUID, guest_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $
  SELECT r.id, r.code, r.status, r.host_id, r.guest_id
    FROM public.draw_rooms r
   WHERE (r.host_id = auth.uid() OR r.guest_id = auth.uid())
     AND r.status <> 'finished'
   ORDER BY r.updated_at DESC
   LIMIT 6;
$;

-- ── 6. Grants ────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.draw_pick_word(TEXT[])              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.draw_expire_round(public.draw_rooms) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.draw_create_room()                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.draw_join_room(TEXT)                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.draw_advance(UUID)                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.draw_guess(UUID, TEXT)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.draw_get_state(UUID)                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.draw_list_my_rooms()                FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.draw_create_room()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.draw_join_room(TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.draw_advance(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.draw_guess(UUID, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.draw_get_state(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.draw_list_my_rooms()    TO authenticated;

-- ── 7. Clean up abandoned rooms (called by the existing maintenance cron) ────

CREATE OR REPLACE FUNCTION public.cleanup_draw_rooms()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.draw_rooms
   WHERE updated_at < NOW() - INTERVAL '1 day'
      OR (status = 'waiting' AND created_at < NOW() - INTERVAL '2 hours');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_draw_rooms() FROM PUBLIC, anon, authenticated;
