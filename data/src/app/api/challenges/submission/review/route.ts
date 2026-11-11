import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/challenges/submission/review
 *
 * Winner approves the challenge submission or requests a retry with feedback.
 *
 * Body: {
 *   challenge_id: string,
 *   action: "approve" | "request_retry",
 *   retry_note?: string
 * }
 *
 * Security:
 *  - Authenticated session verified.
 *  - Caller must be verified match winner.
 *  - Enforced atomically in PostgreSQL `review_challenge_submission`.
 *  - Winner can approve or request retry even without reopening the video.
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

    let body: {
      challenge_id?: string;
      action?: string;
      retry_note?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_body" }, { status: 400 });
    }

    const { challenge_id: challengeId, action, retry_note: retryNote } = body;

    if (!challengeId || !UUID_RE.test(challengeId)) {
      return NextResponse.json({ error: "challenge_id must be a valid UUID.", code: "invalid_id" }, { status: 400 });
    }

    if (!action || !["approve", "request_retry"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'request_retry'.", code: "invalid_action" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("review_challenge_submission", {
      p_challenge_id: challengeId,
      p_action: action,
      p_retry_note: retryNote || null,
    });

    if (error) {
      console.error("[submission/review] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code: string;
      message?: string;
      status?: string;
    };

    if (!result.ok) {
      const status =
        result.code === "forbidden"
          ? 403
          : result.code === "not_found" || result.code === "no_submission"
          ? 404
          : 400;

      return NextResponse.json(
        { error: result.message || result.code, code: result.code },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      status: result.status,
    });
  } catch (err) {
    console.error("[submission/review] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
