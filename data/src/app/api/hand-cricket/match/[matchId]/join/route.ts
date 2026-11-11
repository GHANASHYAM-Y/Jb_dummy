import { NextRequest, NextResponse, connection } from "next/server";
import { requireUser, runMatchRpc, UUID_RE } from "@/features/hand-cricket/server/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/hand-cricket/match/[matchId]/join
 * Marks the caller as present. When both players have joined, the match
 * becomes active and the toss window starts.
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

    return await runMatchRpc("join", auth.supabase, "join_hand_cricket_match", { p_match_id: matchId });
  } catch (err) {
    console.error("[api/hand-cricket/join] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
