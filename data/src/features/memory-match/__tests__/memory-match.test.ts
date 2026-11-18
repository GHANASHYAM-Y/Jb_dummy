/**
 * Memory Match: rules, scoring and page wiring.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  LEVELS,
  SYMBOLS,
  createGame,
  flip,
  formatTime,
  hideMismatch,
  isMismatchPending,
  isNewBest,
  parseBest,
  result,
  shuffle,
  stars,
  type GameState,
  type Level,
} from "../engine/engine";

const SRC = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf-8");

/** Deterministic rng so shuffles are repeatable. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Finds the indexes of a matching pair and a non-matching pair. */
function pairs(state: GameState) {
  const bySymbol = new Map<string, number[]>();
  state.cards.forEach((c, i) => bySymbol.set(c.symbol, [...(bySymbol.get(c.symbol) ?? []), i]));
  const groups = [...bySymbol.values()];
  return { match: groups[0] as [number, number], other: groups[1] as [number, number], groups };
}

describe("Memory Match deck", () => {
  it("builds the right number of cards with exactly two of each symbol", () => {
    for (const level of Object.keys(LEVELS) as Level[]) {
      const game = createGame(level, 1, seeded(7));
      expect(game.cards).toHaveLength(LEVELS[level].pairs * 2);
      const counts = new Map<string, number>();
      game.cards.forEach((c) => counts.set(c.symbol, (counts.get(c.symbol) ?? 0) + 1));
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
      expect(counts.size).toBe(LEVELS[level].pairs);
      expect(game.cards.every((c) => !c.faceUp && !c.matched)).toBe(true);
    }
  });

  it("has enough distinct symbols for the hardest level", () => {
    expect(new Set(SYMBOLS).size).toBe(SYMBOLS.length);
    expect(SYMBOLS.length).toBeGreaterThanOrEqual(LEVELS.hard.pairs);
  });

  it("shuffles without losing or duplicating items", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, seeded(3));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
  });
});

describe("Memory Match play", () => {
  it("keeps a matching pair face up and counts a move", () => {
    let g = createGame("easy", 1, seeded(2));
    const { match } = pairs(g);
    g = flip(g, match[0]);
    expect(g.moves).toBe(0);
    g = flip(g, match[1]);
    expect(g.moves).toBe(1);
    expect(g.cards[match[0]].matched && g.cards[match[1]].matched).toBe(true);
    expect(g.open).toEqual([]);
    expect(g.scores[0]).toBe(1);
  });

  it("holds a mismatch until hideMismatch, and blocks flips meanwhile", () => {
    let g = createGame("easy", 1, seeded(2));
    const { match, other } = pairs(g);
    g = flip(g, match[0]);
    g = flip(g, other[0]);
    expect(isMismatchPending(g)).toBe(true);
    expect(flip(g, other[1])).toBe(g); // third flip ignored
    g = hideMismatch(g);
    expect(isMismatchPending(g)).toBe(false);
    expect(g.cards[match[0]].faceUp).toBe(false);
    expect(g.cards[other[0]].faceUp).toBe(false);
    expect(g.moves).toBe(1);
  });

  it("ignores flipping the same card twice and matched cards", () => {
    let g = createGame("easy", 1, seeded(2));
    const { match } = pairs(g);
    g = flip(g, match[0]);
    expect(flip(g, match[0])).toBe(g);
    g = flip(g, match[1]);
    expect(flip(g, match[0])).toBe(g);
    expect(flip(g, -1)).toBe(g);
    expect(flip(g, 999)).toBe(g);
  });

  it("wins when every pair is found", () => {
    let g = createGame("easy", 1, seeded(5));
    for (const [a, b] of pairs(g).groups) {
      g = flip(g, a);
      g = flip(g, b);
    }
    expect(g.status).toBe("won");
    expect(g.moves).toBe(LEVELS.easy.pairs);
    expect(flip(g, 0)).toBe(g);
  });

  it("two players: a pair keeps the turn, a mismatch passes it", () => {
    let g = createGame("easy", 2, seeded(4));
    const { match, other } = pairs(g);
    g = flip(flip(g, match[0]), match[1]);
    expect(g.turn).toBe(0);
    expect(g.scores).toEqual([1, 0]);

    const rest = pairs(g).groups.filter((grp) => !g.cards[grp[0]].matched);
    g = flip(g, rest[0][0]);
    g = flip(g, rest[1][0]);
    g = hideMismatch(g);
    expect(g.turn).toBe(1);

    g = flip(flip(g, rest[0][0]), rest[0][1]);
    expect(g.scores).toEqual([1, 1]);
    expect(g.turn).toBe(1);
    expect(other).toBeDefined();
  });

  it("solo games never pass the turn", () => {
    let g = createGame("easy", 1, seeded(2));
    const { match, other } = pairs(g);
    g = hideMismatch(flip(flip(g, match[0]), other[0]));
    expect(g.turn).toBe(0);
  });

  it("decides a two-player result", () => {
    const base = createGame("easy", 2, seeded(1));
    expect(result({ ...base, scores: [4, 2] })).toEqual({ kind: "winner", player: 0 });
    expect(result({ ...base, scores: [2, 4] })).toEqual({ kind: "winner", player: 1 });
    expect(result({ ...base, scores: [3, 3] })).toEqual({ kind: "tie" });
    expect(result(createGame("easy", 1, seeded(1)))).toEqual({ kind: "solo" });
  });
});

describe("Memory Match scoring helpers", () => {
  it("awards fewer moves more stars", () => {
    expect(stars("medium", 8)).toBe(3);
    expect(stars("medium", 20)).toBe(2);
    expect(stars("medium", 40)).toBe(1);
  });

  it("formats time as m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(-3)).toBe("0:00");
  });

  it("only saves a best that is actually better", () => {
    expect(isNewBest(null, { moves: 20, seconds: 90 })).toBe(true);
    expect(isNewBest({ moves: 20, seconds: 90 }, { moves: 18, seconds: 200 })).toBe(true);
    expect(isNewBest({ moves: 20, seconds: 90 }, { moves: 20, seconds: 80 })).toBe(true);
    expect(isNewBest({ moves: 20, seconds: 90 }, { moves: 20, seconds: 95 })).toBe(false);
    expect(isNewBest({ moves: 20, seconds: 90 }, { moves: 25, seconds: 10 })).toBe(false);
  });

  it("ignores a corrupted saved best", () => {
    expect(parseBest(null)).toBeNull();
    expect(parseBest("not json")).toBeNull();
    expect(parseBest('{"moves":"x","seconds":1}')).toBeNull();
    expect(parseBest('{"moves":0,"seconds":1}')).toBeNull();
    expect(parseBest('{"moves":12,"seconds":34}')).toEqual({ moves: 12, seconds: 34 });
  });
});

describe("Memory Match wiring", () => {
  it("the page is public in middleware and listed in the Play menu", () => {
    expect(read("middleware.ts")).toContain('"/play/memory-match"');
    expect(read("core/navigation/AppNavigation.tsx")).toContain('href: "/play/memory-match"');
    expect(read("app/(protected)/play/memory-match/page.tsx")).toContain("MemoryMatch");
  });

  it("shuffles only after a button press, so server and browser render the same HTML", () => {
    const ui = read("features/memory-match/components/MemoryMatch.tsx");
    expect(ui).toContain("useReducer(reducer, null)");
    expect(ui).not.toMatch(/useReducer\(reducer, createGame/);
  });
});
