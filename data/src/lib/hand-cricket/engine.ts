/**
 * EVOAIQU — Hand Cricket game logic
 *
 * Pure, side-effect-free TypeScript module.
 * The ball and innings rules mirror the server-side PostgreSQL logic in
 * supabase/migrations/0015_hand_cricket.sql (_hc_resolve_ball). Keep them in sync.
 *
 * Used for: the solo (vs computer) game, unit tests, and scoreboard display
 * for friend matches.
 *
 * Rules:
 *   - Each team has 11 players. An innings ends at 10 wickets (the last batter
 *     has no partner) or when the overs run out. Overs: 2, 3, 5 or 10.
 *   - Every ball both players throw 0–6 within a 5-second shot clock.
 *     0 is called DOK.
 *   - Same number (including both DOK): OUT.
 *   - Batter shows DOK: the batter scores the bowler's number.
 *   - Otherwise the batter scores the number they threw.
 *   - No hand from the batter: dot ball. No hand from the bowler: the
 *     batter's number counts (DOK with no bowler hand scores 0).
 *   - The second innings chases first-innings runs + 1. Equal totals tie.
 *   - Batting order is the squad order; the next batter comes in at each
 *     wicket. Overs are bowled by the last five players in rotation.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** 0 is DOK. */
export const THROW_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
export type ThrowValue = (typeof THROW_VALUES)[number];
export const DOK: ThrowValue = 0;

export const BALLS_PER_OVER = 6;
export const OVER_OPTIONS = [2, 3, 5, 10] as const;
export type OversOption = (typeof OVER_OPTIONS)[number];
export const DEFAULT_OVERS: OversOption = 2;
/** Balls per innings for the default overs (kept for display defaults). */
export const BALLS_PER_INNINGS = DEFAULT_OVERS * BALLS_PER_OVER;

export const PLAYERS_PER_TEAM = 11;
export const WICKETS_PER_INNINGS = PLAYERS_PER_TEAM - 1;
/** The last five players in the squad share the bowling, one over each in turn. */
export const BOWLERS_PER_TEAM = 5;
export const MAX_PLAYER_NAME_LENGTH = 20;

/** Time each player has to throw for one ball. */
export const SHOT_CLOCK_MS = 5_000;
/** Pause after a ball so both players can see the hands before the next one. */
export const REVEAL_PAUSE_MS = 2_000;
/** Pause between innings. */
export const INNINGS_BREAK_MS = 4_000;
/** Time the toss winner has to choose bat or bowl in a friend match. */
export const TOSS_WINDOW_MS = 20_000;
/** Server accepts throws this long after the shot clock (network tolerance). */
export const DEADLINE_TOLERANCE_MS = 1_000;

// ── Types ─────────────────────────────────────────────────────────────────────

/** "A" and "B" are the two sides. In friend matches A = player1, B = player2. */
export type Side = "A" | "B";

export type BallKind = "runs" | "out" | "dok" | "no_batter_hand" | "no_bowler_hand";

export interface BallOutcome {
  batterThrow: ThrowValue | null;
  bowlerThrow: ThrowValue | null;
  runs: number;
  isOut: boolean;
  kind: BallKind;
}

export interface BallRecord extends BallOutcome {
  innings: 1 | 2;
  /** 1-based ball number within the innings */
  ballNumber: number;
  batter: Side;
  bowler: Side;
  /** 0-based squad positions of the batter and bowler for this ball */
  batterIndex: number;
  bowlerIndex: number;
}

export interface InningsScore {
  runs: number;
  balls: number;
  wickets: number;
}

export type MatchStatus = "in_play" | "finished";

export interface HandCricketState {
  ballsPerInnings: number;
  firstBatter: Side;
  innings: 1 | 2;
  innings1: InningsScore;
  innings2: InningsScore;
  /** Runs needed to win in the second innings (first-innings runs + 1) */
  target: number | null;
  balls: BallRecord[];
  status: MatchStatus;
  winner: Side | null;
  isDraw: boolean;
}

export interface PlayBallResult {
  state: HandCricketState;
  ball: BallRecord;
  inningsOver: boolean;
  matchOver: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function otherSide(side: Side): Side {
  return side === "A" ? "B" : "A";
}

export function isValidThrow(value: unknown): value is ThrowValue {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

/** Converts a server/DB value (number or null) into a ThrowValue or null. */
export function toThrowValue(value: unknown): ThrowValue | null {
  return isValidThrow(value) ? value : null;
}

export function isOversOption(value: unknown): value is OversOption {
  return typeof value === "number" && (OVER_OPTIONS as readonly number[]).includes(value);
}

/** "DOK" for 0, otherwise the number. */
export function throwLabel(value: number | null): string {
  if (value === null) return "—";
  return value === DOK ? "DOK" : String(value);
}

/** The side batting in the given innings. */
export function battingSideFor(state: Pick<HandCricketState, "firstBatter">, innings: 1 | 2): Side {
  return innings === 1 ? state.firstBatter : otherSide(state.firstBatter);
}

export function currentBatter(state: HandCricketState): Side {
  return battingSideFor(state, state.innings);
}

export function currentBowler(state: HandCricketState): Side {
  return otherSide(currentBatter(state));
}

/** Score card for the innings in progress. */
export function currentInningsScore(state: HandCricketState): InningsScore {
  return state.innings === 1 ? state.innings1 : state.innings2;
}

/** Squad position (0-based) of the bowler for a 1-based ball number. */
export function bowlerIndexForBall(ballNumber: number): number {
  const overIndex = Math.floor((Math.max(1, ballNumber) - 1) / BALLS_PER_OVER);
  return PLAYERS_PER_TEAM - 1 - (overIndex % BOWLERS_PER_TEAM);
}

/** Squad position of the batter on strike, given wickets fallen so far. */
export function batterIndexForWickets(wickets: number): number {
  return Math.min(PLAYERS_PER_TEAM - 1, Math.max(0, wickets));
}

export function currentBatterIndex(state: HandCricketState): number {
  return batterIndexForWickets(currentInningsScore(state).wickets);
}

export function currentBowlerIndex(state: HandCricketState): number {
  return bowlerIndexForBall(currentInningsScore(state).balls + 1);
}

// ── Squads ────────────────────────────────────────────────────────────────────

export function defaultSquad(): string[] {
  return Array.from({ length: PLAYERS_PER_TEAM }, (_, i) => `Player ${i + 1}`);
}

export const BOT_SQUAD: readonly string[] = [
  "Bolt", "Spark", "Byte", "Pixel", "Turbo", "Glitch", "Nova", "Echo", "Blaze", "Rex", "Zed",
];

/**
 * Cleans a list of player names: exactly 11 entries, trimmed, 1–20 characters,
 * no control characters. Returns null when the list is not valid.
 */
export function sanitizeSquad(names: unknown): string[] | null {
  if (!Array.isArray(names) || names.length !== PLAYERS_PER_TEAM) return null;
  const cleaned: string[] = [];
  for (const name of names) {
    if (typeof name !== "string") return null;
    const trimmed = name.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (trimmed.length < 1 || trimmed.length > MAX_PLAYER_NAME_LENGTH) return null;
    cleaned.push(trimmed);
  }
  return cleaned;
}

// ── Ball adjudication ─────────────────────────────────────────────────────────

/**
 * Resolve one ball. `null` means that player did not throw before the shot
 * clock ran out.
 */
export function resolveBall(batterThrow: ThrowValue | null, bowlerThrow: ThrowValue | null): BallOutcome {
  if (batterThrow === null) {
    return { batterThrow, bowlerThrow, runs: 0, isOut: false, kind: "no_batter_hand" };
  }
  if (bowlerThrow !== null && batterThrow === bowlerThrow) {
    return { batterThrow, bowlerThrow, runs: 0, isOut: true, kind: "out" };
  }
  if (batterThrow === DOK) {
    return { batterThrow, bowlerThrow, runs: bowlerThrow ?? 0, isOut: false, kind: "dok" };
  }
  if (bowlerThrow === null) {
    return { batterThrow, bowlerThrow, runs: batterThrow, isOut: false, kind: "no_bowler_hand" };
  }
  return { batterThrow, bowlerThrow, runs: batterThrow, isOut: false, kind: "runs" };
}

/** Kind of a resolved ball from its stored throws (server rows have no kind). */
export function ballKindFrom(batterThrow: ThrowValue | null, bowlerThrow: ThrowValue | null): BallKind {
  return resolveBall(batterThrow, bowlerThrow).kind;
}

// ── Match progression ─────────────────────────────────────────────────────────

export function createMatch(firstBatter: Side, overs: number = DEFAULT_OVERS): HandCricketState {
  const safeOvers = isOversOption(overs) ? overs : DEFAULT_OVERS;
  return {
    ballsPerInnings: safeOvers * BALLS_PER_OVER,
    firstBatter,
    innings: 1,
    innings1: { runs: 0, balls: 0, wickets: 0 },
    innings2: { runs: 0, balls: 0, wickets: 0 },
    target: null,
    balls: [],
    status: "in_play",
    winner: null,
    isDraw: false,
  };
}

/**
 * Play one ball and return the next state. Never mutates the input.
 * Throws if the match is already finished.
 */
export function playBall(
  state: HandCricketState,
  batterThrow: ThrowValue | null,
  bowlerThrow: ThrowValue | null,
): PlayBallResult {
  if (state.status === "finished") {
    throw new Error("Match is already finished.");
  }

  const outcome = resolveBall(batterThrow, bowlerThrow);
  const batter = currentBatter(state);
  const score = currentInningsScore(state);

  const ball: BallRecord = {
    ...outcome,
    innings: state.innings,
    ballNumber: score.balls + 1,
    batter,
    bowler: otherSide(batter),
    batterIndex: batterIndexForWickets(score.wickets),
    bowlerIndex: bowlerIndexForBall(score.balls + 1),
  };

  const nextScore: InningsScore = {
    runs: score.runs + outcome.runs,
    balls: score.balls + 1,
    wickets: score.wickets + (outcome.isOut ? 1 : 0),
  };

  const balls = [...state.balls, ball];
  const allOutOrDone = nextScore.wickets >= WICKETS_PER_INNINGS || nextScore.balls >= state.ballsPerInnings;

  if (state.innings === 1) {
    return {
      state: {
        ...state,
        innings1: nextScore,
        innings: allOutOrDone ? 2 : 1,
        target: allOutOrDone ? nextScore.runs + 1 : null,
        balls,
      },
      ball,
      inningsOver: allOutOrDone,
      matchOver: false,
    };
  }

  const target = state.target ?? state.innings1.runs + 1;
  let winner: Side | null = null;
  let isDraw = false;
  let matchOver = false;

  if (nextScore.runs >= target) {
    matchOver = true;
    winner = batter;
  } else if (allOutOrDone) {
    matchOver = true;
    if (nextScore.runs === target - 1) {
      isDraw = true;
    } else {
      winner = otherSide(batter);
    }
  }

  return {
    state: {
      ...state,
      innings2: nextScore,
      target,
      balls,
      status: matchOver ? "finished" : "in_play",
      winner,
      isDraw,
    },
    ball,
    inningsOver: matchOver,
    matchOver,
  };
}

// ── Scorecards ────────────────────────────────────────────────────────────────

export interface BattingLine {
  index: number;
  runs: number;
  balls: number;
  isOut: boolean;
  batted: boolean;
}

export interface BowlingLine {
  index: number;
  balls: number;
  runs: number;
  wickets: number;
}

/** Batting card for one innings, in batting order (all 11 players). */
export function battingCard(state: HandCricketState, innings: 1 | 2): BattingLine[] {
  const lines: BattingLine[] = Array.from({ length: PLAYERS_PER_TEAM }, (_, index) => ({
    index,
    runs: 0,
    balls: 0,
    isOut: false,
    batted: false,
  }));
  for (const ball of state.balls) {
    if (ball.innings !== innings) continue;
    const line = lines[ball.batterIndex];
    line.batted = true;
    line.runs += ball.runs;
    line.balls += 1;
    if (ball.isOut) line.isOut = true;
  }
  // The batter still at the crease counts as batting (not out), even on 0 balls
  const score = innings === 1 ? state.innings1 : state.innings2;
  const inningsStarted = innings === 1 || state.innings === 2;
  if (inningsStarted && score.wickets < WICKETS_PER_INNINGS) {
    lines[score.wickets].batted = true;
  }
  return lines;
}

/** Bowling figures for one innings (only players who bowled). */
export function bowlingCard(state: HandCricketState, innings: 1 | 2): BowlingLine[] {
  const byIndex = new Map<number, BowlingLine>();
  for (const ball of state.balls) {
    if (ball.innings !== innings) continue;
    const line = byIndex.get(ball.bowlerIndex) ?? { index: ball.bowlerIndex, balls: 0, runs: 0, wickets: 0 };
    line.balls += 1;
    line.runs += ball.runs;
    if (ball.isOut) line.wickets += 1;
    byIndex.set(ball.bowlerIndex, line);
  }
  return [...byIndex.values()].sort((a, b) => b.index - a.index);
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** 8 balls -> "1.2" (overs.balls) */
export function formatOvers(balls: number): string {
  const safe = Math.max(0, Math.floor(balls));
  return `${Math.floor(safe / BALLS_PER_OVER)}.${safe % BALLS_PER_OVER}`;
}

/** Runs per over, to two decimals. 0 balls -> "0.00". */
export function runRate(runs: number, balls: number): string {
  if (balls <= 0) return "0.00";
  return ((runs / balls) * BALLS_PER_OVER).toFixed(2);
}

/** Balls of the current over for a ball list from one innings (0–6 balls). */
export function currentOverBalls<T extends { ballNumber: number }>(inningsBalls: T[]): T[] {
  if (inningsBalls.length === 0) return [];
  const last = inningsBalls[inningsBalls.length - 1];
  const overIndex = Math.floor((last.ballNumber - 1) / BALLS_PER_OVER);
  return inningsBalls.filter((b) => Math.floor((b.ballNumber - 1) / BALLS_PER_OVER) === overIndex);
}

/** Short label for a ball chip: "W", "•" (dot), or the runs. */
export function ballChipLabel(ball: Pick<BallOutcome, "isOut" | "runs">): string {
  if (ball.isOut) return "W";
  if (ball.runs === 0) return "•";
  return String(ball.runs);
}

export interface ChaseInfo {
  runsNeeded: number;
  ballsLeft: number;
  requiredRate: string;
}

export function chaseInfo(state: Pick<HandCricketState, "innings" | "target" | "innings2" | "ballsPerInnings">): ChaseInfo | null {
  if (state.innings !== 2 || state.target === null) return null;
  const runsNeeded = Math.max(0, state.target - state.innings2.runs);
  const ballsLeft = Math.max(0, state.ballsPerInnings - state.innings2.balls);
  return { runsNeeded, ballsLeft, requiredRate: runRate(runsNeeded, ballsLeft) };
}

/** "45/3" */
export function formatScore(score: Pick<InningsScore, "runs" | "wickets">): string {
  return `${score.runs}/${score.wickets}`;
}

/**
 * One-line result, e.g. "Asha won by 12 runs", "Ravi won by 7 wickets",
 * "Match tied at 31". `names` are the team names. Null while in play.
 */
export function resultSummary(state: HandCricketState, names: Record<Side, string>): string | null {
  if (state.status !== "finished") return null;
  if (state.isDraw) return `Match tied at ${state.innings1.runs}`;
  if (!state.winner) return null;

  const chasingSide = otherSide(state.firstBatter);
  if (state.winner === chasingSide) {
    const wicketsLeft = WICKETS_PER_INNINGS - state.innings2.wickets;
    const spare = state.ballsPerInnings - state.innings2.balls;
    const ballsText = spare > 0 ? ` with ${spare} ball${spare === 1 ? "" : "s"} to spare` : " off the last ball";
    return `${names[state.winner]} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}${ballsText}`;
  }

  const margin = state.innings1.runs - state.innings2.runs;
  return `${names[state.winner]} won by ${margin} run${margin === 1 ? "" : "s"}`;
}

// ── Commentary ────────────────────────────────────────────────────────────────

const RUN_LINES: Record<number, string[]> = {
  1: [
    "{batter} nudges it into the gap for a single.",
    "Quick single. {batter} keeps the board moving.",
    "{batter} taps one and scampers through.",
  ],
  2: [
    "{batter} works it wide for a couple.",
    "Two more. {batter} is running hard.",
    "Pushed into the outfield, they come back for the second.",
  ],
  3: [
    "Three! {batter} finds the long boundary and runs it out.",
    "{batter} threads the field and they hustle back for three.",
  ],
  4: [
    "FOUR! {batter} pierces the field.",
    "Cracking shot. {batter} races it away for four.",
    "That's crunched. Four to {batter}.",
  ],
  5: [
    "Five! {batter} picks up a rare one, overthrows included.",
    "{batter} gets five off that one. {bowler} won't enjoy the replay.",
  ],
  6: [
    "SIX! {batter} sends it into the stands.",
    "That's huge. {batter} clears the rope for six.",
    "Maximum! {bowler} can only watch it sail.",
  ],
};

const OUT_LINES = [
  "OUT! Both showed {throw}. {bowler} reads {batter} perfectly.",
  "Gone! {throw} meets {throw} and {batter} has to walk.",
  "Got 'em! {bowler} matches the {throw} and the stumps are rattled.",
  "OUT! {bowler} guessed {throw}. Great read.",
];

const DOK_LINES = [
  "DOK! {batter} hides the hand and takes {bowler}'s {runs}.",
  "Sneaky DOK from {batter}, who pinches {runs} off {bowler}.",
  "DOK! {bowler} threw {runs} and {batter} pockets the lot.",
];

const DOK_NOTHING_LINES = ["{batter} shows DOK but {bowler} missed the clock. Nothing to steal."];

const NO_BATTER_HAND_LINES = [
  "No hand from {batter}. Dot ball.",
  "{batter} froze on the clock. Nothing off that one.",
];

const NO_BOWLER_HAND_LINES = [
  "{bowler} missed the clock, so {batter} helps themselves to {runs}.",
  "No hand from {bowler}! {batter} takes {runs} for free.",
];

function pick(lines: string[], seed: number): string {
  return lines[Math.abs(seed) % lines.length];
}

/**
 * Commentary line for a ball. Deterministic for a given ball, so both
 * players in a friend match see the same line.
 */
export function commentaryFor(
  ball: Pick<BallRecord, "kind" | "runs" | "batterThrow" | "innings" | "ballNumber">,
  batterName: string,
  bowlerName: string,
): string {
  const seed = ball.innings * 31 + ball.ballNumber * 7 + (ball.batterThrow ?? 0);
  let line: string;

  switch (ball.kind) {
    case "out":
      line = pick(OUT_LINES, seed);
      break;
    case "dok":
      line = pick(ball.runs > 0 ? DOK_LINES : DOK_NOTHING_LINES, seed);
      break;
    case "no_batter_hand":
      line = pick(NO_BATTER_HAND_LINES, seed);
      break;
    case "no_bowler_hand":
      line = pick(NO_BOWLER_HAND_LINES, seed);
      break;
    default:
      line = pick(RUN_LINES[ball.runs] ?? ["{batter} scores {runs}."], seed);
  }

  return line
    .replaceAll("{batter}", batterName)
    .replaceAll("{bowler}", bowlerName)
    .replaceAll("{runs}", String(ball.runs))
    .replaceAll("{throw}", throwLabel(ball.batterThrow));
}

// ── Computer opponent ─────────────────────────────────────────────────────────

/** The computer's throw: uniformly random over 0–6, so it cannot be exploited. */
export function computerThrow(rng: () => number = Math.random): ThrowValue {
  const index = Math.min(THROW_VALUES.length - 1, Math.max(0, Math.floor(rng() * THROW_VALUES.length)));
  return THROW_VALUES[index];
}
