import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

/**
 * GET /api/matchmaking/status?game_type=rps
 *
 * Checks caller's matchmaking queue status and active matches.
 * Returns: 'idle' | 'searching' | 'matched' | 'expired' | 'in_active_match'
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const gameType = request.nextUrl.searchParams.get("game_type") ?? "rps";
    if (gameType !== "rps") {
      return NextResponse.json(
        { error: "Matchmaking is only supported for 'rps'." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_matchmaking_status", {
      p_game_type: gameType,
    });

    if (error) {
      console.error("[matchmaking/status] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      status: string;
      match_id?: string;
      created_at?: string;
      expires_at?: string;
      code?: string;
    };

    if (!result.ok) {
      return NextResponse.json({ error: result.code ?? "Error" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[matchmaking/status] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
