import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { UUID_RE } from "@/shared/lib/validation";


/**
 * POST /api/games/disconnect
 *
 * Records unexpected player disconnection and initiates 60-second grace period.
 * Does NOT forfeit the match immediately (temporary drop / browser refresh protection).
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
      return NextResponse.json(
        { error: "Not authenticated.", code: "unauthenticated" },
        { status: 401 }
      );
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
    const { data, error } = await (supabase as any).rpc("report_disconnect", {
      p_match_id: matchId,
    });

    if (error) {
      console.error("[games/disconnect] RPC error:", error.message);
      return NextResponse.json(
        { error: "Internal server error.", code: "rpc_error" },
        { status: 500 }
      );
    }

    const result = data as {
      ok: boolean;
      code: string;
      phase?: string;
      reconnect_deadline?: string;
      server_now?: string;
    };

    if (!result.ok) {
      if (result.code === "forbidden") {
        return NextResponse.json(
          { error: "Forbidden", code: "forbidden" },
          { status: 403 }
        );
      }
      if (result.code === "not_found") {
        return NextResponse.json(
          { error: "Match not found", code: "not_found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: result.code, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        code: result.code,
        phase: result.phase,
        reconnect_deadline: result.reconnect_deadline,
        server_now: result.server_now,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[games/disconnect] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error.", code: "internal_error" },
      { status: 500 }
    );
  }
}

