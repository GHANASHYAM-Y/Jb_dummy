import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";


/**
 * POST /api/friends/invite/accept
 *
 * Body: { token: string }
 *
 * An authenticated user clicks "Send Friend Request" on an invitation page.
 * Validates the invite token and creates a pending friend request to the inviter.
 */
export async function POST(request: NextRequest) {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated.", code: "unauthenticated" }, { status: 401 });
    }

    let body: { token?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const token = body.token?.trim().toLowerCase();
    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Invalid invitation token.", code: "invalid_token" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("accept_friend_invite", {
      p_token: token,
    });

    if (error) {
      console.error("[api/friends/invite/accept] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as { ok: boolean; code: string; message: string };
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.code === "invalid_or_expired" ? 404 : 409 },
      );
    }

    return NextResponse.json({ ok: true, code: result.code, message: result.message }, { status: 200 });
  } catch (err) {
    console.error("[api/friends/invite/accept] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
