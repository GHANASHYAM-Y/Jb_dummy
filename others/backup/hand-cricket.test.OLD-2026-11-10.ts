/**
 * EVOAIQU — Hand Cricket
 *
 * Covers:
 *  1. Ball adjudication (all 36 throw pairs + shot-clock misses)
 *  2. Innings and match progression (all-out, overs complete, chase, defend, tie)
 *  3. Display helpers and commentary
 *  4. Server snapshot -> engine state mapping
 *  5. API route validation and status mapping (Supabase mocked)
 *  6. Migration contract: hidden throws, RLS, grants, rules kept in sync
 */

import fs from "fs";
import path from "path";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  BALLS_PER_INNINGS,
  SHOT_CLOCK_MS,
  REVEAL_PAUSE_MS,
  INNINGS_BREAK_MS,
  TOSS_WINDOW_MS,
  THROW_VALUES,
  ballChipLabel,
  chaseInfo,
  commentaryFor,
  computerThrow,
  createMatch,
  currentBatter,
  currentOverBalls,
  formatOvers,
  isValidThrow,
  playBall,
  resolveBall,
  resultSummary,
  runRate,
  type HandCricketState,
  type ThrowValue,
} from "@/lib/hand-cricket/engine";
import { snapshotToState, sideOfPlayer, clockOffsetMs } from "@/lib/hand-cricket/snapshot";
import type { HandCricketSnapshot } from "@/lib/hand-cricket/types";

// ── Supabase mocks for the route tests ────────────────────────────────────────

const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const N = (n: number) => n as ThrowValue;

/** Plays a list of [batter, bowler] throws from the given state. */
function playAll(state: HandCricketState, throws: Array<[ThrowValue | null, ThrowValue | null]>): HandCricketState {
  return throws.reduce((s, [bat, bowl]) => playBall(s, bat, bowl).state, state);
}

/** n balls where the batter scores `runs` each time (bowler throws something else). */
function scoringBalls(n: number, runs: ThrowValue): Array<[ThrowValue, ThrowValue]> {
  const other = N(runs === 1 ? 2 : 1);
  return Array.from({ length: n }, () => [runs, other]);
}

// ── 1. Ball adjudication ──────────────────────────────────────────────────────

describe("Hand cricket ball adjudication", () => {
  THROW_VALUES.forEach((bat) => {
    THROW_VALUES.forEach((bowl) => {
      it(`batter ${bat} vs bowler ${bowl}`, () => {
        const outcome = resolveBall(bat, bowl);
        if (bat === bowl) {
          expect(outcome).toMatchObject({ isOut: true, runs: 0, kind: "out" });
        } else {
          expect(outcome).toMatchObject({ isOut: false, runs: bat, kind: "runs" });
        }
      });
    });
  });

  it("no hand from the batter is a dot ball, never a wicket", () => {
    expect(resolveBall(null, N(3))).toMatchObject({ runs: 0, isOut: false, kind: "no_batter_hand" });
  });

  it("no hand from the bowler gives the batter their number", () => {
    expect(resolveBall(N(5), null)).toMatchObject({ runs: 5, isOut: false, kind: "no_bowler_hand" });
  });

  it("no hands at all is a dot ball", () => {
    expect(resolveBall(null, null)).toMatchObject({ runs: 0, isOut: false, kind: "no_batter_hand" });
  });

  it("validates throws strictly", () => {
    expect(isValidThrow(1)).toBe(true);
    expect(isValidThrow(6)).toBe(true);
    for (const bad of [0, 7, 2.5, "3", null, undefined, NaN]) {
      expect(isValidThrow(bad)).toBe(false);
    }
  });
});

// ── 2. Match progression ──────────────────────────────────────────────────────

describe("Hand cricket innings and results", () => {
  it("a wicket ends the first innings early and sets target = runs + 1", () => {
    let state = createMatch("A");
    state = playAll(state, [[N(4), N(1)], [N(6), N(2)]]);
    const result = playBall(state, N(3), N(3));

    expect(result.inningsOver).toBe(true);
    expect(result.matchOver).toBe(false);
    expect(result.state.innings).toBe(2);
    expect(result.state.innings1).toEqual({ runs: 10, balls: 3, isOut: true });
    expect(result.state.target).toBe(11);
    expect(currentBatter(result.state)).toBe("B");
  });

  it("the first innings ends after 12 balls with no wicket", () => {
    const state = playAll(createMatch("B"), scoringBalls(BALLS_PER_INNINGS, N(2)));
    expect(state.innings).toBe(2);
    expect(state.innings1).toEqual({ runs: 24, balls: 12, isOut: false });
    expect(state.target).toBe(25);
    expect(currentBatter(state)).toBe("A");
  });

  it("the chasing side wins as soon as it passes the target", () => {
    let state = playAll(createMatch("A"), [[N(5), N(1)], [N(2), N(2)]]); // A: 5, out
    const result = playBall(playBall(state, N(4), N(1)).state, N(2), N(5)); // B: 4 then 2 = 6

    expect(result.matchOver).toBe(true);
    expect(result.state.status).toBe("finished");
    expect(result.state.winner).toBe("B");
    expect(result.state.isDraw).toBe(false);
    state = result.state;
    expect(resultSummary(state, { A: "Asha", B: "Ravi" })).toBe("Ravi won with 10 balls to spare");
  });

  it("the defending side wins if the chaser is out short", () => {
    let state = playAll(createMatch("A"), [...scoringBalls(3, N(6)), [N(1), N(1)]]); // A: 18, out
    state = playAll(state, [[N(4), N(2)], [N(3), N(3)]]); // B: 4, out

    expect(state.status).toBe("finished");
    expect(state.winner).toBe("A");
    expect(resultSummary(state, { A: "Asha", B: "Ravi" })).toBe("Asha won by 14 runs");
  });

  it("the defending side wins if the chaser runs out of balls", () => {
    let state = playAll(createMatch("A"), scoringBalls(BALLS_PER_INNINGS, N(3))); // A: 36
    state = playAll(state, scoringBalls(BALLS_PER_INNINGS, N(1))); // B: 12
    expect(state.winner).toBe("A");
    expect(resultSummary(state, { A: "Asha", B: "Ravi" })).toBe("Asha won by 24 runs");
  });

  it("equal totals are a tie", () => {
    let tie = playAll(createMatch("A"), [[N(6), N(1)], [N(6), N(6)]]); // A: 6, out
    tie = playAll(tie, [[N(4), N(1)], [N(2), N(1)], [N(5), N(5)]]); // B: 6, out

    expect(tie.status).toBe("finished");
    expect(tie.isDraw).toBe(true);
    expect(tie.winner).toBeNull();
    expect(resultSummary(tie, { A: "Asha", B: "Ravi" })).toBe("Match tied at 6");
  });

  it("a chase won off the final ball says so", () => {
    let state = playAll(createMatch("A"), [[N(1), N(2)], [N(1), N(1)]]); // A: 1, out
    state = playAll(state, Array.from({ length: 11 }, () => [null, N(3)] as [null, ThrowValue])); // 11 dots
    state = playBall(state, N(2), N(5)).state;
    expect(state.winner).toBe("B");
    expect(resultSummary(state, { A: "Asha", B: "Ravi" })).toBe("Ravi won off the last ball");
  });

  it("never mutates the state it was given", () => {
    const start = createMatch("A");
    const snapshot = JSON.stringify(start);
    playBall(start, N(4), N(2));
    expect(JSON.stringify(start)).toBe(snapshot);
  });

  it("refuses to play after the match is over", () => {
    let state = playAll(createMatch("A"), [[N(1), N(1)]]); // A: 0, out
    state = playBall(state, N(2), N(3)).state; // B wins
    expect(() => playBall(state, N(1), N(2))).toThrow(/finished/);
  });
});

// ── 3. Display helpers ────────────────────────────────────────────────────────

describe("Hand cricket display helpers", () => {
  it("formats overs and run rates", () => {
    expect(formatOvers(0)).toBe("0.0");
    expect(formatOvers(8)).toBe("1.2");
    expect(formatOvers(12)).toBe("2.0");
    expect(runRate(0, 0)).toBe("0.00");
    expect(runRate(18, 9)).toBe("12.00");
  });

  it("shows only the current over's balls", () => {
    const balls = Array.from({ length: 8 }, (_, i) => ({ ballNumber: i + 1 }));
    expect(currentOverBalls(balls).map((b) => b.ballNumber)).toEqual([7, 8]);
    expect(currentOverBalls(balls.slice(0, 6)).map((b) => b.ballNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(currentOverBalls([])).toEqual([]);
  });

  it("labels ball chips", () => {
    expect(ballChipLabel({ isOut: true, runs: 0 })).toBe("W");
    expect(ballChipLabel({ isOut: false, runs: 0 })).toBe("•");
    expect(ballChipLabel({ isOut: false, runs: 6 })).toBe("6");
  });

  it("computes what the chase needs", () => {
    let state = playAll(createMatch("A"), [...scoringBalls(2, N(5)), [N(1), N(1)]]); // A: 10, out
    state = playBall(state, N(4), N(1)).state;
    expect(chaseInfo(state)).toEqual({ runsNeeded: 7, ballsLeft: 11, requiredRate: "3.82" });
    expect(chaseInfo(createMatch("A"))).toBeNull();
  });

  it("writes deterministic commentary with player names", () => {
    const ball = { kind: "out" as const, runs: 0, batterThrow: N(4), innings: 1 as const, ballNumber: 3 };
    const line = commentaryFor(ball, "Asha", "Ravi");
    expect(line).toBe(commentaryFor(ball, "Asha", "Ravi"));
    expect(line).toMatch(/Asha|Ravi/);
    expect(line).not.toMatch(/\{(batter|bowler|runs|throw)\}/);

    const six = commentaryFor({ kind: "runs", runs: 6, batterThrow: N(6), innings: 2, ballNumber: 1 }, "Asha", "Ravi");
    expect(six).not.toMatch(/\{/);
  });

  it("the computer only ever throws 1 to 6", () => {
    expect(computerThrow(() => 0)).toBe(1);
    expect(computerThrow(() => 0.9999)).toBe(6);
    expect(computerThrow(() => 1)).toBe(6);
    for (let i = 0; i < 200; i++) {
      expect(isValidThrow(computerThrow())).toBe(true);
    }
  });
});

// ── 4. Snapshot mapping ───────────────────────────────────────────────────────

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const MATCH_ID = "00000000-0000-4000-8000-0000000000aa";

function makeSnapshot(overrides: Partial<HandCricketSnapshot["game"]> = {}, matchOverrides: Partial<HandCricketSnapshot["match"]> = {}): HandCricketSnapshot {
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
      player1_joined: true,
      player2_joined: true,
      toss_winner_id: P2,
      toss_decision: "bowl",
      toss_deadline: null,
      balls_per_innings: 12,
      innings: 1,
      batting_player_id: P1,
      bowling_player_id: P2,
      ball_number: 3,
      innings1_runs: 9,
      innings1_balls: 2,
      innings1_out: false,
      innings2_runs: 0,
      innings2_balls: 0,
      innings2_out: false,
      target: null,
      ball_opens_at: null,
      ball_deadline: null,
      ...overrides,
    },
    balls: [
      { innings: 1, ball_number: 1, batter_id: P1, bowler_id: P2, batter_throw: 5, bowler_throw: 2, runs: 5, is_out: false, created_at: "" },
      { innings: 1, ball_number: 2, batter_id: P1, bowler_id: P2, batter_throw: 4, bowler_throw: null, runs: 4, is_out: false, created_at: "" },
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

  it("derives the first batter from the toss (winner chose to bowl)", () => {
    const state = snapshotToState(makeSnapshot());
    expect(state?.firstBatter).toBe("A");
    expect(state?.innings1).toEqual({ runs: 9, balls: 2, isOut: false });
    expect(state?.balls.map((b) => b.kind)).toEqual(["runs", "no_bowler_hand"]);
    expect(state?.status).toBe("in_play");
  });

  it("returns null until the toss is decided", () => {
    expect(snapshotToState(makeSnapshot({ status: "toss", toss_decision: null }))).toBeNull();
  });

  it("only reports a winner once the match is completed", () => {
    const finished = snapshotToState(
      makeSnapshot({ status: "finished" }, { phase: "completed", winner_id: P2, loser_id: P1 }),
    );
    expect(finished?.status).toBe("finished");
    expect(finished?.winner).toBe("B");

    const forfeited = snapshotToState(makeSnapshot({}, { phase: "forfeited", winner_id: P2 }));
    expect(forfeited?.status).toBe("in_play");
    expect(forfeited?.winner).toBeNull();
  });

  it("computes the server clock offset", () => {
    expect(clockOffsetMs("2026-11-10T12:00:01.000Z", Date.parse("2026-11-10T12:00:00.000Z"))).toBe(1000);
    expect(clockOffsetMs("not a date", 0)).toBe(0);
  });
});

// ── 5. API routes ─────────────────────────────────────────────────────────────

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

  it("throw: rejects a bad match id with 400", async () => {
    const res = await throwPOST(req("/api/hand-cricket/match/nope/throw", { innings: 1, ball_number: 1, value: 3 }), {
      params: Promise.resolve({ matchId: "nope" }),
    });
    expect(res.status).toBe(400);
  });

  it.each([
    [{ innings: 1, ball_number: 1, value: 7 }, "invalid_throw"],
    [{ innings: 1, ball_number: 1, value: 0 }, "invalid_throw"],
    [{ innings: 1, ball_number: 1, value: "3" }, "invalid_throw"],
    [{ innings: 3, ball_number: 1, value: 3 }, "invalid_innings"],
    [{ innings: 1, ball_number: 0, value: 3 }, "invalid_ball_number"],
    [{ innings: 1, ball_number: 1.5, value: 3 }, "invalid_ball_number"],
  ])("throw: rejects %j with %s before calling the database", async (body, code) => {
    const res = await throwPOST(req(`/api/hand-cricket/match/${MATCH_ID}/throw`, body), params);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(code);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throw: passes the ball identity to the RPC and returns the result", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: true, code: "waiting" }, error: null });
    const res = await throwPOST(req(`/api/hand-cricket/match/${MATCH_ID}/throw`, { innings: 2, ball_number: 7, value: 4 }), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, code: "waiting" });
    expect(mockRpc).toHaveBeenCalledWith("submit_hand_cricket_throw", {
      p_match_id: MATCH_ID,
      p_innings: 2,
      p_ball_number: 7,
      p_value: 4,
    });
  });

  it.each([
    ["forbidden", 403],
    ["not_found", 404],
    ["stale_ball", 409],
    ["throw_locked", 409],
    ["ball_timed_out", 409],
  ])("throw: maps RPC code %s to HTTP %i", async (code, status) => {
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code }, error: null });
    const res = await throwPOST(req(`/api/hand-cricket/match/${MATCH_ID}/throw`, { innings: 1, ball_number: 1, value: 2 }), params);
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ success: false, code });
  });

  it("throw: fails closed with 500 when the RPC errors", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const res = await throwPOST(req(`/api/hand-cricket/match/${MATCH_ID}/throw`, { innings: 1, ball_number: 1, value: 2 }), params);
    expect(res.status).toBe(500);
  });

  it("create: refuses to challenge yourself without calling the database", async () => {
    const res = await createPOST(req("/api/hand-cricket/create", { opponent_id: P1 }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("no_self_match");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("create: non-friends get 403", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "not_friends", message: "Friends only." }, error: null });
    const res = await createPOST(req("/api/hand-cricket/create", { opponent_id: P2 }));
    expect(res.status).toBe(403);
  });

  it("create: returns the match id", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: true, code: "match_created", match_id: MATCH_ID }, error: null });
    const res = await createPOST(req("/api/hand-cricket/create", { opponent_id: P2 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, match_id: MATCH_ID });
    expect(mockRpc).toHaveBeenCalledWith("create_hand_cricket_match", { p_opponent_id: P2 });
  });

  it("toss: only accepts bat or bowl", async () => {
    const res = await tossPOST(req(`/api/hand-cricket/match/${MATCH_ID}/toss`, { decision: "field" }), params);
    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("timeout: an early claim is a normal 200 response, not an error", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "not_timed_out", remaining_ms: 800 }, error: null });
    const res = await timeoutPOST(req(`/api/hand-cricket/match/${MATCH_ID}/timeout`), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: false, code: "not_timed_out", remaining_ms: 800 });
  });

  it("timeout: a stranger is still forbidden", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "forbidden" }, error: null });
    const res = await timeoutPOST(req(`/api/hand-cricket/match/${MATCH_ID}/timeout`), params);
    expect(res.status).toBe(403);
  });
});

// ── 6. Migration contract ─────────────────────────────────────────────────────

describe("Migration 0015 — Hand Cricket", () => {
  const sql = fs.readFileSync(
    path.resolve(__dirname, "../../supabase/migrations/0015_hand_cricket.sql"),
    "utf-8",
  );
  // Code only (comments stripped), newline-agnostic: the repo may be checked out with CRLF
  const flat = sql.replace(/--[^\n]*/g, "").replace(/\s+/g, " ");

  it("allows the hand_cricket game type on matches", () => {
    expect(flat).toContain("CHECK (game_type IN ('rps', 'chess', 'hand_cricket'))");
  });

  it("enables RLS on all three tables", () => {
    for (const table of ["hand_cricket_matches", "hand_cricket_balls", "hand_cricket_throws"]) {
      expect(flat).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("never lets clients read hidden throws", () => {
    expect(flat).toContain('ON public.hand_cricket_throws FOR SELECT USING (FALSE)');
    expect(flat).toContain("REVOKE ALL ON public.hand_cricket_throws FROM anon, authenticated");
    expect(flat).not.toMatch(/ADD TABLE public\.hand_cricket_throws/);
  });

  it("blocks all direct client writes", () => {
    for (const table of ["hand_cricket_matches", "hand_cricket_balls", "hand_cricket_throws"]) {
      expect(flat).toContain(`ON public.${table} FOR INSERT WITH CHECK (FALSE)`);
      expect(flat).toContain(`ON public.${table} FOR UPDATE USING (FALSE)`);
      expect(flat).toContain(`ON public.${table} FOR DELETE USING (FALSE)`);
    }
  });

  it("pins search_path on every SECURITY DEFINER function", () => {
    const definers = flat.match(/SECURITY DEFINER SET search_path = public, pg_catalog/g) ?? [];
    const allDefiners = flat.match(/SECURITY DEFINER/g) ?? [];
    expect(definers.length).toBe(allDefiners.length);
    expect(definers.length).toBeGreaterThanOrEqual(10);
  });

  it("keeps internal helpers away from clients", () => {
    expect(flat).toContain("REVOKE ALL ON FUNCTION public._hc_start_play(UUID, TEXT) FROM PUBLIC, anon, authenticated");
    expect(flat).toContain("REVOKE ALL ON FUNCTION public._hc_resolve_ball(UUID) FROM PUBLIC, anon, authenticated");
    expect(flat).not.toMatch(/GRANT EXECUTE ON FUNCTION public\._hc_/);
  });

  it("only friends can be challenged, and blocks are respected", () => {
    expect(flat).toContain("IF NOT public.are_friends(v_caller, p_opponent_id) THEN");
    expect(flat).toContain("IF public.is_blocked(v_caller, p_opponent_id) THEN");
  });

  it("requires both players to have joined before any game action", () => {
    const joinedChecks = flat.match(/IF NOT \(v_hc\.player1_joined AND v_hc\.player2_joined\) THEN/g) ?? [];
    expect(joinedChecks.length).toBeGreaterThanOrEqual(3); // toss, throw, timeout
  });

  it("guards the RPS tables against other games' match ids", () => {
    expect(flat).toContain("BEFORE INSERT ON public.game_moves FOR EACH ROW EXECUTE FUNCTION public._enforce_rps_match_rows()");
    expect(flat).toContain("BEFORE INSERT ON public.game_rounds FOR EACH ROW EXECUTE FUNCTION public._enforce_rps_match_rows()");
  });

  it("uses the same rules and clocks as the TypeScript engine", () => {
    expect(flat).toContain(`balls_per_innings SMALLINT NOT NULL DEFAULT ${BALLS_PER_INNINGS}`);
    expect(flat).toContain("IF v_bat IS NULL THEN v_runs := 0;");
    expect(flat).toContain("ELSIF v_bowl IS NULL THEN v_runs := v_bat;");
    expect(flat).toContain("ELSIF v_bat = v_bowl THEN v_out := TRUE;");
    expect(flat).toContain("target = v_inn_runs + 1");

    const secs = (ms: number) => `INTERVAL '${ms / 1000} seconds'`;
    expect(flat).toContain(`ball_opens_at = NOW() + ${secs(REVEAL_PAUSE_MS)}`);
    expect(flat).toContain(`ball_deadline = NOW() + ${secs(REVEAL_PAUSE_MS + SHOT_CLOCK_MS)}`);
    expect(flat).toContain(`ball_opens_at = NOW() + ${secs(INNINGS_BREAK_MS)}`);
    expect(flat).toContain(`ball_deadline = NOW() + ${secs(INNINGS_BREAK_MS + SHOT_CLOCK_MS)}`);
    expect(flat).toContain(`toss_deadline = NOW() + ${secs(TOSS_WINDOW_MS)}`);
  });
});
