/**
 * Draw & Guess: engine rules, route wiring and migration safety.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BRUSH_COLORS,
  CANVAS_BG,
  MAX_POINTS_PER_STROKE,
  drawerPoints,
  guesserPoints,
  isRoomCode,
  isValidGuess,
  normalizeGuess,
  normalizeRoomCode,
  outcome,
  sanitizePoint,
  sanitizeStroke,
  secondsLeft,
  wordMask,
} from "../engine/engine";

const SRC = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf-8");
const migration = fs.readFileSync(path.resolve(SRC, "../supabase/migrations/0018_draw_guess.sql"), "utf-8");

describe("Draw & Guess engine", () => {
  it("normalises and validates room codes", () => {
    expect(normalizeRoomCode(" ab-c d1e ")).toBe("ABCD1");
    expect(isRoomCode("ABCDE")).toBe(true);
    expect(isRoomCode("abcde")).toBe(false);
    expect(isRoomCode("ABCD")).toBe(false);
    expect(isRoomCode(12345)).toBe(false);
  });

  it("normalises guesses the same way the server does", () => {
    expect(normalizeGuess("  Hot   AIR  Balloon ")).toBe("hot air balloon");
    expect(isValidGuess("cat")).toBe(true);
    expect(isValidGuess("   ")).toBe(false);
    expect(isValidGuess("x".repeat(41))).toBe(false);
    expect(isValidGuess(null)).toBe(false);
  });

  it("masks the word for guessers and shows it to the drawer", () => {
    expect(wordMask(null, 4)).toBe("_ _ _ _");
    expect(wordMask("kite", 4)).toBe("k i t e");
    expect(wordMask(null, null)).toBe("");
  });

  it("scores faster guesses higher and gives the drawer a share", () => {
    expect(guesserPoints(60)).toBe(110);
    expect(guesserPoints(0)).toBe(50);
    expect(guesserPoints(-5)).toBe(50);
    expect(drawerPoints(60)).toBe(55);
    expect(drawerPoints(0)).toBe(25);
  });

  it("computes seconds left without going negative", () => {
    const now = Date.parse("2026-01-01T00:00:10Z");
    expect(secondsLeft("2026-01-01T00:00:40Z", now)).toBe(30);
    expect(secondsLeft("2026-01-01T00:00:05Z", now)).toBe(0);
    expect(secondsLeft(null, now)).toBe(0);
  });

  it("decides the winner, including draws", () => {
    expect(outcome(100, 100)).toBe("draw");
    expect(outcome(120, 100)).toBe("host");
    expect(outcome(80, 100)).toBe("guest");
  });

  it("clamps points and rejects junk", () => {
    expect(sanitizePoint([2, -1])).toEqual([1, 0]);
    expect(sanitizePoint([0.5, 0.25])).toEqual([0.5, 0.25]);
    expect(sanitizePoint([NaN, 0])).toBeNull();
    expect(sanitizePoint("x")).toBeNull();
    expect(sanitizePoint([1, 2, 3])).toBeNull();
  });

  it("validates strokes that arrive over the network", () => {
    const good = { id: "a-1", color: BRUSH_COLORS[1], size: 9, points: [[0.1, 0.2], [0.3, 0.4]] };
    expect(sanitizeStroke(good)?.points).toHaveLength(2);
    expect(sanitizeStroke({ ...good, color: CANVAS_BG })).not.toBeNull(); // eraser
    expect(sanitizeStroke({ ...good, color: "red; background:url(x)" })).toBeNull();
    expect(sanitizeStroke({ ...good, id: "" })).toBeNull();
    expect(sanitizeStroke({ ...good, size: 9999 })?.size).toBe(40);
    expect(sanitizeStroke({ ...good, points: "nope" })).toBeNull();
    expect(sanitizeStroke(null)).toBeNull();

    const many = { ...good, points: Array.from({ length: MAX_POINTS_PER_STROKE + 50 }, () => [0.5, 0.5]) };
    expect(sanitizeStroke(many)?.points).toHaveLength(MAX_POINTS_PER_STROKE);
  });
});

describe("Draw & Guess routes", () => {
  const routes = [
    "app/api/draw-guess/create/route.ts",
    "app/api/draw-guess/join/route.ts",
    "app/api/draw-guess/room/[roomId]/route.ts",
    "app/api/draw-guess/room/[roomId]/advance/route.ts",
    "app/api/draw-guess/room/[roomId]/guess/route.ts",
  ];

  it("every route exists, requires a signed-in user and uses connection()", () => {
    for (const r of routes) {
      const code = read(r);
      expect(code, r).toContain("requireUser");
      expect(code, r).toContain("await connection()");
    }
  });

  it("validates the room id and the guess before calling the database", () => {
    expect(read("app/api/draw-guess/room/[roomId]/guess/route.ts")).toContain("isValidGuess");
    expect(read("app/api/draw-guess/room/[roomId]/guess/route.ts")).toContain("UUID_RE.test(roomId)");
    expect(read("app/api/draw-guess/join/route.ts")).toContain("isRoomCode");
  });

  it("never sends the secret word to the guesser in the client code", () => {
    const board = read("features/draw-guess/components/DrawGuessBoard.tsx");
    expect(board).toContain("wordMask(room.word, room.word_length)");
    expect(board).not.toMatch(/\.from\(["']draw_rooms["']\)/);
  });

  it("the lobby page is reachable and the room page needs a login", () => {
    expect(read("app/(protected)/play/draw-guess/[roomId]/page.tsx")).toContain("redirect(`/login?next=");
    expect(read("core/navigation/AppNavigation.tsx")).toContain('href: "/play/draw-guess"');
  });
});

describe("Draw & Guess migration 0018", () => {
  it("locks every table behind RLS and never lets clients read the room row", () => {
    expect(migration).toContain("ALTER TABLE public.draw_rooms   ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.draw_guesses ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.draw_words ENABLE ROW LEVEL SECURITY");
    expect(migration).toMatch(/draw_rooms_no_select"[\s\S]*?FOR SELECT USING \(FALSE\)/);
  });

  it("only returns the word to the drawer, or to everyone once the round is over", () => {
    expect(migration).toMatch(/WHEN v_reveal OR \(v_room\.status = 'drawing' AND v_uid = v_room\.drawer_id\) THEN v_room\.word/);
    expect(migration).toContain("ELSE NULL");
  });

  it("runs every mutation as SECURITY DEFINER with a fixed search_path", () => {
    for (const fn of ["draw_create_room", "draw_join_room", "draw_advance", "draw_guess", "draw_get_state", "draw_list_my_rooms"]) {
      const start = migration.indexOf(`FUNCTION public.${fn}(`);
      expect(start, fn).toBeGreaterThan(-1);
      const header = migration.slice(start, start + 400);
      expect(header, fn).toContain("SECURITY DEFINER");
      expect(header, fn).toContain("SET search_path = public");
    }
  });

  it("grants the public RPCs to signed-in users only and hides the helpers", () => {
    for (const fn of ["draw_create_room()", "draw_join_room(TEXT)", "draw_advance(UUID)", "draw_guess(UUID, TEXT)", "draw_get_state(UUID)"]) {
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${fn}`);
    }
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.draw_pick_word\(TEXT\[\]\)\s+FROM PUBLIC, anon, authenticated/);
    expect(migration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.draw_pick_word/);
  });

  it("stops the drawer guessing and blocks joining across a block", () => {
    expect(migration).toContain("drawer_cannot_guess");
    expect(migration).toContain("public.user_blocks");
  });
});
