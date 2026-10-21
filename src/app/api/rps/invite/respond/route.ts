import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/rps/invite/respond
 * Body: { invite_id: string, action: "accept" | "decline" }
 *
 * Only the invitee can respond; DB function enforces this.
 * Accept creates a match row and returns the match_id.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { invite_id?: string; action?: string } = {};
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    if (!body.invite_id || !UUID_RE.test(body.invite_id)) {
      return NextResponse.json({ error: "invite_id must be a valid UUID." }, { status: 400 });
    }
    if (!body.action || !["accept", "decline"].includes(body.action)) {
      return NextResponse.json({ error: "action must be 'accept' or 'decline'." }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("respond_game_invite", {
      p_invite_id: body.invite_id,
      p_action:    body.action,
    });
    if (error) {
      console.error("[rps/invite/respond] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
    const result = data as { ok: boolean; code: string; match_id?: string };
    if (!result.ok) {
      const status = result.code === "forbidden" ? 403
        : result.code === "not_found" ? 404
        : 409;
      return NextResponse.json({ error: result.code, code: result.code }, { status });
    }
    return NextResponse.json({
      success: true,
      code: result.code,
      match_id: result.match_id ?? null,
    });
  } catch (err) {
    console.error("[rps/invite/respond] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
