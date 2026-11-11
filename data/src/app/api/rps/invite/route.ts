import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { UUID_RE } from "@/shared/lib/validation";

/**
 * POST /api/rps/invite
 * Body: { invitee_id: string }  — UUID of the friend to challenge
 *
 * Security:
 *  - Session verified via getUser().
 *  - Caller identity comes from session — never from body.
 *  - DB function enforces friend-only constraint.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: { invitee_id?: string } = {};
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    if (!body.invitee_id || !UUID_RE.test(body.invitee_id)) {
      return NextResponse.json({ error: "invitee_id must be a valid UUID." }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("send_game_invite", {
      p_invitee_id: body.invitee_id,
    });
    if (error) {
      console.error("[rps/invite] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
    const result = data as { ok: boolean; code: string; invite_id?: string };
    if (!result.ok) {
      const status = result.code === "not_friends" ? 403 : 409;
      return NextResponse.json({ error: result.code, code: result.code }, { status });
    }
    return NextResponse.json({ success: true, invite_id: result.invite_id });
  } catch (err) {
    console.error("[rps/invite] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * GET /api/rps/invite
 * Returns pending invites (incoming + outgoing) for the authenticated user.
 * For accepted invites, authoritatively checks matches.phase so completed or cancelled
 * matches are never returned as active games.
 */
export async function GET() {
  await connection();
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_game_invites");
    if (error) {
      console.error("[rps/invite GET] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    interface InviteItem {
      invite_id: string;
      direction: "incoming" | "outgoing";
      other_id: string;
      other_name: string;
      other_evoora_id: string;
      other_avatar: string | null;
      status: string;
      expires_at: string;
      match_id: string | null;
      created_at: string;
      is_active?: boolean;
    }

    const rawInvites = ((data as { invites?: InviteItem[] })?.invites ?? []) as InviteItem[];
    const acceptedMatchIds = rawInvites
      .filter((inv) => inv.status === "accepted" && typeof inv.match_id === "string")
      .map((inv) => inv.match_id as string);

    let activeMatchIdSet = new Set<string>();
    if (acceptedMatchIds.length > 0) {
      const { data: activeMatches, error: matchCheckError } = await supabase
        .from("matches")
        .select("id, phase")
        .in("id", acceptedMatchIds)
        .eq("phase", "active");

      if (!matchCheckError && activeMatches) {
        activeMatchIdSet = new Set(activeMatches.map((m: { id: string }) => m.id));
      }
    }

    const sanitizedInvites = rawInvites.map((inv) => {
      if (inv.status === "accepted" && inv.match_id) {
        const isMatchActive = activeMatchIdSet.has(inv.match_id);
        return {
          ...inv,
          is_active: isMatchActive,
          // Only preserve 'accepted' status if the underlying match is genuinely active!
          // If the match is completed/cancelled, mark status as 'completed'
          status: isMatchActive ? "accepted" : "completed",
        };
      }
      return {
        ...inv,
        is_active: false,
      };
    });

    return NextResponse.json({
      ...(data as Record<string, unknown>),
      invites: sanitizedInvites,
    });
  } catch (err) {
    console.error("[rps/invite GET] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
