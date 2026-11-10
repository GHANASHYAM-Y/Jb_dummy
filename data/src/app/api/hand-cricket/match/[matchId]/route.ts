import { NextRequest, NextResponse, connection } from "next/server";
import { loadHandCricketMatch, requireUser, UUID_RE } from "@/lib/hand-cricket/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * GET /api/hand-cricket/match/[matchId]
 * The caller's view of the match: scores, resolved balls, their own throw for
 * the current ball, and only whether the opponent has thrown.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json({ error: "matchId must be a valid UUID.", code: "invalid_id" }, { status: 400 });
    }

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const loaded = await loadHandCricketMatch(auth.supabase, matchId);
    if (!loaded.ok) {
      return NextResponse.json({ error: loaded.code, code: loaded.code }, { status: loaded.status });
    }

    return NextResponse.json(
      { success: true, state: loaded.snapshot, players: loaded.players },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/hand-cricket/match] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
