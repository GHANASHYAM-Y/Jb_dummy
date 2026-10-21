import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getAppOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (host) {
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || "http://localhost:3000";
}

/**
 * GET /api/friends/invite
 * Retrieves or creates the authenticated user's active friend invite link.
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_or_create_friend_invite");

    if (error) {
      console.error("[api/friends/invite] RPC error:", error.message);
      return NextResponse.json({ error: "Unable to load invite link." }, { status: 500 });
    }

    const result = data as { ok: boolean; token?: string; expires_at?: string; code?: string; message?: string };
    if (!result.ok || !result.token) {
      return NextResponse.json(
        { error: result.message || "Failed to generate invite.", code: result.code },
        { status: 400 },
      );
    }

    const origin = getAppOrigin(request);
    const inviteUrl = `${origin}/invite/${result.token}`;

    return NextResponse.json({
      ok: true,
      token: result.token,
      invite_url: inviteUrl,
      expires_at: result.expires_at,
    });
  } catch (err) {
    console.error("[api/friends/invite] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/friends/invite
 * Rotates the authenticated user's friend invite token, deactivating previous links.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("rotate_friend_invite");

    if (error) {
      console.error("[api/friends/invite] Rotate RPC error:", error.message);
      return NextResponse.json({ error: "Unable to rotate invite link." }, { status: 500 });
    }

    const result = data as { ok: boolean; token?: string; expires_at?: string; code?: string; message?: string };
    if (!result.ok || !result.token) {
      return NextResponse.json(
        { error: result.message || "Failed to rotate invite.", code: result.code },
        { status: 400 },
      );
    }

    const origin = getAppOrigin(request);
    const inviteUrl = `${origin}/invite/${result.token}`;

    return NextResponse.json({
      ok: true,
      token: result.token,
      invite_url: inviteUrl,
      expires_at: result.expires_at,
    });
  } catch (err) {
    console.error("[api/friends/invite] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
