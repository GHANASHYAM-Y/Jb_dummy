/**
 * EVOAIQU — Ludo board geometry on a 15x15 grid (row 0 = top, col 0 = left).
 * Yards: red bottom-left, green top-left, yellow top-right, blue bottom-right.
 * Centre (home triangles) is rows 6..8, cols 6..8.
 */

import { FINISHED, HOME_COLUMN_LENGTH, TRACK_LENGTH, YARD, absoluteSquare, type Color } from "./engine";

export const GRID = 15;

export interface Cell {
  row: number;
  col: number;
}

export const YARD_ORIGIN: Record<Color, Cell> = {
  red: { row: 9, col: 0 },
  green: { row: 0, col: 0 },
  yellow: { row: 0, col: 9 },
  blue: { row: 9, col: 9 },
};

/** The 52 shared squares, clockwise, starting at red's start square. */
const TRACK: Cell[] = (() => {
  const cells: Cell[] = [];
  const add = (row: number, col: number) => cells.push({ row, col });
  for (let r = 13; r >= 9; r--) add(r, 6); // 0..4   bottom arm, up
  for (let c = 5; c >= 0; c--) add(8, c); // 5..10  left arm, left
  add(7, 0); // 11
  for (let c = 0; c <= 5; c++) add(6, c); // 12..17 left arm, right (green start 13)
  for (let r = 5; r >= 0; r--) add(r, 6); // 18..23 top arm, up
  add(0, 7); // 24
  for (let r = 0; r <= 5; r++) add(r, 8); // 25..30 top arm, down (yellow start 26)
  for (let c = 9; c <= 14; c++) add(6, c); // 31..36 right arm, right
  add(7, 14); // 37
  for (let c = 14; c >= 9; c--) add(8, c); // 38..43 right arm, left (blue start 39)
  for (let r = 9; r <= 14; r++) add(r, 8); // 44..49 bottom arm, down
  add(14, 7); // 50
  add(14, 6); // 51
  return cells;
})();

/** Direction (row, col delta) each home column runs toward the centre. */
const HOME_COLUMN: Record<Color, { start: Cell; dr: number; dc: number }> = {
  red: { start: { row: 14, col: 7 }, dr: -1, dc: 0 },
  green: { start: { row: 7, col: 0 }, dr: 0, dc: 1 },
  yellow: { start: { row: 0, col: 7 }, dr: 1, dc: 0 },
  blue: { start: { row: 7, col: 14 }, dr: 0, dc: -1 },
};

/** Centre cell where finished tokens of each colour gather. */
const FINISH_CELL: Record<Color, Cell> = {
  red: { row: 8, col: 7 },
  green: { row: 7, col: 6 },
  yellow: { row: 6, col: 7 },
  blue: { row: 7, col: 8 },
};

const YARD_SPOTS: Cell[] = [
  { row: 1, col: 1 },
  { row: 1, col: 4 },
  { row: 4, col: 1 },
  { row: 4, col: 4 },
];

export function trackCell(square: number): Cell {
  const i = ((Math.trunc(square) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
  return { ...TRACK[i] };
}

export function homeColumnCell(color: Color, step: number): Cell {
  const s = Math.min(HOME_COLUMN_LENGTH, Math.max(1, Math.trunc(step)));
  const { start, dr, dc } = HOME_COLUMN[color];
  return { row: start.row + dr * s, col: start.col + dc * s };
}

export function yardCells(color: Color): Cell[] {
  const o = YARD_ORIGIN[color];
  return YARD_SPOTS.map((s) => ({ row: o.row + s.row, col: o.col + s.col }));
}

export function tokenCell(color: Color, progress: number, tokenIndex: number): Cell {
  if (progress === YARD || progress < 0) return yardCells(color)[((tokenIndex % 4) + 4) % 4];
  if (progress >= FINISHED) return { ...FINISH_CELL[color] };
  const square = absoluteSquare(color, progress);
  if (square !== null) return trackCell(square);
  return homeColumnCell(color, progress - 50);
}
