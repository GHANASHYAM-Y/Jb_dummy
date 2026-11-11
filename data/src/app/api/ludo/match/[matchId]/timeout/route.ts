import { NextRequest, NextResponse, connection } from "next/server";
import { errorResponse, performLudoAction, requireUser, UUID_RE } from "@/features/ludo/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/ludo/match/[matchId]/timeout
 * Either player may claim once the turn clock has run out (+1 s). The server
 * rolls for the idle player if needed, then plays that roll automatically
 * (or passes the turn). An early claim returns 200 with code not_timed_out.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) return errorResponse("invalid_id", "matchId must be a valid UUID.");

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    return await performLudoAction("timeout", auth, matchId, { kind: "timeout" });
  } catch (err) {
    console.error("[api/ludo/timeout] Unexpected error:", err);
    return errorResponse("internal_error", "Internal server error.");
  }
}
