import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/challenges/submission?challenge_id=UUID
 *
 * Returns challenge submission and Story details for the caller based on role & permissions.
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const challengeId = request.nextUrl.searchParams.get("challenge_id");

    if (!challengeId || !UUID_RE.test(challengeId)) {
      return NextResponse.json({ error: "challenge_id must be a valid UUID.", code: "invalid_id" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_challenge_story", {
      p_challenge_id: challengeId,
    });

    if (error) {
      console.error("[submission/get] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code?: string;
      has_submission?: boolean;
      submission?: unknown;
    };

    if (!result.ok) {
      const status = result.code === "blocked" ? 403 : result.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: result.code ?? "Error", code: result.code }, { status });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("[submission/get] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
