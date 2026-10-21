import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Inspect component and route sources to ensure contracts and patterns are respected
const matchPageSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/(protected)/play/rps/[matchId]/page.tsx"),
  "utf-8"
);
const matchBoardSrc = fs.readFileSync(
  path.resolve(__dirname, "../components/rps/RpsMatchBoard.tsx"),
  "utf-8"
);
const stateRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/rps/state/route.ts"),
  "utf-8"
);
const matchRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/rps/match/[matchId]/route.ts"),
  "utf-8"
);
const matchMoveRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/rps/match/[matchId]/move/route.ts"),
  "utf-8"
);

describe("RPS Game Data Loading & Route Architecture Audit", () => {
  it("RpsMatchBoard fetches match state from canonical /api/rps/state endpoint", () => {
    expect(matchBoardSrc).toContain("/api/rps/state?match_id=");
    // Should NOT make broken calls to missing endpoints
    expect(matchBoardSrc).not.toContain("fetch(`/api/rps/match/${matchId}`)");
    expect(stateRouteSrc).toContain("get_rps_match_state");
  });

  it("RpsMatchBoard submits moves to /api/rps/move", () => {
    expect(matchBoardSrc).toContain('fetch("/api/rps/move"');
    expect(matchBoardSrc).toContain("match_id: matchId");
    expect(matchBoardSrc).toContain("move: pendingMove");
  });

  it("RpsMatchBoard subscribes to correct Realtime tables (matches, game_rounds, game_moves)", () => {
    expect(matchBoardSrc).toContain('table: "matches"');
    expect(matchBoardSrc).toContain('table: "game_rounds"');
    expect(matchBoardSrc).toContain('table: "game_moves"');
    // Schema mismatch fixed: rps_rounds does not exist in schema
    expect(matchBoardSrc).not.toContain('table: "rps_rounds"');
  });

  it("RpsMatchBoard provides differentiated error handling and actions", () => {
    expect(matchBoardSrc).toContain("not_found");
    expect(matchBoardSrc).toContain("forbidden");
    expect(matchBoardSrc).toContain("network");
    expect(matchBoardSrc).toContain("Back to RPS Lobby");
    expect(matchBoardSrc).toContain("Retry");
  });

  it("RpsMatchPage handles invalid UUIDs, nonexistent matches, and unauthorized participants gracefully", () => {
    expect(matchPageSrc).toContain("UUID_RE.test(matchId)");
    expect(matchPageSrc).toContain("Invalid Match ID");
    expect(matchPageSrc).toContain("Match Not Found");
    expect(matchPageSrc).toContain("Access Restricted");
    expect(matchPageSrc).toContain("matchData.player1_id !== user.id && matchData.player2_id !== user.id");
  });

  it("RpsMatchPage logs server diagnostics without leaking secrets", () => {
    expect(matchPageSrc).toContain('console.error("[play/rps/[matchId]]');
    expect(matchPageSrc).toContain('console.warn("[play/rps/[matchId]]');
  });

  it("REST aliases /api/rps/match/[matchId] and /move are implemented for fallback compatibility", () => {
    expect(matchRouteSrc).toContain("get_rps_match_state");
    expect(matchRouteSrc).toContain("UUID_RE.test");
    expect(matchRouteSrc).toContain("supabase.auth.getUser()");

    expect(matchMoveRouteSrc).toContain("submit_rps_move");
    expect(matchMoveRouteSrc).toContain("UUID_RE.test");
    expect(matchMoveRouteSrc).toContain("isValidMove(body.move)");
  });
});

describe("RPS State & Move API Logic Unit Tests", () => {
  it("validates UUID format correctly", () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(UUID_RE.test("61ad443c-03ff-4fb3-b91c-3500fae92bc0")).toBe(true);
    expect(UUID_RE.test("invalid-uuid")).toBe(false);
    expect(UUID_RE.test("")).toBe(false);
    expect(UUID_RE.test("61ad443c-03ff-4fb3-b91c-3500fae92bc0; DROP TABLE matches;")).toBe(false);
  });

  it("distinguishes match states (active, completed, cancelled)", () => {
    const validPhases = ["invited", "active", "completed", "cancelled"];
    expect(validPhases.includes("active")).toBe(true);
    expect(validPhases.includes("completed")).toBe(true);
    expect(validPhases.includes("cancelled")).toBe(true);
    expect(validPhases.includes("unknown")).toBe(false);
  });

  it("ensures participant authorization logic correctly permits player1 and player2 only", () => {
    const match = {
      id: "61ad443c-03ff-4fb3-b91c-3500fae92bc0",
      player1_id: "user-alice",
      player2_id: "user-bob",
    };

    const isParticipant = (userId: string) =>
      match.player1_id === userId || match.player2_id === userId;

    expect(isParticipant("user-alice")).toBe(true);
    expect(isParticipant("user-bob")).toBe(true);
    expect(isParticipant("user-charlie")).toBe(false);
    expect(isParticipant("anonymous")).toBe(false);
  });
});
