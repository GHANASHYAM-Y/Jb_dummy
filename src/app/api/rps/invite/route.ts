import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/rps/invite
 * Body: { invitee_id: string }  — UUID of the friend to challenge
 *
 * Security:
 *  - Session verified via getUser().
 *  - Caller identity comes from session — never from body.
 *  - DB function enforces friend-only constraint.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { invitee_id?: string } = {};
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!body.invitee_id || !UUID_RE.test(body.invitee_id)) {
      return NextResponse.json({ error: "invitee_id must be a valid UUID." }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("send_game_invite", {
      p_invitee_id: body.invitee_id,
    });
    if (error) {
      console.error("[rps/invite] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
    const result = data as { ok: boolean; code: string; invite_id?: string };
    if (!result.ok) {
      const status = result.code === "not_friends" ? 403 : 409;
      return NextResponse.json({ error: result.code, code: result.code }, { status });
    }
    return NextResponse.json({ success: true, invite_id: result.invite_id });
  } catch (err) {
    console.error("[rps/invite] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * GET /api/rps/invite
 * Returns pending invites (incoming + outgoing) for the authenticated user.
 */
export async function GET() {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_game_invites");
    if (error) {
      console.error("[rps/invite GET] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[rps/invite GET] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
