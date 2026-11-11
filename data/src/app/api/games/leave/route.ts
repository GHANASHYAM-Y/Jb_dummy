import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { UUID_RE } from "@/shared/lib/validation";


/**
 * POST /api/games/leave
 *
 * Voluntary player departure ("Leave Game"):
 *  - Immediately records player departure.
 *  - If opponent remains, opponent is declared winner, caller loser (reason: 'forfeit').
 *  - If both players leave, aborts match (reason: 'both_left').
 *  - Server-authoritative via PostgreSQL RPC `leave_game` with FOR UPDATE locking.
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
    const { data, error } = await (supabase as any).rpc("leave_game", {
      p_match_id: matchId,
    });

    if (error) {
      console.error("[games/leave] RPC error:", error.message);
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
      end_reason?: string;
      winner_id?: string | null;
      loser_id?: string | null;
    };

    if (!result.ok) {
      if (result.code === "forbidden") {
        return NextResponse.json(
          { error: result.message || "Forbidden", code: "forbidden" },
          { status: 403 }
        );
      }
      if (result.code === "not_found") {
        return NextResponse.json(
          { error: result.message || "Match not found", code: "not_found" },
          { status: 404 }
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
        end_reason: result.end_reason,
        winner_id: result.winner_id,
        loser_id: result.loser_id,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[games/leave] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error.", code: "internal_error" },
      { status: 500 }
    );
  }
}

