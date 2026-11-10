import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/friends/send
 *
 * Body: { evoora_id: string }
 *
 * Security:
 *  1. Session verified server-side via getUser().
 *  2. Target resolved by Evoora ID (public ID) — not UUID, avoids guessing.
 *  3. All state transitions enforced inside the SECURITY DEFINER DB function.
 *  4. The caller's UUID is taken from the verified session, never from the body.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { evoora_id?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const rawId = body.evoora_id?.trim();
    if (!rawId) {
      return NextResponse.json({ error: "evoora_id is required." }, { status: 400 });
    }

    // Basic format check to fail fast before hitting the DB.
    if (!/^EVO-[A-Z0-9]{6}$/i.test(rawId)) {
      return NextResponse.json(
        { error: "Invalid EVOAIQU ID format.", code: "invalid_format" },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("send_friend_request", {
      p_target_evoora_id: rawId.toUpperCase(),
    });

    if (error) {
      console.error("[friends/send] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as { ok: boolean; code: string; message: string };
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, code: result.code }, { status: 200 });
  } catch (err) {
    console.error("[friends/send] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
