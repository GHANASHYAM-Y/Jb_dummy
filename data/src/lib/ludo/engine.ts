/**
 * EVOAIQU — Ludo rules engine (classic Indian rules)
 *
 * Pure and deterministic: randomness (dice) is supplied by the caller.
 * Token progress: -1 yard, 0..50 shared track (from the colour's own start
 * square), 51..55 home column, 56 finished.
 */

export const COLORS = ["red", "green", "yellow", "blue"] as const;
export type Color = (typeof COLORS)[number];

export const TRACK_LENGTH = 52;
export const HOME_COLUMN_LENGTH = 5;
export const YARD = -1;
export const FINISHED = 56;
/** Last progress value that is still on the shared track */
const LAST_TRACK_PROGRESS = 50;
const TOKENS_PER_COLOR = 4;

export const START_INDEX: Record<Color, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
export const STAR_SQUARES = [8, 21, 34, 47];
export const SAFE_SQUARES: number[] = [...COLORS.map((c) => START_INDEX[c]), ...STAR_SQUARES].sort(
  (a, b) => a - b,
);

export type PlayerKind = "human" | "bot";

export interface LudoPlayer {
  color: Color;
  kind: PlayerKind;
  userId: string | null;
  label: string;
}

export type LudoEvent =
  | { type: "roll"; color: Color; dice: number; noMoves: boolean; threeSixes: boolean }
  | {
      type: "move";
      color: Color;
      token: number;
      from: number;
      to: number;
      captured: { color: Color; token: number }[];
      finished: boolean;
      extraTurn: boolean;
    }
  | { type: "pass"; color: Color; reason: "timeout" | "no_moves" | "three_sixes" };

export interface LudoState {
  players: LudoPlayer[];
  tokens: Partial<Record<Color, number[]>>;
  turn: number;
  dice: number | null;
  sixesInRow: number;
  status: "playing" | "finished";
  winner: Color | null;
  moveCount: number;
  lastEvent: LudoEvent | null;
  /** Online games: turns each colour has let the clock run out on, in a row. */
  missedTurns?: Partial<Record<Color, number>>;
}

export function seatColors(count: 2 | 3 | 4): Color[] {
  if (count === 2) return ["red", "yellow"];
  if (count === 3) return ["red", "green", "yellow"];
  if (count === 4) return [...COLORS];
  throw new Error("Ludo needs 2 to 4 players");
}

export function createGame(players: LudoPlayer[]): LudoState {
  if (players.length < 2 || players.length > 4) throw new Error("Ludo needs 2 to 4 players");
  const colors = new Set(players.map((p) => p.color));
  if (colors.size !== players.length) throw new Error("Each player needs a different colour");
  for (const c of colors) if (!COLORS.includes(c)) throw new Error(`Unknown colour: ${String(c)}`);

  const seated = [...players]
    .sort((a, b) => COLORS.indexOf(a.color) - COLORS.indexOf(b.color))
    .map((p) => ({ ...p }));
  const tokens: Partial<Record<Color, number[]>> = {};
  for (const p of seated) tokens[p.color] = Array<number>(TOKENS_PER_COLOR).fill(YARD);

  return {
    players: seated,
    tokens,
    turn: 0,
    dice: null,
    sixesInRow: 0,
    status: "playing",
    winner: null,
    moveCount: 0,
    lastEvent: null,
  };
}

export function currentPlayer(state: LudoState): LudoPlayer {
  return state.players[state.turn];
}

export function absoluteSquare(color: Color, progress: number): number | null {
  if (!Number.isInteger(progress) || progress < 0 || progress > LAST_TRACK_PROGRESS) return null;
  return (START_INDEX[color] + progress) % TRACK_LENGTH;
}

export function isSafeSquare(square: number): boolean {
  return SAFE_SQUARES.includes(square);
}

function tokensOf(state: LudoState, color: Color): number[] {
  return state.tokens[color] ?? [];
}

function targetProgress(from: number, dice: number): number | null {
  if (from === YARD) return dice === 6 ? 0 : null;
  if (from >= FINISHED) return null;
  const to = from + dice;
  return to <= FINISHED ? to : null;
}

export function legalMoves(state: LudoState): number[] {
  if (state.status !== "playing" || state.dice === null) return [];
  const dice = state.dice;
  const moves: number[] = [];
  tokensOf(state, currentPlayer(state).color).forEach((p, i) => {
    if (targetProgress(p, dice) !== null) moves.push(i);
  });
  return moves;
}

function copyTokens(tokens: LudoState["tokens"]): LudoState["tokens"] {
  const out: LudoState["tokens"] = {};
  for (const c of COLORS) {
    const t = tokens[c];
    if (t) out[c] = [...t];
  }
  return out;
}

function nextTurn(state: LudoState): number {
  return (state.turn + 1) % state.players.length;
}

function assertPlaying(state: LudoState) {
  if (state.status !== "playing") throw new Error("The game is over");
}

export function applyRoll(state: LudoState, dice: number): { state: LudoState; event: LudoEvent } {
  assertPlaying(state);
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) throw new Error("Dice must be 1 to 6");
  if (state.dice !== null) throw new Error("Move with the current roll first");

  const color = currentPlayer(state).color;
  const sixesInRow = dice === 6 ? state.sixesInRow + 1 : 0;

  if (sixesInRow >= 3) {
    const event: LudoEvent = { type: "roll", color, dice, noMoves: false, threeSixes: true };
    return {
      event,
      state: {
        ...state,
        tokens: copyTokens(state.tokens),
        players: state.players.map((p) => ({ ...p })),
        turn: nextTurn(state),
        dice: null,
        sixesInRow: 0,
        moveCount: state.moveCount + 1,
        lastEvent: event,
      },
    };
  }

  const rolled: LudoState = {
    ...state,
    tokens: copyTokens(state.tokens),
    players: state.players.map((p) => ({ ...p })),
    dice,
    sixesInRow,
    moveCount: state.moveCount + 1,
  };
  const noMoves = legalMoves(rolled).length === 0;
  const event: LudoEvent = { type: "roll", color, dice, noMoves, threeSixes: false };
  if (noMoves) {
    return {
      event,
      state: { ...rolled, turn: nextTurn(state), dice: null, sixesInRow: 0, lastEvent: event },
    };
  }
  return { event, state: { ...rolled, lastEvent: event } };
}

export function applyMove(state: LudoState, token: number): { state: LudoState; event: LudoEvent } {
  assertPlaying(state);
  if (state.dice === null) throw new Error("Roll the dice first");
  if (!legalMoves(state).includes(token)) throw new Error("That token cannot move");

  const color = currentPlayer(state).color;
  const tokens = copyTokens(state.tokens);
  const mine = tokens[color]!;
  const from = mine[token];
  const to = targetProgress(from, state.dice)!;
  mine[token] = to;

  const captured: { color: Color; token: number }[] = [];
  const square = absoluteSquare(color, to);
  if (square !== null && !isSafeSquare(square)) {
    for (const p of state.players) {
      if (p.color === color) continue;
      const theirs = tokens[p.color]!;
      theirs.forEach((prog, i) => {
        if (absoluteSquare(p.color, prog) === square) {
          theirs[i] = YARD;
          captured.push({ color: p.color, token: i });
        }
      });
    }
  }

  const finished = to === FINISHED;
  const won = mine.every((p) => p === FINISHED);
  const extraTurn = !won && (state.dice === 6 || captured.length > 0 || finished);

  const event: LudoEvent = { type: "move", color, token, from, to, captured, finished, extraTurn };
  return {
    event,
    state: {
      ...state,
      players: state.players.map((p) => ({ ...p })),
      tokens,
      turn: extraTurn || won ? state.turn : nextTurn(state),
      dice: null,
      sixesInRow: extraTurn ? state.sixesInRow : 0,
      status: won ? "finished" : "playing",
      winner: won ? color : null,
      moveCount: state.moveCount + 1,
      lastEvent: event,
    },
  };
}

export function passTurn(state: LudoState, reason: "timeout"): { state: LudoState; event: LudoEvent } {
  assertPlaying(state);
  const event: LudoEvent = { type: "pass", color: currentPlayer(state).color, reason };
  return {
    event,
    state: {
      ...state,
      players: state.players.map((p) => ({ ...p })),
      tokens: copyTokens(state.tokens),
      turn: nextTurn(state),
      dice: null,
      sixesInRow: 0,
      moveCount: state.moveCount + 1,
      lastEvent: event,
    },
  };
}

/** Whether an opponent token could land on `square` with a single roll of 1..6. */
function inDanger(state: LudoState, tokens: LudoState["tokens"], color: Color, progress: number): boolean {
  const square = absoluteSquare(color, progress);
  if (square === null || isSafeSquare(square)) return false;
  for (const p of state.players) {
    if (p.color === color) continue;
    for (const prog of tokens[p.color] ?? []) {
      const theirSquare = absoluteSquare(p.color, prog);
      if (theirSquare === null) continue;
      const dist = (square - theirSquare + TRACK_LENGTH) % TRACK_LENGTH;
      if (dist >= 1 && dist <= 6 && prog + dist <= LAST_TRACK_PROGRESS) return true;
    }
  }
  return false;
}

export function chooseBotMove(state: LudoState, rng: () => number = Math.random): number | null {
  const moves = legalMoves(state);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const color = currentPlayer(state).color;
  const scored = moves.map((token) => {
    const { state: after, event } = applyMove(state, token);
    if (event.type !== "move") return { token, score: 0 };
    const { from, to } = event;
    let score: number;
    if (event.captured.length > 0) score = 10_000 + to;
    else if (event.finished) score = 9_000;
    else if (from === YARD) score = 8_000;
    else if (inDanger(state, state.tokens, color, from) && !inDanger(state, after.tokens, color, to))
      score = 7_000 + from;
    else if (!inDanger(state, after.tokens, color, to)) score = 5_000 + to;
    else score = 1_000 + to;
    return { token, score };
  });

  const best = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === best);
  const pick = Math.min(top.length - 1, Math.max(0, Math.floor(rng() * top.length)));
  return top[pick].token;
}

export function autoMove(state: LudoState): number | null {
  return chooseBotMove(state, () => 0);
}

export function rollDie(rng: () => number = Math.random): number {
  const n = Math.floor(rng() * 6) + 1;
  return Math.min(6, Math.max(1, n));
}

export function tokensHome(state: LudoState, color: Color): number {
  return tokensOf(state, color).filter((p) => p === FINISHED).length;
}

export function rotationFor(myColor: Color): 0 | 90 | 180 | 270 {
  switch (myColor) {
    case "red":
      return 0;
    case "blue":
      return 90;
    case "yellow":
      return 180;
    case "green":
      return 270;
  }
}
