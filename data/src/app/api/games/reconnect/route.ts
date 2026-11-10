import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/games/reconnect
 *
 * Reconnects a player to an ongoing match during the 60-second grace period:
 *  - Authenticates the player.
 *  - Verifies match membership & non-terminal match state.
 *  - Verifies 60-second deadline has not expired.
 *  - Clears disconnection flags and restores 'active' phase.
 *  - Preserves exact game state without duplicating records.
 */
export async function POST(request: NextRequest) {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated.", code: "unauthenticated" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const matchId = body.match_id || request.nextUrl.searchParams.get("match_id");

    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json(
        { error: "match_id must be a valid UUID.", code: "invalid_id" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("reconnect_game", {
      p_match_id: matchId,
    });

    if (error) {
      console.error("[games/reconnect] RPC error:", error.message);
      return NextResponse.json(
        { error: "Internal server error.", code: "rpc_error" },
        { status: 500 }
      );
    }

    const result = data as {
      ok: boolean;
      code: string;
      message?: string;
      phase?: string;
      opponent_disconnected?: boolean;
      server_now?: string;
      winner_id?: string | null;
      end_reason?: string;
    };

    if (!result.ok) {
      if (result.code === "forbidden") {
        return NextResponse.json(
          { error: "Forbidden", code: "forbidden" },
          { status: 403 }
        );
      }
      if (result.code === "not_found") {
        return NextResponse.json(
          { error: "Match not found", code: "not_found" },
          { status: 404 }
        );
      }
      if (result.code === "deadline_expired") {
        return NextResponse.json(
          { error: "60-second reconnection deadline has expired.", code: "deadline_expired" },
          { status: 410 }
        );
      }
      if (result.code === "match_already_ended") {
        return NextResponse.json(
          {
            error: "Match has already ended.",
            code: "match_already_ended",
            phase: result.phase,
            winner_id: result.winner_id,
            end_reason: result.end_reason,
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: result.message || result.code, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        code: result.code,
        phase: result.phase,
        opponent_disconnected: result.opponent_disconnected,
        server_now: result.server_now,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[games/reconnect] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error.", code: "internal_error" },
      { status: 500 }
    );
  }
}

