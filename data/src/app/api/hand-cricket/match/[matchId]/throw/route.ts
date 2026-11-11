import { NextRequest, NextResponse, connection } from "next/server";
import { isValidThrow } from "@/features/hand-cricket/server";
import { readJson, requireUser, runMatchRpc, UUID_RE } from "@/features/hand-cricket/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/hand-cricket/match/[matchId]/throw
 * Body: { innings: 1 | 2, ball_number: number, value: 0–6 }  (0 = DOK)
 *
 * innings and ball_number identify the ball the player is throwing for, so a
 * late request can never land on the next ball (409 stale_ball instead).
 * The throw stays hidden from the opponent until the ball is resolved.
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

    const body = await readJson<{ innings?: unknown; ball_number?: unknown; value?: unknown }>(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_body" }, { status: 400 });
    }

    const { innings, ball_number: ballNumber, value } = body;

    if (innings !== 1 && innings !== 2) {
      return NextResponse.json({ error: "innings must be 1 or 2.", code: "invalid_innings" }, { status: 400 });
    }

    if (typeof ballNumber !== "number" || !Number.isInteger(ballNumber) || ballNumber < 1 || ballNumber > 60) {
      return NextResponse.json(
        { error: "ball_number must be a whole number from 1 to 60.", code: "invalid_ball_number" },
        { status: 400 },
      );
    }

    if (!isValidThrow(value)) {
      return NextResponse.json(
        { error: "value must be 0 (DOK) or a whole number from 1 to 6.", code: "invalid_throw" },
        { status: 400 },
      );
    }

    return await runMatchRpc("throw", auth.supabase, "submit_hand_cricket_throw", {
      p_match_id: matchId,
      p_innings: innings,
      p_ball_number: ballNumber,
      p_value: value,
    });
  } catch (err) {
    console.error("[api/hand-cricket/throw] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
