/**
 * EVOAIQU — Rock, Paper, Scissors Game Logic
 *
 * Pure, side-effect-free TypeScript module.
 * All adjudication mirrors the server-side PostgreSQL logic in 0007_rps_first_to_five_and_timer.sql.
 * Used for: unit tests, UI display, move validation before API call.
 *
 * Format: FIRST TO 5 WINS
 * Each round has a 10-second deadline with atomic server-side timeout resolution.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type RpsMove = "rock" | "paper" | "scissors";
export type RoundMove = RpsMove | "timeout";

export type RoundResultCode = "player1_wins" | "player2_wins" | "draw";

export interface RoundResult {
  code: RoundResultCode;
  winner?: 1 | 2;   // undefined for draw
  isTimeout?: boolean;
}

export interface Round {
  round_number: number;
  player1_move: RoundMove;
  player2_move: RoundMove;
  result: RoundResultCode;
  resolved_at?: string;
}

export interface MatchScore {
  player1Wins: number;
  player2Wins: number;
}

export type MatchOutcome = "player1_wins" | "player2_wins" | "ongoing";

export const RPS_MOVES: RpsMove[] = ["rock", "paper", "scissors"];

export const WINS_REQUIRED = 5; // FIRST TO 5 round wins

// ── Move validation ───────────────────────────────────────────────────────────

export function isValidMove(move: string): move is RpsMove {
  return move === "rock" || move === "paper" || move === "scissors";
}

export function isValidRoundMove(move: string): move is RoundMove {
  return move === "rock" || move === "paper" || move === "scissors" || move === "timeout";
}

// ── Round adjudication ────────────────────────────────────────────────────────

/**
 * Determine the outcome of a single round.
 * Result is from the perspective of player1.
 *
 * Hand rules:
 *   Rock beats Scissors
 *   Scissors beats Paper
 *   Paper beats Rock
 *   Identical moves → draw
 *
 * Timeout rules (atomic server policy):
 *   - Neither submits before 10s deadline → draw (0 points)
 *   - Only player 1 submits → player 1 wins round (1 point)
 *   - Only player 2 submits → player 2 wins round (1 point)
 */
export function adjudicateRound(p1: RoundMove, p2: RoundMove): RoundResult {
  // Timeout cases
  if (p1 === "timeout" && p2 === "timeout") {
    return { code: "draw", isTimeout: true };
  }
  if (p1 !== "timeout" && p2 === "timeout") {
    return { code: "player1_wins", winner: 1, isTimeout: true };
  }
  if (p1 === "timeout" && p2 !== "timeout") {
    return { code: "player2_wins", winner: 2, isTimeout: true };
  }

  // Identical moves → draw
  if (p1 === p2) return { code: "draw" };

  const p1Wins =
    (p1 === "rock"     && p2 === "scissors") ||
    (p1 === "scissors" && p2 === "paper")    ||
    (p1 === "paper"    && p2 === "rock");

  if (p1Wins) return { code: "player1_wins", winner: 1 };
  return { code: "player2_wins", winner: 2 };
}

// ── Score calculation ─────────────────────────────────────────────────────────

/**
 * Compute running scores from a list of resolved rounds.
 * Draw rounds add zero to either score.
 */
export function computeScore(rounds: Pick<Round, "result">[]): MatchScore {
  let player1Wins = 0;
  let player2Wins = 0;
  for (const r of rounds) {
    if (r.result === "player1_wins") player1Wins++;
    else if (r.result === "player2_wins") player2Wins++;
  }
  return { player1Wins, player2Wins };
}

// ── Match outcome ─────────────────────────────────────────────────────────────

/**
 * Determine whether the match is finished and who won.
 * Returns 'ongoing' until either player reaches WINS_REQUIRED (5 wins).
 */
export function getMatchOutcome(score: MatchScore): MatchOutcome {
  if (score.player1Wins >= WINS_REQUIRED) return "player1_wins";
  if (score.player2Wins >= WINS_REQUIRED) return "player2_wins";
  return "ongoing";
}

/**
 * Given a full set of rounds and a WINS_REQUIRED target (5), simulate a match
 * and return when it ended (or 'ongoing').
 * Correctly ignores draw rounds for win counting purposes.
 */
export function simulateMatch(rounds: Round[]): {
  outcome: MatchOutcome;
  finalScore: MatchScore;
  totalRounds: number;
} {
  let p1 = 0;
  let p2 = 0;

  for (const round of rounds) {
    const result = adjudicateRound(round.player1_move, round.player2_move);
    if (result.winner === 1) p1++;
    else if (result.winner === 2) p2++;

    if (p1 >= WINS_REQUIRED || p2 >= WINS_REQUIRED) {
      return {
        outcome: p1 >= WINS_REQUIRED ? "player1_wins" : "player2_wins",
        finalScore: { player1Wins: p1, player2Wins: p2 },
        totalRounds: rounds.indexOf(round) + 1,
      };
    }
  }

  return {
    outcome: "ongoing",
    finalScore: { player1Wins: p1, player2Wins: p2 },
    totalRounds: rounds.length,
  };
}

// ── Move label helpers ────────────────────────────────────────────────────────

export const MOVE_EMOJI: Record<RoundMove, string> = {
  rock:     "🪨",
  paper:    "📄",
  scissors: "✂️",
  timeout:  "⏱️",
};

export const MOVE_LABEL_EN: Record<RoundMove, string> = {
  rock:     "Rock",
  paper:    "Paper",
  scissors: "Scissors",
  timeout:  "Time Expired",
};

export const MOVE_LABEL_TA: Record<RoundMove, string> = {
  rock:     "கல்",
  paper:    "காகிதம்",
  scissors: "கத்தரிக்கோல்",
  timeout:  "நேரம் முடிந்தது",
};

/**
 * Returns a human-readable outcome string for the caller.
 * 'myPerspective' is 1 if caller is player1, 2 if player2.
 */
export function roundOutcomeLabel(
  result: RoundResultCode,
  myPerspective: 1 | 2,
): "win" | "loss" | "draw" {
  if (result === "draw") return "draw";
  if (result === "player1_wins") return myPerspective === 1 ? "win" : "loss";
  return myPerspective === 2 ? "win" : "loss";
}
