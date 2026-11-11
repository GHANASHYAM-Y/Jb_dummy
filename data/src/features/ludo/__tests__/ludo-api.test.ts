/**
 * EVOAIQU — Ludo online API
 *
 * Covers:
 *  1. Route auth, validation and status mapping (Supabase mocked)
 *  2. Roll / move / timeout: turn checks, stale versions, illegal moves,
 *     service-role writes, wins, and the 503 path without a service key
 *  3. Migration contract: RLS, service-role-only writes, search_path,
 *     game_type constraint, initial state in sync with the engine
 */

import fs from "fs";
import path from "path";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createGame, FINISHED, type LudoState } from "@/features/ludo/engine/engine";
import { LUDO_TURN_MS, type LudoSnapshot } from "@/features/ludo/types";

// ── Supabase mocks ───────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockAdminRpc = vi.fn();
const mockProfilesIn = vi.fn();
const serviceKey = { present: true };

vi.mock("@/core/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      rpc: mockRpc,
      from: () => ({ select: () => ({ in: mockProfilesIn }) }),
    }),
  ),
  createServiceRoleClient: vi.fn(() => {
    if (!serviceKey.present) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    return { rpc: mockAdminRpc };
  }),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, connection: vi.fn().mockResolvedValue(undefined) };
});

import { POST as createPOST } from "@/app/api/ludo/create/route";
import { GET as matchGET } from "@/app/api/ludo/match/[matchId]/route";
import { POST as joinPOST } from "@/app/api/ludo/match/[matchId]/join/route";
import { POST as cancelPOST } from "@/app/api/ludo/match/[matchId]/cancel/route";
import { POST as rollPOST } from "@/app/api/ludo/match/[matchId]/roll/route";
import { POST as movePOST } from "@/app/api/ludo/match/[matchId]/move/route";
import { POST as timeoutPOST } from "@/app/api/ludo/match/[matchId]/timeout/route";
import { httpStatusForCode, planLudoAction, winnerUserId } from "@/features/ludo/server/server";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MATCH_ID = "11111111-1111-4111-8111-111111111111";
const P1 = "22222222-2222-4222-8222-222222222222"; // red
const P2 = "33333333-3333-4333-8333-333333333333"; // yellow

function onlineGame(): LudoState {
  return createGame([
    { color: "red", kind: "human", userId: P1, label: "" },
    { color: "yellow", kind: "human", userId: P2, label: "" },
  ]);
}

function snapshot(
  state: LudoState,
  opts: { version?: number; phase?: string; status?: string; deadlineMs?: number; nowMs?: number } = {},
): LudoSnapshot & { ok: true } {
  const now = opts.nowMs ?? Date.now();
  return {
    ok: true,
    match: {
      id: MATCH_ID,
      phase: (opts.phase ?? "active") as LudoSnapshot["match"]["phase"],
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
    },
    game: {
      status: (opts.status ?? "playing") as LudoSnapshot["game"]["status"],
      version: opts.version ?? 4,
      state,
      turn_deadline: new Date(opts.deadlineMs ?? now + LUDO_TURN_MS).toISOString(),
      player1_joined: true,
      player2_joined: true,
    },
    server_now: new Date(now).toISOString(),
  };
}

/** get_ludo_state returns `snap` for the user client. */
function serveState(snap: ReturnType<typeof snapshot>) {
  mockRpc.mockImplementation((name: string) =>
    Promise.resolve(
      name === "get_ludo_state" ? { data: snap, error: null } : { data: { ok: false, code: "unknown" }, error: null },
    ),
  );
}

function adminOk(version = 5, code = "state_applied") {
  mockAdminRpc.mockResolvedValue({ data: { ok: true, code, version }, error: null });
}

const params = { params: Promise.resolve({ matchId: MATCH_ID }) };
const req = (url: string, body?: unknown, method = "POST") =>
  new NextRequest(`http://localhost:3000${url}`, {
    method,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const lastApplyArgs = () => mockAdminRpc.mock.calls[mockAdminRpc.mock.calls.length - 1][1];

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockReset();
  mockAdminRpc.mockReset();
  serviceKey.present = true;
  mockGetUser.mockResolvedValue({ data: { user: { id: P1 } }, error: null });
});

// ── 1. Auth, validation, simple RPC routes ───────────────────────────────────

describe("Ludo API — auth and validation", () => {
  it.each([
    ["roll", () => rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, { version: 0 }), params)],
    ["move", () => movePOST(req(`/api/ludo/match/${MATCH_ID}/move`, { version: 0, token: 0 }), params)],
    ["timeout", () => timeoutPOST(req(`/api/ludo/match/${MATCH_ID}/timeout`), params)],
    ["join", () => joinPOST(req(`/api/ludo/match/${MATCH_ID}/join`), params)],
    ["cancel", () => cancelPOST(req(`/api/ludo/match/${MATCH_ID}/cancel`), params)],
    ["create", () => createPOST(req("/api/ludo/create", { opponent_id: P2 }))],
    ["get", () => matchGET(req(`/api/ludo/match/${MATCH_ID}`, undefined, "GET"), params)],
  ])("%s: rejects unauthenticated callers with 401", async (_name, call) => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("no session") });
    const res = await call();
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("unauthenticated");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it("rejects a malformed match id with 400", async () => {
    const bad = { params: Promise.resolve({ matchId: "not-a-uuid" }) };
    const res = await rollPOST(req("/api/ludo/match/x/roll", { version: 0 }), bad);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid_id");
  });

  it.each([
    [{}, "invalid_version"],
    [{ version: -1 }, "invalid_version"],
    [{ version: 1.5 }, "invalid_version"],
    [{ version: "3" }, "invalid_version"],
  ])("roll: rejects %j with %s", async (body, code) => {
    const res = await rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, body), params);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(code);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    [{ version: 0 }, "invalid_token"],
    [{ version: 0, token: 4 }, "invalid_token"],
    [{ version: 0, token: -1 }, "invalid_token"],
    [{ version: 0, token: "1" }, "invalid_token"],
    [{ token: 1 }, "invalid_version"],
  ])("move: rejects %j with %s", async (body, code) => {
    const res = await movePOST(req(`/api/ludo/match/${MATCH_ID}/move`, body), params);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(code);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("move: rejects an invalid JSON body", async () => {
    const res = await movePOST(req(`/api/ludo/match/${MATCH_ID}/move`, "{oops"), params);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid_body");
  });

  it("create: validates the opponent and refuses yourself", async () => {
    const bad = await createPOST(req("/api/ludo/create", { opponent_id: "nope" }));
    expect(bad.status).toBe(400);
    const self = await createPOST(req("/api/ludo/create", { opponent_id: P1 }));
    expect(self.status).toBe(400);
    expect((await self.json()).code).toBe("no_self_match");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("create: calls create_ludo_match and passes existing_match through", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: true, code: "existing_match", match_id: MATCH_ID }, error: null });
    const res = await createPOST(req("/api/ludo/create", { opponent_id: P2 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, code: "existing_match", match_id: MATCH_ID });
    expect(mockRpc).toHaveBeenCalledWith("create_ludo_match", { p_opponent_id: P2 });
  });

  it.each([
    ["not_friends", 403],
    ["blocked", 403],
    ["opponent_not_found", 404],
  ])("create: maps %s to HTTP %i", async (code, status) => {
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code }, error: null });
    const res = await createPOST(req("/api/ludo/create", { opponent_id: P2 }));
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ success: false, code });
  });

  it("join and cancel call their RPCs; cancel after start is a 409", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: true, code: "match_started", phase: "active" }, error: null });
    const joined = await joinPOST(req(`/api/ludo/match/${MATCH_ID}/join`), params);
    expect(await joined.json()).toMatchObject({ success: true, phase: "active" });
    expect(mockRpc).toHaveBeenLastCalledWith("join_ludo_match", { p_match_id: MATCH_ID });

    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "not_waiting" }, error: null });
    const cancelled = await cancelPOST(req(`/api/ludo/match/${MATCH_ID}/cancel`), params);
    expect(cancelled.status).toBe(409);
    expect(mockRpc).toHaveBeenLastCalledWith("cancel_ludo_match", { p_match_id: MATCH_ID });
  });

  it("get: returns the snapshot and both profiles", async () => {
    serveState(snapshot(onlineGame()));
    mockProfilesIn.mockResolvedValueOnce({
      data: [{ id: P2, display_name: "Asha", evoora_id: "asha", avatar_url: null }],
      error: null,
    });
    const res = await matchGET(req(`/api/ludo/match/${MATCH_ID}`, undefined, "GET"), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.state.game.state.players.map((p: { color: string }) => p.color)).toEqual(["red", "yellow"]);
    expect(json.state).not.toHaveProperty("ok");
    expect(json.players.player2.display_name).toBe("Asha");
    expect(json.players.player1.display_name).toBe("Player 1");
  });

  it("get: maps forbidden to 403", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "forbidden" }, error: null });
    const res = await matchGET(req(`/api/ludo/match/${MATCH_ID}`, undefined, "GET"), params);
    expect(res.status).toBe(403);
  });

  it("status mapping covers the contract codes", () => {
    expect(httpStatusForCode("not_your_turn")).toBe(403);
    expect(httpStatusForCode("stale_version")).toBe(409);
    expect(httpStatusForCode("illegal_move")).toBe(409);
    expect(httpStatusForCode("match_not_active")).toBe(409);
    expect(httpStatusForCode("service_unavailable")).toBe(503);
  });
});

// ── 2. Roll / move / timeout ─────────────────────────────────────────────────

describe("Ludo API — roll", () => {
  it("rolls on the server and saves through apply_ludo_state at the expected version", async () => {
    serveState(snapshot(onlineGame(), { version: 4 }));
    adminOk(5);
    const res = await rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, { version: 4 }), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, version: 5 });
    expect(json.event.type).toBe("roll");
    expect(json.event.dice).toBeGreaterThanOrEqual(1);
    expect(json.event.dice).toBeLessThanOrEqual(6);

    expect(mockAdminRpc).toHaveBeenCalledTimes(1);
    expect(mockAdminRpc.mock.calls[0][0]).toBe("apply_ludo_state");
    const args = lastApplyArgs();
    expect(args).toMatchObject({ p_match_id: MATCH_ID, p_caller_id: P1, p_expected_version: 4, p_winner_id: null });
    expect(args.p_state.moveCount).toBe(1);
    expect(typeof args.p_turn_deadline).toBe("string");
  });

  it("returns 503 service_unavailable when the service role key is missing", async () => {
    serviceKey.present = false;
    serveState(snapshot(onlineGame()));
    const res = await rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, { version: 4 }), params);
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("service_unavailable");
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it("rejects a roll out of turn with 403 not_your_turn", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: P2 } }, error: null });
    serveState(snapshot(onlineGame()));
    const res = await rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, { version: 4 }), params);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("not_your_turn");
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it("rejects a stale version with 409 before rolling", async () => {
    serveState(snapshot(onlineGame(), { version: 7 }));
    const res = await rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, { version: 6 }), params);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "stale_version", version: 7 });
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it("passes a stale_version from the database through as 409", async () => {
    serveState(snapshot(onlineGame(), { version: 4 }));
    mockAdminRpc.mockResolvedValueOnce({ data: { ok: false, code: "stale_version", version: 5 }, error: null });
    const res = await rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, { version: 4 }), params);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("stale_version");
  });

  it("rejects a second roll while one is pending", async () => {
    serveState(snapshot({ ...onlineGame(), dice: 6, sixesInRow: 1 }));
    const res = await rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, { version: 4 }), params);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("dice_pending");
  });

  it.each(["waiting", "completed", "forfeited"])("rejects play in phase %s with 409 match_not_active", async (phase) => {
    serveState(snapshot(onlineGame(), { phase, status: phase === "waiting" ? "waiting" : "playing" }));
    const res = await rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, { version: 4 }), params);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("match_not_active");
  });

  it("returns 500 when the database errors", async () => {
    serveState(snapshot(onlineGame()));
    mockAdminRpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const res = await rollPOST(req(`/api/ludo/match/${MATCH_ID}/roll`, { version: 4 }), params);
    expect(res.status).toBe(500);
  });
});

describe("Ludo API — move", () => {
  function withRoll(dice: number, red: number[]): LudoState {
    const g = onlineGame();
    return { ...g, dice, tokens: { ...g.tokens, red } };
  }

  it("applies a legal move validated by the engine", async () => {
    serveState(snapshot(withRoll(6, [-1, -1, -1, -1])));
    adminOk(5);
    const res = await movePOST(req(`/api/ludo/match/${MATCH_ID}/move`, { version: 4, token: 2 }), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.event).toMatchObject({ type: "move", token: 2, from: -1, to: 0, extraTurn: true });
    expect(lastApplyArgs().p_state.tokens.red).toEqual([-1, -1, 0, -1]);
  });

  it("rejects an illegal move with 409", async () => {
    serveState(snapshot(withRoll(3, [-1, 10, -1, -1])));
    const res = await movePOST(req(`/api/ludo/match/${MATCH_ID}/move`, { version: 4, token: 0 }), params);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("illegal_move");
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it("rejects a move before rolling", async () => {
    serveState(snapshot(onlineGame()));
    const res = await movePOST(req(`/api/ludo/match/${MATCH_ID}/move`, { version: 4, token: 0 }), params);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("roll_first");
  });

  it("rejects a move out of turn with 403", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: P2 } }, error: null });
    serveState(snapshot(withRoll(6, [-1, -1, -1, -1])));
    const res = await movePOST(req(`/api/ludo/match/${MATCH_ID}/move`, { version: 4, token: 0 }), params);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("not_your_turn");
  });

  it("rejects a stale version with 409", async () => {
    serveState(snapshot(withRoll(6, [-1, -1, -1, -1]), { version: 9 }));
    const res = await movePOST(req(`/api/ludo/match/${MATCH_ID}/move`, { version: 8, token: 0 }), params);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("stale_version");
  });

  it("finishing the last token sends the winner and clears the clock", async () => {
    serveState(snapshot(withRoll(2, [FINISHED, FINISHED, FINISHED, FINISHED - 2])));
    adminOk(5, "game_over");
    const res = await movePOST(req(`/api/ludo/match/${MATCH_ID}/move`, { version: 4, token: 3 }), params);
    expect(res.status).toBe(200);
    expect((await res.json()).code).toBe("game_over");
    const args = lastApplyArgs();
    expect(args.p_winner_id).toBe(P1);
    expect(args.p_turn_deadline).toBeNull();
    expect(args.p_state).toMatchObject({ status: "finished", winner: "red" });
  });
});

describe("Ludo API — timeout", () => {
  it("an early claim is a normal 200 with not_timed_out", async () => {
    serveState(snapshot(onlineGame(), { deadlineMs: Date.now() + 10_000 }));
    const res = await timeoutPOST(req(`/api/ludo/match/${MATCH_ID}/timeout`), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: false, code: "not_timed_out" });
    expect(json.remaining_ms).toBeGreaterThan(0);
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it("allows the 1 second tolerance before accepting", async () => {
    serveState(snapshot(onlineGame(), { deadlineMs: Date.now() - 500 }));
    const res = await timeoutPOST(req(`/api/ludo/match/${MATCH_ID}/timeout`), params);
    expect((await res.json()).code).toBe("not_timed_out");
  });

  it("after the deadline, plays the idle player's pending roll for them", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: P2 } }, error: null }); // opponent claims
    const g = onlineGame();
    serveState(snapshot({ ...g, dice: 6, sixesInRow: 1 }, { deadlineMs: Date.now() - 5_000 }));
    adminOk(5);
    const res = await timeoutPOST(req(`/api/ludo/match/${MATCH_ID}/timeout`), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, version: 5 });
    expect(json.event.type).toBe("move");
    expect(lastApplyArgs().p_state.tokens.red.filter((p: number) => p === 0)).toHaveLength(1);
    expect(lastApplyArgs().p_caller_id).toBe(P2);
  });

  it("after the deadline with no roll pending, rolls then auto-moves", () => {
    const now = Date.now();
    const snap = snapshot(onlineGame(), { deadlineMs: now - 5_000, nowMs: now });
    const planned = planLudoAction(snap, P2, { kind: "timeout" }, now, () => 6);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.events.map((e) => e.type)).toEqual(["roll", "move"]);
    expect(planned.state.tokens.red).toContain(0);

    const noMoves = planLudoAction(snap, P2, { kind: "timeout" }, now, () => 3);
    expect(noMoves.ok && noMoves.events.map((e) => e.type)).toEqual(["roll"]);
    expect(noMoves.ok && noMoves.state.turn).toBe(1);
  });

  it("counts missed turns and forfeits on the third in a row", () => {
    const now = Date.now();
    const g = { ...onlineGame(), dice: 3 };
    const snap = (missed: number) =>
      snapshot({ ...g, missedTurns: { red: missed } }, { deadlineMs: now - 5_000, nowMs: now });

    const second = planLudoAction(snap(1), P2, { kind: "timeout" }, now, () => 3);
    expect(second.ok && second.state.missedTurns?.red).toBe(2);
    expect(second.ok && second.state.status).toBe("playing");
    expect(second.ok && second.endReason).toBeUndefined();

    const third = planLudoAction(snap(2), P2, { kind: "timeout" }, now, () => 3);
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.endReason).toBe("forfeit");
    expect(third.state).toMatchObject({ status: "finished", winner: "yellow" });
    expect(winnerUserId(third.state)).toBe(P2);
  });

  it("a real move by the player resets their missed-turn count", () => {
    const g = { ...onlineGame(), dice: 6, missedTurns: { red: 2 } };
    const snap = snapshot(g, { deadlineMs: Date.now() + 10_000 });
    const moved = planLudoAction(snap, P1, { kind: "move", version: 4, token: 0 }, Date.now());
    expect(moved.ok && moved.state.missedTurns?.red).toBe(0);
  });

  it("saves a forfeit with end reason forfeit", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: P2 } }, error: null });
    const g = { ...onlineGame(), dice: 3, missedTurns: { red: 2 } };
    serveState(snapshot(g, { deadlineMs: Date.now() - 5_000 }));
    adminOk(5);
    const res = await timeoutPOST(req(`/api/ludo/match/${MATCH_ID}/timeout`), params);
    expect(res.status).toBe(200);
    expect(lastApplyArgs()).toMatchObject({ p_winner_id: P2, p_end_reason: "forfeit", p_turn_deadline: null });
  });

  it("returns 503 without a service role key", async () => {
    serviceKey.present = false;
    const res = await timeoutPOST(req(`/api/ludo/match/${MATCH_ID}/timeout`), params);
    expect(res.status).toBe(503);
  });

  it("refuses non-participants", () => {
    const planned = planLudoAction(snapshot(onlineGame()), "44444444-4444-4444-8444-444444444444", { kind: "roll", version: 4 }, Date.now());
    expect(planned).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("Migration 0017 — Ludo forfeit and cleanup", () => {
  const sql = fs.readFileSync(
    path.resolve(__dirname, "../../../../supabase/migrations/0017_ludo_forfeit_and_cleanup.sql"),
    "utf-8",
  );
  const flat = sql.replace(/--[^\r\n]*/g, "").replace(/\s+/g, " ");

  it("replaces apply_ludo_state with an end-reason version, service role only", () => {
    const sig = "public.apply_ludo_state(UUID, UUID, INT, JSONB, TIMESTAMPTZ, UUID, TEXT)";
    expect(flat).toContain("DROP FUNCTION IF EXISTS public.apply_ludo_state(UUID, UUID, INT, JSONB, TIMESTAMPTZ, UUID)");
    expect(flat).toContain(`REVOKE ALL ON FUNCTION ${sig} FROM PUBLIC, anon, authenticated`);
    expect(flat).toContain(`GRANT EXECUTE ON FUNCTION ${sig} TO service_role;`);
    expect(flat).toContain("p_end_reason NOT IN ('completed', 'forfeit')");
    expect(flat).toContain("end_reason = p_end_reason");
  });

  it("marks the game row finished when the shared lifecycle ends the match", () => {
    expect(flat).toContain("AFTER UPDATE OF phase ON public.matches");
    expect(flat).toContain("NEW.phase IN ('completed', 'aborted', 'forfeited', 'cancelled')");
    expect(flat).toContain("SET status = 'finished', turn_deadline = NULL");
    expect(flat).toContain("SECURITY DEFINER SET search_path = public, pg_catalog");
  });
});

// ── 3. Migration contract ────────────────────────────────────────────────────

describe("Migration 0016 — Ludo", () => {
  const sql = fs.readFileSync(path.resolve(__dirname, "../../../../supabase/migrations/0016_ludo.sql"), "utf-8");
  // Code only (comments stripped), newline-agnostic
  const flat = sql.replace(/--[^\r\n]*/g, "").replace(/\s+/g, " ");

  it("allows the ludo game type on matches", () => {
    expect(flat).toContain("CHECK (game_type IN ('rps', 'chess', 'hand_cricket', 'ludo'))");
    expect(flat).toContain("pg_get_constraintdef(oid) ILIKE '%game_type%'");
  });

  it("creates ludo_matches with versioned JSONB state", () => {
    expect(flat).toContain("CREATE TABLE IF NOT EXISTS public.ludo_matches");
    expect(flat).toContain("REFERENCES public.matches(id) ON DELETE CASCADE");
    expect(flat).toContain("state JSONB NOT NULL");
    expect(flat).toContain("version INT NOT NULL DEFAULT 0");
    expect(flat).toContain("CHECK (status IN ('waiting', 'playing', 'finished'))");
    expect(flat).toContain("EXECUTE FUNCTION public.set_updated_at()");
  });

  it("enables RLS: participants read, direct writes blocked", () => {
    expect(flat).toContain("ALTER TABLE public.ludo_matches ENABLE ROW LEVEL SECURITY");
    expect(flat).toContain("USING (auth.uid() = player1_id OR auth.uid() = player2_id)");
    expect(flat).toContain("ON public.ludo_matches FOR INSERT WITH CHECK (FALSE)");
    expect(flat).toContain("ON public.ludo_matches FOR UPDATE USING (FALSE)");
    expect(flat).toContain("ON public.ludo_matches FOR DELETE USING (FALSE)");
  });

  it("lets only the service role call apply_ludo_state", () => {
    const sig = "public.apply_ludo_state(UUID, UUID, INT, JSONB, TIMESTAMPTZ, UUID)";
    expect(flat).toContain(`REVOKE ALL ON FUNCTION ${sig} FROM PUBLIC, anon, authenticated`);
    expect(flat).toContain(`GRANT EXECUTE ON FUNCTION ${sig} TO service_role;`);
    const grants = flat.match(/GRANT EXECUTE ON FUNCTION public\.apply_ludo_state[^;]*;/g) ?? [];
    expect(grants).toHaveLength(1);
    expect(grants[0]).not.toMatch(/authenticated|anon/);
  });

  it("apply_ludo_state locks rows, checks phase and version, completes the match", () => {
    const body = flat.slice(flat.indexOf("FUNCTION public.apply_ludo_state("));
    expect(body).toMatch(/FROM public\.matches WHERE id = p_match_id AND game_type = 'ludo' FOR UPDATE/);
    expect(body).toMatch(/FROM public\.ludo_matches WHERE id = p_match_id FOR UPDATE/);
    expect(body).toContain("v_match.phase NOT IN ('active', 'reconnecting')");
    expect(body).toContain("'stale_version'");
    expect(body).toContain("phase = 'completed', end_reason = 'completed', winner_id = p_winner_id, loser_id = v_loser");
  });

  it("pins search_path on every SECURITY DEFINER function", () => {
    const definers = flat.match(/SECURITY DEFINER SET search_path = public, pg_catalog/g) ?? [];
    expect(definers.length).toBe((flat.match(/SECURITY DEFINER/g) ?? []).length);
    expect(definers.length).toBe(5);
  });

  it("creates matches only between accepted, unblocked friends, serialized per pair", () => {
    expect(flat).toContain("IF NOT public.are_friends(v_caller, p_opponent_id) THEN");
    expect(flat).toContain("IF public.is_blocked(v_caller, p_opponent_id) THEN");
    expect(flat).toContain("PERFORM pg_advisory_xact_lock(");
    expect(flat).toContain("'existing_match'");
    expect(flat).toContain("NOW() + INTERVAL '10 minutes'");
  });

  it("starts the turn clock with LUDO_TURN_MS when both join", () => {
    expect(flat).toContain(`turn_deadline = NOW() + INTERVAL '${LUDO_TURN_MS / 1000} seconds'`);
  });

  it("initial state has the same shape as engine createGame", () => {
    const g = onlineGame();
    for (const key of Object.keys(g)) expect(flat).toContain(`'${key}'`);
    for (const key of Object.keys(g.players[0])) expect(flat).toContain(`'${key}'`);
    expect(flat).toContain("jsonb_build_object('color', 'red', 'kind', 'human', 'userId', v_caller, 'label', '')");
    expect(flat).toContain(
      "jsonb_build_object('color', 'yellow', 'kind', 'human', 'userId', p_opponent_id, 'label', '')",
    );
    expect(g.tokens.red).toEqual([-1, -1, -1, -1]);
    expect(flat).toContain("'red', '[-1, -1, -1, -1]'::jsonb");
    expect(flat).toContain("'yellow', '[-1, -1, -1, -1]'::jsonb");
    expect(flat).toMatch(/'turn', 0, 'dice', NULL, 'sixesInRow', 0, 'status', 'playing', 'winner', NULL, 'moveCount', 0, 'lastEvent', NULL/);
  });

  it("broadcasts ludo_matches over realtime", () => {
    expect(flat).toContain("ALTER TABLE public.ludo_matches REPLICA IDENTITY FULL");
    expect(flat).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.ludo_matches");
    expect(flat).toContain("EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;");
  });
});
