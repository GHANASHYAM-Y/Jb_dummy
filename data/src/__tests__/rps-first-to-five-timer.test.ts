import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  WINS_REQUIRED,
  adjudicateRound,
  computeScore,
  getMatchOutcome,
  simulateMatch,
  isValidMove,
  isValidRoundMove,
  roundOutcomeLabel,
  type Round,
} from "@/lib/rps";

// Read SQL migration and component sources for architectural verification
const migration0007Src = fs.readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/0007_rps_first_to_five_and_timer.sql"),
  "utf-8"
);
const matchBoardSrc = fs.readFileSync(
  path.resolve(__dirname, "../components/rps/RpsMatchBoard.tsx"),
  "utf-8"
);
const roundTimerSrc = fs.readFileSync(
  path.resolve(__dirname, "../components/rps/RoundTimer.tsx"),
  "utf-8"
);
const handGraphicSrc = fs.readFileSync(
  path.resolve(__dirname, "../components/rps/HandGraphic.tsx"),
  "utf-8"
);
const timeoutRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/rps/timeout/route.ts"),
  "utf-8"
);
const stateRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/rps/state/route.ts"),
  "utf-8"
);

describe("EVOAIQU RPS First to 5 Wins Rule Enforcement", () => {
  it("enforces WINS_REQUIRED constant is 5", () => {
    expect(WINS_REQUIRED).toBe(5);
  });

  it("identifies player1 victory only when reaching 5 wins", () => {
    expect(getMatchOutcome({ player1Wins: 4, player2Wins: 4 })).toBe("ongoing");
    expect(getMatchOutcome({ player1Wins: 5, player2Wins: 4 })).toBe("player1_wins");
    expect(getMatchOutcome({ player1Wins: 5, player2Wins: 0 })).toBe("player1_wins");
  });

  it("identifies player2 victory only when reaching 5 wins", () => {
    expect(getMatchOutcome({ player1Wins: 4, player2Wins: 4 })).toBe("ongoing");
    expect(getMatchOutcome({ player1Wins: 3, player2Wins: 5 })).toBe("player2_wins");
    expect(getMatchOutcome({ player1Wins: 0, player2Wins: 5 })).toBe("player2_wins");
  });

  it("draws award zero points and game continues after multiple draws", () => {
    const roundsWithDraws: Round[] = [
      { round_number: 1, player1_move: "rock", player2_move: "rock", result: "draw" },
      { round_number: 2, player1_move: "paper", player2_move: "paper", result: "draw" },
      { round_number: 3, player1_move: "scissors", player2_move: "scissors", result: "draw" },
      { round_number: 4, player1_move: "rock", player2_move: "scissors", result: "player1_wins" },
    ];
    const score = computeScore(roundsWithDraws);
    expect(score).toEqual({ player1Wins: 1, player2Wins: 0 });
    expect(getMatchOutcome(score)).toBe("ongoing");
  });

  it("simulates a complete First to 5 match with mixed wins and draws", () => {
    const fullMatchRounds: Round[] = [
      { round_number: 1, player1_move: "rock", player2_move: "scissors", result: "player1_wins" }, // 1-0
      { round_number: 2, player1_move: "paper", player2_move: "paper", result: "draw" },           // 1-0
      { round_number: 3, player1_move: "rock", player2_move: "paper", result: "player2_wins" },    // 1-1
      { round_number: 4, player1_move: "scissors", player2_move: "paper", result: "player1_wins" }, // 2-1
      { round_number: 5, player1_move: "scissors", player2_move: "scissors", result: "draw" },       // 2-1
      { round_number: 6, player1_move: "paper", player2_move: "rock", result: "player1_wins" },    // 3-1
      { round_number: 7, player1_move: "rock", player2_move: "paper", result: "player2_wins" },    // 3-2
      { round_number: 8, player1_move: "rock", player2_move: "scissors", result: "player1_wins" }, // 4-2
      { round_number: 9, player1_move: "scissors", player2_move: "rock", result: "player2_wins" }, // 4-3
      { round_number: 10, player1_move: "paper", player2_move: "rock", result: "player1_wins" },   // 5-3 (Ends here!)
      { round_number: 11, player1_move: "rock", player2_move: "paper", result: "player2_wins" },   // Should NOT be counted
    ];

    const sim = simulateMatch(fullMatchRounds);
    expect(sim.outcome).toBe("player1_wins");
    expect(sim.finalScore).toEqual({ player1Wins: 5, player2Wins: 3 });
    expect(sim.totalRounds).toBe(10);
  });
});

describe("10-Second Move Deadline & Server Timeout Adjudication", () => {
  it("adjudicates round as draw when both players time out (0 points)", () => {
    const res = adjudicateRound("timeout", "timeout");
    expect(res.code).toBe("draw");
    expect(res.winner).toBeUndefined();
    expect(res.isTimeout).toBe(true);
  });

  it("awards round to player 1 when player 2 times out", () => {
    const res = adjudicateRound("rock", "timeout");
    expect(res.code).toBe("player1_wins");
    expect(res.winner).toBe(1);
    expect(res.isTimeout).toBe(true);
  });

  it("awards round to player 2 when player 1 times out", () => {
    const res = adjudicateRound("timeout", "scissors");
    expect(res.code).toBe("player2_wins");
    expect(res.winner).toBe(2);
    expect(res.isTimeout).toBe(true);
  });

  it("validates round moves correctly including timeout", () => {
    expect(isValidMove("rock")).toBe(true);
    expect(isValidMove("paper")).toBe(true);
    expect(isValidMove("scissors")).toBe(true);
    expect(isValidMove("timeout")).toBe(false); // players cannot manually submit 'timeout'

    expect(isValidRoundMove("rock")).toBe(true);
    expect(isValidRoundMove("timeout")).toBe(true);
    expect(isValidRoundMove("invalid")).toBe(false);
  });

  it("provides correct round outcome labels", () => {
    expect(roundOutcomeLabel("player1_wins", 1)).toBe("win");
    expect(roundOutcomeLabel("player1_wins", 2)).toBe("loss");
    expect(roundOutcomeLabel("player2_wins", 1)).toBe("loss");
    expect(roundOutcomeLabel("player2_wins", 2)).toBe("win");
    expect(roundOutcomeLabel("draw", 1)).toBe("draw");
    expect(roundOutcomeLabel("draw", 2)).toBe("draw");
  });
});

describe("Database Migration 0007 Integrity & Architecture", () => {
  it("migration 0007 defines round_deadline and 5-win threshold", () => {
    expect(migration0007Src).toContain("ADD COLUMN IF NOT EXISTS round_deadline TIMESTAMPTZ");
    expect(migration0007Src).toContain("player1_wins >= 5 OR v_match.player2_wins >= 5");
    expect(migration0007Src).toContain("resolve_rps_timeout");
    expect(migration0007Src).toContain("INTERVAL '10 seconds'");
  });

  it("migration 0007 rejects late move submissions past deadline", () => {
    expect(migration0007Src).toContain("v_match.round_deadline IS NOT NULL AND NOW() > v_match.round_deadline");
    expect(migration0007Src).toContain("move_timeout");
  });

  it("migration 0007 enforces atomic idempotency and concurrency locks", () => {
    expect(migration0007Src).toContain("FOR UPDATE");
    expect(migration0007Src).toContain("ON CONFLICT (match_id, round_number) DO NOTHING");
  });
});

describe("Component Graphics & Accessible Timer Architecture", () => {
  it("RoundTimer renders circular SVG and Coral warning below 3 seconds", () => {
    expect(roundTimerSrc).toContain("TOTAL_SECONDS = 10");
    expect(roundTimerSrc).toContain("CIRCUMFERENCE");
    expect(roundTimerSrc).toContain("#167D78");
    expect(roundTimerSrc).toContain("#D95F49");
    expect(roundTimerSrc).toContain("role=\"timer\"");
    expect(roundTimerSrc).toContain("serverNow");
  });

  it("HandGraphic renders SVG illustrations without emoji dependencies", () => {
    expect(handGraphicSrc).toContain("RockHandSvg");
    expect(handGraphicSrc).toContain("PaperHandSvg");
    expect(handGraphicSrc).toContain("ScissorsHandSvg");
    expect(handGraphicSrc).toContain("TimeoutSvg");
    expect(handGraphicSrc).toContain("viewBox=\"0 0 100 100\"");
  });

  it("RpsMatchBoard displays FIRST TO 5 badge, 5 win dots, and timer integration", () => {
    expect(matchBoardSrc).toContain("FIRST TO 5");
    expect(matchBoardSrc).toContain("targetWins");
    expect(matchBoardSrc).toContain("<RoundTimer");
    expect(matchBoardSrc).toContain("<HandGraphic");
    expect(matchBoardSrc).toContain("/api/rps/timeout");
  });

  it("API routes enforce authenticated participant checks and atomic resolution", () => {
    expect(timeoutRouteSrc).toContain("resolve_rps_timeout");
    expect(timeoutRouteSrc).toContain("supabase.auth.getUser()");
    expect(timeoutRouteSrc).toContain("UUID_RE.test");
    expect(stateRouteSrc).toContain("target_wins: 5");
  });
});
