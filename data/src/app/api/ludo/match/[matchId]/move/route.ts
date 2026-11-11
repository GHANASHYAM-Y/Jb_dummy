import { NextRequest, NextResponse, connection } from "next/server";
import {
  errorResponse,
  isTokenIndex,
  isVersion,
  performLudoAction,
  readJson,
  requireUser,
  UUID_RE,
} from "@/features/ludo/server/server";

interface RouteContext {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/ludo/match/[matchId]/move
 * Body: { version: number, token: 0 | 1 | 2 | 3 }
 * Moves one of the caller's tokens with the pending roll.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { matchId } = await params;
    if (!matchId || !UUID_RE.test(matchId)) return errorResponse("invalid_id", "matchId must be a valid UUID.");

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ version?: unknown; token?: unknown }>(request);
    if (!body || typeof body !== "object") return errorResponse("invalid_body", "Invalid JSON body.");
    if (!isVersion(body.version)) return errorResponse("invalid_version", "version must be a non-negative integer.");
    if (!isTokenIndex(body.token)) return errorResponse("invalid_token", "token must be 0, 1, 2 or 3.");

    return await performLudoAction("move", auth, matchId, {
      kind: "move",
      version: body.version,
      token: body.token,
    });
  } catch (err) {
    console.error("[api/ludo/move] Unexpected error:", err);
    return errorResponse("internal_error", "Internal server error.");
  }
}
