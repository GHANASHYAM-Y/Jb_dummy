import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/rps/state?match_id=UUID
 *
 * Returns the caller's authorised match state:
 *   - Match metadata (phase, scores, round, winner, target_wins=5, round_deadline)
 *   - All resolved rounds (both moves visible)
 *   - Whether the caller has submitted for the current round
 *   - Opponent submission status without revealing their move
 *   - Authoritative server timestamp (server_now) for synchronized countdown
 */
export async function GET(request: NextRequest) {
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

    const matchId = request.nextUrl.searchParams.get("match_id");
    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json(
        { error: "match_id must be a valid UUID." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_rps_match_state", {
      p_match_id: matchId,
    });
    if (error) {
      console.error("[rps/state] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
    const result = data as {
      ok: boolean;
      code?: string;
      match?: {
        id: string;
        phase: string;
        player1_id: string;
        player2_id: string;
        current_round: number;
        round_deadline?: string | null;
        [key: string]: unknown;
      };
      rounds?: unknown[];
      my_move_this_round?: string | null;
      opponent_has_submitted?: boolean;
      server_now?: string;
    };

    if (!result.ok) {
      const status =
        result.code === "forbidden"
          ? 403
          : result.code === "not_found"
          ? 404
          : 500;
      return NextResponse.json({ error: result.code }, { status });
    }

    // Enforce First to 5 target wins and authoritative server timestamp
    const nowIso = new Date().toISOString();
    let oppSubmitted = result.opponent_has_submitted;

    // If RPC didn't provide opponent_has_submitted, check safely without leaking move value
    if (oppSubmitted === undefined && result.match) {
      const oppId =
        result.match.player1_id === user.id
          ? result.match.player2_id
          : result.match.player1_id;
      const { data: oppMoveRow } = await supabase
        .from("game_moves")
        .select("id")
        .eq("match_id", matchId)
        .eq("player_id", oppId)
        .eq("round_number", result.match.current_round)
        .maybeSingle();

      oppSubmitted = !!oppMoveRow;
    }

    const enrichedData = {
      ...result,
      server_now: result.server_now || nowIso,
      opponent_has_submitted: oppSubmitted ?? false,
      match: {
        ...result.match,
        target_wins: 5,
        round_deadline:
          result.match?.round_deadline ||
          (result.match?.phase === "active"
            ? new Date(Date.now() + 10000).toISOString()
            : null),
      },
    };

    return NextResponse.json(enrichedData);
  } catch (err) {
    console.error("[rps/state] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
