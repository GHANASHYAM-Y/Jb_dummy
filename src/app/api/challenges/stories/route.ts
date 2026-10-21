import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/challenges/stories
 *
 * Retrieves active 24-hour Stories accessible to the caller:
 *   - Public stories from anyone (excluding blocked users).
 *   - Private stories from accepted friends.
 *   - The caller's own active stories.
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Query active unexpired submissions with profile joins
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("challenge_submissions")
      .select(`
        id,
        challenge_id,
        match_id,
        loser_id,
        winner_id,
        storage_path,
        media_type,
        duration_seconds,
        visibility,
        status,
        created_at,
        expires_at,
        creator:profiles!challenge_submissions_loser_id_fkey(id, display_name, evoora_id, avatar_url),
        challenge:challenges!challenge_submissions_challenge_id_fkey(title, category, description)
      `)
      .gt("expires_at", new Date().toISOString())
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(30);

    const targetUser = request.nextUrl.searchParams.get("user_id");
    if (targetUser) {
      query = query.eq("loser_id", targetUser);
    }

    const { data: rawStories, error } = await query;

    if (error) {
      console.warn("[challenges/stories] Query warning:", error.message);
      return NextResponse.json({ ok: true, stories: [] });
    }

    // Generate signed URLs only if caller is permitted and story is unexpired
    const now = Date.now();
    const storiesWithUrls = await Promise.all(
      (rawStories || []).map(async (story: Record<string, unknown> & { visibility?: string; loser_id?: string; winner_id?: string; storage_path?: string; expires_at?: string }) => {
        let mediaUrl = "";
        const isExpired = story.expires_at ? new Date(story.expires_at).getTime() <= now : false;

        // Author can view active story.
        // Public story can be viewed by all unblocked viewers.
        // Friends (selected via RLS) can view private story; winner must use the review session.
        const canViewMedia = !isExpired && story.storage_path && (
          story.visibility === "public" ||
          (user && user.id === story.loser_id) ||
          (user && user.id !== story.winner_id && story.visibility === "private")
        );

        if (canViewMedia && story.storage_path) {
          try {
            const adminStorage = createServiceRoleClient();
            const { data: signData } = await adminStorage.storage
              .from("challenge-stories")
              .createSignedUrl(story.storage_path, 300);
            if (signData?.signedUrl) mediaUrl = signData.signedUrl;
          } catch {
            // Storage fallback
          }
        }

        return {
          ...story,
          media_url: mediaUrl,
        };
      })
    );

    return NextResponse.json(
      {
        ok: true,
        stories: storiesWithUrls,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" },
      }
    );
  } catch (err) {
    console.error("[challenges/stories] Unexpected error:", err);
    return NextResponse.json({ ok: true, stories: [] });
  }
}
