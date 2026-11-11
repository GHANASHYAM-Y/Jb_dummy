/**
 * EVOAIQU — Hand Cricket
 *
 * Covers:
 *  1. Ball adjudication (all 49 throw pairs incl. DOK + shot-clock misses)
 *  2. Innings and match progression (10 wickets, overs options, chase, defend, tie)
 *  3. Batting order, bowling rotation, scorecards, squads
 *  4. Display helpers and commentary
 *  5. Server snapshot -> engine state mapping
 *  6. API route validation and status mapping (Supabase mocked)
 *  7. Migration contract: hidden throws, RLS, grants, rules kept in sync
 */

import fs from "fs";
import path from "path";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  BALLS_PER_OVER,
  DOK,
  OVER_OPTIONS,
  PLAYERS_PER_TEAM,
  REVEAL_PAUSE_MS,
  SHOT_CLOCK_MS,
  INNINGS_BREAK_MS,
  TOSS_WINDOW_MS,
  THROW_VALUES,
  WICKETS_PER_INNINGS,
  ballChipLabel,
  battingCard,
  bowlerIndexForBall,
  bowlingCard,
  chaseInfo,
  commentaryFor,
  computerThrow,
  createMatch,
  currentBatter,
  currentBatterIndex,
  currentOverBalls,
  defaultSquad,
  formatOvers,
  formatScore,
  isOversOption,
  isValidThrow,
  playBall,
  resolveBall,
  resultSummary,
  runRate,
  sanitizeSquad,
  throwLabel,
  type HandCricketState,
  type ThrowValue,
} from "@/lib/hand-cricket/engine";
import { snapshotToState, sideOfPlayer, clockOffsetMs, squadsOf } from "@/lib/hand-cricket/snapshot";
import type { HandCricketSnapshot } from "@/lib/hand-cricket/types";

// ── Supabase mocks for the route tests ────────────────────────────────────────

const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/core/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({ auth: { getUser: mockGetUser }, rpc: mockRpc })),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, connection: vi.fn().mockResolvedValue(undefined) };
});

import { POST as throwPOST } from "@/app/api/hand-cricket/match/[matchId]/throw/route";
import { POST as createPOST } from "@/app/api/hand-cricket/create/route";
import { POST as timeoutPOST } from "@/app/api/hand-cricket/match/[matchId]/timeout/route";
import { POST as tossPOST } from "@/app/api/hand-cricket/match/[matchId]/toss/route";
import { POST as squadPOST } from "@/app/api/hand-cricket/match/[matchId]/squad/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const N = (n: number) => n as ThrowValue;

function playAll(state: HandCricketState, throws: Array<[ThrowValue | null, ThrowValue | null]>): HandCricketState {
  return throws.reduce((s, [bat, bowl]) => playBall(s, bat, bowl).state, state);
}

/** n balls where the batter scores `runs` each time (bowler throws something else). */
function scoring(n: number, runs: ThrowValue): Array<[ThrowValue, ThrowValue]> {
  const other = N(runs === 1 ? 2 : 1);
  return Array.from({ length: n }, () => [runs, other]);
}

/** n wickets in a row. */
function wickets(n: number): Array<[ThrowValue, ThrowValue]> {
  return Array.from({ length: n }, () => [N(3), N(3)]);
}

// ── 1. Ball adjudication ──────────────────────────────────────────────────────

describe("Hand cricket ball adjudication", () => {
  THROW_VALUES.forEach((bat) => {
    THROW_VALUES.forEach((bowl) => {
      it(`batter ${throwLabel(bat)} vs bowler ${throwLabel(bowl)}`, () => {
        const outcome = resolveBall(bat, bowl);
        if (bat === bowl) {
          expect(outcome).toMatchObject({ isOut: true, runs: 0, kind: "out" });
        } else if (bat === DOK) {
          expect(outcome).toMatchObject({ isOut: false, runs: bowl, kind: "dok" });
        } else {
          expect(outcome).toMatchObject({ isOut: false, runs: bat, kind: "runs" });
        }
      });
    });
  });

  it("both DOK is OUT", () => {
    expect(resolveBall(N(0), N(0))).toMatchObject({ isOut: true, runs: 0, kind: "out" });
  });

  it("batter DOK takes the bowler's number", () => {
    expect(resolveBall(N(0), N(6))).toMatchObject({ isOut: false, runs: 6, kind: "dok" });
  });

  it("bowler DOK changes nothing: the batter scores their own number", () => {
    expect(resolveBall(N(4), N(0))).toMatchObject({ isOut: false, runs: 4, kind: "runs" });
  });

  it("no hand from the batter is a dot ball, never a wicket", () => {
    expect(resolveBall(null, N(3))).toMatchObject({ runs: 0, isOut: false, kind: "no_batter_hand" });
  });

  it("no hand from the bowler gives the batter their number", () => {
    expect(resolveBall(N(5), null)).toMatchObject({ runs: 5, isOut: false, kind: "no_bowler_hand" });
  });

  it("batter DOK with no bowler hand scores nothing", () => {
    expect(resolveBall(N(0), null)).toMatchObject({ runs: 0, isOut: false, kind: "dok" });
  });

  it("validates throws strictly (0–6)", () => {
    for (const ok of [0, 1, 6]) expect(isValidThrow(ok)).toBe(true);
    for (const bad of [-1, 7, 2.5, "3", null, undefined, NaN]) expect(isValidThrow(bad)).toBe(false);
  });

  it("labels DOK", () => {
    expect(throwLabel(0)).toBe("DOK");
    expect(throwLabel(4)).toBe("4");
    expect(throwLabel(null)).toBe("—");
  });
});

// ── 2. Match progression ──────────────────────────────────────────────────────

describe("Hand cricket innings and results", () => {
  it("supports 2, 3, 5 and 10 overs", () => {
    expect([...OVER_OPTIONS]).toEqual([2, 3, 5, 10]);
    for (const overs of OVER_OPTIONS) {
      expect(createMatch("A", overs).ballsPerInnings).toBe(overs * BALLS_PER_OVER);
    }
    expect(isOversOption(4)).toBe(false);
    expect(createMatch("A", 4).ballsPerInnings).toBe(12); // falls back to 2 overs
  });

  it("a wicket does NOT end the innings; the next batter comes in", () => {
    let state = createMatch("A", 5);
    state = playAll(state, [[N(4), N(1)], [N(3), N(3)]]);
    expect(state.innings).toBe(1);
    expect(state.innings1).toEqual({ runs: 4, balls: 2, wickets: 1 });
    expect(currentBatterIndex(state)).toBe(1);
  });

  it("10 wickets ends the innings (all out) and sets target = runs + 1", () => {
    const result = playBall(playAll(createMatch("A", 10), [...scoring(2, N(6)), ...wickets(9)]), N(2), N(2));
    expect(result.inningsOver).toBe(true);
    expect(result.state.innings1).toEqual({ runs: 12, balls: 12, wickets: WICKETS_PER_INNINGS });
    expect(result.state.innings).toBe(2);
    expect(result.state.target).toBe(13);
    expect(currentBatter(result.state)).toBe("B");
  });

  it("the innings ends when the overs run out", () => {
    const state = playAll(createMatch("B", 3), scoring(18, N(2)));
    expect(state.innings).toBe(2);
    expect(state.innings1).toEqual({ runs: 36, balls: 18, wickets: 0 });
    expect(state.target).toBe(37);
  });

  it("the chasing side wins as soon as it passes the target, by wickets left", () => {
    let state = playAll(createMatch("A", 2), [...scoring(2, N(4)), ...wickets(10)]); // A: 8/10 in 12 balls
    expect(state.innings).toBe(2);
    state = playAll(state, [[N(5), N(1)], [N(1), N(1)], [N(4), N(2)]]); // B: 9/1
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("B");
    expect(resultSummary(state, { A: "Me", B: "Bot" })).toBe("Bot won by 9 wickets with 9 balls to spare");
  });

  it("the defending side wins if the chaser is all out short", () => {
    let state = playAll(createMatch("A", 2), scoring(12, N(3))); // A: 36/0
    state = playAll(state, [...scoring(2, N(6)), ...wickets(10)]); // B: 12/10
    expect(state.winner).toBe("A");
    expect(resultSummary(state, { A: "Me", B: "Bot" })).toBe("Me won by 24 runs");
  });

  it("the defending side wins if the chaser runs out of balls", () => {
    let state = playAll(createMatch("A", 2), scoring(12, N(3))); // 36
    state = playAll(state, scoring(12, N(1))); // 12
    expect(state.winner).toBe("A");
    expect(state.innings2.wickets).toBe(0);
  });

  it("equal totals are a tie", () => {
    let tie = playAll(createMatch("A", 2), [[N(6), N(1)], ...wickets(10)]); // A: 6/10
    tie = playAll(tie, [[N(4), N(1)], [N(2), N(1)], ...wickets(10)]); // B: 6/10
    expect(tie.status).toBe("finished");
    expect(tie.isDraw).toBe(true);
    expect(tie.winner).toBeNull();
    expect(resultSummary(tie, { A: "Me", B: "Bot" })).toBe("Match tied at 6");
  });

  it("DOK runs count toward the total", () => {
    const state = playAll(createMatch("A", 2), [[N(0), N(5)], [N(0), N(6)]]);
    expect(state.innings1.runs).toBe(11);
  });

  it("never mutates the state it was given", () => {
    const start = createMatch("A");
    const snapshot = JSON.stringify(start);
    playBall(start, N(4), N(2));
    expect(JSON.stringify(start)).toBe(snapshot);
  });

  it("refuses to play after the match is over", () => {
    let state = playAll(createMatch("A"), wickets(10)); // A: 0/10
    state = playBall(state, N(2), N(3)).state; // B wins
    expect(() => playBall(state, N(1), N(2))).toThrow(/finished/);
  });
});

// ── 3. Order, rotation, scorecards, squads ────────────────────────────────────

describe("Hand cricket batting order, bowling and scorecards", () => {
  it("bowlers rotate over the last five players, one over each", () => {
    expect(bowlerIndexForBall(1)).toBe(10);
    expect(bowlerIndexForBall(6)).toBe(10);
    expect(bowlerIndexForBall(7)).toBe(9);
    expect(bowlerIndexForBall(25)).toBe(6);
    expect(bowlerIndexForBall(31)).toBe(10); // over 6 starts the rotation again
  });

  it("records which batter and bowler faced each ball", () => {
    const state = playAll(createMatch("A", 2), [[N(4), N(1)], [N(2), N(2)], [N(6), N(1)], ...scoring(4, N(1))]);
    expect(state.balls.map((b) => b.batterIndex)).toEqual([0, 0, 1, 1, 1, 1, 1]);
    expect(state.balls.map((b) => b.bowlerIndex)).toEqual([10, 10, 10, 10, 10, 10, 9]);
  });

  it("builds batting and bowling cards", () => {
    const state = playAll(createMatch("A", 2), [[N(4), N(1)], [N(2), N(2)], [N(6), N(1)]]);
    const card = battingCard(state, 1);
    expect(card).toHaveLength(PLAYERS_PER_TEAM);
    expect(card[0]).toMatchObject({ runs: 4, balls: 2, isOut: true, batted: true });
    expect(card[1]).toMatchObject({ runs: 6, balls: 1, isOut: false, batted: true });
    expect(card[2]).toMatchObject({ batted: false });
    expect(bowlingCard(state, 1)).toEqual([{ index: 10, balls: 3, runs: 10, wickets: 1 }]);
  });

  it("the batter at the crease counts as batting even before facing", () => {
    const state = playAll(createMatch("A", 2), [[N(2), N(2)]]);
    expect(battingCard(state, 1)[1]).toMatchObject({ batted: true, balls: 0, isOut: false });
  });

  it("cleans and validates squads of 11 names", () => {
    expect(defaultSquad()).toHaveLength(11);
    const names = defaultSquad().map((n, i) => (i === 0 ? "  Asha  " : n));
    expect(sanitizeSquad(names)?.[0]).toBe("Asha");
    expect(sanitizeSquad(defaultSquad().slice(0, 10))).toBeNull();
    expect(sanitizeSquad([...defaultSquad().slice(0, 10), ""])).toBeNull();
    expect(sanitizeSquad([...defaultSquad().slice(0, 10), "x".repeat(21)])).toBeNull();
    expect(sanitizeSquad([...defaultSquad().slice(0, 10), 7])).toBeNull();
    expect(sanitizeSquad("nope")).toBeNull();
  });
});

// ── 4. Display helpers ────────────────────────────────────────────────────────

describe("Hand cricket display helpers", () => {
  it("formats overs, scores and run rates", () => {
    expect(formatOvers(8)).toBe("1.2");
    expect(formatOvers(60)).toBe("10.0");
    expect(formatScore({ runs: 45, wickets: 3 })).toBe("45/3");
    expect(runRate(0, 0)).toBe("0.00");
    expect(runRate(18, 9)).toBe("12.00");
  });

  it("shows only the current over's balls", () => {
    const balls = Array.from({ length: 8 }, (_, i) => ({ ballNumber: i + 1 }));
    expect(currentOverBalls(balls).map((b) => b.ballNumber)).toEqual([7, 8]);
    expect(currentOverBalls([])).toEqual([]);
  });

  it("labels ball chips", () => {
    expect(ballChipLabel({ isOut: true, runs: 0 })).toBe("W");
    expect(ballChipLabel({ isOut: false, runs: 0 })).toBe("•");
    expect(ballChipLabel({ isOut: false, runs: 6 })).toBe("6");
  });

  it("computes what the chase needs", () => {
    let state = playAll(createMatch("A", 2), [...scoring(2, N(5)), ...wickets(10)]); // A: 10
    state = playBall(state, N(4), N(1)).state;
    expect(chaseInfo(state)).toEqual({ runsNeeded: 7, ballsLeft: 11, requiredRate: "3.82" });
    expect(chaseInfo(createMatch("A"))).toBeNull();
  });

  it("writes deterministic commentary with player names, including DOK", () => {
    const out = { kind: "out" as const, runs: 0, batterThrow: N(4), innings: 1 as const, ballNumber: 3 };
    expect(commentaryFor(out, "Asha", "Nova")).toBe(commentaryFor(out, "Asha", "Nova"));
    expect(commentaryFor(out, "Asha", "Nova")).toMatch(/Asha|Nova/);

    const dok = commentaryFor({ kind: "dok", runs: 5, batterThrow: N(0), innings: 1, ballNumber: 2 }, "Asha", "Nova");
    expect(dok).toMatch(/DOK|5/);
    expect(dok).not.toMatch(/\{/);
  });

  it("the computer throws 0 (DOK) to 6", () => {
    expect(computerThrow(() => 0)).toBe(0);
    expect(computerThrow(() => 0.9999)).toBe(6);
    expect(computerThrow(() => 1)).toBe(6);
    for (let i = 0; i < 200; i++) expect(isValidThrow(computerThrow())).toBe(true);
  });
});

// ── 5. Snapshot mapping ───────────────────────────────────────────────────────

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const MATCH_ID = "00000000-0000-4000-8000-0000000000aa";

function makeSnapshot(
  overrides: Partial<HandCricketSnapshot["game"]> = {},
  matchOverrides: Partial<HandCricketSnapshot["match"]> = {},
): HandCricketSnapshot {
  return {
    match: {
      id: MATCH_ID,
      phase: "active",
      end_reason: null,
      player1_id: P1,
      player2_id: P2,
      winner_id: null,
      loser_id: null,
      is_draw: false,
      last_activity_at: null,
      waiting_deadline: null,
      completed_at: null,
      player1_disconnected_at: null,
      player2_disconnected_at: null,
      player1_reconnect_deadline: null,
      player2_reconnect_deadline: null,
      ...matchOverrides,
    },
    game: {
      status: "in_play",
      player1_squad: defaultSquad(),
      player2_squad: defaultSquad().map((n) => n.replace("Player", "Friend")),
      player1_joined: true,
      player2_joined: true,
      toss_winner_id: P2,
      toss_decision: "bowl",
      toss_deadline: null,
      balls_per_innings: 30,
      innings: 1,
      batting_player_id: P1,
      bowling_player_id: P2,
      ball_number: 4,
      innings1_runs: 9,
      innings1_balls: 3,
      innings1_wickets: 1,
      innings2_runs: 0,
      innings2_balls: 0,
      innings2_wickets: 0,
      target: null,
      ball_opens_at: null,
      ball_deadline: null,
      ...overrides,
    },
    balls: [
      { innings: 1, ball_number: 1, batter_id: P1, bowler_id: P2, batter_throw: 5, bowler_throw: 2, runs: 5, is_out: false, created_at: "" },
      { innings: 1, ball_number: 2, batter_id: P1, bowler_id: P2, batter_throw: 3, bowler_throw: 3, runs: 0, is_out: true, created_at: "" },
      { innings: 1, ball_number: 3, batter_id: P1, bowler_id: P2, batter_throw: 0, bowler_throw: 4, runs: 4, is_out: false, created_at: "" },
    ],
    my_throw: null,
    opponent_has_thrown: false,
    server_now: "2026-11-10T12:00:00.000Z",
  };
}

describe("Hand cricket snapshot mapping", () => {
  it("maps players to sides", () => {
    const snap = makeSnapshot();
    expect(sideOfPlayer(snap, P1)).toBe("A");
    expect(sideOfPlayer(snap, P2)).toBe("B");
    expect(sideOfPlayer(snap, "someone-else")).toBeNull();
  });

  it("derives first batter, wickets, DOK kind and batter positions", () => {
    const state = snapshotToState(makeSnapshot());
    expect(state?.firstBatter).toBe("A");
    expect(state?.ballsPerInnings).toBe(30);
    expect(state?.innings1).toEqual({ runs: 9, balls: 3, wickets: 1 });
    expect(state?.balls.map((b) => b.kind)).toEqual(["runs", "out", "dok"]);
    expect(state?.balls.map((b) => b.batterIndex)).toEqual([0, 0, 1]);
  });

  it("exposes both squads, with defaults for bad data", () => {
    const squads = squadsOf(makeSnapshot({ player2_squad: ["too", "short"] }));
    expect(squads.A[0]).toBe("Player 1");
    expect(squads.B).toEqual(defaultSquad());
  });

  it("returns null until the toss is decided", () => {
    expect(snapshotToState(makeSnapshot({ status: "toss", toss_decision: null }))).toBeNull();
  });

  it("only reports a winner once the match is completed", () => {
    const finished = snapshotToState(makeSnapshot({ status: "finished" }, { phase: "completed", winner_id: P2, loser_id: P1 }));
    expect(finished?.winner).toBe("B");
    const forfeited = snapshotToState(makeSnapshot({}, { phase: "forfeited", winner_id: P2 }));
    expect(forfeited?.winner).toBeNull();
  });

  it("computes the server clock offset", () => {
    expect(clockOffsetMs("2026-11-10T12:00:01.000Z", Date.parse("2026-11-10T12:00:00.000Z"))).toBe(1000);
    expect(clockOffsetMs("not a date", 0)).toBe(0);
  });
});

// ── 6. API routes ─────────────────────────────────────────────────────────────

describe("Hand cricket API routes", () => {
  const params = { params: Promise.resolve({ matchId: MATCH_ID }) };
  const req = (url: string, body?: unknown) =>
    new NextRequest(`http://localhost:3000${url}`, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: P1 } }, error: null });
  });

  it("throw: rejects unauthenticated callers with 401", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("no session") });
    const res = await throwPOST(req(`/api/hand-cricket/match/${MATCH_ID}/throw`, { innings: 1, ball_number: 1, value: 3 }), params);
    expect(res.status).toBe(401);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    [{ innings: 1, ball_number: 1, value: 7 }, "invalid_throw"],
    [{ innings: 1, ball_number: 1, value: -1 }, "invalid_throw"],
    [{ innings: 1, ball_number: 1, value: "3" }, "invalid_throw"],
    [{ innings: 3, ball_number: 1, value: 3 }, "invalid_innings"],
    [{ innings: 1, ball_number: 0, value: 3 }, "invalid_ball_number"],
    [{ innings: 1, ball_number: 61, value: 3 }, "invalid_ball_number"],
  ])("throw: rejects %j with %s before calling the database", async (body, code) => {
    const res = await throwPOST(req(`/api/hand-cricket/match/${MATCH_ID}/throw`, body), params);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(code);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throw: accepts DOK (0) and ball 60 of a 10-over innings", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: true, code: "waiting" }, error: null });
    const res = await throwPOST(req(`/api/hand-cricket/match/${MATCH_ID}/throw`, { innings: 2, ball_number: 60, value: 0 }), params);
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("submit_hand_cricket_throw", {
      p_match_id: MATCH_ID,
      p_innings: 2,
      p_ball_number: 60,
      p_value: 0,
    });
  });

  it.each([
    ["forbidden", 403],
    ["not_found", 404],
    ["stale_ball", 409],
    ["throw_locked", 409],
  ])("throw: maps RPC code %s to HTTP %i", async (code, status) => {
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code }, error: null });
    const res = await throwPOST(req(`/api/hand-cricket/match/${MATCH_ID}/throw`, { innings: 1, ball_number: 1, value: 2 }), params);
    expect(res.status).toBe(status);
  });

  it("create: refuses to challenge yourself", async () => {
    const res = await createPOST(req("/api/hand-cricket/create", { opponent_id: P1 }));
    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("create: rejects overs other than 2, 3, 5, 10", async () => {
    const res = await createPOST(req("/api/hand-cricket/create", { opponent_id: P2, overs: 4 }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid_overs");
  });

  it("create: passes overs to the RPC (default 2)", async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, code: "match_created", match_id: MATCH_ID }, error: null });
    await createPOST(req("/api/hand-cricket/create", { opponent_id: P2, overs: 10 }));
    expect(mockRpc).toHaveBeenLastCalledWith("create_hand_cricket_match", { p_opponent_id: P2, p_overs: 10 });
    await createPOST(req("/api/hand-cricket/create", { opponent_id: P2 }));
    expect(mockRpc).toHaveBeenLastCalledWith("create_hand_cricket_match", { p_opponent_id: P2, p_overs: 2 });
  });

  it("squad: validates 11 names before calling the database", async () => {
    const bad = await squadPOST(req(`/api/hand-cricket/match/${MATCH_ID}/squad`, { names: ["only one"] }), params);
    expect(bad.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();

    mockRpc.mockResolvedValueOnce({ data: { ok: true, code: "squad_saved" }, error: null });
    const names = defaultSquad().map((n, i) => (i === 0 ? "  Asha " : n));
    const ok = await squadPOST(req(`/api/hand-cricket/match/${MATCH_ID}/squad`, { names }), params);
    expect(ok.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("set_hand_cricket_squad", {
      p_match_id: MATCH_ID,
      p_names: ["Asha", ...defaultSquad().slice(1)],
    });
  });

  it("toss: only accepts bat or bowl", async () => {
    const res = await tossPOST(req(`/api/hand-cricket/match/${MATCH_ID}/toss`, { decision: "field" }), params);
    expect(res.status).toBe(400);
  });

  it("timeout: an early claim is a normal 200 response", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "not_timed_out", remaining_ms: 800 }, error: null });
    const res = await timeoutPOST(req(`/api/hand-cricket/match/${MATCH_ID}/timeout`), params);
    expect(res.status).toBe(200);
  });
});

// ── 7. Migration contract ─────────────────────────────────────────────────────

describe("Migration 0015 — Hand Cricket", () => {
  const sql = fs.readFileSync(path.resolve(__dirname, "../../supabase/migrations/0015_hand_cricket.sql"), "utf-8");
  // Code only (comments stripped), newline-agnostic: the repo may be checked out with CRLF
  const flat = sql.replace(/--[^\n]*/g, "").replace(/\s+/g, " ");

  it("allows the hand_cricket game type on matches", () => {
    expect(flat).toContain("CHECK (game_type IN ('rps', 'chess', 'hand_cricket'))");
  });

  it("enables RLS on all three tables and hides throws", () => {
    for (const t of ["hand_cricket_matches", "hand_cricket_balls", "hand_cricket_throws"]) {
      expect(flat).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`);
      expect(flat).toContain(`ON public.${t} FOR INSERT WITH CHECK (FALSE)`);
    }
    expect(flat).toContain("ON public.hand_cricket_throws FOR SELECT USING (FALSE)");
    expect(flat).toContain("REVOKE ALL ON public.hand_cricket_throws FROM anon, authenticated");
  });

  it("pins search_path on every SECURITY DEFINER function", () => {
    const definers = flat.match(/SECURITY DEFINER SET search_path = public, pg_catalog/g) ?? [];
    expect(definers.length).toBe((flat.match(/SECURITY DEFINER/g) ?? []).length);
    expect(definers.length).toBeGreaterThanOrEqual(11);
  });

  it("keeps internal helpers away from clients", () => {
    expect(flat).toContain("REVOKE ALL ON FUNCTION public._hc_resolve_ball(UUID) FROM PUBLIC, anon, authenticated");
    expect(flat).not.toMatch(/GRANT EXECUTE ON FUNCTION public\._hc_/);
  });

  it("supports overs 2/3/5/10, 11-player squads and wickets", () => {
    expect(flat).toContain("CHECK (balls_per_innings IN (12, 18, 30, 60))");
    expect(flat).toContain("IF p_overs IS NULL OR p_overs NOT IN (2, 3, 5, 10) THEN");
    expect(flat).toContain("array_length(player1_squad, 1) = 11");
    expect(flat).toContain("CHECK (innings1_wickets BETWEEN 0 AND 10)");
    expect(flat).toContain("v_inn_wkts >= 10 OR v_inn_balls >= v_hc.balls_per_innings");
  });

  it("uses the same ball rules as the TypeScript engine (incl. DOK)", () => {
    expect(flat).toContain("IF v_bat IS NULL THEN v_runs := 0;");
    expect(flat).toContain("ELSIF v_bowl IS NOT NULL AND v_bat = v_bowl THEN v_out := TRUE;");
    expect(flat).toContain("ELSIF v_bat = 0 THEN v_runs := COALESCE(v_bowl, 0);");
    expect(flat).toContain("ELSIF v_bowl IS NULL THEN v_runs := v_bat;");
    expect(flat).toContain("CHECK (throw_value BETWEEN 0 AND 6)");
    expect(flat).toContain("IF p_value IS NULL OR p_value < 0 OR p_value > 6 THEN");
  });

  it("only lets players rename their own squad", () => {
    expect(flat).toContain("IF v_match.player1_id = v_caller THEN UPDATE public.hand_cricket_matches SET player1_squad = v_clean");
    expect(flat).toContain("GRANT EXECUTE ON FUNCTION public.set_hand_cricket_squad(UUID, TEXT[]) TO authenticated");
  });

  it("keeps clocks in sync with the engine constants", () => {
    const secs = (ms: number) => `INTERVAL '${ms / 1000} seconds'`;
    expect(flat).toContain(`ball_deadline = NOW() + ${secs(REVEAL_PAUSE_MS + SHOT_CLOCK_MS)}`);
    expect(flat).toContain(`ball_deadline = NOW() + ${secs(INNINGS_BREAK_MS + SHOT_CLOCK_MS)}`);
    expect(flat).toContain(`toss_deadline = NOW() + ${secs(TOSS_WINDOW_MS)}`);
  });

  it("guards the RPS tables against other games' match ids", () => {
    expect(flat).toContain("BEFORE INSERT ON public.game_moves FOR EACH ROW EXECUTE FUNCTION public._enforce_rps_match_rows()");
  });
});
