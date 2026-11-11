import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { UUID_RE } from "@/shared/lib/validation";

/**
 * POST /api/friends/respond
 *
 * Body: { request_id: string, action: "accept" | "reject" }
 *
 * Security: Only the actual receiver can accept/reject — enforced in the DB
 * SECURITY DEFINER function using auth.uid() from the verified session.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { request_id?: string; action?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (!body.request_id || !body.action) {
      return NextResponse.json(
        { error: "request_id and action are required." },
        { status: 400 },
      );
    }

    if (!["accept", "reject"].includes(body.action)) {
      return NextResponse.json(
        { error: "action must be 'accept' or 'reject'." },
        { status: 400 },
      );
    }

    // Basic UUID format check.
    if (!UUID_RE.test(body.request_id)) {
      return NextResponse.json({ error: "Invalid request_id." }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("respond_friend_request", {
      p_request_id: body.request_id,
      p_action: body.action,
    });

    if (error) {
      console.error("[friends/respond] RPC error:", error.message);
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
    console.error("[friends/respond] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
