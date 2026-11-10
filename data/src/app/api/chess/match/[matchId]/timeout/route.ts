import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { calculateClocks, handleTimeout } from "@/lib/chess/engine";
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

    // 1. Fetch current match state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: chessMatchData, error: matchError } = await (supabase as any)
      .from("chess_matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !chessMatchData) {
      return NextResponse.json({ error: "Chess match not found.", code: "not_found" }, { status: 404 });
    }

    const chessMatch = chessMatchData as ChessMatchState;

    const typedState: ChessMatchState = {
      ...chessMatch,
      winner_id: null,
      win_reason: null,
    };

    // 2. Server-side authoritative clock verification
    const now = Date.now();
    const timeoutRes = handleTimeout(typedState, now);
    if (!timeoutRes.ok || !timeoutRes.nextState) {
      return NextResponse.json({
        error: timeoutRes.message || "Neither player has exceeded their time limit.",
        code: timeoutRes.code,
      }, { status: 400 });
    }

    const clocks = calculateClocks(typedState, now);
    const timedOutColor = clocks.timedOutColor;
    if (!timedOutColor) {
      return NextResponse.json({ error: "No player has timed out.", code: "not_timed_out" }, { status: 400 });
    }

    const next = timeoutRes.nextState;

    // 3. Commit timeout via claim_chess_timeout RPC (service-role or authenticated participant)
    const adminClient = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (adminClient as any).rpc("claim_chess_timeout", {
      p_match_id: matchId,
      p_timed_out_color: timedOutColor,
      p_winner_id: next.winner_id,
      p_is_draw: next.is_draw,
      p_reason: next.win_reason || "timeout",
    });

    if (rpcError) {
      console.error("[api/chess/match/timeout] RPC error:", rpcError.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const result = rpcData as { ok: boolean; code: string; message?: string; winner_id?: string; is_draw?: boolean };
    if (!result.ok) {
      return NextResponse.json({ error: result.message || result.code, code: result.code }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      code: "timeout_confirmed",
      winner_id: result.winner_id,
      is_draw: result.is_draw,
    });
  } catch (err) {
    console.error("[api/chess/match/timeout] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
