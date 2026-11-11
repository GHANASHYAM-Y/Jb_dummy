import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

/**
 * POST /api/matchmaking/join
 *
 * Joins the Rock, Paper, Scissors random matchmaking queue.
 * Atomically matches with an eligible waiting player if one exists,
 * or registers the caller in the queue.
 *
 * Body (optional): { game_type?: "rps" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let gameType = "rps";
    try {
      const body = await request.json();
      if (body.game_type && body.game_type !== "rps") {
        return NextResponse.json(
          { error: "Matchmaking is only supported for 'rps'." },
          { status: 400 }
        );
      }
      if (body.game_type) gameType = body.game_type;
    } catch {
      // Body is optional; default to 'rps'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("join_matchmaking", {
      p_game_type: gameType,
    });

    if (error) {
      console.error("[matchmaking/join] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code: string;
      message?: string;
      match_id?: string;
      queue_id?: string;
    };

    if (!result.ok) {
      const status =
        result.code === "already_in_match"
          ? 409
          : result.code === "rate_limited"
          ? 429
          : 400;

      return NextResponse.json(
        {
          error: result.message ?? result.code,
          code: result.code,
          match_id: result.match_id,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      match_id: result.match_id,
      queue_id: result.queue_id,
    });
  } catch (err) {
    console.error("[matchmaking/join] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
