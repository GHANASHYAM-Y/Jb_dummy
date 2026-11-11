import { describe, it, expect } from "vitest";
import {
  adjudicateRound,
  computeScore,
  getMatchOutcome,
  roundOutcomeLabel,
  simulateMatch,
  WINS_REQUIRED,
  type RpsMove,
  type Round,
} from "@/features/rock-paper-scissors/engine/rps";

describe("RPS All 9 Move Combinations & Matrix Adjudication", () => {
  const MOVES: RpsMove[] = ["rock", "paper", "scissors"];

  const EXPECTED_RESULTS: Record<string, { winner: 1 | 2 | 0; desc: string }> = {
    "rock:rock": { winner: 0, desc: "Rock vs Rock is a draw" },
    "rock:paper": { winner: 2, desc: "Paper covers Rock (Player 2 wins)" },
    "rock:scissors": { winner: 1, desc: "Rock crushes Scissors (Player 1 wins)" },
    "paper:rock": { winner: 1, desc: "Paper covers Rock (Player 1 wins)" },
    "paper:paper": { winner: 0, desc: "Paper vs Paper is a draw" },
    "paper:scissors": { winner: 2, desc: "Scissors cut Paper (Player 2 wins)" },
    "scissors:rock": { winner: 2, desc: "Rock crushes Scissors (Player 2 wins)" },
    "scissors:paper": { winner: 1, desc: "Scissors cut Paper (Player 1 wins)" },
    "scissors:scissors": { winner: 0, desc: "Scissors vs Scissors is a draw" },
  };

  MOVES.forEach((m1) => {
    MOVES.forEach((m2) => {
      const key = `${m1}:${m2}`;
      const expectation = EXPECTED_RESULTS[key];

      it(`correctly adjudicates ${m1} vs ${m2}: ${expectation.desc}`, () => {
        const res = adjudicateRound(m1, m2);
        if (expectation.winner === 0) {
          expect(res.code).toBe("draw");
          expect(res.winner).toBeUndefined();
          expect(roundOutcomeLabel(res.code, 1)).toBe("draw");
          expect(roundOutcomeLabel(res.code, 2)).toBe("draw");
        } else if (expectation.winner === 1) {
          expect(res.code).toBe("player1_wins");
          expect(res.winner).toBe(1);
          expect(roundOutcomeLabel(res.code, 1)).toBe("win");
          expect(roundOutcomeLabel(res.code, 2)).toBe("loss");
        } else {
          expect(res.code).toBe("player2_wins");
          expect(res.winner).toBe(2);
          expect(roundOutcomeLabel(res.code, 1)).toBe("loss");
          expect(roundOutcomeLabel(res.code, 2)).toBe("win");
        }
      });
    });
  });

  it("verifies symmetry across both players' viewpoints", () => {
    // When Player 1 plays Rock and Player 2 plays Scissors
    const p1Rock_p2Scissors = adjudicateRound("rock", "scissors");
    expect(roundOutcomeLabel(p1Rock_p2Scissors.code, 1)).toBe("win");
    expect(roundOutcomeLabel(p1Rock_p2Scissors.code, 2)).toBe("loss");

    // Symmetrical inverse: Player 1 plays Scissors and Player 2 plays Rock
    const p1Scissors_p2Rock = adjudicateRound("scissors", "rock");
    expect(roundOutcomeLabel(p1Scissors_p2Rock.code, 1)).toBe("loss");
    expect(roundOutcomeLabel(p1Scissors_p2Rock.code, 2)).toBe("win");
  });

  it("handles timeout matrix combinations correctly", () => {
    expect(adjudicateRound("timeout", "timeout")).toEqual({ code: "draw", isTimeout: true });
    expect(adjudicateRound("rock", "timeout")).toEqual({ code: "player1_wins", winner: 1, isTimeout: true });
    expect(adjudicateRound("timeout", "rock")).toEqual({ code: "player2_wins", winner: 2, isTimeout: true });
    expect(adjudicateRound("paper", "timeout")).toEqual({ code: "player1_wins", winner: 1, isTimeout: true });
    expect(adjudicateRound("timeout", "paper")).toEqual({ code: "player2_wins", winner: 2, isTimeout: true });
    expect(adjudicateRound("scissors", "timeout")).toEqual({ code: "player1_wins", winner: 1, isTimeout: true });
    expect(adjudicateRound("timeout", "scissors")).toEqual({ code: "player2_wins", winner: 2, isTimeout: true });
  });

  it("simulates full First to 5 match with all 9 move combinations in sequence", () => {
    const rounds: Round[] = [
      { round_number: 1, player1_move: "rock", player2_move: "rock", result: "draw" }, // 0-0
      { round_number: 2, player1_move: "rock", player2_move: "scissors", result: "player1_wins" }, // 1-0
      { round_number: 3, player1_move: "scissors", player2_move: "rock", result: "player2_wins" }, // 1-1
      { round_number: 4, player1_move: "paper", player2_move: "paper", result: "draw" }, // 1-1
      { round_number: 5, player1_move: "paper", player2_move: "rock", result: "player1_wins" }, // 2-1
      { round_number: 6, player1_move: "rock", player2_move: "paper", result: "player2_wins" }, // 2-2
      { round_number: 7, player1_move: "scissors", player2_move: "scissors", result: "draw" }, // 2-2
      { round_number: 8, player1_move: "scissors", player2_move: "paper", result: "player1_wins" }, // 3-2
      { round_number: 9, player1_move: "paper", player2_move: "scissors", result: "player2_wins" }, // 3-3
      { round_number: 10, player1_move: "rock", player2_move: "scissors", result: "player1_wins" }, // 4-3
      { round_number: 11, player1_move: "paper", player2_move: "rock", result: "player1_wins" }, // 5-3 (VICTORY)
      { round_number: 12, player1_move: "rock", player2_move: "paper", result: "player2_wins" }, // Uncounted post-completion
    ];

    const scoreAtEnd = computeScore(rounds.slice(0, 11));
    expect(scoreAtEnd).toEqual({ player1Wins: 5, player2Wins: 3 });
    expect(getMatchOutcome(scoreAtEnd)).toBe("player1_wins");

    const totalRawScore = computeScore(rounds);
    expect(totalRawScore).toEqual({ player1Wins: 5, player2Wins: 4 });

    const sim = simulateMatch(rounds);
    expect(sim.outcome).toBe("player1_wins");
    expect(sim.finalScore).toEqual({ player1Wins: 5, player2Wins: 3 });
    expect(sim.totalRounds).toBe(11);
    expect(WINS_REQUIRED).toBe(5);
  });
});
