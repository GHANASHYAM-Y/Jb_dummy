import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/rps/timeout
 *
 * Atomically resolves an expired 10-second round deadline:
 *   - Neither submitted -> draw / no-contest (0 points to either)
 *   - Only player 1 submitted -> player 1 wins round (1 point)
 *   - Only player 2 submitted -> player 2 wins round (1 point)
 *   - Both submitted at deadline -> standard rock-paper-scissors comparison
 *
 * FIRST TO 5 WINS: Automatically checks if any player reached 5 points and completes match.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const matchId = body.match_id || request.nextUrl.searchParams.get("match_id");

    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json(
        { error: "match_id must be a valid UUID." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const { data, error } = await supabaseAny.rpc("resolve_rps_timeout", {
      p_match_id: matchId,
    });

    if (!error && data) {
      const result = data as { ok: boolean; code?: string; message?: string };
      if (!result.ok && result.code === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!result.ok && result.code === "not_found") {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    // Fallback: If RPC not yet applied, inspect match directly
    const { data: match, error: matchError } = await supabaseAny
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.player1_id !== user.id && match.player2_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (match.phase !== "active") {
      return NextResponse.json(
        { ok: false, code: "match_not_active", message: "Match is not active." },
        { status: 200 }
      );
    }

    // Check if round already resolved
    const { data: existingRound } = await supabaseAny
      .from("game_rounds")
      .select("id")
      .eq("match_id", matchId)
      .eq("round_number", match.current_round)
      .maybeSingle();

    if (existingRound) {
      return NextResponse.json({
        ok: true,
        code: "already_resolved",
        message: "Round already resolved.",
      });
    }

    // Check moves recorded for current round
    const { data: moves } = await supabaseAny
      .from("game_moves")
      .select("player_id, move")
      .eq("match_id", matchId)
      .eq("round_number", match.current_round);

    const moveList = (moves || []) as Array<{ player_id: string; move: string }>;
    const p1Move = moveList.find((m) => m.player_id === match.player1_id)?.move;
    const p2Move = moveList.find((m) => m.player_id === match.player2_id)?.move;

    let resolvedP1Move: string = "timeout";
    let resolvedP2Move: string = "timeout";
    let roundResult: "player1_wins" | "player2_wins" | "draw" = "draw";
    let p1Delta = 0;
    let p2Delta = 0;

    if (!p1Move && !p2Move) {
      resolvedP1Move = "timeout";
      resolvedP2Move = "timeout";
      roundResult = "draw";
    } else if (p1Move && !p2Move) {
      resolvedP1Move = p1Move;
      resolvedP2Move = "timeout";
      roundResult = "player1_wins";
      p1Delta = 1;
    } else if (!p1Move && p2Move) {
      resolvedP1Move = "timeout";
      resolvedP2Move = p2Move;
      roundResult = "player2_wins";
      p2Delta = 1;
    } else if (p1Move && p2Move) {
      resolvedP1Move = p1Move;
      resolvedP2Move = p2Move;
      if (p1Move === p2Move) roundResult = "draw";
      else if (
        (p1Move === "rock" && p2Move === "scissors") ||
        (p1Move === "scissors" && p2Move === "paper") ||
        (p1Move === "paper" && p2Move === "rock")
      ) {
        roundResult = "player1_wins";
        p1Delta = 1;
      } else {
        roundResult = "player2_wins";
        p2Delta = 1;
      }
    }

    const newP1Wins = (match.player1_wins || 0) + p1Delta;
    const newP2Wins = (match.player2_wins || 0) + p2Delta;
    const isCompleted = newP1Wins >= 5 || newP2Wins >= 5;

    // Record round
    await supabaseAny.from("game_rounds").insert({
      match_id: matchId,
      round_number: match.current_round,
      player1_move: resolvedP1Move,
      player2_move: resolvedP2Move,
      result: roundResult,
    });

    // Update match
    await supabaseAny
      .from("matches")
      .update({
        player1_wins: newP1Wins,
        player2_wins: newP2Wins,
        current_round: (match.current_round || 1) + 1,
        phase: isCompleted ? "completed" : "active",
        winner_id: isCompleted
          ? newP1Wins > newP2Wins
            ? match.player1_id
            : match.player2_id
          : null,
        completed_at: isCompleted ? new Date().toISOString() : null,
        round_deadline: isCompleted
          ? null
          : new Date(Date.now() + 10000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    return NextResponse.json({
      ok: true,
      code: "timeout_resolved",
      result: roundResult,
      player1_wins: newP1Wins,
      player2_wins: newP2Wins,
      is_completed: isCompleted,
    });
  } catch (err) {
    console.error("[rps/timeout] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
