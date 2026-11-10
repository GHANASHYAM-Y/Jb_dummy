import { NextRequest, NextResponse, connection } from "next/server";
import { requireUser, runMatchRpc, UUID_RE } from "@/lib/hand-cricket/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/hand-cricket/match/[matchId]/cancel
 * Calls off a challenge that has not started yet (phase 'waiting').
 * Once both players have joined, use /api/games/leave instead (forfeit).
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

    return await runMatchRpc("cancel", auth.supabase, "cancel_hand_cricket_match", { p_match_id: matchId });
  } catch (err) {
    console.error("[api/hand-cricket/cancel] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
