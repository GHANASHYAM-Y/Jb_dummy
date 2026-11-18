/**
 * Draw & Guess: pure rules and helpers (no React, no network).
 *
 * The server is the source of truth for scores and secret words; these helpers
 * validate input early and shape what the board shows.
 */

import type { Stroke, StrokePoint } from "../types";

export const ROOM_CODE_RE = /^[A-Z0-9]{5}$/;
export const MAX_GUESS_LENGTH = 40;

export const BRUSH_COLORS = ["#1E1B24", "#E5484D", "#FF5A3C", "#FFC23D", "#14C49A", "#3B82F6", "#8C7BFF", "#8B5E3C"] as const;
export const BRUSH_SIZES = [4, 9, 16] as const;
export const CANVAS_BG = "#FFFFFF";
/** Safety caps so a modified client cannot flood the channel. */
export const MAX_STROKES = 400;
export const MAX_POINTS_PER_STROKE = 800;

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

export function isRoomCode(value: unknown): value is string {
  return typeof value === "string" && ROOM_CODE_RE.test(value);
}

/** Matches the server's normalisation: lower-case, trimmed, single spaces. */
export function normalizeGuess(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().toLowerCase();
}

export function isValidGuess(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const n = normalizeGuess(raw);
  return n.length >= 1 && n.length <= MAX_GUESS_LENGTH;
}

/**
 * The word as blanks for the guesser: "banana" -> "_ _ _ _ _ _".
 * Spaces in the word stay as gaps. When the real word is known it is shown as is.
 */
export function wordMask(word: string | null, length: number | null): string {
  if (word !== null) return word.split("").join(" ");
  return "_".repeat(length ?? 0).split("").join(" ");
}

/** Whole seconds left on the round clock, never negative. */
export function secondsLeft(deadlineIso: string | null, nowMs: number): number {
  if (!deadlineIso) return 0;
  return Math.max(0, Math.ceil((Date.parse(deadlineIso) - nowMs) / 1000));
}

/** Points a correct guess earns the guesser (mirrors draw_guess in the migration). */
export function guesserPoints(secondsRemaining: number): number {
  return 50 + Math.max(0, Math.floor(secondsRemaining));
}

/** Points the drawer earns when their drawing is guessed. */
export function drawerPoints(secondsRemaining: number): number {
  return 25 + Math.floor(Math.max(0, Math.floor(secondsRemaining)) / 2);
}

export type Outcome = "host" | "guest" | "draw";

export function outcome(hostScore: number, guestScore: number): Outcome {
  if (hostScore === guestScore) return "draw";
  return hostScore > guestScore ? "host" : "guest";
}

/** Clamps a received point into the canvas. Returns null for junk. */
export function sanitizePoint(p: unknown): StrokePoint | null {
  if (!Array.isArray(p) || p.length !== 2) return null;
  const [x, y] = p;
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
}

/** Validates a stroke that arrived over the network before drawing it. */
export function sanitizeStroke(raw: unknown): Stroke | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || s.id.length === 0 || s.id.length > 40) return null;
  const colorOk =
    typeof s.color === "string" && ((BRUSH_COLORS as readonly string[]).includes(s.color) || s.color === CANVAS_BG);
  if (!colorOk) return null;
  if (typeof s.size !== "number" || !Number.isFinite(s.size)) return null;
  if (!Array.isArray(s.points)) return null;
  const points: StrokePoint[] = [];
  for (const p of s.points.slice(0, MAX_POINTS_PER_STROKE)) {
    const clean = sanitizePoint(p);
    if (clean) points.push(clean);
  }
  return { id: s.id, color: s.color as string, size: Math.min(40, Math.max(1, s.size)), points };
}
