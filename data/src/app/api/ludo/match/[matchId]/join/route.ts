import { NextRequest, NextResponse, connection } from "next/server";
import { errorResponse, requireUser, runRpc, UUID_RE } from "@/features/ludo/server/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/ludo/match/[matchId]/join
 * Marks the caller as present. Once both players have joined, the match starts.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) return errorResponse("invalid_id", "matchId must be a valid UUID.");

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    return await runRpc("join", auth.supabase, "join_ludo_match", { p_match_id: matchId });
  } catch (err) {
    console.error("[api/ludo/join] Unexpected error:", err);
    return errorResponse("internal_error", "Internal server error.");
  }
}
