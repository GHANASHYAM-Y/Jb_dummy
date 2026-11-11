import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { UUID_RE } from "@/shared/lib/validation";


/**
 * GET /api/challenges/match?match_id=UUID
 *
 * Returns the challenge for a specific match, if assigned.
 * Accessible only by match participants.
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const matchId = request.nextUrl.searchParams.get("match_id");
    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json(
        { error: "match_id must be a valid UUID." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_match_challenge", {
      p_match_id: matchId,
    });

    if (error) {
      console.error("[challenges/match] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code?: string;
      challenge?: unknown;
    };

    if (!result.ok) {
      const status = result.code === "forbidden" ? 403 : 404;
      return NextResponse.json({ error: result.code ?? "Error" }, { status });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("[challenges/match] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
