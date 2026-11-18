/**
 * EVOAIQU: Draw & Guess server helpers
 *
 * Shared by the /api/draw-guess routes and the room page. Only import from
 * Server Components and Route Handlers (it uses the server Supabase client).
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import type { DrawPlayer, DrawPlayers, DrawSnapshot } from "../types";

import { UUID_RE } from "@/shared/lib/validation";
export { UUID_RE };
export { readJson } from "@/shared/lib/http";

// The generated Database type does not include the draw tables/RPCs yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabase = any;

export function httpStatusForCode(code: string | undefined): number {
  switch (code) {
    case "unauthenticated":
      return 401;
    case "forbidden":
    case "blocked":
    case "drawer_cannot_guess":
      return 403;
    case "not_found":
      return 404;
    case "invalid_guess":
    case "invalid_code":
    case "invalid_id":
      return 400;
    default:
      return 409;
  }
}

type AuthedClient = { supabase: UntypedSupabase; userId: string };

export async function requireUser(): Promise<AuthedClient | NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated.", code: "unauthenticated" }, { status: 401 });
  }
  return { supabase, userId: user.id };
}

interface RpcResult {
  ok: boolean;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

/** Calls a draw RPC and turns the result into a response. `softCodes` return HTTP 200. */
export async function runDrawRpc(
  label: string,
  supabase: UntypedSupabase,
  rpcName: string,
  args: Record<string, unknown>,
  softCodes: string[] = [],
): Promise<NextResponse> {
  const { data, error } = await supabase.rpc(rpcName, args);
  if (error) {
    console.error(`[api/draw-guess/${label}] RPC error:`, error.message);
    return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
  }
  const result = (data ?? { ok: false, code: "empty_result" }) as RpcResult;
  if (!result.ok) {
    const code = result.code ?? "unknown";
    const status = softCodes.includes(code) ? 200 : httpStatusForCode(code);
    return NextResponse.json({ ...result, success: false, error: result.message || code, code }, { status });
  }
  return NextResponse.json({ ...result, success: true });
}

export type LoadRoomResult =
  | { ok: true; snapshot: DrawSnapshot; players: DrawPlayers }
  | { ok: false; code: string; status: number };

async function loadPlayers(supabase: UntypedSupabase, hostId: string, guestId: string | null): Promise<DrawPlayers> {
  const ids = guestId ? [hostId, guestId] : [hostId];
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
  const byId = new Map<string, DrawPlayer>(
    ((data ?? []) as DrawPlayer[]).map((p) => [
      p.id,
      { id: p.id, display_name: p.display_name || "Player", avatar_url: p.avatar_url ?? null },
    ]),
  );
  return {
    host: byId.get(hostId) ?? { id: hostId, display_name: "Host", avatar_url: null },
    guest: guestId ? (byId.get(guestId) ?? { id: guestId, display_name: "Guest", avatar_url: null }) : null,
  };
}

/** Loads one player's view of a room plus both players' public profiles. */
export async function loadDrawRoom(supabase: UntypedSupabase, roomId: string): Promise<LoadRoomResult> {
  const { data, error } = await supabase.rpc("draw_get_state", { p_room_id: roomId });
  if (error) {
    console.error("[draw-guess] draw_get_state error:", error.message);
    return { ok: false, code: "rpc_error", status: 500 };
  }
  const result = data as (DrawSnapshot & { ok: true }) | { ok: false; code?: string } | null;
  if (!result || !result.ok) {
    const code = result && !result.ok && result.code ? result.code : "not_found";
    return { ok: false, code, status: httpStatusForCode(code) };
  }
  const snapshot: DrawSnapshot = { room: result.room, guesses: result.guesses ?? [], server_now: result.server_now };
  const players = await loadPlayers(supabase, snapshot.room.host_id, snapshot.room.guest_id);
  return { ok: true, snapshot, players };
}
