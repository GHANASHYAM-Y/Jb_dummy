import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { isValidMove } from "@/lib/rps";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/rps/move
 * Body: { match_id: string, move: "rock" | "paper" | "scissors" }
 *
 * Security:
 *  - Session verified via getUser().
 *  - The DB function uses auth.uid() as the caller — body.match_id is a
 *    pointer, not an identity claim.
 *  - Submission is idempotent: re-submitting the exact same move returns ok.
 *  - Submitting a different move after the first is rejected.
 *  - Opponent's move is never returned in this response.
 *  - Round is resolved atomically inside the DB function.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { match_id?: string; move?: string } = {};
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    if (!body.match_id || !UUID_RE.test(body.match_id)) {
      return NextResponse.json({ error: "match_id must be a valid UUID." }, { status: 400 });
    }
    if (!body.move || !isValidMove(body.move)) {
      return NextResponse.json({
        error: "move must be 'rock', 'paper', or 'scissors'.",
        code: "invalid_move",
      }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("submit_rps_move", {
      p_match_id: body.match_id,
      p_move:     body.move,
    });
    if (error) {
      console.error("[rps/move] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
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
      // Only surface round_result — never the opponent's move value
      round_result: result.round_result ?? null,
    });
  } catch (err) {
    console.error("[rps/move] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
