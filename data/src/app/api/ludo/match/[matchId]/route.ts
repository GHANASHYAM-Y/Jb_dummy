import { NextRequest, NextResponse, connection } from "next/server";
import { errorResponse, loadLudoMatch, requireUser, UUID_RE } from "@/lib/ludo/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * GET /api/ludo/match/[matchId]
 * The match, game state and both players' profiles. Participants only.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) return errorResponse("invalid_id", "matchId must be a valid UUID.");

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const loaded = await loadLudoMatch(auth.supabase, matchId);
    if (!loaded.ok) return errorResponse(loaded.code);

    return NextResponse.json(
      { success: true, state: loaded.snapshot, players: loaded.players },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/ludo/match] Unexpected error:", err);
    return errorResponse("internal_error", "Internal server error.");
  }
}
