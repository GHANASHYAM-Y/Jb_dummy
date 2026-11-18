import { NextRequest, NextResponse, connection } from "next/server";
import { UUID_RE, isValidGuess, readJson, requireUser, runDrawRpc } from "@/features/draw-guess/server";

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

/**
 * POST /api/draw-guess/room/[roomId]/guess
 * Body: { guess: string }. The server compares it with the secret word; the
 * word never reaches the guesser's browser. A guess that arrives just after the
 * round ended returns HTTP 200 with success: false (code round_not_active).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { roomId } = await params;
    if (!roomId || !UUID_RE.test(roomId)) {
      return NextResponse.json({ error: "roomId must be a valid UUID.", code: "invalid_id" }, { status: 400 });
    }

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ guess?: unknown }>(request);
    if (!isValidGuess(body?.guess)) {
      return NextResponse.json({ error: "Type a guess of 1 to 40 characters.", code: "invalid_guess" }, { status: 400 });
    }

    return await runDrawRpc(
      "guess",
      auth.supabase,
      "draw_guess",
      { p_room_id: roomId, p_guess: body.guess },
      ["round_not_active"],
    );
  } catch (err) {
    console.error("[api/draw-guess/guess] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
