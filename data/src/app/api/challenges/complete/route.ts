import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { UUID_RE } from "@/shared/lib/validation";


/**
 * POST /api/challenges/complete
 * Body: { challenge_id: string }
 *
 * Security:
 *  - Only the assigned recipient (loser) can complete the challenge.
 *  - Must be in 'accepted' status.
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
    const { data, error } = await (supabase as any).rpc("complete_challenge", {
      p_challenge_id: body.challenge_id,
    });

    if (error) {
      console.error("[challenges/complete] RPC error:", error.message);
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
          : result.code === "not_accepted"
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
      status: "completed",
      challenge: updatedChallenge,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("[challenges/complete] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
