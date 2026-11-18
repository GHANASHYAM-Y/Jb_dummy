/**
 * Memory Match: pure rules (no React, no timers, no network).
 *
 * The game is a reducer. The UI flips a card with `flip`, and after a mismatch
 * it waits a moment and applies `hideMismatch`.
 */

export type Level = "easy" | "medium" | "hard";

export interface LevelConfig {
  pairs: number;
  cols: number;
  label: string;
}

export const LEVELS: Record<Level, LevelConfig> = {
  easy: { pairs: 6, cols: 4, label: "Easy · 12 cards" },
  medium: { pairs: 8, cols: 4, label: "Medium · 16 cards" },
  hard: { pairs: 12, cols: 6, label: "Hard · 24 cards" },
};

export const SYMBOLS = ["🐶", "🐱", "🦊", "🐼", "🐸", "🦁", "🐵", "🐯", "🦄", "🐙", "🦋", "🐢", "🍎", "🍕", "⚽", "🚀"] as const;

export interface Card {
  id: number;
  symbol: string;
  faceUp: boolean;
  matched: boolean;
}

export interface GameState {
  level: Level;
  players: 1 | 2;
  cards: Card[];
  /** Indexes of face-up cards that have not been judged yet (0, 1 or 2). */
  open: number[];
  moves: number;
  /** Player whose turn it is: 0 or 1. */
  turn: 0 | 1;
  scores: [number, number];
  status: "playing" | "won";
}

/** Fisher–Yates shuffle. `rng` returns a number in [0, 1) and is injectable for tests. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(level: Level, players: 1 | 2, rng: () => number = Math.random): GameState {
  const { pairs } = LEVELS[level];
  const symbols = shuffle(SYMBOLS, rng).slice(0, pairs);
  const cards = shuffle([...symbols, ...symbols], rng).map<Card>((symbol, id) => ({
    id,
    symbol,
    faceUp: false,
    matched: false,
  }));
  return { level, players, cards, open: [], moves: 0, turn: 0, scores: [0, 0], status: "playing" };
}

/** True while two unmatched cards are showing and the UI must hide them before the next flip. */
export function isMismatchPending(state: GameState): boolean {
  if (state.open.length !== 2) return false;
  const [a, b] = state.open;
  return state.cards[a].symbol !== state.cards[b].symbol;
}

/** Flips the card at `index`. Illegal flips return the same state. */
export function flip(state: GameState, index: number): GameState {
  if (state.status !== "playing") return state;
  const card = state.cards[index];
  if (!card || card.faceUp || card.matched) return state;
  if (state.open.length >= 2) return state;

  const cards = state.cards.map((c, i) => (i === index ? { ...c, faceUp: true } : c));
  const open = [...state.open, index];

  if (open.length < 2) return { ...state, cards, open };

  const [a, b] = open;
  const moves = state.moves + 1;

  if (cards[a].symbol !== cards[b].symbol) {
    // Wait for hideMismatch(): the turn passes only once the cards are hidden
    return { ...state, cards, open, moves };
  }

  const matchedCards = cards.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
  const scores: [number, number] = [...state.scores];
  scores[state.turn] += 1;
  const won = matchedCards.every((c) => c.matched);
  // A player who finds a pair keeps their turn
  return { ...state, cards: matchedCards, open: [], moves, scores, status: won ? "won" : "playing" };
}

/** Turns a mismatched pair face down and passes the turn in two-player games. */
export function hideMismatch(state: GameState): GameState {
  if (!isMismatchPending(state)) return state;
  const cards = state.cards.map((c, i) => (state.open.includes(i) ? { ...c, faceUp: false } : c));
  const turn: 0 | 1 = state.players === 2 ? (state.turn === 0 ? 1 : 0) : state.turn;
  return { ...state, cards, open: [], turn };
}

export type Result = { kind: "solo" } | { kind: "winner"; player: 0 | 1 } | { kind: "tie" };

export function result(state: GameState): Result {
  if (state.players === 1) return { kind: "solo" };
  const [a, b] = state.scores;
  if (a === b) return { kind: "tie" };
  return { kind: "winner", player: a > b ? 0 : 1 };
}

/** Stars for a solo game: fewer moves is better. Perfect play needs `pairs` moves. */
export function stars(level: Level, moves: number): 1 | 2 | 3 {
  const { pairs } = LEVELS[level];
  if (moves <= Math.ceil(pairs * 1.6)) return 3;
  if (moves <= Math.ceil(pairs * 2.5)) return 2;
  return 1;
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const BEST_KEY_PREFIX = "evo-memory-match-best-";

export interface Best {
  moves: number;
  seconds: number;
}

/** A solo result beats the saved best when it uses fewer moves, or equal moves in less time. */
export function isNewBest(current: Best | null, next: Best): boolean {
  if (!current) return true;
  return next.moves < current.moves || (next.moves === current.moves && next.seconds < current.seconds);
}

export function parseBest(raw: string | null): Best | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Best>;
    if (typeof v.moves === "number" && typeof v.seconds === "number" && v.moves > 0 && v.seconds >= 0) {
      return { moves: v.moves, seconds: v.seconds };
    }
  } catch {
    // Corrupt value: treat as no best
  }
  return null;
}
