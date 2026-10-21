import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/friends/invite/resolve?token=...
 *
 * Resolves an invitation token. Accessible to both authenticated users and public visitors.
 * Returns the inviter's public display info and the relationship to the caller.
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim().toLowerCase();

    if (!token || token.length < 16) {
      return NextResponse.json(
        { ok: false, code: "invalid_token", message: "Invalid invite token." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("resolve_friend_invite", {
      p_token: token,
    });

    if (error) {
      console.error("[api/friends/invite/resolve] RPC error:", error.message);
      return NextResponse.json(
        { ok: false, code: "error", message: "Unable to resolve invitation." },
        { status: 500 },
      );
    }

    const result = data as {
      ok: boolean;
      code?: string;
      message?: string;
      relationship?: string;
      inviter?: { display_name: string; avatar_url: string | null; evoora_id: string };
    };

    if (!result.ok) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[api/friends/invite/resolve] Unexpected error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
