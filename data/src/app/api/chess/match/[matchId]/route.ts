import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { calculateClocks, getCapturedPieces, getLegalMoves } from "@/features/chess/server";
import { ChessMatchState } from "@/features/chess/server";
import { UUID_RE } from "@/shared/lib/validation";


interface RouteContext {
  params: Promise<{ matchId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
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

    // 1. Fetch chess_matches details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: chessMatchData, error: matchError } = await (supabase as any)
      .from("chess_matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !chessMatchData) {
      return NextResponse.json({ error: "Chess match not found.", code: "not_found" }, { status: 404 });
    }

    const chessMatch = chessMatchData as ChessMatchState & { created_at: string; updated_at?: string };

    // 2. Participant check
    const isWhite = user.id === chessMatch.white_player_id;
    const isBlack = user.id === chessMatch.black_player_id;
    if (!isWhite && !isBlack) {
      return NextResponse.json({ error: "Access denied. Participants only.", code: "forbidden" }, { status: 403 });
    }

    // 3. Fetch player profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, display_name, evoora_id, avatar_url")
      .in("id", [chessMatch.white_player_id, chessMatch.black_player_id]);

    const profileList = (profiles || []) as Array<{ id: string; display_name: string | null; evoora_id: string | null; avatar_url: string | null }>;
    const profileMap = new Map(profileList.map((p) => [p.id, p]));
    const whitePlayer = profileMap.get(chessMatch.white_player_id) || {
      id: chessMatch.white_player_id,
      display_name: "White Player",
      evoora_id: "EVO-WHITE",
      avatar_url: null,
    };
    const blackPlayer = profileMap.get(chessMatch.black_player_id) || {
      id: chessMatch.black_player_id,
      display_name: "Black Player",
      evoora_id: "EVO-BLACK",
      avatar_url: null,
    };

    // 4. Fetch move history
    const { data: moves } = await supabase
      .from("chess_moves")
      .select("*")
      .eq("match_id", matchId)
      .order("ply", { ascending: true });

    // 5. Calculate real-time clocks with in-flight elapsed time
    const typedState: ChessMatchState = {
      ...chessMatch,
      winner_id: null,
      win_reason: null,
    };
    const now = Date.now();
    const clocks = calculateClocks(typedState, now);

    // 6. Calculate captured pieces & material advantage
    const captured = getCapturedPieces(chessMatch.fen);

    // 7. Calculate legal moves for caller if it's their turn
    const isCallerTurn = (chessMatch.turn === "w" && isWhite) || (chessMatch.turn === "b" && isBlack);
    const isGameActive = chessMatch.game_status === "active" || chessMatch.game_status === "check";
    const legalMoves = isCallerTurn && isGameActive ? getLegalMoves(chessMatch.fen) : [];

    return NextResponse.json({
      success: true,
      match: {
        id: chessMatch.id,
        fen: chessMatch.fen,
        pgn: chessMatch.pgn,
        turn: chessMatch.turn,
        ply: chessMatch.ply,
        time_control_seconds: chessMatch.time_control_seconds,
        increment_seconds: chessMatch.increment_seconds,
        white_time_remaining_ms: clocks.whiteRemainingMs,
        black_time_remaining_ms: clocks.blackRemainingMs,
        is_timed_out: clocks.isTimedOut,
        timed_out_color: clocks.timedOutColor,
        is_check: chessMatch.is_check,
        is_checkmate: chessMatch.is_checkmate,
        is_stalemate: chessMatch.is_stalemate,
        is_draw: chessMatch.is_draw,
        game_status: chessMatch.game_status,
        draw_offered_by: chessMatch.draw_offered_by,
        resigned_by: chessMatch.resigned_by,
        last_move_at: chessMatch.last_move_at,
        created_at: chessMatch.created_at,
      },
      viewer: {
        userId: user.id,
        color: isWhite ? "w" : "b",
        isMyTurn: isCallerTurn,
      },
      players: {
        white: whitePlayer,
        black: blackPlayer,
      },
      captured,
      legalMoves,
      moves: moves || [],
      serverNow: new Date(now).toISOString(),
    });
  } catch (err) {
    console.error("[api/chess/match/[matchId]] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
