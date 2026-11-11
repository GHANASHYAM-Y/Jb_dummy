import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

/**
 * GET /api/challenges?filter=received|sent|all
 *
 * Returns challenges for the authenticated caller.
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
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (matchId) {
      if (!UUID_RE.test(matchId)) {
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
        console.error("[challenges] get_match_challenge RPC error:", error.message);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
      }

      const matchResult = data as {
        ok: boolean;
        code?: string;
        challenge?: unknown;
      };

      if (!matchResult.ok) {
        const status = matchResult.code === "forbidden" ? 403 : 404;
        return NextResponse.json({ error: matchResult.code ?? "Error" }, { status });
      }

      return NextResponse.json(matchResult, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    const filter = request.nextUrl.searchParams.get("filter") ?? "all";
    if (!["received", "sent", "all"].includes(filter)) {
      return NextResponse.json(
        { error: "filter must be 'received', 'sent', or 'all'." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_user_challenges", {
      p_filter: filter,
    });

    if (error) {
      console.error("[challenges] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code?: string;
      challenges?: unknown[];
    };

    if (!result.ok) {
      return NextResponse.json({ error: result.code ?? "Error" }, { status: 400 });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("[challenges] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
