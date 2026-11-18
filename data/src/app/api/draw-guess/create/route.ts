import { NextResponse, connection } from "next/server";
import { requireUser, runDrawRpc } from "@/features/draw-guess/server";

/** POST /api/draw-guess/create: opens a new room and returns its id and 5-character code. */
export async function POST() {
  await connection();
  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;
    return await runDrawRpc("create", auth.supabase, "draw_create_room", {});
  } catch (err) {
    console.error("[api/draw-guess/create] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
