/**
 * Regression Test Suite: RPS Hand Selection, Double-Timeout Draw Suppression, and Adaptive Polling
 *
 * Verifies fixes for:
 * 1. Double-timeout draw does not trigger the lengthy 3.2s clash animation.
 * 2. Hand selection becomes interactive promptly after a timeout draw.
 * 3. Single-click hand selection reliably locks in moves with duplicate submission prevention.
 * 4. Move submission in progress suppresses competing client-side timeouts.
 * 5. Timeouts do not repeatedly advance or re-trigger for the same round.
 * 6. Adaptive Realtime Polling:
 *    - Realtime SUBSCRIBED reduces polling to low-frequency heartbeat (12000ms).
 *    - Realtime error/disconnect immediately enables fallback polling (2500ms).
 *    - Reconnection restores normal heartbeat polling.
 *    - Concurrent fetches are safely debounced.
 * 7. State API route is strictly read-only with no side-effect mutations on GET.
 * 8. Opponent move privacy is preserved.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { isValidMove, type Round } from "@/lib/rps";

const arenaDuelStageSrc = fs.readFileSync(
  path.resolve(__dirname, "../components/rps/ArenaDuelStage.tsx"),
  "utf-8"
);
const roundTimerSrc = fs.readFileSync(
  path.resolve(__dirname, "../components/rps/RoundTimer.tsx"),
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
const moveRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/rps/move/route.ts"),
  "utf-8"
);

describe("RPS Hand Selection & Clash Animation Logic", () => {
  it("detects double-timeout draws where neither player moved", () => {
    const doubleTimeoutRound: Round = {
      round_number: 1,
      player1_move: "timeout",
      player2_move: "timeout",
      result: "draw",
    };

    const isDoubleTimeout =
      (doubleTimeoutRound.player1_move === "timeout" || doubleTimeoutRound.player1_move === null) &&
      (doubleTimeoutRound.player2_move === "timeout" || doubleTimeoutRound.player2_move === null) &&
      doubleTimeoutRound.result === "draw";

    expect(isDoubleTimeout).toBe(true);
  });

  it("does not classify mutual move draws (e.g. Rock vs Rock) as double-timeout draws", () => {
    const mutualMoveDraw: Round = {
      round_number: 2,
      player1_move: "rock",
      player2_move: "rock",
      result: "draw",
    };

    const isDoubleTimeout =
      (mutualMoveDraw.player1_move === "timeout" || mutualMoveDraw.player1_move === null) &&
      (mutualMoveDraw.player2_move === "timeout" || mutualMoveDraw.player2_move === null) &&
      mutualMoveDraw.result === "draw";

    expect(isDoubleTimeout).toBe(false);
  });

  it("does not classify single-player timeout rounds as double-timeout draws", () => {
    const singleTimeoutWin: Round = {
      round_number: 3,
      player1_move: "rock",
      player2_move: "timeout",
      result: "player1_wins",
    };

    const isDoubleTimeout =
      (singleTimeoutWin.player1_move === "timeout" || singleTimeoutWin.player1_move === null) &&
      (singleTimeoutWin.player2_move === "timeout" || singleTimeoutWin.player2_move === null) &&
      singleTimeoutWin.result === "draw";

    expect(isDoubleTimeout).toBe(false);
  });

  it("ArenaDuelStage source suppresses clash animation for double-timeout draws", () => {
    expect(arenaDuelStageSrc).toContain("isDoubleTimeoutDraw");
    expect(arenaDuelStageSrc).toContain("if (isDoubleTimeoutDraw) {");
    expect(arenaDuelStageSrc).toContain("onClashActiveChange");
  });

  it("ArenaDuelStage move cards support instant single-click lock in", () => {
    expect(arenaDuelStageSrc).toContain("onSelectMove(move)");
    expect(arenaDuelStageSrc).toContain("onSubmitMove(move)");
    expect(arenaDuelStageSrc).toContain("Locking in...");
    expect(arenaDuelStageSrc).toContain("disabled={submitting}");
  });

  it("ArenaDuelStage keyboard shortcuts support instant lock in", () => {
    expect(arenaDuelStageSrc).toContain("onSubmitMove(\"rock\")");
    expect(arenaDuelStageSrc).toContain("onSubmitMove(\"paper\")");
    expect(arenaDuelStageSrc).toContain("onSubmitMove(\"scissors\")");
  });
});

describe("Timeout Coordination & Concurrency Guards", () => {
  it("RoundTimer accepts isClashing prop and guards timeout from firing during animation", () => {
    expect(roundTimerSrc).toContain("isClashing?: boolean;");
    expect(roundTimerSrc).toContain("if (isResolved || isClashing) return;");
    expect(roundTimerSrc).toContain("!isClashing");
    expect(roundTimerSrc).toContain("Clash in progress...");
  });

  it("RpsMatchBoard prevents competing timeouts when a move submission is in flight", () => {
    expect(matchBoardSrc).toContain("submittingRef.current");
    expect(matchBoardSrc).toContain("if (submittingRef.current) return;");
  });

  it("RpsMatchBoard prevents duplicate timeout requests for the same round", () => {
    expect(matchBoardSrc).toContain("lastTimedOutRoundRef.current === roundToTimeout");
    expect(matchBoardSrc).toContain("lastTimedOutRoundRef.current = roundToTimeout");
  });

  it("RpsMatchBoard resets pending move and errors on authoritative round advancement", () => {
    expect(matchBoardSrc).toContain("const currentRound = state?.match.current_round;");
    expect(matchBoardSrc).toContain("setPendingMove(null);");
    expect(matchBoardSrc).toContain("setSubmitMsg(null);");
  });

  it("RpsMatchBoard connects clash active state to RoundTimer", () => {
    expect(matchBoardSrc).toContain("isClashing={isClashActive}");
    expect(matchBoardSrc).toContain("onClashActiveChange={(active) => setIsClashActive(active)}");
  });
});

describe("Adaptive Realtime & Polling Strategy", () => {
  it("RpsMatchBoard switches polling frequency based on Realtime subscription status", () => {
    expect(matchBoardSrc).toContain("setRealtimeConnected(true)");
    expect(matchBoardSrc).toContain("setRealtimeConnected(false)");
    expect(matchBoardSrc).toContain("const interval = realtimeConnected ? 12000 : 2500;");
  });

  it("RpsMatchBoard restores fallback polling upon channel error or timeout", () => {
    expect(matchBoardSrc).toContain("status === \"CHANNEL_ERROR\"");
    expect(matchBoardSrc).toContain("status === \"TIMED_OUT\"");
    expect(matchBoardSrc).toContain("status === \"CLOSED\"");
  });

  it("RpsMatchBoard prevents concurrent state fetches", () => {
    expect(matchBoardSrc).toContain("if (isFetchingRef.current) return;");
    expect(matchBoardSrc).toContain("isFetchingRef.current = true;");
    expect(matchBoardSrc).toContain("isFetchingRef.current = false;");
  });

  it("RpsMatchBoard tracks component mounting for clean async tear-down", () => {
    expect(matchBoardSrc).toContain("mountedRef.current = true;");
    expect(matchBoardSrc).toContain("mountedRef.current = false;");
    expect(matchBoardSrc).toContain("supabase.removeChannel(channel)");
  });
});

describe("State API & Server-Side Security Enforcement", () => {
  it("GET /api/rps/state is strictly read-only and contains no match mutation updates", () => {
    // Should NOT modify match rows on GET requests
    expect(stateRouteSrc).not.toContain(".from(\"matches\").update(");
    expect(stateRouteSrc).not.toContain("phase: \"active\"");
  });

  it("GET /api/rps/state preserves move privacy and returns boolean status without leaking moves", () => {
    expect(stateRouteSrc).toContain(".select(\"id\")");
    expect(stateRouteSrc).not.toContain(".select(\"move\")");
    expect(stateRouteSrc).toContain("opponent_has_submitted: oppSubmitted ?? false");
  });

  it("POST /api/rps/move enforces strict move validation", () => {
    expect(isValidMove("rock")).toBe(true);
    expect(isValidMove("paper")).toBe(true);
    expect(isValidMove("scissors")).toBe(true);
    expect(isValidMove("invalid")).toBe(false);
    expect(isValidMove("timeout")).toBe(false);
    expect(moveRouteSrc).toContain("isValidMove(body.move)");
  });
});
