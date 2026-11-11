/**
 * Evoora — Milestone 3B Rock, Paper, Scissors Game Tests
 *
 * Verifies:
 *   1. Pure RPS game logic (move validation, adjudication, scoring, match outcomes, simulations).
 *   2. SQL Migration 0003 audit (tables, constraints, RLS policies, hidden move secrecy,
 *      SECURITY DEFINER functions, atomic concurrency protections).
 *   3. API routes security & validation (authentication, UUID validation, friend-only enforcement,
 *      hidden-move non-leakage).
 *   4. TypeScript database interfaces & i18n keys for RPS.
 *
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  isValidMove,
  adjudicateRound,
  computeScore,
  getMatchOutcome,
  simulateMatch,
  MOVE_EMOJI,
  MOVE_LABEL_EN,
  MOVE_LABEL_TA,
  WINS_REQUIRED,
  type RpsMove,
  type Round,
} from "@/features/rock-paper-scissors/engine/rps";

// ── File paths for static security analysis ───────────────────────────────────

const migrationPath = path.resolve(
  __dirname,
  "../../../../supabase/migrations/0003_rps.sql",
);
const migration = fs.readFileSync(migrationPath, "utf-8");

const inviteRoutePath = path.resolve(
  __dirname,
  "../../../app/api/rps/invite/route.ts",
);
const inviteRoute = fs.readFileSync(inviteRoutePath, "utf-8");

const respondRoutePath = path.resolve(
  __dirname,
  "../../../app/api/rps/invite/respond/route.ts",
);
const respondRoute = fs.readFileSync(respondRoutePath, "utf-8");

const cancelRoutePath = path.resolve(
  __dirname,
  "../../../app/api/rps/invite/cancel/route.ts",
);
const cancelRoute = fs.readFileSync(cancelRoutePath, "utf-8");

const moveRoutePath = path.resolve(
  __dirname,
  "../../../app/api/rps/move/route.ts",
);
const moveRoute = fs.readFileSync(moveRoutePath, "utf-8");

const stateRoutePath = path.resolve(
  __dirname,
  "../../../app/api/rps/state/route.ts",
);
const stateRoute = fs.readFileSync(stateRoutePath, "utf-8");

const historyRoutePath = path.resolve(
  __dirname,
  "../../../app/api/rps/history/route.ts",
);
const historyRoute = fs.readFileSync(historyRoutePath, "utf-8");

const dbTypesPath = path.resolve(__dirname, "../../../core/supabase/database.ts");
const dbTypes = fs.readFileSync(dbTypesPath, "utf-8");

const i18nPath = path.resolve(__dirname, "../../../core/i18n/translations.ts");
const i18nSrc = fs.readFileSync(i18nPath, "utf-8");

// ── 1. Pure Game Logic Tests ──────────────────────────────────────────────────

describe("RPS Game Logic — Move Validation", () => {
  it("accepts valid moves", () => {
    expect(isValidMove("rock")).toBe(true);
    expect(isValidMove("paper")).toBe(true);
    expect(isValidMove("scissors")).toBe(true);
  });

  it("rejects invalid moves", () => {
    expect(isValidMove("")).toBe(false);
    expect(isValidMove("ROCK")).toBe(false);
    expect(isValidMove("Paper")).toBe(false);
    expect(isValidMove("lizard")).toBe(false);
    expect(isValidMove("spock")).toBe(false);
    expect(isValidMove("fire")).toBe(false);
    expect(isValidMove("123")).toBe(false);
  });
});

describe("RPS Game Logic — Round Adjudication", () => {
  it("determines player1 wins correctly", () => {
    expect(adjudicateRound("rock", "scissors")).toEqual({
      code: "player1_wins",
      winner: 1,
    });
    expect(adjudicateRound("scissors", "paper")).toEqual({
      code: "player1_wins",
      winner: 1,
    });
    expect(adjudicateRound("paper", "rock")).toEqual({
      code: "player1_wins",
      winner: 1,
    });
  });

  it("determines player2 wins correctly", () => {
    expect(adjudicateRound("scissors", "rock")).toEqual({
      code: "player2_wins",
      winner: 2,
    });
    expect(adjudicateRound("paper", "scissors")).toEqual({
      code: "player2_wins",
      winner: 2,
    });
    expect(adjudicateRound("rock", "paper")).toEqual({
      code: "player2_wins",
      winner: 2,
    });
  });

  it("determines draws correctly for identical moves", () => {
    expect(adjudicateRound("rock", "rock")).toEqual({ code: "draw" });
    expect(adjudicateRound("paper", "paper")).toEqual({ code: "draw" });
    expect(adjudicateRound("scissors", "scissors")).toEqual({ code: "draw" });
  });

  it("exhaustively covers all 9 possible combinations", () => {
    const moves: RpsMove[] = ["rock", "paper", "scissors"];
    let drawCount = 0;
    let p1WinCount = 0;
    let p2WinCount = 0;

    for (const m1 of moves) {
      for (const m2 of moves) {
        const res = adjudicateRound(m1, m2);
        if (res.code === "draw") drawCount++;
        else if (res.code === "player1_wins") p1WinCount++;
        else if (res.code === "player2_wins") p2WinCount++;
      }
    }

    expect(drawCount).toBe(3);
    expect(p1WinCount).toBe(3);
    expect(p2WinCount).toBe(3);
  });
});

describe("RPS Game Logic — Score & Match Outcomes", () => {
  it("computes scores correctly ignoring draws", () => {
    const rounds: Pick<Round, "result">[] = [
      { result: "player1_wins" },
      { result: "draw" },
      { result: "player2_wins" },
      { result: "draw" },
      { result: "player1_wins" },
    ];
    const score = computeScore(rounds);
    expect(score).toEqual({ player1Wins: 2, player2Wins: 1 });
  });

  it("returns ongoing outcome when neither player has reached 5 wins", () => {
    expect(getMatchOutcome({ player1Wins: 0, player2Wins: 0 })).toBe("ongoing");
    expect(getMatchOutcome({ player1Wins: 1, player2Wins: 0 })).toBe("ongoing");
    expect(getMatchOutcome({ player1Wins: 0, player2Wins: 1 })).toBe("ongoing");
    expect(getMatchOutcome({ player1Wins: 4, player2Wins: 4 })).toBe("ongoing");
  });

  it("identifies player1 victory at 5 wins", () => {
    expect(getMatchOutcome({ player1Wins: 5, player2Wins: 0 })).toBe("player1_wins");
    expect(getMatchOutcome({ player1Wins: 5, player2Wins: 4 })).toBe("player1_wins");
  });

  it("identifies player2 victory at 5 wins", () => {
    expect(getMatchOutcome({ player1Wins: 0, player2Wins: 5 })).toBe("player2_wins");
    expect(getMatchOutcome({ player1Wins: 4, player2Wins: 5 })).toBe("player2_wins");
  });

  it("simulates a clean 5-0 match terminating after 5 rounds", () => {
    const match = simulateMatch([
      { round_number: 1, player1_move: "rock", player2_move: "scissors", result: "player1_wins" },
      { round_number: 2, player1_move: "paper", player2_move: "rock", result: "player1_wins" },
      { round_number: 3, player1_move: "scissors", player2_move: "paper", result: "player1_wins" },
      { round_number: 4, player1_move: "rock", player2_move: "scissors", result: "player1_wins" },
      { round_number: 5, player1_move: "paper", player2_move: "rock", result: "player1_wins" },
      { round_number: 6, player1_move: "scissors", player2_move: "paper", result: "player1_wins" },
    ]);
    expect(match.outcome).toBe("player1_wins");
    expect(match.finalScore).toEqual({ player1Wins: 5, player2Wins: 0 });
    expect(match.totalRounds).toBe(5);
  });

  it("simulates an ongoing match", () => {
    const match = simulateMatch([
      { round_number: 1, player1_move: "rock", player2_move: "rock", result: "draw" },
      { round_number: 2, player1_move: "scissors", player2_move: "paper", result: "player1_wins" },
    ]);
    expect(match.outcome).toBe("ongoing");
    expect(match.finalScore).toEqual({ player1Wins: 1, player2Wins: 0 });
    expect(match.totalRounds).toBe(2);
  });

  it("verifies required wins constant is 5", () => {
    expect(WINS_REQUIRED).toBe(5);
  });

  it("provides emoji and label mappings for English and Tamil", () => {
    expect(MOVE_EMOJI.rock).toBe("🪨");
    expect(MOVE_EMOJI.paper).toBe("📄");
    expect(MOVE_EMOJI.scissors).toBe("✂️");

    expect(MOVE_LABEL_EN.rock).toBe("Rock");
    expect(MOVE_LABEL_EN.paper).toBe("Paper");
    expect(MOVE_LABEL_EN.scissors).toBe("Scissors");

    expect(MOVE_LABEL_TA.rock).toBe("கல்");
    expect(MOVE_LABEL_TA.paper).toBe("காகிதம்");
    expect(MOVE_LABEL_TA.scissors).toBe("கத்தரிக்கோல்");
  });
});

// ── 2. SQL Migration 0003 Audit ───────────────────────────────────────────────

describe("Migration 0003 — Table Structure & Integrity Constraints", () => {
  it("creates game_invites table with IF NOT EXISTS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.game_invites");
  });

  it("creates matches table with IF NOT EXISTS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.matches");
  });

  it("creates game_moves table with IF NOT EXISTS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.game_moves");
  });

  it("creates game_rounds table with IF NOT EXISTS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.game_rounds");
  });

  it("enforces no_self_invite constraint", () => {
    expect(migration).toMatch(/CONSTRAINT\s+no_self_invite\s+CHECK\s*\(\s*inviter_id\s*<>\s*invitee_id\s*\)/i);
  });

  it("normalises game invites pair with LEAST/GREATEST partial unique index", () => {
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_game_invite");
    expect(migration).toContain("LEAST(inviter_id, invitee_id)");
    expect(migration).toContain("GREATEST(inviter_id, invitee_id)");
    expect(migration).toContain("WHERE status = 'pending';");
  });

  it("ensures an accepted invitation links to at most one match via partial unique index", () => {
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS game_invites_match_id_unique");
    expect(migration).toContain("ON public.game_invites (match_id)");
    expect(migration).toContain("WHERE match_id IS NOT NULL;");
  });

  it("enforces no_self_match constraint", () => {
    expect(migration).toMatch(/CONSTRAINT\s+no_self_match\s+CHECK\s*\(\s*player1_id\s*<>\s*player2_id\s*\)/i);
  });

  it("enforces valid_scores non-negative constraint", () => {
    expect(migration).toMatch(/CONSTRAINT\s+valid_scores\s+CHECK\s*\(\s*player1_wins\s*>=\s*0\s+AND\s+player2_wins\s*>=\s*0\s*\)/i);
  });

  it("enforces unique move per player per round in game_moves", () => {
    expect(migration).toContain("UNIQUE (match_id, player_id, round_number)");
  });

  it("enforces unique resolved round per match in game_rounds", () => {
    expect(migration).toContain("UNIQUE (match_id, round_number)");
  });

  it("creates indexes on foreign keys and lookup columns", () => {
    expect(migration).toContain("game_invites_inviter_idx");
    expect(migration).toContain("game_invites_invitee_idx");
    expect(migration).toContain("matches_player1_idx");
    expect(migration).toContain("matches_player2_idx");
    expect(migration).toContain("game_moves_match_round_idx");
    expect(migration).toContain("game_rounds_match_idx");
  });
});

describe("Migration 0003 — Row Level Security & Move Privacy Audit", () => {
  it("enables RLS on game_invites", () => {
    expect(migration).toContain("ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;");
  });

  it("enables RLS on matches", () => {
    expect(migration).toContain("ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;");
  });

  it("enables RLS on game_moves", () => {
    expect(migration).toContain("ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;");
  });

  it("enables RLS on game_rounds", () => {
    expect(migration).toContain("ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;");
  });

  it("blocks direct client INSERT/UPDATE/DELETE on game_invites", () => {
    expect(migration).toMatch(/CREATE POLICY "gi_insert"\s+ON public\.game_invites FOR INSERT WITH CHECK \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "gi_update"\s+ON public\.game_invites FOR UPDATE USING \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "gi_delete"\s+ON public\.game_invites FOR DELETE USING \(FALSE\)/);
  });

  it("blocks direct client INSERT/UPDATE/DELETE on matches", () => {
    expect(migration).toMatch(/CREATE POLICY "m_insert"\s+ON public\.matches FOR INSERT WITH CHECK \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "m_update"\s+ON public\.matches FOR UPDATE USING \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "m_delete"\s+ON public\.matches FOR DELETE USING \(FALSE\)/);
  });

  it("blocks direct client INSERT/UPDATE/DELETE on game_moves", () => {
    expect(migration).toMatch(/CREATE POLICY "gm_insert"\s+ON public\.game_moves FOR INSERT WITH CHECK \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "gm_update"\s+ON public\.game_moves FOR UPDATE USING \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "gm_delete"\s+ON public\.game_moves FOR DELETE USING \(FALSE\)/);
  });

  it("blocks direct client INSERT/UPDATE/DELETE on game_rounds", () => {
    expect(migration).toMatch(/CREATE POLICY "gr_insert"\s+ON public\.game_rounds FOR INSERT WITH CHECK \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "gr_update"\s+ON public\.game_rounds FOR UPDATE USING \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "gr_delete"\s+ON public\.game_rounds FOR DELETE USING \(FALSE\)/);
  });

  it("CRITICAL: hidden moves policy ensures players only see opponent move AFTER round is resolved", () => {
    // Must allow auth.uid() = player_id (own move) OR EXISTS (game_rounds resolved for this round)
    expect(migration).toContain("auth.uid() = player_id");
    expect(migration).toContain("FROM public.game_rounds gr");
    expect(migration).toContain("gr.round_number = game_moves.round_number");
  });

  it("deliberately excludes game_moves from Realtime publication to prevent move sniffing", () => {
    expect(migration).not.toContain("ADD TABLE public.game_moves;");
    expect(migration).toContain("game_moves is intentionally excluded from Realtime");
  });
});

describe("Migration 0003 — SECURITY DEFINER Functions & Concurrency", () => {
  it("defines are_friends function with SECURITY DEFINER and participant privacy guard", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.are_friends");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public");
    // Defense-in-depth: prevents arbitrary friendship-graph enumeration
    expect(migration).toContain("auth.uid() IS NOT NULL AND auth.uid() <> a AND auth.uid() <> b");
  });

  it("defines send_game_invite requiring accepted friendship and catching race conditions", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.send_game_invite");
    expect(migration).toContain("public.are_friends(v_caller, p_invitee_id)");
    expect(migration).toContain("EXCEPTION WHEN unique_violation THEN");
    expect(migration).toContain("invite_pending");
    expect(migration).toContain("match_active");
  });

  it("defines respond_game_invite ensuring only invitee can respond, with row locking and idempotency", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.respond_game_invite");
    expect(migration).toContain("FROM public.game_invites");
    expect(migration).toContain("FOR UPDATE;");
    expect(migration).toContain("v_invite.invitee_id <> v_caller");
    expect(migration).toContain("forbidden");
    expect(migration).toContain("v_invite.status = 'accepted' AND p_action = 'accept'");
  });

  it("validates respond_game_invite action strictly, explicitly rejecting NULL and invalid actions", () => {
    // In PostgreSQL three-valued logic, `NULL NOT IN ('accept', 'decline')` evaluates to NULL,
    // which skips `IF ... THEN` blocks in PL/pgSQL and would fall through to acceptance logic.
    expect(migration).toContain("IF p_action IS NULL OR p_action NOT IN ('accept', 'decline') THEN");
    expect(migration).toContain("RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_action');");
  });

  it("validates submit_rps_move move parameter strictly, explicitly rejecting NULL and invalid moves", () => {
    expect(migration).toContain("IF p_move IS NULL OR p_move NOT IN ('rock', 'paper', 'scissors') THEN");
    expect(migration).toContain("RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_move'");
  });

  it("configures Realtime publication safely for matches, game_rounds, and game_invites while excluding game_moves", () => {
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;");
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;");
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;");
    expect(migration).not.toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;");
  });

  it("defines cancel_game_invite ensuring only inviter can cancel, with row locking and idempotency", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.cancel_game_invite");
    expect(migration).toContain("FOR UPDATE;");
    expect(migration).toContain("v_invite.inviter_id <> v_caller");
    expect(migration).toContain("v_invite.status = 'cancelled'");
  });

  it("defines submit_rps_move with row-level locking to prevent race conditions", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.submit_rps_move");
    expect(migration).toContain("FOR UPDATE;");
  });

  it("uses ON CONFLICT DO NOTHING on game_rounds to prevent double-resolve in concurrent submissions", () => {
    expect(migration).toContain("ON CONFLICT (match_id, round_number) DO NOTHING;");
  });

  it("handles submit_rps_move retries safely, locks committed moves, and completes uncompleted resolution", () => {
    // Rejects changing committed move
    expect(migration).toContain("v_existing <> v_my_move");
    expect(migration).toContain("code', 'move_locked'");
    // Returns already_submitted only if round is already resolved in game_rounds
    expect(migration).toContain("SELECT 1 FROM public.game_rounds");
    expect(migration).toContain("code', 'already_submitted'");
    // Allows same-move retry to proceed to resolution if opponent also submitted
    expect(migration).toContain("SELECT move INTO v_opp_move");
    expect(migration).toContain("code', 'waiting'");
    expect(migration).toContain("code', 'round_resolved'");
  });

  it("defines get_rps_match_state hiding opponent pending moves", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_rps_match_state");
    expect(migration).toContain("my_move_this_round");
    expect(migration).not.toContain("opp_move_this_round");
  });

  it("defines get_rps_history and get_game_invites functions with subquery LIMIT 50", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_rps_history");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_game_invites");
    // Verifies subquery pattern: aggregates from subquery so LIMIT 50 applies to individual items
    expect(migration).toContain("SELECT COALESCE(jsonb_agg(sub.item), '[]'::jsonb)");
    expect(migration).toContain("ORDER BY m.completed_at DESC\n    LIMIT 50");
    expect(migration).toContain("ORDER BY gi.created_at DESC\n    LIMIT 50");
  });

  it("revokes functions from PUBLIC, grants only authenticated users, and keeps helpers private", () => {
    expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.send_game_invite\s*\(UUID\)\s+FROM PUBLIC;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.send_game_invite\s*\(UUID\)\s+TO authenticated;/);
    expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.submit_rps_move\s*\(UUID,\s*TEXT\)\s+FROM PUBLIC;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.submit_rps_move\s*\(UUID,\s*TEXT\)\s+TO authenticated;/);
    expect(migration).toContain("REVOKE EXECUTE ON FUNCTION public._rps_result");
    expect(migration).toContain("REVOKE EXECUTE ON FUNCTION public.are_friends");
    // are_friends must NOT be granted to authenticated (prevents friendship-graph enumeration)
    expect(migration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.are_friends\s*\(UUID,\s*UUID\)\s+TO authenticated;/);
  });
});

// ── 3. API Routes Security & Validation Audit ────────────────────────────────

describe("RPS API Routes — Authentication & Authorization Audit", () => {
  it("POST /api/rps/invite verifies user session and validates UUID", () => {
    expect(inviteRoute).toContain("supabase.auth.getUser()");
    expect(inviteRoute).toContain("Not authenticated.");
    expect(inviteRoute).toContain("UUID_RE.test");
  });

  it("POST /api/rps/invite delegates friend verification and creation to DB function", () => {
    expect(inviteRoute).toContain("rpc(\"send_game_invite\"");
  });

  it("POST /api/rps/invite/respond requires authentication, valid action and invite UUID", () => {
    expect(respondRoute).toContain("supabase.auth.getUser()");
    expect(respondRoute).toContain("[\"accept\", \"decline\"].includes(body.action)");
    expect(respondRoute).toContain("UUID_RE.test");
    expect(respondRoute).toContain("rpc(\"respond_game_invite\"");
  });

  it("POST /api/rps/invite/cancel requires authentication and invite UUID", () => {
    expect(cancelRoute).toContain("supabase.auth.getUser()");
    expect(cancelRoute).toContain("UUID_RE.test");
    expect(cancelRoute).toContain("rpc(\"cancel_game_invite\"");
  });

  it("POST /api/rps/move validates move format before calling DB function", () => {
    expect(moveRoute).toContain("isValidMove(body.move)");
    expect(moveRoute).toContain("invalid_move");
    expect(moveRoute).toContain("rpc(\"submit_rps_move\"");
  });

  it("POST /api/rps/move never echoes back the opponent's unrevealed move", () => {
    expect(moveRoute).not.toContain("opponent_move");
    expect(moveRoute).not.toContain("opp_move");
  });

  it("GET /api/rps/state requires authentication and match_id UUID", () => {
    expect(stateRoute).toContain("supabase.auth.getUser()");
    expect(stateRoute).toContain("UUID_RE.test");
    expect(stateRoute).toContain("rpc(\"get_rps_match_state\"");
  });

  it("GET /api/rps/history requires authentication and calls get_rps_history", () => {
    expect(historyRoute).toContain("supabase.auth.getUser()");
    expect(historyRoute).toContain("rpc(\"get_rps_history\"");
  });
});

// ── 4. Types & i18n Audit ────────────────────────────────────────────────────

describe("RPS Types & i18n Completeness Audit", () => {
  it("defines RpsMove, RoundResult, InviteStatus, MatchPhase in database.ts", () => {
    expect(dbTypes).toContain("export type RpsMove = \"rock\" | \"paper\" | \"scissors\";");
    expect(dbTypes).toContain("export type RoundResult = \"player1_wins\" | \"player2_wins\" | \"draw\";");
    expect(dbTypes).toContain("export type InviteStatus = \"pending\" | \"accepted\" | \"declined\" | \"cancelled\" | \"expired\";");
    expect(dbTypes).toContain("export type MatchPhase = \"invited\" | \"active\" | \"completed\" | \"cancelled\";");
  });

  it("defines GameInvite, Match, GameMove, GameRound interfaces in database.ts", () => {
    expect(dbTypes).toContain("export interface GameInvite");
    expect(dbTypes).toContain("export interface Match");
    expect(dbTypes).toContain("export interface GameMove");
    expect(dbTypes).toContain("export interface GameRound");
  });

  it("includes all RPS RPC functions in Database definition", () => {
    expect(dbTypes).toContain("send_game_invite:");
    expect(dbTypes).toContain("respond_game_invite:");
    expect(dbTypes).toContain("cancel_game_invite:");
    expect(dbTypes).toContain("get_rps_match_state:");
    expect(dbTypes).toContain("submit_rps_move:");
    expect(dbTypes).toContain("get_rps_history:");
    expect(dbTypes).toContain("get_game_invites:");
  });

  it("provides all rps.* localization keys in en and ta", () => {
    const requiredKeys = [
      "rps.round",
      "rps.not_found",
      "rps.move_locked",
      "rps.match_not_active",
      "rps.connected",
      "rps.polling_fallback",
      "rps.you",
      "rps.opponent",
      "rps.you_won",
      "rps.draw",
      "rps.you_lost",
      "rps.match_over",
      "rps.rematch",
      "rps.view_history",
      "rps.waiting_opponent",
      "rps.choose_move",
      "rps.submit_move",
      "rps.round_history",
      "rps.load_error",
      "rps.not_friends",
      "rps.invite_pending",
      "rps.match_active",
      "rps.invite_sent",
      "rps.incoming_invites",
      "rps.accept",
      "rps.decline",
      "rps.sent_invites",
      "rps.cancel_invite",
      "rps.challenge_friend",
      "rps.no_friends",
      "rps.add_friends",
      "rps.challenge",
      "rps.no_history",
      "rps.win",
      "rps.loss",
    ];

    for (const key of requiredKeys) {
      expect(i18nSrc).toContain(`"${key}":`);
    }
  });
});
