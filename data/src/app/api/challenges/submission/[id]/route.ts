import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/core/supabase/server";
import { isValidVisibility } from "@/features/dare-game/lib/challenges";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/challenges/submission/[id]
 * Loser updates Story visibility ('private' | 'public').
 * Winner is strictly forbidden.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  await connection();
  try {
    const { id: submissionId } = await params;
    if (!submissionId || !UUID_RE.test(submissionId)) {
      return NextResponse.json({ error: "Invalid submission ID.", code: "invalid_id" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated.", code: "unauthenticated" }, { status: 401 });
    }

    let body: { visibility?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload.", code: "invalid_body" }, { status: 400 });
    }

    const { visibility } = body;
    if (!visibility || !isValidVisibility(visibility)) {
      return NextResponse.json({ error: "visibility must be 'private' or 'public'.", code: "invalid_visibility" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_story_visibility", {
      p_submission_id: submissionId,
      p_visibility: visibility,
    });

    if (error) {
      console.error("[submission/patch] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const result = data as { ok: boolean; code: string; message?: string; visibility?: string };
    if (!result.ok) {
      const status = result.code === "forbidden" ? 403 : result.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: result.message || result.code, code: result.code }, { status });
    }

    return NextResponse.json({ success: true, visibility: result.visibility });
  } catch (err) {
    console.error("[submission/patch] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}

/**
 * DELETE /api/challenges/submission/[id]
 * Loser deletes their Story. Removes underlying media file from storage immediately.
 * Preserves challenge records and approval history.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  await connection();
  try {
    const { id: submissionId } = await params;
    if (!submissionId || !UUID_RE.test(submissionId)) {
      return NextResponse.json({ error: "Invalid submission ID.", code: "invalid_id" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated.", code: "unauthenticated" }, { status: 401 });
    }

    // Call RPC to mark deleted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("delete_challenge_story", {
      p_submission_id: submissionId,
    });

    if (error) {
      console.error("[submission/delete] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error.", code: "rpc_error" }, { status: 500 });
    }

    const result = data as { ok: boolean; code: string; message?: string; storage_path?: string };
    if (!result.ok) {
      const status = result.code === "forbidden" ? 403 : result.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: result.message || result.code, code: result.code }, { status });
    }

    // Delete media file from Supabase storage
    if (result.storage_path) {
      try {
        const adminStorage = createServiceRoleClient();
        const { data: removeData, error: removeError } = await adminStorage.storage
          .from("challenge-stories")
          .remove([result.storage_path]);

        if (!removeError && removeData && removeData.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminStorage as any).rpc("confirm_story_media_deleted", {
            p_storage_paths: [result.storage_path],
          });
        }
      } catch (storageErr) {
        console.warn("[submission/delete] Storage delete warning (cleanup will retry):", storageErr);
      }
    }

    return NextResponse.json({ success: true, code: "deleted" });
  } catch (err) {
    console.error("[submission/delete] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error.", code: "internal_error" }, { status: 500 });
  }
}
