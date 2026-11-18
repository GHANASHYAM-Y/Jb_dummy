/**
 * Tic Tac Toe: pure rules and the computer opponent (no React, no network).
 */

export type Mark = "X" | "O";
export type Cell = Mark | null;
/** Nine cells, row by row: 0 1 2 / 3 4 5 / 6 7 8. */
export type Board = readonly Cell[];
export type Difficulty = "easy" | "medium" | "hard";

export const WINNING_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const EMPTY_BOARD: Board = Object.freeze(Array<Cell>(9).fill(null));

export function other(mark: Mark): Mark {
  return mark === "X" ? "O" : "X";
}

export interface Win {
  winner: Mark;
  line: readonly [number, number, number];
}

export function findWin(board: Board): Win | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const m = board[a];
    if (m && m === board[b] && m === board[c]) return { winner: m, line };
  }
  return null;
}

export function availableMoves(board: Board): number[] {
  const moves: number[] = [];
  board.forEach((cell, i) => {
    if (cell === null) moves.push(i);
  });
  return moves;
}

export function isFull(board: Board): boolean {
  return board.every((c) => c !== null);
}

export function isDraw(board: Board): boolean {
  return findWin(board) === null && isFull(board);
}

/** Returns a new board with `mark` placed, or the same board if the move is illegal. */
export function applyMove(board: Board, index: number, mark: Mark): Board {
  if (!Number.isInteger(index) || index < 0 || index > 8 || board[index] !== null) return board;
  if (findWin(board)) return board;
  const next = board.slice();
  next[index] = mark;
  return next;
}

/** Whose turn it is, given the marks already on the board and who opened. */
export function nextMark(board: Board, opener: Mark = "X"): Mark {
  const placed = board.filter((c) => c !== null).length;
  return placed % 2 === 0 ? opener : other(opener);
}

/** Minimax score from `me`'s point of view: positive is good. Faster wins score higher. */
function minimax(board: Board, turn: Mark, me: Mark, depth: number, alpha: number, beta: number): number {
  const win = findWin(board);
  if (win) return win.winner === me ? 10 - depth : depth - 10;
  if (isFull(board)) return 0;

  if (turn === me) {
    let best = -Infinity;
    for (const move of availableMoves(board)) {
      const score = minimax(applyMove(board, move, turn), other(turn), me, depth + 1, alpha, beta);
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const move of availableMoves(board)) {
    const score = minimax(applyMove(board, move, turn), other(turn), me, depth + 1, alpha, beta);
    best = Math.min(best, score);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

/** All moves that are equally best for `me`. */
export function bestMoves(board: Board, me: Mark): number[] {
  let top = -Infinity;
  let moves: number[] = [];
  for (const move of availableMoves(board)) {
    const score = minimax(applyMove(board, move, me), other(me), me, 1, -Infinity, Infinity);
    if (score > top) {
      top = score;
      moves = [move];
    } else if (score === top) {
      moves.push(move);
    }
  }
  return moves;
}

/** Chance each difficulty plays the perfect move instead of a random one. */
export const SMARTNESS: Record<Difficulty, number> = { easy: 0, medium: 0.6, hard: 1 };

/**
 * The computer's move. `rng` returns a number in [0, 1) and is injectable so
 * tests are deterministic. Returns -1 when no move is possible.
 */
export function computerMove(board: Board, me: Mark, difficulty: Difficulty, rng: () => number = Math.random): number {
  const open = availableMoves(board);
  if (open.length === 0 || findWin(board)) return -1;

  const pick = (list: number[]) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  const smart = rng() < SMARTNESS[difficulty];
  return pick(smart ? bestMoves(board, me) : open);
}
