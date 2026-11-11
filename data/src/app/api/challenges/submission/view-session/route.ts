import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/core/supabase/server";
import { UUID_RE } from "@/shared/lib/validation";


/**
 * POST /api/challenges/submission/view-session
 *
 * Atomically governs the verified winner's one-time authorized viewing session.
 *
 * Body:
 *   - action: "start" | "ack_playback" | "finish"
 *   - challenge_id?: UUID (for "start")
 *   - submission_id?: UUID (for "ack_playback" and "finish")
 *   - session_token?: UUID (for "ack_playback" and "finish")
 *
 * Security:
 *  - Enforces one viewing session per submission server-side with PostgreSQL row locks.
 *  - Reopening is denied once consumed or expired.
 *  - Network interruptions before playback starts do NOT consume the session.
 *  - Generates a short-lived (180s) signed media URL only for authorized session holders.
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
      action?: string;
      challenge_id?: string;
      submission_id?: string;
      session_token?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_body" }, { status: 400 });
    }

    const { action } = body;

    // ── 1. Action: START ──────────────────────────────────────────────────────
    if (action === "start") {
      const challengeId = body.challenge_id;
      if (!challengeId || !UUID_RE.test(challengeId)) {
        return NextResponse.json({ error: "challenge_id must be a valid UUID.", code: "invalid_id" }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("start_winner_review_session", {
        p_challenge_id: challengeId,
      });

      if (error) {
        console.error("[view-session/start] RPC error:", error.message);
        return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
      }

      const result = data as {
        ok: boolean;
        code: string;
        message?: string;
        submission_id?: string;
        session_token?: string;
        storage_path?: string;
        duration_seconds?: number;
        media_type?: string;
        playback_started?: boolean;
      };

      if (!result.ok) {
        const status =
          result.code === "already_viewed" || result.code === "session_expired"
            ? 403
            : result.code === "forbidden" || result.code === "blocked"
            ? 403
            : result.code === "no_submission"
            ? 404
            : 400;

        return NextResponse.json(
          { error: result.message || result.code, code: result.code },
          { status }
        );
      }

      // Generate a short-lived (180s) signed URL for private video playback
      let signedUrl = "";
      if (result.storage_path) {
        try {
          const adminStorage = createServiceRoleClient();
          const { data: signData, error: signError } = await adminStorage.storage
            .from("challenge-stories")
            .createSignedUrl(result.storage_path, 180);

          if (!signError && signData?.signedUrl) {
            signedUrl = signData.signedUrl;
          }
        } catch {
          // If storage isn't accessible, use mock media stream fallback
        }
      }

      return NextResponse.json(
        {
          ok: true,
          code: result.code,
          submission_id: result.submission_id,
          session_token: result.session_token,
          media_url: signedUrl,
          storage_path: result.storage_path,
          duration_seconds: result.duration_seconds || 10,
          media_type: result.media_type || "video/webm",
          playback_started: result.playback_started ?? false,
        },
        {
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" },
        }
      );
    }

    // ── 2. Action: ACK_PLAYBACK ───────────────────────────────────────────────
    if (action === "ack_playback") {
      const submissionId = body.submission_id;
      const token = body.session_token;

      if (!submissionId || !UUID_RE.test(submissionId) || !token || !UUID_RE.test(token)) {
        return NextResponse.json({ error: "Invalid submission_id or session_token.", code: "invalid_params" }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("ack_playback_start", {
        p_submission_id: submissionId,
        p_token: token,
      });

      if (error) {
        console.error("[view-session/ack] RPC error:", error.message);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
      }

      const result = data as { ok: boolean; code: string; message?: string };
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    // ── 3. Action: FINISH ─────────────────────────────────────────────────────
    if (action === "finish") {
      const submissionId = body.submission_id;
      const token = body.session_token;

      if (!submissionId || !UUID_RE.test(submissionId) || !token || !UUID_RE.test(token)) {
        return NextResponse.json({ error: "Invalid submission_id or session_token.", code: "invalid_params" }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("finish_winner_review_session", {
        p_submission_id: submissionId,
        p_token: token,
      });

      if (error) {
        console.error("[view-session/finish] RPC error:", error.message);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
      }

      const result = data as { ok: boolean; code: string; message?: string };
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    return NextResponse.json({ error: "Invalid action. Must be 'start', 'ack_playback', or 'finish'.", code: "invalid_action" }, { status: 400 });
  } catch (err) {
    console.error("[view-session] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
