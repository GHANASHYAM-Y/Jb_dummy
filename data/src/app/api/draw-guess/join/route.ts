import { NextRequest, NextResponse, connection } from "next/server";
import { isRoomCode, normalizeRoomCode, readJson, requireUser, runDrawRpc } from "@/features/draw-guess/server";

/** POST /api/draw-guess/join. Body: { code: string }. Joins the room with that code. */
export async function POST(request: NextRequest) {
  await connection();
  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ code?: unknown }>(request);
    const code = typeof body?.code === "string" ? normalizeRoomCode(body.code) : "";
    if (!isRoomCode(code)) {
      return NextResponse.json({ error: "Enter the 5-character room code.", code: "invalid_code" }, { status: 400 });
    }

    return await runDrawRpc("join", auth.supabase, "draw_join_room", { p_code: code });
  } catch (err) {
    console.error("[api/draw-guess/join] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
