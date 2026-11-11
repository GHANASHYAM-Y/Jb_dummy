import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/core/supabase/server";
import { canClaimDraw } from "@/features/chess/server";
import { UUID_RE } from "@/shared/lib/validation";


interface RouteContext {
  params: Promise<{ matchId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json({ error: "matchId must be a valid UUID.", code: "invalid_id" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated.", code: "unauthenticated" }, { status: 401 });
    }

    let body: { action?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_body" }, { status: 400 });
    }

    const { action } = body;
    if (!action || !["offer", "accept", "decline", "claim"].includes(action)) {
      return NextResponse.json({ error: "action must be 'offer', 'accept', 'decline', or 'claim'.", code: "invalid_action" }, { status: 400 });
    }

    if (action === "claim") {
      // 1. Fetch match to verify participant and game status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: chessMatchData, error: fetchError } = await (supabase as any)
        .from("chess_matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (fetchError || !chessMatchData) {
        return NextResponse.json({ error: "Chess match not found.", code: "not_found" }, { status: 404 });
      }

      if (user.id !== chessMatchData.white_player_id && user.id !== chessMatchData.black_player_id) {
        return NextResponse.json({ error: "Not a participant in this match.", code: "forbidden" }, { status: 403 });
      }

      if (chessMatchData.game_status !== "active" && chessMatchData.game_status !== "check") {
        return NextResponse.json({ error: "Game is already over.", code: "game_already_over" }, { status: 400 });
      }

      // Check whether claim is valid under FIDE rules
      const claimResult = canClaimDraw(chessMatchData.fen, chessMatchData.pgn);
      if (!claimResult.canClaim || !claimResult.reason) {
        return NextResponse.json({
          error: "Position does not qualify for a threefold repetition or 50-move draw claim.",
          code: "cannot_claim_draw",
        }, { status: 400 });
      }

      // Authoritative update via service role
      const adminClient = createServiceRoleClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: matchUpdateErr } = await (adminClient as any)
        .from("chess_matches")
        .update({
          game_status: claimResult.reason,
          is_draw: true,
          draw_offered_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      if (matchUpdateErr) {
        console.error("[api/chess/match/draw] Error updating chess_matches on claim:", matchUpdateErr.message);
        return NextResponse.json({ error: "Internal server error.", code: "db_error" }, { status: 500 });
      }

      // Complete root match for dare integration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from("matches")
        .update({
          phase: "completed",
          winner_id: null,
          is_draw: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      return NextResponse.json({
        success: true,
        action: "claim",
        code: "draw_claimed",
        reason: claimResult.reason,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("respond_chess_draw", {
      p_match_id: matchId,
      p_action: action,
    });

    if (error) {
      console.error("[api/chess/match/draw] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const result = data as { ok: boolean; code: string; message?: string };
    if (!result.ok) {
      const status = result.code === "forbidden" ? 403 : result.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: result.message || result.code, code: result.code }, { status });
    }

    return NextResponse.json({
      success: true,
      action,
      code: result.code,
    });
  } catch (err) {
    console.error("[api/chess/match/draw] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
