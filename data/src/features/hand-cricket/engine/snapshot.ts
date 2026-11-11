/**
 * EVOAIQU — Hand Cricket snapshot helpers
 *
 * Converts a friend-match snapshot from the server into the engine's
 * HandCricketState so friend matches and solo matches share the same
 * scoreboard, chase and result helpers. Pure and client-safe.
 *
 * Side "A" is always player1 and side "B" is player2.
 */

import {
  ballKindFrom,
  batterIndexForWickets,
  bowlerIndexForBall,
  defaultSquad,
  sanitizeSquad,
  toThrowValue,
  type BallRecord,
  type HandCricketState,
  type Side,
} from "./engine";
import type { HandCricketSnapshot } from "../types";

export function sideOfPlayer(snapshot: Pick<HandCricketSnapshot, "match">, playerId: string | null): Side | null {
  if (!playerId) return null;
  if (playerId === snapshot.match.player1_id) return "A";
  if (playerId === snapshot.match.player2_id) return "B";
  return null;
}

export function playerIdOfSide(snapshot: Pick<HandCricketSnapshot, "match">, side: Side): string {
  return side === "A" ? snapshot.match.player1_id : snapshot.match.player2_id;
}

/** Both squads (11 names each), falling back to defaults for bad data. */
export function squadsOf(snapshot: Pick<HandCricketSnapshot, "game">): Record<Side, string[]> {
  return {
    A: sanitizeSquad(snapshot.game.player1_squad) ?? defaultSquad(),
    B: sanitizeSquad(snapshot.game.player2_squad) ?? defaultSquad(),
  };
}

/**
 * Engine view of a friend match, or null while the toss is still undecided
 * (nobody is batting yet).
 */
export function snapshotToState(snapshot: HandCricketSnapshot): HandCricketState | null {
  const { game, match } = snapshot;
  if (!game.toss_decision) return null;

  const tossWinnerSide = sideOfPlayer(snapshot, game.toss_winner_id);
  if (!tossWinnerSide) return null;
  const firstBatter: Side =
    game.toss_decision === "bat" ? tossWinnerSide : tossWinnerSide === "A" ? "B" : "A";

  // Batter and bowler positions follow from the ball order: the batter on
  // strike is the one in after the wickets so far; bowlers rotate by over.
  const wicketsSoFar: Record<1 | 2, number> = { 1: 0, 2: 0 };
  const rows = [...snapshot.balls].sort((a, b) => a.innings - b.innings || a.ball_number - b.ball_number);
  const balls: BallRecord[] = rows.map((row) => {
    const batterThrow = toThrowValue(row.batter_throw);
    const bowlerThrow = toThrowValue(row.bowler_throw);
    const batterIndex = batterIndexForWickets(wicketsSoFar[row.innings]);
    if (row.is_out) wicketsSoFar[row.innings] += 1;
    return {
      innings: row.innings,
      ballNumber: row.ball_number,
      batter: sideOfPlayer(snapshot, row.batter_id) ?? "A",
      bowler: sideOfPlayer(snapshot, row.bowler_id) ?? "B",
      batterIndex,
      bowlerIndex: bowlerIndexForBall(row.ball_number),
      batterThrow,
      bowlerThrow,
      runs: row.runs,
      isOut: row.is_out,
      kind: ballKindFrom(batterThrow, bowlerThrow),
    };
  });

  const finished = game.status === "finished" && match.phase === "completed";

  return {
    ballsPerInnings: game.balls_per_innings,
    firstBatter,
    innings: game.innings,
    innings1: { runs: game.innings1_runs, balls: game.innings1_balls, wickets: game.innings1_wickets },
    innings2: { runs: game.innings2_runs, balls: game.innings2_balls, wickets: game.innings2_wickets },
    target: game.target,
    balls,
    status: finished ? "finished" : "in_play",
    winner: finished ? sideOfPlayer(snapshot, match.winner_id) : null,
    isDraw: finished && match.is_draw,
  };
}

/** Milliseconds to add to Date.now() to approximate the server clock. */
export function clockOffsetMs(serverNowIso: string, receivedAtMs: number = Date.now()): number {
  const serverMs = Date.parse(serverNowIso);
  return Number.isNaN(serverMs) ? 0 : serverMs - receivedAtMs;
}

/** Key identifying the ball currently being played (for de-duplicating timeout claims). */
export function currentBallKey(snapshot: HandCricketSnapshot): string {
  return `${snapshot.game.innings}-${snapshot.game.ball_number}`;
}
