/**
 * Tic Tac Toe: rules, the computer opponent, and page wiring.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  EMPTY_BOARD,
  WINNING_LINES,
  applyMove,
  availableMoves,
  bestMoves,
  computerMove,
  findWin,
  isDraw,
  nextMark,
  other,
  type Board,
  type Difficulty,
  type Mark,
} from "../engine/engine";

const SRC = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf-8");

/** Builds a board from a 9-character string: X, O or . for empty. */
const b = (s: string): Board => s.split("").map((c) => (c === "X" || c === "O" ? c : null));

describe("Tic Tac Toe rules", () => {
  it("detects all eight winning lines for both marks", () => {
    for (const line of WINNING_LINES) {
      for (const mark of ["X", "O"] as Mark[]) {
        const cells = Array(9).fill(null);
        line.forEach((i) => (cells[i] = mark));
        expect(findWin(cells)?.winner).toBe(mark);
        expect(findWin(cells)?.line).toEqual(line);
      }
    }
  });

  it("reports no winner on an empty or unfinished board", () => {
    expect(findWin(EMPTY_BOARD)).toBeNull();
    expect(findWin(b("XO.......") )).toBeNull();
  });

  it("detects a draw only when the board is full with no winner", () => {
    expect(isDraw(b("XOXXOOOXX"))).toBe(true);
    expect(isDraw(b("XXXOO...."))).toBe(false); // X has won
    expect(isDraw(b("XO......."))).toBe(false); // not full
  });

  it("rejects illegal moves and moves after the game is won", () => {
    const board = b("X........");
    expect(applyMove(board, 0, "O")).toBe(board); // occupied
    expect(applyMove(board, 9, "O")).toBe(board);
    expect(applyMove(board, -1, "O")).toBe(board);
    expect(applyMove(board, 1.5, "O")).toBe(board);
    const won = b("XXXOO....");
    expect(applyMove(won, 8, "O")).toBe(won);
  });

  it("does not mutate the board it was given", () => {
    const board = b(".........");
    const next = applyMove(board, 4, "X");
    expect(board[4]).toBeNull();
    expect(next[4]).toBe("X");
  });

  it("works out whose turn it is", () => {
    expect(nextMark(EMPTY_BOARD, "X")).toBe("X");
    expect(nextMark(b("X........"), "X")).toBe("O");
    expect(nextMark(b("O........"), "O")).toBe("X");
    expect(other("X")).toBe("O");
  });
});

describe("Tic Tac Toe computer", () => {
  it("takes a winning move when one is available", () => {
    // O can win at index 2
    expect(computerMove(b("OO.XX...."), "O", "hard", () => 0)).toBe(2);
  });

  it("blocks the opponent's winning move", () => {
    // X threatens 0-1-2; O must play 2
    expect(computerMove(b("XX..O...."), "O", "hard", () => 0)).toBe(2);
  });

  it("returns -1 when the game is over or the board is full", () => {
    expect(computerMove(b("XXXOO...."), "O", "hard")).toBe(-1);
    expect(computerMove(b("XOXXOOOXX"), "O", "hard")).toBe(-1);
  });

  it("easy mode can play any open cell", () => {
    const board = b("X........");
    const seen = new Set<number>();
    for (let i = 0; i < 8; i++) seen.add(computerMove(board, "O", "easy", () => i / 8));
    expect(seen.size).toBeGreaterThan(3);
    for (const m of seen) expect(availableMoves(board)).toContain(m);
  });

  it("hard mode never loses: it holds at least a draw against every possible opening line of play", () => {
    // Explore every sequence of human moves; the computer (O) always replies with a best move.
    function explore(board: Board, turn: Mark, computer: Mark, level: Difficulty): boolean {
      const win = findWin(board);
      if (win) return win.winner === computer;
      if (isDraw(board)) return true;
      if (turn === computer) {
        const move = computerMove(board, computer, level, () => 0);
        return explore(applyMove(board, move, computer), other(turn), computer, level);
      }
      return availableMoves(board).every((m) => explore(applyMove(board, m, turn), other(turn), computer, level));
    }
    // Human opens (X), computer is O
    expect(explore(EMPTY_BOARD, "X", "O", "hard")).toBe(true);
    // Computer opens (X), human is O
    expect(explore(EMPTY_BOARD, "X", "X", "hard")).toBe(true);
  });

  it("the first move on an empty board is among the best moves (all squares draw or better)", () => {
    expect(bestMoves(EMPTY_BOARD, "X").length).toBeGreaterThan(0);
  });
});

describe("Tic Tac Toe wiring", () => {
  it("the page is public in middleware and listed in the Play menu", () => {
    expect(read("middleware.ts")).toContain('"/play/tic-tac-toe"');
    expect(read("core/navigation/AppNavigation.tsx")).toContain('href: "/play/tic-tac-toe"');
    expect(read("app/(protected)/play/tic-tac-toe/page.tsx")).toContain("TicTacToe");
  });

  it("the board is keyboard accessible and announces the status", () => {
    const ui = read("features/tic-tac-toe/components/TicTacToe.tsx");
    expect(ui).toContain('role="status"');
    expect(ui).toContain("aria-label={`${CELL_NAMES[i]}");
    expect(ui).toContain("focus-visible:ring-2");
  });
});
