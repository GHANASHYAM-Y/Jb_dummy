import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/rps/timeout
 *
 * Atomically resolves an expired 10-second round deadline via the authoritative
 * PostgreSQL RPC `resolve_rps_timeout`.
 *
 * Security:
 *  - Enforces authenticated session.
 *  - Authoritative resolution is delegated strictly to the database RPC (SECURITY DEFINER).
 *  - Guarantees server-side round_deadline verification.
 *  - Eliminates client-side fallback to prevent RLS masking exploits.
 */
export async function POST(request: NextRequest) {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated.", code: "unauthenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const matchId = body.match_id || request.nextUrl.searchParams.get("match_id");

    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json(
        { error: "match_id must be a valid UUID.", code: "invalid_id" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("resolve_rps_timeout", {
      p_match_id: matchId,
    });

    if (error) {
      console.error("[api/rps/timeout] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code?: string;
      message?: string;
      seconds_remaining?: number;
      result?: string;
      player1_wins?: number;
      player2_wins?: number;
      is_completed?: boolean;
    };

    if (!result.ok) {
      if (result.code === "forbidden") {
        return NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 });
      }
      if (result.code === "not_found") {
        return NextResponse.json({ error: "Match not found", code: "not_found" }, { status: 404 });
      }
      if (result.code === "deadline_not_reached") {
        return NextResponse.json(
          {
            error: result.message || "Round deadline has not expired yet.",
            code: "deadline_not_reached",
            seconds_remaining: result.seconds_remaining,
          },
          { status: 400 }
        );
      }
      if (result.code === "match_not_active") {
        return NextResponse.json(
          { ok: false, code: "match_not_active", message: result.message || "Match is not active." },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: result.message || result.code || "Unable to resolve timeout.", code: result.code || "timeout_error" },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[api/rps/timeout] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}

