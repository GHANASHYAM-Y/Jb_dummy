import { NextRequest, NextResponse, connection } from "next/server";
import { errorResponse, requireUser, runRpc, UUID_RE } from "@/lib/ludo/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/ludo/match/[matchId]/cancel
 * Calls off a challenge that has not started yet (phase 'waiting' only).
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) return errorResponse("invalid_id", "matchId must be a valid UUID.");

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    return await runRpc("cancel", auth.supabase, "cancel_ludo_match", { p_match_id: matchId });
  } catch (err) {
    console.error("[api/ludo/cancel] Unexpected error:", err);
    return errorResponse("internal_error", "Internal server error.");
  }
}
