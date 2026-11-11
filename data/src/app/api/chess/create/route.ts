import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { UUID_RE } from "@/shared/lib/validation";


export async function POST(request: NextRequest) {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated.", code: "unauthenticated" }, { status: 401 });
    }

    let body: {
      opponent_id?: string;
      time_control_seconds?: number;
      increment_seconds?: number;
      preferred_color?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_body" }, { status: 400 });
    }

    const { opponent_id, time_control_seconds = 300, increment_seconds = 3, preferred_color = "random" } = body;

    if (!opponent_id || !UUID_RE.test(opponent_id)) {
      return NextResponse.json({ error: "opponent_id must be a valid UUID.", code: "invalid_opponent_id" }, { status: 400 });
    }

    if (opponent_id === user.id) {
      return NextResponse.json({ error: "Cannot create a match against yourself.", code: "no_self_match" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("create_chess_match", {
      p_opponent_id: opponent_id,
      p_time_control_seconds: time_control_seconds,
      p_increment_seconds: increment_seconds,
      p_preferred_color: preferred_color,
    });

    if (error) {
      console.error("[api/chess/create] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code: string;
      message?: string;
      match_id?: string;
      white_player_id?: string;
      black_player_id?: string;
      time_control_seconds?: number;
      increment_seconds?: number;
    };

    if (!result.ok) {
      const status = result.code === "blocked" ? 403 : result.code === "opponent_not_found" ? 404 : 400;
      return NextResponse.json({ error: result.message || result.code, code: result.code }, { status });
    }

    return NextResponse.json({
      success: true,
      match_id: result.match_id,
      white_player_id: result.white_player_id,
      black_player_id: result.black_player_id,
      time_control_seconds: result.time_control_seconds,
      increment_seconds: result.increment_seconds,
    });
  } catch (err) {
    console.error("[api/chess/create] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
