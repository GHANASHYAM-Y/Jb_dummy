import { NextRequest, NextResponse, connection } from "next/server";
import { UUID_RE, loadDrawRoom, requireUser } from "@/features/draw-guess/server";

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

/**
 * GET /api/draw-guess/room/[roomId]
 * The caller's view of the room. The secret word is only included for the drawer
 * while drawing, and for everyone once the round is over.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  await connection();
  try {
    const { roomId } = await params;
    if (!roomId || !UUID_RE.test(roomId)) {
      return NextResponse.json({ error: "roomId must be a valid UUID.", code: "invalid_id" }, { status: 400 });
    }

    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const loaded = await loadDrawRoom(auth.supabase, roomId);
    if (!loaded.ok) {
      return NextResponse.json({ error: loaded.code, code: loaded.code }, { status: loaded.status });
    }
    return NextResponse.json({ success: true, snapshot: loaded.snapshot, players: loaded.players });
  } catch (err) {
    console.error("[api/draw-guess/room] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
