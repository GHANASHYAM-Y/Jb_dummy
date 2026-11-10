import { NextRequest, NextResponse, connection } from "next/server";
import { requireUser, runMatchRpc, UUID_RE } from "@/lib/hand-cricket/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/** Codes a client sees in normal play when it claims slightly early or late. */
const SOFT_CODES = ["not_timed_out", "game_already_over", "match_not_active", "waiting_for_opponent"];

/**
 * POST /api/hand-cricket/match/[matchId]/timeout
 * Claims an expired clock. The server checks the deadline itself:
 *   - toss window expired: the toss winner is sent in to bat
 *   - shot clock expired: the ball is resolved with the throws that arrived
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json({ error: "matchId must be a valid UUID.", code: "invalid_id" }, { status: 400 });
    }

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    return await runMatchRpc(
      "timeout",
      auth.supabase,
      "claim_hand_cricket_timeout",
      { p_match_id: matchId },
      SOFT_CODES,
    );
  } catch (err) {
    console.error("[api/hand-cricket/timeout] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
