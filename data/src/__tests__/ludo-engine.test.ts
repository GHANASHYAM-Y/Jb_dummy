/**
 * EVOAIQU — Ludo engine and board geometry
 *
 * Covers:
 *  1. Setup: seats, colours, clockwise turn order
 *  2. Rolling: 6 to leave the yard, extra roll on 6, three 6s, no moves
 *  3. Moving: captures, safe squares, exact finish, home columns, win
 *  4. Bot heuristics and deterministic timeouts
 *  5. Board geometry and rotation
 *  6. Immutability
 */

import { describe, it, expect } from "vitest";
import {
  COLORS,
  FINISHED,
  SAFE_SQUARES,
  START_INDEX,
  STAR_SQUARES,
  TRACK_LENGTH,
  YARD,
  absoluteSquare,
  applyMove,
  applyRoll,
  autoMove,
  chooseBotMove,
  createGame,
  currentPlayer,
  isSafeSquare,
  legalMoves,
  passTurn,
  rollDie,
  rotationFor,
  seatColors,
  tokensHome,
  type Color,
  type LudoPlayer,
  type LudoState,
} from "@/lib/ludo/engine";
import {
  GRID,
  YARD_ORIGIN,
  homeColumnCell,
  tokenCell,
  trackCell,
  yardCells,
  type Cell,
} from "@/lib/ludo/board";
import { LUDO_TURN_MS } from "@/lib/ludo/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function players(colors: Color[]): LudoPlayer[] {
  return colors.map((color, i) => ({
    color,
    kind: i === 0 ? "human" : "bot",
    userId: i === 0 ? "me" : null,
    label: i === 0 ? "Me" : `Bot ${i}`,
  }));
}

/** A game with the given colours and token overrides, `turn` set to `turnColor`. */
function game(
  colors: Color[],
  tokens: Partial<Record<Color, number[]>> = {},
  turnColor: Color = colors[0],
  extra: Partial<LudoState> = {},
): LudoState {
  const s = createGame(players(colors));
  for (const [c, t] of Object.entries(tokens) as [Color, number[]][]) s.tokens[c] = [...t];
  s.turn = s.players.findIndex((p) => p.color === turnColor);
  return { ...s, ...extra };
}

/** Progress value that puts `color` on absolute track square `square`. */
function progressAt(color: Color, square: number): number {
  return (square - START_INDEX[color] + TRACK_LENGTH) % TRACK_LENGTH;
}

function rollAndMove(s: LudoState, dice: number, token: number) {
  const rolled = applyRoll(s, dice);
  return applyMove(rolled.state, token);
}

const chebyshev = (a: Cell, b: Cell) => Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
const inBlock = (c: Cell, o: Cell, size: number) =>
  c.row >= o.row && c.row < o.row + size && c.col >= o.col && c.col < o.col + size;
const inCentre = (c: Cell) => c.row >= 6 && c.row <= 8 && c.col >= 6 && c.col <= 8;

// ── 1. Setup ────────────────────────────────────────────────────────────────

describe("setup", () => {
  it("seatColors gives opposite corners for 2, three clockwise for 3, all for 4", () => {
    expect(seatColors(2)).toEqual(["red", "yellow"]);
    expect(seatColors(3)).toEqual(["red", "green", "yellow"]);
    expect(seatColors(4)).toEqual(["red", "green", "yellow", "blue"]);
  });

  it("createGame puts every token in the yard and red to move", () => {
    const s = createGame(players(["red", "green", "yellow", "blue"]));
    for (const c of COLORS) expect(s.tokens[c]).toEqual([YARD, YARD, YARD, YARD]);
    expect(currentPlayer(s).color).toBe("red");
    expect(s).toMatchObject({ turn: 0, dice: null, sixesInRow: 0, status: "playing", winner: null, moveCount: 0 });
  });

  it("createGame sorts seats into clockwise colour order and only tracks colours in play", () => {
    const s = createGame(players(["yellow", "red", "green"]));
    expect(s.players.map((p) => p.color)).toEqual(["red", "green", "yellow"]);
    expect(s.tokens.blue).toBeUndefined();
  });

  it("createGame rejects bad player lists", () => {
    expect(() => createGame(players(["red"]))).toThrow();
    expect(() => createGame([...players(["red", "green", "yellow", "blue"]), ...players(["red"])])).toThrow();
    expect(() => createGame(players(["red", "red"]))).toThrow();
  });

  it("safe squares are the four starts and four stars", () => {
    expect(SAFE_SQUARES).toEqual([0, 8, 13, 21, 26, 34, 39, 47]);
    for (const s of [...STAR_SQUARES, ...Object.values(START_INDEX)]) expect(isSafeSquare(s)).toBe(true);
    expect(isSafeSquare(1)).toBe(false);
    expect(isSafeSquare(10)).toBe(false);
  });

  it("LUDO_TURN_MS is 20 seconds", () => {
    expect(LUDO_TURN_MS).toBe(20_000);
  });
});

// ── 2. Rolling ──────────────────────────────────────────────────────────────

describe("rolling", () => {
  it("needs a 6 to leave the yard; anything else passes the turn", () => {
    const s = createGame(players(seatColors(2)));
    for (const d of [1, 2, 3, 4, 5]) {
      const { state, event } = applyRoll(s, d);
      expect(event).toEqual({ type: "roll", color: "red", dice: d, noMoves: true, threeSixes: false });
      expect(currentPlayer(state).color).toBe("yellow");
      expect(state.dice).toBeNull();
      expect(state.moveCount).toBe(1);
    }
    const six = applyRoll(s, 6);
    expect(six.event).toMatchObject({ noMoves: false, threeSixes: false });
    expect(six.state.dice).toBe(6);
    expect(legalMoves(six.state)).toEqual([0, 1, 2, 3]);
  });

  it("a token brought out on 6 sits at its start square and earns another roll", () => {
    const s = createGame(players(seatColors(2)));
    const { state, event } = rollAndMove(s, 6, 2);
    expect(state.tokens.red).toEqual([YARD, YARD, 0, YARD]);
    expect(absoluteSquare("red", 0)).toBe(START_INDEX.red);
    expect(event).toMatchObject({ type: "move", from: YARD, to: 0, extraTurn: true, captured: [] });
    expect(currentPlayer(state).color).toBe("red");
    expect(state.dice).toBeNull();
    expect(state.sixesInRow).toBe(1);
    expect(state.moveCount).toBe(2);
  });

  it("rolling a 6 on the track gives another roll", () => {
    const s = game(["red", "yellow"], { red: [10, YARD, YARD, YARD] });
    const { state, event } = rollAndMove(s, 6, 0);
    expect(state.tokens.red![0]).toBe(16);
    expect(event).toMatchObject({ extraTurn: true });
    expect(currentPlayer(state).color).toBe("red");
  });

  it("a non-6 move passes the turn and resets sixesInRow", () => {
    const s = game(["red", "yellow"], { red: [10, YARD, YARD, YARD] });
    const afterSix = rollAndMove(s, 6, 0).state;
    const { state, event } = rollAndMove(afterSix, 2, 0);
    expect(event).toMatchObject({ extraTurn: false });
    expect(currentPlayer(state).color).toBe("yellow");
    expect(state.sixesInRow).toBe(0);
  });

  it("three 6s in a row forfeits the third roll and passes the turn", () => {
    let s = game(["red", "yellow"], { red: [10, YARD, YARD, YARD] });
    s = rollAndMove(s, 6, 0).state;
    s = rollAndMove(s, 6, 0).state;
    expect(s.sixesInRow).toBe(2);
    const before = s.tokens.red!.slice();
    const { state, event } = applyRoll(s, 6);
    expect(event).toEqual({ type: "roll", color: "red", dice: 6, noMoves: false, threeSixes: true });
    expect(state.tokens.red).toEqual(before);
    expect(currentPlayer(state).color).toBe("yellow");
    expect(state.dice).toBeNull();
    expect(state.sixesInRow).toBe(0);
  });

  it("a non-6 after two 6s does not trigger the forfeit", () => {
    const s = game(["red", "yellow"], { red: [10, YARD, YARD, YARD] }, "red", { sixesInRow: 2 });
    const { state, event } = applyRoll(s, 4);
    expect(event).toMatchObject({ threeSixes: false, noMoves: false });
    expect(state.dice).toBe(4);
    expect(state.sixesInRow).toBe(0);
  });

  it("with no legal move the turn passes (even on a 6)", () => {
    const s = game(["red", "yellow"], { red: [FINISHED, FINISHED, 54, 55] });
    const { state, event } = applyRoll(s, 6);
    expect(event).toMatchObject({ noMoves: true });
    expect(currentPlayer(state).color).toBe("yellow");
    expect(state.sixesInRow).toBe(0);
  });

  it("rejects bad dice, a second roll, and rolling after the game", () => {
    const s = createGame(players(seatColors(2)));
    for (const d of [0, 7, 2.5, -1, NaN]) expect(() => applyRoll(s, d)).toThrow();
    const rolled = applyRoll(s, 6).state;
    expect(() => applyRoll(rolled, 3)).toThrow();
    expect(() => applyRoll({ ...s, status: "finished" }, 3)).toThrow();
  });

  it("legalMoves is empty while no dice is pending", () => {
    expect(legalMoves(game(["red", "yellow"], { red: [1, 2, 3, 4] }))).toEqual([]);
  });

  it("rollDie stays within 1..6", () => {
    expect(rollDie(() => 0)).toBe(1);
    expect(rollDie(() => 0.9999999)).toBe(6);
    expect(rollDie(() => 0.5)).toBe(4);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const d = rollDie();
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
      expect(Number.isInteger(d)).toBe(true);
      seen.add(d);
    }
    expect(seen.size).toBe(6);
  });
});

// ── 3. Moving ───────────────────────────────────────────────────────────────

describe("moving", () => {
  it("capturing on a normal square sends ALL opponent tokens there home and gives another roll", () => {
    const y = progressAt("yellow", 10);
    const s = game(["red", "yellow"], { red: [5, YARD, YARD, YARD], yellow: [y, y, YARD, 20] });
    const { state, event } = rollAndMove(s, 5, 0);
    expect(absoluteSquare("red", 10)).toBe(10);
    expect(event).toMatchObject({
      type: "move",
      to: 10,
      extraTurn: true,
      captured: [
        { color: "yellow", token: 0 },
        { color: "yellow", token: 1 },
      ],
    });
    expect(state.tokens.yellow).toEqual([YARD, YARD, YARD, 20]);
    expect(currentPlayer(state).color).toBe("red");
    expect(state.sixesInRow).toBe(0);
  });

  it("captures tokens of several colours on the same square", () => {
    const sq = 30;
    const s = game(["red", "green", "yellow", "blue"], {
      red: [27, YARD, YARD, YARD],
      green: [progressAt("green", sq), YARD, YARD, YARD],
      blue: [progressAt("blue", sq), YARD, YARD, YARD],
    });
    const { state, event } = rollAndMove(s, 3, 0);
    expect(event.type === "move" && event.captured.length).toBe(2);
    expect(state.tokens.green![0]).toBe(YARD);
    expect(state.tokens.blue![0]).toBe(YARD);
  });

  it("no capture on star squares; tokens share the square", () => {
    for (const star of STAR_SQUARES) {
      const r = progressAt("red", star);
      const y = progressAt("yellow", star);
      const s = game(["red", "yellow"], { red: [r - 3, YARD, YARD, YARD], yellow: [y, YARD, YARD, YARD] });
      const { state, event } = rollAndMove(s, 3, 0);
      expect(event).toMatchObject({ captured: [], extraTurn: false });
      expect(absoluteSquare("red", state.tokens.red![0])).toBe(star);
      expect(absoluteSquare("yellow", state.tokens.yellow![0])).toBe(star);
    }
  });

  it("no capture on start squares; a token on its own start is safe", () => {
    const s = game(["red", "green", "yellow", "blue"], {
      red: [10, YARD, YARD, YARD],
      green: [0, YARD, YARD, YARD],
    });
    const { state, event } = rollAndMove(s, 3, 0);
    expect(absoluteSquare("red", state.tokens.red![0])).toBe(START_INDEX.green);
    expect(event).toMatchObject({ captured: [] });
    expect(state.tokens.green![0]).toBe(0);
  });

  it("bringing a token out onto a start square occupied by an opponent does not capture", () => {
    const s = game(["red", "yellow"], { red: [YARD, YARD, YARD, YARD], yellow: [progressAt("yellow", 0), YARD, YARD, YARD] });
    const { state, event } = rollAndMove(s, 6, 0);
    expect(event).toMatchObject({ captured: [] });
    expect(state.tokens.yellow![0]).toBe(progressAt("yellow", 0));
  });

  it("own tokens can stack (no blockades) and never capture each other", () => {
    const y = progressAt("yellow", 12);
    const s = game(["red", "yellow"], { red: [10, 12, YARD, YARD], yellow: [YARD, YARD, YARD, YARD] }, "yellow", {});
    // yellow can pass through red's stack (no blockades)
    const ys = { ...s, tokens: { ...s.tokens, yellow: [y - 3, YARD, YARD, YARD] } };
    expect(legalMoves(applyRoll(ys, 5).state)).toEqual([0]);
    const rs = game(["red", "yellow"], { red: [10, 12, YARD, YARD] });
    const { state, event } = rollAndMove(rs, 2, 0);
    expect(state.tokens.red).toEqual([12, 12, YARD, YARD]);
    expect(event).toMatchObject({ captured: [] });
  });

  it("needs an exact roll to finish; overshooting is not allowed", () => {
    const s = game(["red", "yellow"], { red: [53, YARD, YARD, YARD] });
    for (const d of [4, 5]) {
      const { state, event } = applyRoll(s, d);
      expect(event).toMatchObject({ noMoves: true });
      expect(state.tokens.red![0]).toBe(53);
    }
    expect(legalMoves(applyRoll(s, 2).state)).toEqual([0]);
    const { state, event } = rollAndMove(s, 3, 0);
    expect(state.tokens.red![0]).toBe(FINISHED);
    expect(event).toMatchObject({ finished: true, extraTurn: true });
    expect(currentPlayer(state).color).toBe("red");
    expect(tokensHome(state, "red")).toBe(1);
  });

  it("a token passing its own track end enters its own home column, not the shared track", () => {
    const s = game(["red", "yellow"], { red: [48, YARD, YARD, YARD] });
    const { state } = rollAndMove(s, 5, 0);
    expect(state.tokens.red![0]).toBe(53);
    expect(absoluteSquare("red", 53)).toBeNull();
    expect(tokenCell("red", 53, 0)).toEqual(homeColumnCell("red", 3));
  });

  it("tokens in another colour's home column cannot be captured and progress is per colour", () => {
    // yellow's home column begins after yellow progress 50 (square 24); red lands on 24
    const s = game(["red", "yellow"], { red: [20, YARD, YARD, YARD], yellow: [51, 52, YARD, YARD] });
    const { state, event } = rollAndMove(s, 4, 0);
    expect(absoluteSquare("red", state.tokens.red![0])).toBe(24);
    expect(event).toMatchObject({ captured: [] });
    expect(state.tokens.yellow).toEqual([51, 52, YARD, YARD]);
    // and a red token at red progress 51+ is in red's own column
    expect(tokenCell("red", 51, 0)).not.toEqual(tokenCell("yellow", 51, 0));
  });

  it("finishing the last token wins and ends the game", () => {
    const s = game(["red", "yellow"], { red: [FINISHED, FINISHED, FINISHED, 53] });
    const { state, event } = rollAndMove(s, 3, 3);
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("red");
    expect(state.dice).toBeNull();
    expect(event).toMatchObject({ finished: true, extraTurn: false });
    expect(tokensHome(state, "red")).toBe(4);
    expect(() => applyRoll(state, 3)).toThrow();
    expect(() => passTurn(state, "timeout")).toThrow();
    expect(legalMoves(state)).toEqual([]);
  });

  it("applyMove rejects illegal tokens and moves without a roll", () => {
    const s = game(["red", "yellow"], { red: [YARD, 10, FINISHED, YARD] });
    expect(() => applyMove(s, 1)).toThrow();
    const rolled = applyRoll(s, 3).state;
    expect(legalMoves(rolled)).toEqual([1]);
    expect(() => applyMove(rolled, 0)).toThrow();
    expect(() => applyMove(rolled, 2)).toThrow();
    expect(() => applyMove(rolled, 7)).toThrow();
  });

  it("passTurn on timeout moves to the next player and clears the dice", () => {
    const s = applyRoll(game(["red", "yellow"], { red: [10, YARD, YARD, YARD] }), 6).state;
    const { state, event } = passTurn(s, "timeout");
    expect(event).toEqual({ type: "pass", color: "red", reason: "timeout" });
    expect(currentPlayer(state).color).toBe("yellow");
    expect(state).toMatchObject({ dice: null, sixesInRow: 0, moveCount: s.moveCount + 1, lastEvent: event });
  });

  it("turn order skips absent colours", () => {
    const order = (colors: Color[]) => {
      let s = createGame(players(colors));
      const seen: Color[] = [];
      for (let i = 0; i < colors.length * 2; i++) {
        seen.push(currentPlayer(s).color);
        s = applyRoll(s, 1).state;
      }
      return seen;
    };
    expect(order(seatColors(2))).toEqual(["red", "yellow", "red", "yellow"]);
    expect(order(seatColors(3))).toEqual(["red", "green", "yellow", "red", "green", "yellow"]);
    expect(order(seatColors(4))).toEqual(["red", "green", "yellow", "blue", "red", "green", "yellow", "blue"]);
    expect(order(["green", "blue"])).toEqual(["green", "blue", "green", "blue"]);
  });

  it("absoluteSquare wraps around for every colour", () => {
    for (const c of COLORS) {
      for (let p = 0; p <= 50; p++) expect(absoluteSquare(c, p)).toBe((START_INDEX[c] + p) % 52);
      expect(absoluteSquare(c, YARD)).toBeNull();
      for (const p of [51, 55, FINISHED]) expect(absoluteSquare(c, p)).toBeNull();
    }
    expect(absoluteSquare("blue", 13)).toBe(0);
    expect(absoluteSquare("yellow", 50)).toBe(24);
    expect(absoluteSquare("green", 50)).toBe(11);
    expect(absoluteSquare("red", 50)).toBe(50);
  });

  it("a full random game always terminates with a winner", () => {
    let seed = 12345;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    let s = createGame(players(seatColors(4)));
    let steps = 0;
    while (s.status === "playing" && steps < 20000) {
      s = s.dice === null ? applyRoll(s, rollDie(rng)).state : applyMove(s, chooseBotMove(s, rng)!).state;
      steps++;
    }
    expect(s.status).toBe("finished");
    expect(tokensHome(s, s.winner!)).toBe(4);
    for (const c of COLORS) for (const p of s.tokens[c]!) expect(p).toBeGreaterThanOrEqual(YARD);
  });
});

// ── 4. Bots ─────────────────────────────────────────────────────────────────

describe("bot moves", () => {
  it("returns null with no legal moves", () => {
    expect(chooseBotMove(createGame(players(seatColors(2))))).toBeNull();
    expect(autoMove(createGame(players(seatColors(2))))).toBeNull();
  });

  it("prefers a capture", () => {
    const s = applyRoll(
      game(["red", "yellow"], { red: [20, 5, YARD, YARD], yellow: [progressAt("yellow", 10), YARD, YARD, YARD] }),
      5,
    ).state;
    for (let i = 0; i < 10; i++) expect(chooseBotMove(s)).toBe(1);
  });

  it("prefers capture over finishing", () => {
    const s = applyRoll(
      game(["red", "yellow"], { red: [53, 7, YARD, YARD], yellow: [progressAt("yellow", 10), YARD, YARD, YARD] }),
      3,
    ).state;
    expect(chooseBotMove(s)).toBe(1);
  });

  it("prefers finishing a token", () => {
    const s = applyRoll(game(["red", "yellow"], { red: [10, 53, YARD, YARD] }), 3).state;
    expect(chooseBotMove(s)).toBe(1);
  });

  it("brings a token out on a 6", () => {
    const s = applyRoll(game(["red", "yellow"], { red: [10, YARD, YARD, YARD] }), 6).state;
    expect([1, 2, 3]).toContain(chooseBotMove(s, () => 0.5));
  });

  it("escapes danger", () => {
    // yellow sits 3 behind red token 0; red token 1 could land on a star instead
    const s = applyRoll(
      game(["red", "yellow"], { red: [20, 30, YARD, YARD], yellow: [progressAt("yellow", 17), YARD, YARD, YARD] }),
      4,
    ).state;
    expect(chooseBotMove(s)).toBe(0);
  });

  it("autoMove is deterministic", () => {
    const s = applyRoll(game(["red", "yellow"], { red: [3, 10, 30, 40] }), 2).state;
    const first = autoMove(s);
    expect(first).not.toBeNull();
    for (let i = 0; i < 10; i++) expect(autoMove(s)).toBe(first);
    expect(first).toBe(chooseBotMove(s, () => 0));
  });
});

// ── 5. Board ────────────────────────────────────────────────────────────────

describe("board geometry", () => {
  const track = Array.from({ length: TRACK_LENGTH }, (_, i) => trackCell(i));
  const yards = COLORS.map((c) => YARD_ORIGIN[c]);

  it("has 52 distinct track cells on the cross, outside yards and the centre", () => {
    expect(GRID).toBe(15);
    expect(new Set(track.map((c) => `${c.row},${c.col}`)).size).toBe(52);
    for (const c of track) {
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeLessThan(GRID);
      expect(c.col).toBeGreaterThanOrEqual(0);
      expect(c.col).toBeLessThan(GRID);
      expect((c.row >= 6 && c.row <= 8) || (c.col >= 6 && c.col <= 8)).toBe(true);
      expect(inCentre(c)).toBe(false);
      for (const o of yards) expect(inBlock(c, o, 6)).toBe(false);
    }
  });

  it("consecutive squares (including the wrap) are one step apart", () => {
    for (let i = 0; i < TRACK_LENGTH; i++) {
      expect(chebyshev(track[i], track[(i + 1) % TRACK_LENGTH])).toBe(1);
    }
    expect(trackCell(52)).toEqual(trackCell(0));
  });

  it("each start square sits next to its own yard", () => {
    for (const c of COLORS) {
      const start = trackCell(START_INDEX[c]);
      const touching = yardCellsOfBlock(YARD_ORIGIN[c]).some((y) => chebyshev(y, start) === 1);
      expect(touching).toBe(true);
      for (const other of COLORS.filter((o) => o !== c)) {
        expect(yardCellsOfBlock(YARD_ORIGIN[other]).some((y) => chebyshev(y, start) === 1)).toBe(false);
      }
    }
  });

  it("home columns lead from the colour's last track square toward the centre", () => {
    const trackKeys = new Set(track.map((c) => `${c.row},${c.col}`));
    for (const c of COLORS) {
      const last = trackCell(absoluteSquare(c, 50)!);
      expect(chebyshev(homeColumnCell(c, 1), last)).toBe(1);
      let prevDist = Infinity;
      for (let step = 1; step <= 5; step++) {
        const cell = homeColumnCell(c, step);
        expect(trackKeys.has(`${cell.row},${cell.col}`)).toBe(false);
        expect(inCentre(cell)).toBe(false);
        const d = chebyshev(cell, { row: 7, col: 7 });
        expect(d).toBeLessThan(prevDist);
        prevDist = d;
        if (step > 1) expect(chebyshev(cell, homeColumnCell(c, step - 1))).toBe(1);
      }
      expect(prevDist).toBe(2);
      expect(tokenCell(c, 51, 0)).toEqual(homeColumnCell(c, 1));
      expect(tokenCell(c, 55, 0)).toEqual(homeColumnCell(c, 5));
    }
  });

  it("yard cells are four distinct spots inside the colour's 6x6 block", () => {
    expect(YARD_ORIGIN).toEqual({
      red: { row: 9, col: 0 },
      green: { row: 0, col: 0 },
      yellow: { row: 0, col: 9 },
      blue: { row: 9, col: 9 },
    });
    for (const c of COLORS) {
      const cells = yardCells(c);
      expect(cells).toHaveLength(4);
      expect(new Set(cells.map((x) => `${x.row},${x.col}`)).size).toBe(4);
      for (const x of cells) expect(inBlock(x, YARD_ORIGIN[c], 6)).toBe(true);
      for (let i = 0; i < 4; i++) expect(tokenCell(c, YARD, i)).toEqual(cells[i]);
    }
  });

  it("tokenCell maps track progress and finished tokens", () => {
    for (const c of COLORS) {
      expect(tokenCell(c, 0, 0)).toEqual(trackCell(START_INDEX[c]));
      expect(tokenCell(c, 50, 1)).toEqual(trackCell(absoluteSquare(c, 50)!));
      expect(inCentre(tokenCell(c, FINISHED, 2))).toBe(true);
    }
  });

  it("rotationFor puts each colour's yard at the bottom-left", () => {
    const rotate = (cell: Cell, deg: number): Cell => {
      let r = cell;
      for (let i = 0; i < deg / 90; i++) r = { row: r.col, col: GRID - 1 - r.row };
      return r;
    };
    expect(rotationFor("red")).toBe(0);
    for (const c of COLORS) {
      const deg = rotationFor(c);
      for (const y of yardCellsOfBlock(YARD_ORIGIN[c])) {
        expect(inBlock(rotate(y, deg), { row: 9, col: 0 }, 6)).toBe(true);
      }
    }
  });
});

function yardCellsOfBlock(o: Cell): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) out.push({ row: o.row + r, col: o.col + c });
  return out;
}

// ── 6. Immutability ─────────────────────────────────────────────────────────

describe("immutability", () => {
  it("never mutates inputs", () => {
    const y = progressAt("yellow", 10);
    const base = game(["red", "yellow"], { red: [5, YARD, 53, YARD], yellow: [y, y, YARD, YARD] });
    const snap = JSON.stringify(base);
    const rolled = applyRoll(base, 5);
    expect(JSON.stringify(base)).toBe(snap);

    const rolledSnap = JSON.stringify(rolled.state);
    applyMove(rolled.state, 0);
    chooseBotMove(rolled.state);
    autoMove(rolled.state);
    legalMoves(rolled.state);
    passTurn(rolled.state, "timeout");
    expect(JSON.stringify(rolled.state)).toBe(rolledSnap);

    const sixes = { ...base, sixesInRow: 2 };
    const sixesSnap = JSON.stringify(sixes);
    applyRoll(sixes, 6);
    expect(JSON.stringify(sixes)).toBe(sixesSnap);

    const ps = players(["yellow", "red"]);
    const psSnap = JSON.stringify(ps);
    createGame(ps);
    expect(JSON.stringify(ps)).toBe(psSnap);
  });

  it("returned state does not share token arrays with the input", () => {
    const base = game(["red", "yellow"], { red: [5, YARD, YARD, YARD] });
    const { state } = rollAndMove(base, 6, 0);
    expect(state.tokens.red).not.toBe(base.tokens.red);
    expect(state.tokens.yellow).not.toBe(base.tokens.yellow);
  });
});
