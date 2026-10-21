import { NextResponse, connection } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET / POST /api/challenges/stories/cleanup
 *
 * Retention policy cleanup:
 *  - Identifies stories older than 24 hours (expires_at <= NOW()).
 *  - Permanently deletes the underlying media objects from Supabase Storage.
 *  - Preserves challenge records, match records, and approval history.
 *  - Triggered via Vercel Cron (HTTP GET) or external schedulers/POST.
 */
export async function POST(request: Request) {
  await connection();
  try {
    // Require secret verification for external cron runners, or authenticated session
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized.", code: "unauthorized" }, { status: 401 });
      }
    } else {
      // If no CRON_SECRET configured, require authenticated caller session
      const serverSupabase = await createServerSupabaseClient();
      const { data: { user } } = await serverSupabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized.", code: "unauthorized" }, { status: 401 });
      }
    }

    // Use service role client for background maintenance
    const supabase = createServiceRoleClient();

    // Call DB RPC to get expired storage paths and update records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("cleanup_expired_stories");

    if (error) {
      console.error("[stories/cleanup] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as { ok: boolean; expired_paths: string[] };
    const expiredPaths = result.expired_paths || [];

    let deletedCount = 0;
    if (expiredPaths.length > 0) {
      try {
        const adminStorage = createServiceRoleClient();
        const { data: removeData, error: removeError } = await adminStorage.storage
          .from("challenge-stories")
          .remove(expiredPaths);

        // ONLY confirm paths that Storage successfully removed
        if (!removeError && removeData && removeData.length > 0) {
          const confirmedPaths = removeData
            .map((item: { name: string }) => item.name)
            .filter(Boolean);

          if (confirmedPaths.length > 0) {
            deletedCount = confirmedPaths.length;
            // Confirm ONLY successfully deleted paths in the database.
            // Failed deletions remain media_deleted_at = NULL and will be retried.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).rpc("confirm_story_media_deleted", {
              p_storage_paths: confirmedPaths,
            });
          }
        }
      } catch (storageErr) {
        console.warn("[stories/cleanup] Storage removal warning (files will be retried on next run):", storageErr);
      }
    }

    return NextResponse.json({
      success: true,
      cleaned_records: expiredPaths.length,
      deleted_files: deletedCount,
    });
  } catch (err) {
    console.error("[stories/cleanup] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// Vercel Cron triggers endpoints using HTTP GET
export const GET = POST;
