import { NextRequest, NextResponse, connection } from "next/server";
import { UUID_RE, requireUser, runDrawRpc } from "@/features/draw-guess/server";

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

/**
 * POST /api/draw-guess/room/[roomId]/advance
 * Starts the first round, or moves on after a round (next round, or finish).
 * Either player may call it; a second call at the same moment is a no-op.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { roomId } = await params;
    if (!roomId || !UUID_RE.test(roomId)) {
      return NextResponse.json({ error: "roomId must be a valid UUID.", code: "invalid_id" }, { status: 400 });
    }

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    return await runDrawRpc("advance", auth.supabase, "draw_advance", { p_room_id: roomId });
  } catch (err) {
    console.error("[api/draw-guess/advance] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
