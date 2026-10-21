import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface UserSearchResult {
  id: string;
  display_name: string;
  evoora_id: string;
  avatar_url: string | null;
  bio: string | null;
  friendship_status: "friend" | "pending_sent" | "pending_received" | "none";
  request_id?: string;
}

interface BlockRecord {
  blocker_id: string;
  blocked_id: string;
}

interface RequestRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
}

interface ProfileRecord {
  id: string;
  display_name: string;
  evoora_id: string;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
}

/**
 * GET /api/friends/search?q=...
 *
 * Server-authoritative search for players by display name or unique EVOAIQU ID.
 * Returns suggested users when query is empty.
 * Enforces privacy (is_public = true) and bidirectional blocking rules.
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    // 1. Fetch blocked user IDs (bidirectional)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawBlocks } = await (supabase as any)
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    const blocks = (rawBlocks || []) as BlockRecord[];
    const blockedSet = new Set<string>();
    for (const b of blocks) {
      if (b.blocker_id === user.id) blockedSet.add(b.blocked_id);
      if (b.blocked_id === user.id) blockedSet.add(b.blocker_id);
    }

    // 2. Fetch active friend requests involving the caller
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawRequests } = await (supabase as any)
      .from("friend_requests")
      .select("id, sender_id, receiver_id, status")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .in("status", ["accepted", "pending"]);

    const requests = (rawRequests || []) as RequestRecord[];
    const friendMap = new Map<string, { status: "friend" | "pending_sent" | "pending_received"; requestId: string }>();
    for (const r of requests) {
      const otherId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
      if (r.status === "accepted") {
        friendMap.set(otherId, { status: "friend", requestId: r.id });
      } else if (r.status === "pending") {
        if (r.sender_id === user.id) {
          friendMap.set(otherId, { status: "pending_sent", requestId: r.id });
        } else {
          friendMap.set(otherId, { status: "pending_received", requestId: r.id });
        }
      }
    }

    // 3. Query profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profilesQuery = (supabase as any)
      .from("profiles")
      .select("id, display_name, evoora_id, avatar_url, bio, is_public")
      .eq("is_public", true)
      .neq("id", user.id);

    if (query.length > 0) {
      const cleanQ = query.replace(/[%_]/g, "\\$&");
      profilesQuery = profilesQuery.or(
        `display_name.ilike.%${cleanQ}%,evoora_id.ilike.%${cleanQ}%`,
      );
    }

    const { data: rawProfiles, error: profilesError } = await profilesQuery.limit(15);

    if (profilesError) {
      console.error("[friends/search] Query error:", profilesError.message);
      return NextResponse.json({ error: "Failed to search players." }, { status: 500 });
    }

    const profiles = (rawProfiles || []) as ProfileRecord[];

    // 4. Filter out blocked users and format results
    const results: UserSearchResult[] = profiles
      .filter((p) => !blockedSet.has(p.id))
      .map((p) => {
        const rel = friendMap.get(p.id);
        return {
          id: p.id,
          display_name: p.display_name,
          evoora_id: p.evoora_id,
          avatar_url: p.avatar_url,
          bio: p.bio,
          friendship_status: rel ? rel.status : "none",
          request_id: rel?.requestId,
        };
      });

    return NextResponse.json({
      ok: true,
      users: results,
    });
  } catch (err) {
    console.error("[friends/search] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
