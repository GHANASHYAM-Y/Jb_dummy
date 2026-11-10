import { NextRequest, NextResponse, connection } from "next/server";
import { errorResponse, readJson, requireUser, runRpc, UUID_RE } from "@/lib/ludo/server";

/**
 * POST /api/ludo/create
 * Body: { opponent_id: string }
 *
 * Challenges an accepted friend to 1 vs 1 Ludo (caller is red, friend is
 * yellow). If the pair already has an unfinished match, that match is
 * returned instead (code: existing_match).
 */
export async function POST(request: NextRequest) {
  await connection();
  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ opponent_id?: unknown }>(request);
    if (!body || typeof body !== "object") return errorResponse("invalid_body", "Invalid JSON body.");

    const opponentId = typeof body.opponent_id === "string" ? body.opponent_id : "";
    if (!UUID_RE.test(opponentId)) {
      return errorResponse("invalid_opponent_id", "opponent_id must be a valid UUID.");
    }
    if (opponentId === auth.userId) {
      return errorResponse("no_self_match", "You cannot challenge yourself.");
    }

    return await runRpc("create", auth.supabase, "create_ludo_match", { p_opponent_id: opponentId });
  } catch (err) {
    console.error("[api/ludo/create] Unexpected error:", err);
    return errorResponse("internal_error", "Internal server error.");
  }
}
