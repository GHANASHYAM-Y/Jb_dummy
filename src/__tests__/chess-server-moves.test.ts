/**
 * EVOAIQU — Speed Chess Server Authoritative Validation & Concurrency Tests
 * Milestone 6: Server Moves, Clocks, Migrations, and Route Security
 *
 * Verifies:
 *   1. Migration 0010 & 0011 static audits (isolation from RPS, RLS, atomic locks, RPCs).
 *   2. Route security audits (auth, participants, UUID regex, optimistic ply check, no client clock trust).
 *   3. Authoritative chess.js move execution, out-of-turn rejection, stale ply detection.
 *   4. FIDE Article 6.9 clock calculation and timeout claims.
 *   5. Resignation and draw negotiation flows.
 *
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  STARTING_FEN,
  calculateClocks,
  validateAndExecuteMove,
  handleTimeout,
  getCapturedPieces,
  getLegalMoves,
} from "@/lib/chess/engine";
import { ChessMatchState } from "@/lib/chess/types";

// ── File Paths for Static Security Audits ───────────────────────────────────

const migration0010Path = path.resolve(__dirname, "../../supabase/migrations/0010_chess.sql");
const migration0010 = fs.readFileSync(migration0010Path, "utf-8");

const migration0011Path = path.resolve(__dirname, "../../supabase/migrations/0011_chess_rpcs.sql");
const migration0011 = fs.readFileSync(migration0011Path, "utf-8");

const migration0012Path = path.resolve(__dirname, "../../supabase/migrations/0012_chess_rpc_security.sql");
const migration0012 = fs.readFileSync(migration0012Path, "utf-8");

const createRoutePath = path.resolve(__dirname, "../app/api/chess/create/route.ts");
const createRoute = fs.readFileSync(createRoutePath, "utf-8");

const getMatchRoutePath = path.resolve(__dirname, "../app/api/chess/match/[matchId]/route.ts");
const getMatchRoute = fs.readFileSync(getMatchRoutePath, "utf-8");

const moveRoutePath = path.resolve(__dirname, "../app/api/chess/match/[matchId]/move/route.ts");
const moveRoute = fs.readFileSync(moveRoutePath, "utf-8");

const resignRoutePath = path.resolve(__dirname, "../app/api/chess/match/[matchId]/resign/route.ts");
const resignRoute = fs.readFileSync(resignRoutePath, "utf-8");

const drawRoutePath = path.resolve(__dirname, "../app/api/chess/match/[matchId]/draw/route.ts");
const drawRoute = fs.readFileSync(drawRoutePath, "utf-8");

const timeoutRoutePath = path.resolve(__dirname, "../app/api/chess/match/[matchId]/timeout/route.ts");
const timeoutRoute = fs.readFileSync(timeoutRoutePath, "utf-8");

// ── 1. Database Migrations 0010 & 0011 Audits ───────────────────────────────

describe("Chess Migrations 0010 & 0011 Audit", () => {
  it("keeps chess completely isolated from RPS tables", () => {
    expect(migration0010).toContain("CREATE TABLE IF NOT EXISTS public.chess_matches");
    expect(migration0010).toContain("CREATE TABLE IF NOT EXISTS public.chess_moves");
    // Ensure RPS tables are untouched
    expect(migration0010).not.toContain("ALTER TABLE public.rps_matches");
    expect(migration0011).not.toContain("ALTER TABLE public.rps_matches");
  });

  it("enforces Row Level Security (RLS) on both chess tables", () => {
    expect(migration0010).toContain("ALTER TABLE public.chess_matches ENABLE ROW LEVEL SECURITY;");
    expect(migration0010).toMatch(/ALTER TABLE public\.chess_moves\s+ENABLE ROW LEVEL SECURITY;/);
  });

  it("restricts viewing chess matches to participants and completed match viewers", () => {
    expect(migration0010).toContain("chess_matches_select");
    expect(migration0010).toContain("auth.uid() = white_player_id");
    expect(migration0010).toContain("auth.uid() = black_player_id");
  });

  it("configures REPLICA IDENTITY FULL for Supabase Realtime diffs", () => {
    expect(migration0010).toContain("ALTER TABLE public.chess_matches REPLICA IDENTITY FULL;");
    expect(migration0010).toContain("supabase_realtime ADD TABLE public.chess_matches;");
  });

  it("implements atomic concurrency locking in apply_chess_move_atomic RPC", () => {
    // Row lock with FOR UPDATE
    expect(migration0011).toContain("SELECT * INTO v_match");
    expect(migration0011).toContain("FOR UPDATE");
    // Ply optimistic lock checking
    expect(migration0011).toContain("v_match.ply <> p_expected_ply");
    expect(migration0011).toContain("stale_ply");
    // Participant checking
    expect(migration0011).toContain("p_caller_id <> v_match.white_player_id");
  });

  it("updates matches table on checkmate or resignation so Dare Studio triggers", () => {
    expect(migration0011).toContain("UPDATE public.matches");
    expect(migration0011).toMatch(/phase\s+=\s+'completed'/);
    expect(migration0011).toMatch(/winner_id\s+=/);
  });

  it("revokes anonymous execution across all chess RPCs in Migration 0012", () => {
    expect(migration0012).toContain("REVOKE ALL ON FUNCTION public.create_chess_match(UUID, INT, INT, TEXT) FROM PUBLIC, anon;");
    expect(migration0012).toContain("REVOKE ALL ON FUNCTION public.apply_chess_move_atomic(UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, INT, TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC, anon, authenticated;");
    expect(migration0012).toContain("REVOKE ALL ON FUNCTION public.resign_chess_match(UUID) FROM PUBLIC, anon;");
    expect(migration0012).toContain("REVOKE ALL ON FUNCTION public.respond_chess_draw(UUID, TEXT) FROM PUBLIC, anon;");
    expect(migration0012).toContain("REVOKE ALL ON FUNCTION public.claim_chess_timeout(UUID, TEXT, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;");
  });

  it("restricts apply_chess_move_atomic strictly to service_role in Migration 0012", () => {
    expect(migration0012).toContain("GRANT EXECUTE ON FUNCTION public.apply_chess_move_atomic(UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, INT, TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO service_role;");
    expect(migration0012).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.apply_chess_move_atomic.*TO authenticated/);
    expect(migration0012).toContain("COALESCE(auth.role(), '') <> 'service_role'");
  });

  it("adjudicates timeouts authoritatively using FIDE 6.9 in claim_chess_timeout in Migration 0012", () => {
    expect(migration0012).toContain("v_opp_has_sufficient");
    expect(migration0012).toContain("insufficient_material");
    expect(migration0012).toContain("v_final_winner_id");
    expect(migration0012).toContain("search_path = public, pg_catalog");
  });
});

// ── 2. API Routes Security & Validation Audits ──────────────────────────────

describe("Chess API Routes Security Audits", () => {
  it("validates UUIDs and authenticates users in /api/chess/create", () => {
    expect(createRoute).toContain("UUID_RE");
    expect(createRoute).toContain("supabase.auth.getUser()");
    expect(createRoute).toContain("unauthenticated");
    expect(createRoute).toContain("create_chess_match");
  });

  it("enforces participant checks in /api/chess/match/[matchId]", () => {
    expect(getMatchRoute).toContain("UUID_RE");
    expect(getMatchRoute).toContain("user.id === chessMatch.white_player_id");
    expect(getMatchRoute).toContain("user.id === chessMatch.black_player_id");
    expect(getMatchRoute).toContain("Access denied. Participants only.");
    expect(getMatchRoute).toContain("calculateClocks");
    expect(getMatchRoute).toContain("getCapturedPieces");
    expect(getMatchRoute).toContain("getLegalMoves");
  });

  it("authoritatively validates moves and locks ply via service-role in /api/chess/match/[matchId]/move", () => {
    expect(moveRoute).toContain("chessMatch.ply !== expected_ply");
    expect(moveRoute).toContain("stale_ply");
    expect(moveRoute).toContain("validateAndExecuteMove");
    expect(moveRoute).toContain("createServiceRoleClient");
    expect(moveRoute).toContain("apply_chess_move_atomic");
  });

  it("authoritatively computes timeouts without trusting client timestamps in /api/chess/match/[matchId]/timeout", () => {
    expect(timeoutRoute).toContain("handleTimeout");
    expect(timeoutRoute).toContain("calculateClocks");
    expect(timeoutRoute).toContain("createServiceRoleClient");
    expect(timeoutRoute).toContain("claim_chess_timeout");
    // Must not accept client-submitted remaining time in body
    expect(timeoutRoute).not.toContain("req.remaining_time");
    expect(timeoutRoute).not.toContain("body.remaining_time");
  });

  it("supports resignation with participant verification in /api/chess/match/[matchId]/resign", () => {
    expect(resignRoute).toContain("resign_chess_match");
    expect(resignRoute).toContain("p_match_id: matchId");
  });

  it("supports draw offers and responses in /api/chess/match/[matchId]/draw", () => {
    expect(drawRoute).toContain("action");
    expect(drawRoute).toContain("respond_chess_draw");
    expect(drawRoute).toContain("offer");
    expect(drawRoute).toContain("accept");
    expect(drawRoute).toContain("decline");
  });
});

// ── 3. Server Authoritative Move & Concurrency Engine Execution ─────────────

describe("Server-Authoritative Move Execution & Concurrency Protections", () => {
  const whiteId = "11111111-1111-1111-1111-111111111111";
  const blackId = "22222222-2222-2222-2222-222222222222";
  const outsiderId = "99999999-9999-9999-9999-999999999999";

  const createInitialMatch = (): ChessMatchState => ({
    id: "match-123",
    white_player_id: whiteId,
    black_player_id: blackId,
    fen: STARTING_FEN,
    pgn: "",
    turn: "w",
    ply: 0,
    time_control_seconds: 300,
    increment_seconds: 5,
    white_time_remaining_ms: 300000,
    black_time_remaining_ms: 300000,
    last_move_at: new Date(Date.now() - 2000).toISOString(),
    is_check: false,
    is_checkmate: false,
    is_stalemate: false,
    is_draw: false,
    game_status: "active",
    winner_id: null,
    win_reason: null,
    draw_offered_by: null,
    resigned_by: null,
  });

  it("rejects moves from an outsider not in the match", () => {
    const match = createInitialMatch();
    const res = validateAndExecuteMove(match, outsiderId, { from: "e2", to: "e4" });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("not_a_participant");
  });

  it("rejects out-of-turn moves (Black attempting to move on White's turn)", () => {
    const match = createInitialMatch();
    const res = validateAndExecuteMove(match, blackId, { from: "e7", to: "e5" });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("out_of_turn");
  });

  it("rejects illegal chess moves", () => {
    const match = createInitialMatch();
    // Pawn jumping diagonally to empty square
    const res = validateAndExecuteMove(match, whiteId, { from: "e2", to: "d3" });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("illegal_move");
  });

  it("authoritatively executes a valid move and advances ply, turn, and increment", () => {
    const match = createInitialMatch();
    const now = Date.now();
    const res = validateAndExecuteMove(match, whiteId, { from: "e2", to: "e4" }, now);

    expect(res.ok).toBe(true);
    expect(res.san).toBe("e4");
    expect(res.nextState).toBeDefined();

    const next = res.nextState!;
    expect(next.turn).toBe("b");
    expect(next.ply).toBe(1);
    expect(next.fen).toContain("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq");
    // Clock should have deducted elapsed time (~2000ms) and added 5000ms increment
    expect(next.white_time_remaining_ms).toBeGreaterThan(298000);
  });

  it("detects and rejects stale moves when simulated in succession", () => {
    const match0 = createInitialMatch();
    const now = Date.now();

    // White moves e4
    const move1 = validateAndExecuteMove(match0, whiteId, { from: "e2", to: "e4" }, now);
    expect(move1.ok).toBe(true);
    const match1 = move1.nextState!;

    // Black attempts to move e5 against match0 (stale ply 0 instead of match1 ply 1)
    expect(match0.ply).toBe(0);
    expect(match1.ply).toBe(1);

    // If a client tried to execute a move against match0 turn, it would be 'w' turn, rejecting black
    const staleRes = validateAndExecuteMove(match0, blackId, { from: "e7", to: "e5" }, now);
    expect(staleRes.ok).toBe(false);
    expect(staleRes.code).toBe("out_of_turn");

    // But when playing against match1, Black moves legally
    const validBlackMove = validateAndExecuteMove(match1, blackId, { from: "e7", to: "e5" }, now + 1000);
    expect(validBlackMove.ok).toBe(true);
    expect(validBlackMove.nextState!.turn).toBe("w");
    expect(validBlackMove.nextState!.ply).toBe(2);
  });

  it("detects check state authoritatively", () => {
    // Fool's mate setup: 1. f3 e5 2. g4 Qh4#
    let state = createInitialMatch();
    const now = Date.now();

    // 1. f3
    state = validateAndExecuteMove(state, whiteId, { from: "f2", to: "f3" }, now).nextState!;
    // 1... e5
    state = validateAndExecuteMove(state, blackId, { from: "e7", to: "e5" }, now + 1000).nextState!;
    // 2. g4
    state = validateAndExecuteMove(state, whiteId, { from: "g2", to: "g4" }, now + 2000).nextState!;
    // 2... Qh4#
    const mateRes = validateAndExecuteMove(state, blackId, { from: "d8", to: "h4" }, now + 3000);

    expect(mateRes.ok).toBe(true);
    expect(mateRes.san).toBe("Qh4#");
    const endState = mateRes.nextState!;
    expect(endState.is_checkmate).toBe(true);
    expect(endState.game_status).toBe("checkmate");
    expect(endState.winner_id).toBe(blackId);
    expect(endState.win_reason).toBe("checkmate");
  });
});

// ── 4. Clock Calculation & Timeout Protection ───────────────────────────────

describe("Authoritative Clock & Timeout Verification", () => {
  const whiteId = "11111111-1111-1111-1111-111111111111";
  const blackId = "22222222-2222-2222-2222-222222222222";

  it("accurately calculates in-flight elapsed time for active player", () => {
    const matchTime = Date.now() - 10000; // Last move was 10 seconds ago
    const state: ChessMatchState = {
      id: "clock-test",
      white_player_id: whiteId,
      black_player_id: blackId,
      fen: STARTING_FEN,
      pgn: "",
      turn: "w",
      ply: 1, // White's turn after ply 0
      time_control_seconds: 60,
      increment_seconds: 0,
      white_time_remaining_ms: 60000,
      black_time_remaining_ms: 60000,
      last_move_at: new Date(matchTime).toISOString(),
      is_check: false,
      is_checkmate: false,
      is_stalemate: false,
      is_draw: false,
      game_status: "active",
      winner_id: null,
      win_reason: null,
      draw_offered_by: null,
      resigned_by: null,
    };

    const clocks = calculateClocks(state, Date.now());
    // White's clock should have 10,000ms deducted (~50,000ms remaining)
    expect(clocks.whiteRemainingMs).toBeLessThanOrEqual(50500);
    expect(clocks.whiteRemainingMs).toBeGreaterThanOrEqual(49000);
    // Black's clock should remain untouched at 60,000ms
    expect(clocks.blackRemainingMs).toBe(60000);
    expect(clocks.isTimedOut).toBe(false);
  });

  it("authoritatively detects when a player has run out of time", () => {
    const matchTime = Date.now() - 70000; // 70 seconds elapsed with 60s clock
    const state: ChessMatchState = {
      id: "clock-timeout",
      white_player_id: whiteId,
      black_player_id: blackId,
      fen: STARTING_FEN,
      pgn: "",
      turn: "w",
      ply: 1,
      time_control_seconds: 60,
      increment_seconds: 0,
      white_time_remaining_ms: 60000,
      black_time_remaining_ms: 60000,
      last_move_at: new Date(matchTime).toISOString(),
      is_check: false,
      is_checkmate: false,
      is_stalemate: false,
      is_draw: false,
      game_status: "active",
      winner_id: null,
      win_reason: null,
      draw_offered_by: null,
      resigned_by: null,
    };

    const timeoutRes = handleTimeout(state, Date.now());
    expect(timeoutRes.ok).toBe(true);
    expect(timeoutRes.nextState).toBeDefined();
    expect(timeoutRes.nextState!.game_status).toBe("timeout");
    // White timed out -> Black wins
    expect(timeoutRes.nextState!.winner_id).toBe(blackId);
  });

  it("does not allow timeout claim if neither player has expired", () => {
    const state: ChessMatchState = {
      id: "clock-ok",
      white_player_id: whiteId,
      black_player_id: blackId,
      fen: STARTING_FEN,
      pgn: "",
      turn: "w",
      ply: 1,
      time_control_seconds: 300,
      increment_seconds: 5,
      white_time_remaining_ms: 290000,
      black_time_remaining_ms: 300000,
      last_move_at: new Date().toISOString(),
      is_check: false,
      is_checkmate: false,
      is_stalemate: false,
      is_draw: false,
      game_status: "active",
      winner_id: null,
      win_reason: null,
      draw_offered_by: null,
      resigned_by: null,
    };

    const timeoutRes = handleTimeout(state, Date.now());
    expect(timeoutRes.ok).toBe(false);
    expect(timeoutRes.code).toBe("not_timed_out");
  });
});

// ── 5. Board State Helpers & Legal Moves ────────────────────────────────────

describe("Captured Pieces & Legal Move Calculation", () => {
  it("tracks starting captured pieces as empty with 0 advantage", () => {
    const captured = getCapturedPieces(STARTING_FEN);
    expect(captured.white).toHaveLength(0);
    expect(captured.black).toHaveLength(0);
    expect(captured.advantage).toBe(0);
  });

  it("calculates captures and material advantage accurately", () => {
    // White took black queen: black has no 'q', white captured 'q' (+9 advantage)
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const captured = getCapturedPieces(fen);
    expect(captured.white).toContain("q");
    expect(captured.advantage).toBe(9);
  });

  it("computes legal moves accurately for starting position", () => {
    const legalMoves = getLegalMoves(STARTING_FEN);
    // Standard starting position has 20 legal moves: 16 pawn moves (8 single, 8 double) + 4 knight moves
    expect(legalMoves).toHaveLength(20);
    expect(legalMoves.some((m) => m.from === "e2" && m.to === "e4")).toBe(true);
    expect(legalMoves.some((m) => m.from === "g1" && m.to === "f3")).toBe(true);
  });
});
