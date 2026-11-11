import { NextRequest, NextResponse, connection } from "next/server";
import { errorResponse, isVersion, performLudoAction, readJson, requireUser, UUID_RE } from "@/features/ludo/server/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/ludo/match/[matchId]/roll
 * Body: { version: number }
 * The server rolls the die for the caller (their turn, no roll pending).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) return errorResponse("invalid_id", "matchId must be a valid UUID.");

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ version?: unknown }>(request);
    if (!body || typeof body !== "object") return errorResponse("invalid_body", "Invalid JSON body.");
    if (!isVersion(body.version)) return errorResponse("invalid_version", "version must be a non-negative integer.");

    return await performLudoAction("roll", auth, matchId, { kind: "roll", version: body.version });
  } catch (err) {
    console.error("[api/ludo/roll] Unexpected error:", err);
    return errorResponse("internal_error", "Internal server error.");
  }
}
