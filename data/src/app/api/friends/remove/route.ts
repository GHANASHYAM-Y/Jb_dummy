import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

/**
 * DELETE /api/friends/remove
 *
 * Body: { friend_id: string }  — the UUID of the friend's profile.
 *
 * Either participant can remove the friendship.
 * The DB function enforces ownership using auth.uid() from the session.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { friend_id?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!body.friend_id || !UUID_RE.test(body.friend_id)) {
      return NextResponse.json({ error: "Invalid friend_id." }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("remove_friend", {
      p_friend_id: body.friend_id,
    });

    if (error) {
      console.error("[friends/remove] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as { ok: boolean; code: string; message: string };
    if (!result.ok) {
      const status = result.code === "not_friends" ? 404 : 400;
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }

    return NextResponse.json({ success: true, code: result.code }, { status: 200 });
  } catch (err) {
    console.error("[friends/remove] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
