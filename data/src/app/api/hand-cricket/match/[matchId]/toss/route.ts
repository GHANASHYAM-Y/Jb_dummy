import { NextRequest, NextResponse, connection } from "next/server";
import { readJson, requireUser, runMatchRpc, UUID_RE } from "@/lib/hand-cricket/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/hand-cricket/match/[matchId]/toss
 * Body: { decision: "bat" | "bowl" }
 * Only the toss winner may choose; the server enforces it.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json({ error: "matchId must be a valid UUID.", code: "invalid_id" }, { status: 400 });
    }

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ decision?: unknown }>(request);
    const decision = body?.decision;
    if (decision !== "bat" && decision !== "bowl") {
      return NextResponse.json(
        { error: "decision must be bat or bowl.", code: "invalid_decision" },
        { status: 400 },
      );
    }

    return await runMatchRpc("toss", auth.supabase, "choose_hand_cricket_toss", {
      p_match_id: matchId,
      p_decision: decision,
    });
  } catch (err) {
    console.error("[api/hand-cricket/toss] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
