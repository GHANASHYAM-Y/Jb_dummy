import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { isValidMove } from "@/features/rock-paper-scissors/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/rps/match/[matchId]/move
 * Body: { move: "rock" | "paper" | "scissors" }
 *
 * REST alias to POST /api/rps/move.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json({ error: "match_id must be a valid UUID.", code: "invalid_uuid" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated.", code: "unauthenticated" }, { status: 401 });
    }

    let body: { move?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body.", code: "invalid_body" }, { status: 400 });
    }

    if (!body.move || !isValidMove(body.move)) {
      return NextResponse.json({
        error: "move must be 'rock', 'paper', or 'scissors'.",
        code: "invalid_move",
      }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("submit_rps_move", {
      p_match_id: matchId,
      p_move:     body.move,
    });
    if (error) {
      console.error("[rps/match/[matchId]/move] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code: string;
      round_result?: string;
    };
    if (!result.ok) {
      const status = result.code === "forbidden" ? 403
        : result.code === "not_found" ? 404
        : result.code === "move_locked" ? 409
        : 400;
      return NextResponse.json({ error: result.code, code: result.code }, { status });
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      round_result: result.round_result ?? null,
    });
  } catch (err) {
    console.error("[rps/match/[matchId]/move] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error.", code: "unexpected_error" }, { status: 500 });
  }
}
