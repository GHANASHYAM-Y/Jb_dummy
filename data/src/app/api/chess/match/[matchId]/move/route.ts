import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/core/supabase/server";
import { validateAndExecuteMove } from "@/lib/chess/engine";
import { ChessMatchState } from "@/lib/chess/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    let body: {
      from?: string;
      to?: string;
      promotion?: string;
      expected_ply?: number;
      claim_draw?: boolean;
    } = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_body" }, { status: 400 });
    }

    const { from, to, promotion, expected_ply, claim_draw } = body;

    if (!from || !to || typeof from !== "string" || typeof to !== "string") {
      return NextResponse.json({ error: "from and to squares are required.", code: "missing_squares" }, { status: 400 });
    }

    if (typeof expected_ply !== "number" || expected_ply < 0) {
      return NextResponse.json({ error: "expected_ply must be a non-negative integer.", code: "invalid_ply" }, { status: 400 });
    }

    // 1. Fetch current authoritative match state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: chessMatchData, error: fetchError } = await (supabase as any)
      .from("chess_matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (fetchError || !chessMatchData) {
      return NextResponse.json({ error: "Chess match not found.", code: "not_found" }, { status: 404 });
    }

    const chessMatch = chessMatchData as ChessMatchState;

    // 2. Concurrency check: Reject stale moves immediately
    if (chessMatch.ply !== expected_ply) {
      return NextResponse.json({
        error: "Board position has changed. Please refresh your board.",
        code: "stale_ply",
        current_ply: chessMatch.ply,
      }, { status: 409 });
    }

    const typedState: ChessMatchState = {
      ...chessMatch,
      winner_id: null,
      win_reason: null,
    };

    // 3. Authoritative server-side validation using chess.js
    const now = Date.now();
    const moveRes = validateAndExecuteMove(
      typedState,
      user.id,
      { from, to, promotion, claim_draw: Boolean(claim_draw) },
      now
    );

    if (!moveRes.ok || !moveRes.nextState) {
      const statusCode = moveRes.code === "forbidden" || moveRes.code === "not_a_participant"
        ? 403
        : moveRes.code === "out_of_turn"
        ? 400
        : moveRes.code === "game_already_over"
        ? 400
        : 422; // Unprocessable Entity for illegal move
      return NextResponse.json({ error: moveRes.message || moveRes.code, code: moveRes.code }, { status: statusCode });
    }

    const next = moveRes.nextState;

    // 4. Atomic PostgreSQL commit via apply_chess_move_atomic RPC (service-role only)
    const adminClient = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (adminClient as any).rpc("apply_chess_move_atomic", {
      p_match_id: matchId,
      p_caller_id: user.id,
      p_expected_ply: expected_ply,
      p_fen: next.fen,
      p_pgn: next.pgn,
      p_turn: next.turn,
      p_san: moveRes.san,
      p_from: moveRes.from,
      p_to: moveRes.to,
      p_promotion: moveRes.promotion || null,
      p_captured: moveRes.captured || null,
      p_white_time_ms: next.white_time_remaining_ms,
      p_black_time_ms: next.black_time_remaining_ms,
      p_time_spent_ms: moveRes.timeSpentMs || 0,
      p_game_status: next.game_status,
      p_winner_id: next.winner_id,
      p_win_reason: next.win_reason,
      p_is_check: next.is_check,
      p_is_checkmate: next.is_checkmate,
      p_is_stalemate: next.is_stalemate,
      p_is_draw: next.is_draw,
    });

    if (rpcError) {
      console.error("[api/chess/match/move] RPC error:", rpcError.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const rpcResult = rpcData as { ok: boolean; code: string; message?: string; ply?: number; game_status?: string };
    if (!rpcResult.ok) {
      const status = rpcResult.code === "stale_ply" ? 409 : 400;
      return NextResponse.json({ error: rpcResult.message || rpcResult.code, code: rpcResult.code }, { status });
    }

    return NextResponse.json({
      success: true,
      code: "move_applied",
      move: {
        san: moveRes.san,
        from: moveRes.from,
        to: moveRes.to,
        promotion: moveRes.promotion,
        captured: moveRes.captured,
        ply: rpcResult.ply,
      },
      match: {
        fen: next.fen,
        pgn: next.pgn,
        turn: next.turn,
        ply: rpcResult.ply,
        is_check: next.is_check,
        is_checkmate: next.is_checkmate,
        is_stalemate: next.is_stalemate,
        is_draw: next.is_draw,
        game_status: next.game_status,
        winner_id: next.winner_id,
        white_time_remaining_ms: next.white_time_remaining_ms,
        black_time_remaining_ms: next.black_time_remaining_ms,
      },
    });
  } catch (err) {
    console.error("[api/chess/match/move] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
