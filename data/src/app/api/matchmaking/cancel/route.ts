import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/matchmaking/cancel
 *
 * Cancels caller's waiting matchmaking queue entry.
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
      if (body.game_type) gameType = body.game_type;
    } catch {
      // Body optional
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("cancel_matchmaking", {
      p_game_type: gameType,
    });

    if (error) {
      console.error("[matchmaking/cancel] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code: string;
      match_id?: string;
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[matchmaking/cancel] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
