/**
 * EVOAIQU — Ludo server helpers
 *
 * Shared by the /api/ludo routes. Only import from Server Components and
 * Route Handlers. Game rules run here with the TypeScript engine; the result
 * is saved through the service-role-only apply_ludo_state RPC.
 */

import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/core/supabase/server";
import {
  applyMove,
  applyRoll,
  autoMove,
  currentPlayer,
  legalMoves,
  passTurn,
  type LudoEvent,
  type LudoState,
} from "./engine";
import { LUDO_TURN_MS, type LudoPlayerProfile, type LudoPlayers, type LudoSnapshot } from "./types";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extra time allowed after turn_deadline before a timeout claim is accepted */
export const TIMEOUT_TOLERANCE_MS = 1_000;

/** A player who lets the clock run out this many turns in a row forfeits. */
export const MAX_MISSED_TURNS = 3;

// The generated Database type does not include the ludo tables/RPCs yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabase = any;

/** HTTP status for an RPC / action result code. Unknown codes are game-state conflicts. */
export function httpStatusForCode(code: string | undefined): number {
  switch (code) {
    case "unauthenticated":
      return 401;
    case "forbidden":
    case "not_your_turn":
    case "not_friends":
    case "blocked":
      return 403;
    case "not_found":
    case "opponent_not_found":
      return 404;
    case "invalid_id":
    case "invalid_body":
    case "invalid_opponent":
    case "invalid_opponent_id":
    case "invalid_version":
    case "invalid_token":
    case "no_self_match":
      return 400;
    case "service_unavailable":
      return 503;
    case "rpc_error":
    case "internal_error":
      return 500;
    default:
      return 409;
  }
}

export function errorResponse(code: string, error?: string, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json(
    { ...extra, success: false, error: error ?? code, code },
    { status: httpStatusForCode(code) },
  );
}

type AuthedClient = { supabase: UntypedSupabase; userId: string };

/** Resolves the signed-in user, or returns a 401 response. */
export async function requireUser(): Promise<AuthedClient | NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated.", code: "unauthenticated" },
      { status: 401 },
    );
  }
  return { supabase, userId: user.id };
}

export interface RpcResult {
  ok: boolean;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Calls a ludo RPC as the user and turns the result into a response.
 * Codes in `softCodes` return HTTP 200 with success: false.
 */
export async function runRpc(
  label: string,
  supabase: UntypedSupabase,
  rpcName: string,
  args: Record<string, unknown>,
  softCodes: string[] = [],
): Promise<NextResponse> {
  const { data, error } = await supabase.rpc(rpcName, args);

  if (error) {
    console.error(`[api/ludo/${label}] RPC error:`, error.message);
    return errorResponse("rpc_error", "Internal server error.");
  }

  const result = (data ?? { ok: false, code: "empty_result" }) as RpcResult;
  if (!result.ok) {
    const code = result.code ?? "unknown";
    const status = softCodes.includes(code) ? 200 : httpStatusForCode(code);
    return NextResponse.json({ ...result, success: false, error: result.message || code, code }, { status });
  }
  return NextResponse.json({ ...result, success: true });
}

/** Parses a JSON body, returning null when the body is missing or invalid. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function isVersion(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

export function isTokenIndex(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 3;
}

// ── Reading ──────────────────────────────────────────────────────────────────

export type SnapshotResult =
  | { ok: true; snapshot: LudoSnapshot; fetchedAt: number }
  | { ok: false; code: string };

/** The caller's snapshot via get_ludo_state (participants only). */
export async function fetchLudoSnapshot(supabase: UntypedSupabase, matchId: string): Promise<SnapshotResult> {
  const { data, error } = await supabase.rpc("get_ludo_state", { p_match_id: matchId });
  if (error) {
    console.error("[ludo] get_ludo_state error:", error.message);
    return { ok: false, code: "rpc_error" };
  }
  const result = data as (LudoSnapshot & { ok: true }) | { ok: false; code?: string } | null;
  if (!result || !result.ok) {
    return { ok: false, code: result && !result.ok && result.code ? result.code : "not_found" };
  }
  return {
    ok: true,
    fetchedAt: Date.now(),
    snapshot: { match: result.match, game: result.game, server_now: result.server_now },
  };
}

function fallbackPlayer(id: string, label: string): LudoPlayerProfile {
  return { id, display_name: label, evoora_id: null, avatar_url: null };
}

export type LoadMatchResult =
  | { ok: true; snapshot: LudoSnapshot; players: LudoPlayers }
  | { ok: false; code: string; status: number };

/** Loads one player's view of a match plus both players' public profiles. */
export async function loadLudoMatch(supabase: UntypedSupabase, matchId: string): Promise<LoadMatchResult> {
  const loaded = await fetchLudoSnapshot(supabase, matchId);
  if (!loaded.ok) return { ok: false, code: loaded.code, status: httpStatusForCode(loaded.code) };
  const { snapshot } = loaded;

  const ids = [snapshot.match.player1_id, snapshot.match.player2_id];
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, evoora_id, avatar_url")
    .in("id", ids);

  const profiles = new Map<string, LudoPlayerProfile>(
    ((profileRows ?? []) as LudoPlayerProfile[]).map((p) => [
      p.id,
      {
        id: p.id,
        display_name: p.display_name || "Player",
        evoora_id: p.evoora_id ?? null,
        avatar_url: p.avatar_url ?? null,
      },
    ]),
  );

  return {
    ok: true,
    snapshot,
    players: {
      player1: profiles.get(ids[0]) ?? fallbackPlayer(ids[0], "Player 1"),
      player2: profiles.get(ids[1]) ?? fallbackPlayer(ids[1], "Player 2"),
    },
  };
}

// ── Writing ──────────────────────────────────────────────────────────────────

export type LudoAction =
  | { kind: "roll"; version: number }
  | { kind: "move"; version: number; token: number }
  | { kind: "timeout" };

/** Server-side die: uniform 1..6 from a CSPRNG. */
export function serverRollDie(): number {
  return randomInt(1, 7);
}

type Planned =
  | { ok: true; state: LudoState; events: LudoEvent[]; endReason?: "forfeit" }
  | { ok: false; code: string; error: string; extra?: Record<string, unknown> };

/** A real roll or move by the player resets their missed-turn count. */
function clearMissed(state: LudoState, userId: string): LudoState {
  const color = state.players.find((p) => p.userId === userId)?.color;
  if (!color || !state.missedTurns?.[color]) return state;
  return { ...state, missedTurns: { ...state.missedTurns, [color]: 0 } };
}

/** Pure planning step: validates the action against the snapshot and runs the engine. */
export function planLudoAction(
  snapshot: LudoSnapshot,
  userId: string,
  action: LudoAction,
  nowMs: number,
  rollDie: () => number = serverRollDie,
): Planned {
  const { match, game } = snapshot;
  if (match.player1_id !== userId && match.player2_id !== userId) {
    return { ok: false, code: "forbidden", error: "You are not in this match." };
  }
  if (!["active", "reconnecting"].includes(match.phase) || game.status !== "playing" || game.state?.status !== "playing") {
    return { ok: false, code: "match_not_active", error: "This match is not in play." };
  }
  if (action.kind !== "timeout" && game.version !== action.version) {
    return { ok: false, code: "stale_version", error: "The board has changed.", extra: { version: game.version } };
  }

  let state = game.state;
  const events: LudoEvent[] = [];

  try {
    if (action.kind === "timeout") {
      const deadline = game.turn_deadline ? Date.parse(game.turn_deadline) : NaN;
      if (Number.isFinite(deadline) && nowMs < deadline + TIMEOUT_TOLERANCE_MS) {
        return {
          ok: false,
          code: "not_timed_out",
          error: "The turn clock has not run out.",
          extra: { remaining_ms: deadline + TIMEOUT_TOLERANCE_MS - nowMs },
        };
      }
      const turnColor = currentPlayer(state).color;
      if (state.dice === null) {
        const rolled = applyRoll(state, rollDie());
        state = rolled.state;
        events.push(rolled.event);
      }
      // Still this player's roll waiting to be used: play it for them
      if (state.dice !== null && currentPlayer(state).color === turnColor) {
        const token = autoMove(state);
        const step = token === null ? passTurn(state, "timeout") : applyMove(state, token);
        state = step.state;
        events.push(step.event);
      }
      if (state.status === "finished") return { ok: true, state, events };

      // Count the missed turn; too many in a row ends the match for them
      const missed = (state.missedTurns?.[turnColor] ?? 0) + 1;
      if (missed >= MAX_MISSED_TURNS) {
        const winner = state.players.find((p) => p.color !== turnColor);
        if (winner) {
          return {
            ok: true,
            events,
            endReason: "forfeit",
            state: {
              ...state,
              status: "finished",
              winner: winner.color,
              dice: null,
              missedTurns: { ...state.missedTurns, [turnColor]: missed },
            },
          };
        }
      }
      return { ok: true, state: { ...state, missedTurns: { ...state.missedTurns, [turnColor]: missed } }, events };
    }

    if (currentPlayer(state).userId !== userId) {
      return { ok: false, code: "not_your_turn", error: "It is not your turn." };
    }

    if (action.kind === "roll") {
      if (state.dice !== null) {
        return { ok: false, code: "dice_pending", error: "Move a token with your roll first." };
      }
      const rolled = applyRoll(state, rollDie());
      return { ok: true, state: clearMissed(rolled.state, userId), events: [rolled.event] };
    }

    if (state.dice === null) {
      return { ok: false, code: "roll_first", error: "Roll the dice first." };
    }
    if (!legalMoves(state).includes(action.token)) {
      return { ok: false, code: "illegal_move", error: "That token cannot move." };
    }
    const moved = applyMove(state, action.token);
    return { ok: true, state: clearMissed(moved.state, userId), events: [moved.event] };
  } catch (err) {
    return { ok: false, code: "illegal_move", error: err instanceof Error ? err.message : "Illegal move." };
  }
}

/** Winner's user id for a finished state, else null. */
export function winnerUserId(state: LudoState): string | null {
  if (state.status !== "finished" || !state.winner) return null;
  return state.players.find((p) => p.color === state.winner)?.userId ?? null;
}

/**
 * Loads the match as the caller, applies the action with the engine, and saves
 * it with apply_ludo_state (service role) at the expected version.
 */
export async function performLudoAction(
  label: string,
  auth: AuthedClient,
  matchId: string,
  action: LudoAction,
): Promise<NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any;
  try {
    admin = createServiceRoleClient();
  } catch {
    return errorResponse("service_unavailable", "Online Ludo is not available right now.");
  }

  const loaded = await fetchLudoSnapshot(auth.supabase, matchId);
  if (!loaded.ok) return errorResponse(loaded.code);

  // Database clock now, so deadlines agree with turn_deadline set in SQL
  const serverNow = Date.parse(loaded.snapshot.server_now);
  const dbNow = (Number.isFinite(serverNow) ? serverNow : loaded.fetchedAt) + (Date.now() - loaded.fetchedAt);

  const plan = planLudoAction(loaded.snapshot, auth.userId, action, dbNow);
  if (!plan.ok) {
    if (plan.code === "not_timed_out") {
      return NextResponse.json({ ...plan.extra, success: false, error: plan.error, code: plan.code });
    }
    return errorResponse(plan.code, plan.error, plan.extra);
  }

  const winnerId = winnerUserId(plan.state);
  const { data, error } = await admin.rpc("apply_ludo_state", {
    p_match_id: matchId,
    p_caller_id: auth.userId,
    p_expected_version: loaded.snapshot.game.version,
    p_state: plan.state,
    p_turn_deadline: winnerId ? null : new Date(dbNow + LUDO_TURN_MS).toISOString(),
    p_winner_id: winnerId,
    p_end_reason: plan.endReason ?? "completed",
  });

  if (error) {
    console.error(`[api/ludo/${label}] apply_ludo_state error:`, error.message);
    return errorResponse("rpc_error", "Internal server error.");
  }

  const result = (data ?? { ok: false, code: "empty_result" }) as RpcResult;
  if (!result.ok) {
    const code = result.code ?? "unknown";
    return errorResponse(code, result.message || code, { version: result.version });
  }

  return NextResponse.json({
    success: true,
    code: result.code ?? "state_applied",
    version: result.version,
    event: plan.events[plan.events.length - 1] ?? null,
    events: plan.events,
  });
}
