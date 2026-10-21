-- =============================================================================
-- Migration: 0004_challenges.sql
-- Project:   Evoora — JE Labs
-- Purpose:   Challenge assignment system integrated with completed matches.
--            Defines the challenges table, RLS policies, and SECURITY DEFINER
--            functions for assigning, accepting, skipping, and querying challenges.
--
-- Security principles:
--  - Only the verified winner of a completed match can assign a challenge.
--  - The recipient (verified loser) alone can accept or skip the challenge.
--  - Winner and loser are authoritative values from public.matches — NEVER
--    trusted from client payloads.
--  - Unique constraint on match_id prevents duplicate or concurrent duplicate
--    challenge assignments for the same match.
--  - Direct INSERT/UPDATE/DELETE are blocked by RLS policies; all mutations
--    occur through audited SECURITY DEFINER functions.
--  - Participant-only RLS SELECT guarantees privacy.
-- =============================================================================

-- ── 1. challenge_catalog table ────────────────────────────────────────────────
-- Authoritative catalog of curated, safe, non-harmful challenges.
-- All challenges assigned to users MUST exist in this catalog. Direct client mutations
-- are forbidden; data is seeded or managed authoritatively.

CREATE TABLE IF NOT EXISTS public.challenge_catalog (
  id            TEXT           PRIMARY KEY,
  category      TEXT           NOT NULL CHECK (category IN (
                                 'dance',
                                 'singing',
                                 'acting',
                                 'mimicry',
                                 'tongue_twister',
                                 'comedy'
                               )),
  title         TEXT           NOT NULL,
  description   TEXT           NOT NULL,
  instructions  TEXT           NOT NULL,
  emoji         TEXT           NOT NULL DEFAULT '',
  duration_secs INTEGER        NOT NULL DEFAULT 20,
  is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE public.challenge_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cc_select" ON public.challenge_catalog;
CREATE POLICY "cc_select"
  ON public.challenge_catalog FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "cc_insert" ON public.challenge_catalog;
CREATE POLICY "cc_insert" ON public.challenge_catalog FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "cc_update" ON public.challenge_catalog;
CREATE POLICY "cc_update" ON public.challenge_catalog FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "cc_delete" ON public.challenge_catalog;
CREATE POLICY "cc_delete" ON public.challenge_catalog FOR DELETE USING (FALSE);

-- ── 2. Seed curated challenge catalog ─────────────────────────────────────────

INSERT INTO public.challenge_catalog (id, category, title, description, instructions, emoji, duration_secs, is_active)
VALUES
  ('dance_robot', 'dance', 'The Mechanical Robot', 'Perform an ultra-stiff, mechanical robot dance.', 'Move only one joint at a time with sharp robotic pauses for 20 seconds. Make bleep-bloop sound effects if you want!', '🤖', 20, TRUE),
  ('dance_slowmo', 'dance', 'Slow-Motion Victory Goal', 'Celebrate an imaginary soccer goal in dramatic slow motion.', 'Run across the room, drop to your knees, and raise your arms as if watching an Olympic stadium replay in 0.25x speed.', '⚽', 25, TRUE),
  ('dance_retro_disco', 'dance', '80s Retro Disco Boogie', 'Classic Saturday night fever finger-pointing disco moves.', 'Alternate pointing your index finger up to the sky and down to the floor while stepping side-to-side with a groovy smile.', '🕺', 20, TRUE),
  ('sing_dramatic_opera', 'singing', 'Dramatic Opera Groceries', 'Sing everyday sentences like an Italian opera tenor.', 'Sing your favorite food order or what you had for breakfast using intense, vibrato-heavy, high-drama opera vocals.', '🎶', 30, TRUE),
  ('sing_whisper_rock', 'singing', 'Whispering Rock Star', 'Sing a loud, high-energy rock song entirely in a stage whisper.', 'Deliver the chorus of your favorite rock or pop anthem with intense rockstar hand gestures, but in a completely hushed whisper.', '🤫', 25, TRUE),
  ('sing_alien_lullaby', 'singing', 'Extraterrestrial Lullaby', 'Sing a gentle lullaby using invented Martian syllables.', 'Use silly sounds like ''zorp-glorp-beep'' in a sweet, calming melody to put an imaginary baby alien to sleep.', '👽', 25, TRUE),
  ('act_soap_opera', 'acting', 'The Lost Sock Betrayal', 'An over-the-top soap opera monologue about a missing sock.', 'Gasp dramatically, turn to the camera with widening eyes, and deliver a tearful speech mourning the tragic betrayal of a single lost sock.', '🧦', 30, TRUE),
  ('act_extreme_weather', 'acting', 'Hurricane Weather Reporter', 'Report live from the center of a ferocious pretend storm.', 'Hold a pretend microphone, lean violently against imaginary 100mph gale winds, and shout breaking news updates over the howling storm.', '🌪️', 25, TRUE),
  ('act_silent_film', 'acting', '1920s Melodrama Star', 'A silent movie reaction to discovering an empty cookie jar.', 'No words allowed! Use exaggerated facial expressions, hand-on-forehead fainting gestures, and silent weeping.', '🎬', 20, TRUE),
  ('mimic_t_rex', 'mimicry', 'Tiny-Armed T-Rex', 'Perform an ordinary task with tiny dinosaur arms.', 'Tuck your elbows tightly into your ribs, curl your fingers into two-claw hands, and try to inspect something on the table while making dinosaur grunts.', '🦖', 20, TRUE),
  ('mimic_espresso_machine', 'mimicry', 'Espresso Coffee Machine', 'Recreate the sounds and actions of a barista coffee machine.', 'Make the grinding sound (grrrr), the high-pressure steam hiss (pssshhhh), and the final happy dripping pour (drip... drip... ping!).', '☕', 20, TRUE),
  ('mimic_penguin_march', 'mimicry', 'Diplomatic Penguin March', 'Waddle like an emperor penguin inspecting royal ice guards.', 'Keep your knees glued together, flippers straight at your sides, and solemnly waddle around your chair with utmost royal dignity.', '🐧', 20, TRUE),
  ('tt_peter_piper', 'tongue_twister', 'Peter Piper Challenge', 'Recite the classic pickled pepper twister three times without stopping.', 'Say: ''Peter Piper picked a peck of pickled peppers'' 3 times in a row, clearly and at high speed!', '🌶️', 20, TRUE),
  ('tt_woodchuck', 'tongue_twister', 'Woodchuck Wonder', 'The timeless riddle of the wood-chucking woodchuck.', 'Say: ''How much wood would a woodchuck chuck if a woodchuck could chuck wood?'' 3 times consecutively without stumbling.', '🪵', 25, TRUE),
  ('tt_betty_botter', 'tongue_twister', 'Betty Botter''s Butter', 'Betty bought some bitter butter and tried to make it better.', 'Say: ''Betty Botter bought some butter, but she said the butter''s bitter!'' 3 times in rapid succession.', '🧈', 25, TRUE),
  ('comedy_statue_freeze', 'comedy', 'The Impatient Museum Statue', 'Hold an absurd statuesque pose without laughing.', 'Strike the silliest artistic pose you can imagine and freeze completely motionless for 15 seconds without laughing or blinking.', '🗿', 15, TRUE),
  ('comedy_giggle_loop', 'comedy', 'The Contagious Giggle', 'Start from a tiny snicker and escalate into a belly laugh.', 'Begin with a silent nose snort, build up to a squeaky giggle, and finish with a full, loud, hearty belly laugh for 15 seconds.', '😂', 15, TRUE),
  ('comedy_invisible_mirror', 'comedy', 'Living Reflection', 'Pretend you are in front of a mirror fixing an imaginary outrageous hairstyle.', 'Style an imaginary two-foot-tall beehive or mohawk haircut, checking your side profile with total serious dedication.', '🪞', 20, TRUE)
ON CONFLICT (id) DO UPDATE SET
  category      = EXCLUDED.category,
  title         = EXCLUDED.title,
  description   = EXCLUDED.description,
  instructions  = EXCLUDED.instructions,
  emoji         = EXCLUDED.emoji,
  duration_secs = EXCLUDED.duration_secs,
  is_active     = EXCLUDED.is_active;

-- ── 3. challenges table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.challenges (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One challenge per completed match.
  match_id      UUID           NOT NULL
                               REFERENCES public.matches(id) ON DELETE CASCADE,

  -- Authoritative winner from the match (assigner).
  winner_id     UUID           NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Authoritative loser from the match (recipient).
  loser_id      UUID           NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Challenge catalog metadata (authoritative foreign key reference)
  challenge_id  TEXT           NOT NULL
                               REFERENCES public.challenge_catalog(id),
  category      TEXT           NOT NULL
                               CHECK (category IN (
                                 'dance',
                                 'singing',
                                 'acting',
                                 'mimicry',
                                 'tongue_twister',
                                 'comedy'
                               )),
  title         TEXT           NOT NULL,
  description   TEXT           NOT NULL,
  instructions  TEXT           NOT NULL,

  -- Visibility: 'private' (default) or 'public'.
  -- Note: Public assignment indicates intended audience only;
  -- video submission or publication requires separate explicit consent.
  visibility    TEXT           NOT NULL DEFAULT 'private'
                               CHECK (visibility IN ('private', 'public')),

  -- Lifecycle status
  status        TEXT           NOT NULL DEFAULT 'pending'
                               CHECK (status IN (
                                 'pending',
                                 'accepted',
                                 'completed',
                                 'skipped',
                                 'cancelled'
                               )),

  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Integrity constraints
  CONSTRAINT no_self_challenge CHECK (winner_id <> loser_id),
  CONSTRAINT unique_match_challenge UNIQUE (match_id)
);

-- ── 4. updated_at trigger ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS challenges_set_updated_at ON public.challenges;
CREATE TRIGGER challenges_set_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS challenges_winner_idx ON public.challenges (winner_id, status);
CREATE INDEX IF NOT EXISTS challenges_loser_idx  ON public.challenges (loser_id, status);
CREATE INDEX IF NOT EXISTS challenges_match_idx  ON public.challenges (match_id);

-- ── 6. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- SELECT: Only the two participants (winner and loser) can view their challenges.
DROP POLICY IF EXISTS "c_select" ON public.challenges;
CREATE POLICY "c_select"
  ON public.challenges FOR SELECT
  USING (auth.uid() = winner_id OR auth.uid() = loser_id);

-- Block direct client INSERT, UPDATE, DELETE. All mutations run through RPCs.
DROP POLICY IF EXISTS "c_insert" ON public.challenges;
CREATE POLICY "c_insert" ON public.challenges FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "c_update" ON public.challenges;
CREATE POLICY "c_update" ON public.challenges FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "c_delete" ON public.challenges;
CREATE POLICY "c_delete" ON public.challenges FOR DELETE USING (FALSE);

-- ── 7. assign_challenge() ────────────────────────────────────────────────────
-- Assigns a curated challenge to the loser of a completed match.
-- Validates:
--   - Caller must be logged in.
--   - Challenge ID must exist in authoritative challenge_catalog.
--   - Any client metadata must match authoritative catalog (rejects fabricated metadata).
--   - Match must exist, phase = 'completed', is_draw = false.
--   - Caller must be the authoritative match winner.
--   - Loser is inferred from match player IDs (never client input).
--   - Prevents duplicate assignment for the same match.

CREATE OR REPLACE FUNCTION public.assign_challenge(
  p_match_id     UUID,
  p_challenge_id TEXT,
  p_category     TEXT DEFAULT NULL,
  p_title        TEXT DEFAULT NULL,
  p_description  TEXT DEFAULT NULL,
  p_instructions TEXT DEFAULT NULL,
  p_visibility   TEXT DEFAULT 'private'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_match     RECORD;
  v_loser_id  UUID;
  v_id        UUID;
  v_catalog   RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'Must be logged in.');
  END IF;

  -- Validate visibility parameter (reject NULL or values outside allowlist)
  IF p_visibility IS NULL OR p_visibility NOT IN ('private', 'public') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_visibility',
      'message', 'Visibility must be private or public.');
  END IF;

  -- Validate challenge_id parameter presence
  IF p_challenge_id IS NULL OR TRIM(p_challenge_id) = '' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_challenge_id',
      'message', 'Challenge ID must be provided.');
  END IF;

  -- Authoritative catalog validation inside the database function
  SELECT * INTO v_catalog
  FROM public.challenge_catalog
  WHERE id = TRIM(p_challenge_id) AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_challenge_id',
      'message', 'Invalid challenge ID. Not found in authoritative catalog.');
  END IF;

  -- Defensive anti-fabrication check:
  -- If client provided any challenge metadata, verify they strictly match the authoritative catalog!
  IF (p_category IS NOT NULL AND p_category <> v_catalog.category) OR
     (p_title IS NOT NULL AND p_title <> v_catalog.title) OR
     (p_description IS NOT NULL AND p_description <> v_catalog.description) OR
     (p_instructions IS NOT NULL AND p_instructions <> v_catalog.instructions) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'fabricated_metadata',
      'message', 'Challenge metadata does not match authoritative catalog.');
  END IF;

  -- Lock match row for update to ensure race-free check
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_found',
      'message', 'Match not found.');
  END IF;

  -- Match must be finished
  IF v_match.phase <> 'completed' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_completed',
      'message', 'Match is not completed.');
  END IF;

  -- Draws cannot have a challenge
  IF v_match.is_draw OR v_match.winner_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_was_draw',
      'message', 'Draw matches do not generate challenge assignments.');
  END IF;

  -- Caller must be the verified winner
  IF v_match.winner_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_winner',
      'message', 'Only the verified match winner can assign a challenge.');
  END IF;

  -- Authoritatively derive the loser
  IF v_match.player1_id = v_caller THEN
    v_loser_id := v_match.player2_id;
  ELSE
    v_loser_id := v_match.player1_id;
  END IF;

  -- Defensive check: cannot challenge oneself
  IF v_loser_id = v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'self_challenge',
      'message', 'Cannot assign a challenge to yourself.');
  END IF;

  -- Prevent duplicate challenge assignment
  IF EXISTS (SELECT 1 FROM public.challenges WHERE match_id = p_match_id) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'already_assigned',
      'message', 'A challenge has already been assigned for this match.');
  END IF;

  BEGIN
    INSERT INTO public.challenges (
      match_id,
      winner_id,
      loser_id,
      challenge_id,
      category,
      title,
      description,
      instructions,
      visibility,
      status
    )
    VALUES (
      p_match_id,
      v_caller,
      v_loser_id,
      v_catalog.id,
      v_catalog.category,
      v_catalog.title,
      v_catalog.description,
      v_catalog.instructions,
      p_visibility,
      'pending'
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'already_assigned',
      'message', 'A challenge has already been assigned for this match.');
  END;

  RETURN jsonb_build_object(
    'ok',           TRUE,
    'code',         'assigned',
    'challenge_id', v_id
  );
END;
$$;

-- ── 6. respond_challenge() ───────────────────────────────────────────────────
-- Allows the recipient (loser) to accept or skip an assigned challenge.
-- action: 'accept' | 'skip'

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
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated',
      'message', 'Must be logged in.');
  END IF;

  -- Explicitly reject NULL or invalid actions
  IF p_action IS NULL OR p_action NOT IN ('accept', 'skip') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_action',
      'message', 'Action must be accept or skip.');
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_found',
      'message', 'Challenge not found.');
  END IF;

  -- Only the recipient can accept or skip
  IF v_challenge.loser_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden',
      'message', 'Only the assigned recipient can accept or skip this challenge.');
  END IF;

  -- Idempotency: if already in target status, return success
  IF v_challenge.status = 'accepted' AND p_action = 'accept' THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'accepted');
  END IF;
  IF v_challenge.status = 'skipped' AND p_action = 'skip' THEN
    RETURN jsonb_build_object('ok', TRUE, 'code', 'skipped');
  END IF;

  -- Must be in pending status
  IF v_challenge.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_pending',
      'message', 'Challenge is no longer pending.');
  END IF;

  IF p_action = 'accept' THEN
    UPDATE public.challenges
    SET status = 'accepted', updated_at = NOW()
    WHERE id = p_challenge_id;
    RETURN jsonb_build_object('ok', TRUE, 'code', 'accepted');
  ELSE
    UPDATE public.challenges
    SET status = 'skipped', updated_at = NOW()
    WHERE id = p_challenge_id;
    RETURN jsonb_build_object('ok', TRUE, 'code', 'skipped');
  END IF;
END;
$$;

-- ── 7. get_match_challenge() ─────────────────────────────────────────────────
-- Retrieves the challenge for a specific match, if one exists and caller is participant.

CREATE OR REPLACE FUNCTION public.get_match_challenge(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_match     RECORD;
  v_challenge RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'unauthenticated');
  END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'match_not_found');
  END IF;

  IF v_match.player1_id <> v_caller AND v_match.player2_id <> v_caller THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'forbidden');
  END IF;

  SELECT c.*,
         p_winner.display_name AS winner_name,
         p_winner.evoora_id   AS winner_evoora_id,
         p_loser.display_name  AS loser_name,
         p_loser.evoora_id    AS loser_evoora_id
  INTO v_challenge
  FROM public.challenges c
  JOIN public.profiles p_winner ON p_winner.id = c.winner_id
  JOIN public.profiles p_loser  ON p_loser.id  = c.loser_id
  WHERE c.match_id = p_match_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', TRUE, 'challenge', NULL);
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'challenge', jsonb_build_object(
      'id',           v_challenge.id,
      'match_id',     v_challenge.match_id,
      'winner_id',    v_challenge.winner_id,
      'winner_name',  v_challenge.winner_name,
      'winner_evoora_id', v_challenge.winner_evoora_id,
      'loser_id',     v_challenge.loser_id,
      'loser_name',   v_challenge.loser_name,
      'loser_evoora_id', v_challenge.loser_evoora_id,
      'challenge_id', v_challenge.challenge_id,
      'category',     v_challenge.category,
      'title',        v_challenge.title,
      'description',  v_challenge.description,
      'instructions', v_challenge.instructions,
      'visibility',   v_challenge.visibility,
      'status',       v_challenge.status,
      'created_at',   v_challenge.created_at,
      'updated_at',   v_challenge.updated_at
    )
  );
END;
$$;

-- ── 8. get_user_challenges() ─────────────────────────────────────────────────
-- Returns challenges for the caller:
--   p_filter: 'received' | 'sent' | 'all'

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

-- ── 9. Privileges ────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.assign_challenge(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.respond_challenge(UUID, TEXT)                                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_match_challenge(UUID)                                   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_challenges(TEXT)                                   FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.assign_challenge(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_challenge(UUID, TEXT)                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_challenge(UUID)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_challenges(TEXT)                                   TO authenticated;

GRANT SELECT ON public.challenges TO authenticated;
GRANT SELECT ON public.challenge_catalog TO authenticated;

-- ── 10. Realtime publication ─────────────────────────────────────────────────
-- Enables Realtime events on challenges so participant screens update automatically
-- when an assignment occurs or when a status changes to accepted/skipped.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'challenges'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
    END IF;
  END IF;
END $$;

-- ── End of migration 0004_challenges.sql ─────────────────────────────────────
