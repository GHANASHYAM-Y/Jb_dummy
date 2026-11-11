import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

/**
 * POST /api/friends/cancel
 *
 * Body: { request_id: string }
 *
 * Allows the sender of a pending request to cancel it.
 * The DB function verifies that the caller is the actual sender.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { request_id?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!body.request_id || !UUID_RE.test(body.request_id)) {
      return NextResponse.json({ error: "Invalid request_id." }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("cancel_friend_request", {
      p_request_id: body.request_id,
    });

    if (error) {
      console.error("[friends/cancel] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as { ok: boolean; code: string; message: string };
    if (!result.ok) {
      const status = result.code === "forbidden" ? 403
        : result.code === "not_found" ? 404
        : 409;
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }

    return NextResponse.json({ success: true, code: result.code }, { status: 200 });
  } catch (err) {
    console.error("[friends/cancel] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
