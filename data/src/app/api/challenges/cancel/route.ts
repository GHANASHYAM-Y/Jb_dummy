import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/challenges/cancel
 * Body: { challenge_id: string }
 *
 * Security:
 *  - Only the challenge assigner (winner) can cancel their challenge.
 *  - Must be in 'pending' status.
 *  - Enforced authoritatively inside the database RPC.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { challenge_id?: string } = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body.challenge_id || !UUID_RE.test(body.challenge_id)) {
      return NextResponse.json(
        { error: "challenge_id must be a valid UUID." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("cancel_challenge", {
      p_challenge_id: body.challenge_id,
    });

    if (error) {
      console.error("[challenges/cancel] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code: string;
      message?: string;
    };

    if (!result.ok) {
      const status =
        result.code === "forbidden"
          ? 403
          : result.code === "not_found"
          ? 404
          : result.code === "not_pending"
          ? 409
          : 400;

      return NextResponse.json(
        { error: result.message ?? result.code, code: result.code },
        { status }
      );
    }

    // Retrieve refreshed challenge record for caller UI
    let updatedChallenge: unknown = null;
    try {
      const { data: ch } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", body.challenge_id)
        .maybeSingle();
      updatedChallenge = ch;
    } catch {
      // Non-critical fallback
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      status: "cancelled",
      challenge: updatedChallenge,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("[challenges/cancel] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
