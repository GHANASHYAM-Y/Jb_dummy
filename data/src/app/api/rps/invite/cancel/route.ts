import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { UUID_RE } from "@/shared/lib/validation";


/**
 * POST /api/rps/invite/cancel
 * Body: { invite_id: string }
 *
 * Allows the inviter to cancel a pending invite.
 * DB function verifies inviter_id = auth.uid().
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { invite_id?: string } = {};
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    if (!body.invite_id || !UUID_RE.test(body.invite_id)) {
      return NextResponse.json({ error: "invite_id must be a valid UUID." }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("cancel_game_invite", {
      p_invite_id: body.invite_id,
    });
    if (error) {
      console.error("[rps/invite/cancel] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
    const result = data as { ok: boolean; code: string };
    if (!result.ok) {
      const status = result.code === "forbidden" ? 403
        : result.code === "not_found" ? 404
        : 409;
      return NextResponse.json({ error: result.code, code: result.code }, { status });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[rps/invite/cancel] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
