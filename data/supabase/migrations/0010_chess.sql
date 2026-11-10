-- =============================================================================
-- Migration: 0010_chess.sql
-- Project:   EVOAIQU — JE Labs
-- Purpose:   Milestone 6 Speed Chess isolation schema:
--            - chess_matches (FIDE board FEN, PGN, timers, check/mate state)
--            - chess_moves (authoritative move log, SAN, timestamps, ply)
--            - Strict RLS policies and Realtime replica identity
--            - Zero impact or breaking changes to existing RPS matches or tables
-- =============================================================================

-- ── 1. chess_matches Table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chess_matches (
  id                       UUID           PRIMARY KEY
                                          REFERENCES public.matches(id) ON DELETE CASCADE,

  -- Authoritative player colors (White moves first per FIDE rules)
  white_player_id          UUID           NOT NULL
                                          REFERENCES public.profiles(id) ON DELETE RESTRICT,
  black_player_id          UUID           NOT NULL
                                          REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Full authoritative board state and notation
  fen                      TEXT           NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn                      TEXT           NOT NULL DEFAULT '',
  turn                     TEXT           NOT NULL DEFAULT 'w'
                                          CHECK (turn IN ('w', 'b')),
  ply                      SMALLINT       NOT NULL DEFAULT 0,

  -- Timed Speed Chess clocks (default: 5m + 3s increment)
  time_control_seconds     INTEGER        NOT NULL DEFAULT 300,
  increment_seconds        INTEGER        NOT NULL DEFAULT 3,
  white_time_remaining_ms  INTEGER        NOT NULL DEFAULT 300000,
  black_time_remaining_ms  INTEGER        NOT NULL DEFAULT 300000,
  last_move_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Authoritative game evaluation flags
  is_check                 BOOLEAN        NOT NULL DEFAULT FALSE,
  is_checkmate             BOOLEAN        NOT NULL DEFAULT FALSE,
  is_stalemate             BOOLEAN        NOT NULL DEFAULT FALSE,
  is_draw                  BOOLEAN        NOT NULL DEFAULT FALSE,
  game_status              TEXT           NOT NULL DEFAULT 'active'
                                          CHECK (game_status IN (
                                            'active',
                                            'check',
                                            'checkmate',
                                            'stalemate',
                                            'draw_agreed',
                                            'timeout',
                                            'resigned',
                                            'insufficient_material',
                                            'threefold_repetition',
                                            'fifty_move_rule',
                                            'abandoned'
                                          )),

  -- Game action indicators
  draw_offered_by          UUID           NULL
                                          REFERENCES public.profiles(id) ON DELETE SET NULL,
  resigned_by              UUID           NULL
                                          REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_chess_match CHECK (white_player_id <> black_player_id)
);

DROP TRIGGER IF EXISTS chess_matches_set_updated_at ON public.chess_matches;
CREATE TRIGGER chess_matches_set_updated_at
  BEFORE UPDATE ON public.chess_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS chess_matches_white_idx ON public.chess_matches (white_player_id, game_status);
CREATE INDEX IF NOT EXISTS chess_matches_black_idx ON public.chess_matches (black_player_id, game_status);

-- ── 2. chess_moves Table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chess_moves (
  id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id                 UUID           NOT NULL
                                          REFERENCES public.matches(id) ON DELETE CASCADE,
  ply                      SMALLINT       NOT NULL CHECK (ply >= 1),
  player_id                UUID           NOT NULL
                                          REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Authoritative move details
  san                      TEXT           NOT NULL,
  from_square              TEXT           NOT NULL,
  to_square                TEXT           NOT NULL,
  promotion                TEXT           NULL,
  captured                 TEXT           NULL,
  fen_after                TEXT           NOT NULL,

  -- Precise clock timing audit
  time_spent_ms            INTEGER        NOT NULL DEFAULT 0,
  white_time_remaining_ms  INTEGER        NOT NULL,
  black_time_remaining_ms  INTEGER        NOT NULL,

  created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- One move per ply per match
  UNIQUE (match_id, ply)
);

CREATE INDEX IF NOT EXISTS chess_moves_match_ply_idx ON public.chess_moves (match_id, ply);

-- ── 3. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.chess_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chess_moves   ENABLE ROW LEVEL SECURITY;

-- SELECT policies: Participants only
DROP POLICY IF EXISTS "chess_matches_select" ON public.chess_matches;
CREATE POLICY "chess_matches_select"
  ON public.chess_matches FOR SELECT
  USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);

DROP POLICY IF EXISTS "chess_moves_select" ON public.chess_moves;
CREATE POLICY "chess_moves_select"
  ON public.chess_moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chess_matches cm
      WHERE cm.id = chess_moves.match_id
        AND (cm.white_player_id = auth.uid() OR cm.black_player_id = auth.uid())
    )
  );

-- Direct client mutations are blocked. Mutations occur strictly through server-authoritative API / RPCs.
DROP POLICY IF EXISTS "chess_matches_insert" ON public.chess_matches;
CREATE POLICY "chess_matches_insert" ON public.chess_matches FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "chess_matches_update" ON public.chess_matches;
CREATE POLICY "chess_matches_update" ON public.chess_matches FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "chess_matches_delete" ON public.chess_matches;
CREATE POLICY "chess_matches_delete" ON public.chess_matches FOR DELETE USING (FALSE);

DROP POLICY IF EXISTS "chess_moves_insert" ON public.chess_moves;
CREATE POLICY "chess_moves_insert" ON public.chess_moves FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "chess_moves_update" ON public.chess_moves;
CREATE POLICY "chess_moves_update" ON public.chess_moves FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "chess_moves_delete" ON public.chess_moves;
CREATE POLICY "chess_moves_delete" ON public.chess_moves FOR DELETE USING (FALSE);

-- ── 4. Realtime Replica Identity ─────────────────────────────────────────────

ALTER TABLE public.chess_matches REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_matches;
EXCEPTION WHEN duplicate_object THEN
  NULL;
WHEN undefined_object THEN
  NULL;
END $$;

-- ── End of migration 0010_chess.sql ──────────────────────────────────────────
