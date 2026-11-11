import { NextRequest, NextResponse, connection } from "next/server";
import { isOversOption } from "@/features/hand-cricket/server";
import { readJson, requireUser, runMatchRpc, UUID_RE } from "@/features/hand-cricket/server";

/**
 * POST /api/hand-cricket/create
 * Body: { opponent_id: string, overs?: 2 | 3 | 5 | 10 }  (default 2)
 *
 * Challenges an accepted friend. If the pair already has an unfinished match,
 * that match is returned instead (code: existing_match).
 */
export async function POST(request: NextRequest) {
  await connection();
  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ opponent_id?: unknown; overs?: unknown }>(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_body" }, { status: 400 });
    }

    const opponentId = typeof body.opponent_id === "string" ? body.opponent_id : "";
    if (!UUID_RE.test(opponentId)) {
      return NextResponse.json(
        { error: "opponent_id must be a valid UUID.", code: "invalid_opponent_id" },
        { status: 400 },
      );
    }

    if (opponentId === auth.userId) {
      return NextResponse.json(
        { error: "You cannot challenge yourself.", code: "no_self_match" },
        { status: 400 },
      );
    }

    const overs = body.overs === undefined ? 2 : body.overs;
    if (!isOversOption(overs)) {
      return NextResponse.json(
        { error: "overs must be 2, 3, 5 or 10.", code: "invalid_overs" },
        { status: 400 },
      );
    }

    return await runMatchRpc("create", auth.supabase, "create_hand_cricket_match", {
      p_opponent_id: opponentId,
      p_overs: overs,
    });
  } catch (err) {
    console.error("[api/hand-cricket/create] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
