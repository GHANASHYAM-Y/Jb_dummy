import { NextRequest, NextResponse, connection } from "next/server";
import { sanitizeSquad } from "@/features/hand-cricket/server";
import { readJson, requireUser, runMatchRpc, UUID_RE } from "@/features/hand-cricket/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/hand-cricket/match/[matchId]/squad
 * Body: { names: string[] }  (exactly 11 names, 1–20 characters each)
 * Renames the caller's own players. The server re-validates the names.
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

    const body = await readJson<{ names?: unknown }>(request);
    const names = sanitizeSquad(body?.names);
    if (!names) {
      return NextResponse.json(
        { error: "names must be 11 player names, 1 to 20 characters each.", code: "invalid_squad" },
        { status: 400 },
      );
    }

    return await runMatchRpc("squad", auth.supabase, "set_hand_cricket_squad", {
      p_match_id: matchId,
      p_names: names,
    });
  } catch (err) {
    console.error("[api/hand-cricket/squad] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
