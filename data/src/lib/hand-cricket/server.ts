/**
 * EVOAIQU — Hand Cricket server helpers
 *
 * Shared by the /api/hand-cricket routes and the match page. Only import from
 * Server Components and Route Handlers (it uses the server Supabase client).
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import type { HandCricketPlayer, HandCricketPlayers, HandCricketSnapshot } from "./types";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The generated Database type does not include the hand cricket tables/RPCs yet,
// so RPC calls go through an untyped client, matching the chess routes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabase = any;

/** HTTP status for an RPC result code. Unknown codes are game-state conflicts. */
export function httpStatusForCode(code: string | undefined): number {
  switch (code) {
    case "unauthenticated":
      return 401;
    case "forbidden":
    case "player_left":
    case "not_toss_winner":
    case "not_friends":
    case "blocked":
      return 403;
    case "not_found":
    case "opponent_not_found":
      return 404;
    case "invalid_throw":
    case "invalid_decision":
    case "invalid_opponent":
    case "invalid_overs":
    case "invalid_squad":
      return 400;
    default:
      return 409;
  }
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
    return NextResponse.json({ error: "Not authenticated.", code: "unauthenticated" }, { status: 401 });
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
 * Calls a hand cricket RPC for a match action and turns the result into a
 * response. Codes listed in `softCodes` return HTTP 200 with success: false,
 * because the client expects them during normal play (e.g. a timeout claim
 * that arrives a moment early).
 */
export async function runMatchRpc(
  label: string,
  supabase: UntypedSupabase,
  rpcName: string,
  args: Record<string, unknown>,
  softCodes: string[] = [],
): Promise<NextResponse> {
  const { data, error } = await supabase.rpc(rpcName, args);

  if (error) {
    console.error(`[api/hand-cricket/${label}] RPC error:`, error.message);
    return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
  }

  const result = (data ?? { ok: false, code: "empty_result" }) as RpcResult;

  if (!result.ok) {
    const code = result.code ?? "unknown";
    const status = softCodes.includes(code) ? 200 : httpStatusForCode(code);
    return NextResponse.json(
      { ...result, success: false, error: result.message || code, code },
      { status },
    );
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

function fallbackPlayer(id: string, label: string): HandCricketPlayer {
  return { id, display_name: label, evoora_id: null, avatar_url: null };
}

export type LoadMatchResult =
  | { ok: true; snapshot: HandCricketSnapshot; players: HandCricketPlayers }
  | { ok: false; code: string; status: number };

/** Loads one player's view of a match plus both players' public profiles. */
export async function loadHandCricketMatch(
  supabase: UntypedSupabase,
  matchId: string,
): Promise<LoadMatchResult> {
  const { data, error } = await supabase.rpc("get_hand_cricket_state", { p_match_id: matchId });

  if (error) {
    console.error("[hand-cricket] get_hand_cricket_state error:", error.message);
    return { ok: false, code: "rpc_error", status: 500 };
  }

  const result = data as (HandCricketSnapshot & { ok: true }) | { ok: false; code?: string } | null;
  if (!result || !result.ok) {
    const code = result && !result.ok && result.code ? result.code : "not_found";
    return { ok: false, code, status: httpStatusForCode(code) };
  }

  const snapshot: HandCricketSnapshot = {
    match: result.match,
    game: result.game,
    balls: result.balls ?? [],
    my_throw: result.my_throw ?? null,
    opponent_has_thrown: Boolean(result.opponent_has_thrown),
    server_now: result.server_now,
  };

  const ids = [snapshot.match.player1_id, snapshot.match.player2_id];
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, evoora_id, avatar_url")
    .in("id", ids);

  const profiles = new Map<string, HandCricketPlayer>(
    ((profileRows ?? []) as HandCricketPlayer[]).map((p) => [
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
