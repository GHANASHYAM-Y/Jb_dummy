import { NextRequest, NextResponse, connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/blocks
 * Retrieves the caller's list of blocked users.
 */
export async function GET() {
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
    const { data, error } = await (supabase as any).rpc("get_blocked_users");
    if (error) {
      console.error("[blocks] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code?: string;
      blocked_users?: unknown[];
    };

    if (!result.ok) {
      return NextResponse.json({ error: result.code ?? "Error" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[blocks] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/blocks
 * Body: { blocked_id: string }
 * Blocks the target user.
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

    let body: { blocked_id?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body.blocked_id || !UUID_RE.test(body.blocked_id)) {
      return NextResponse.json(
        { error: "blocked_id must be a valid UUID." },
        { status: 400 }
      );
    }

    if (body.blocked_id === user.id) {
      return NextResponse.json(
        { error: "Cannot block yourself." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("block_user", {
      p_blocked_id: body.blocked_id,
    });

    if (error) {
      console.error("[blocks/post] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code: string;
      message?: string;
    };

    if (!result.ok) {
      const status =
        result.code === "user_not_found"
          ? 404
          : result.code === "invalid_user"
          ? 400
          : 400;
      return NextResponse.json(
        { error: result.message ?? result.code, code: result.code },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      code: result.code,
    });
  } catch (err) {
    console.error("[blocks/post] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/blocks
 * Body: { blocked_id: string } or Query: ?blocked_id=UUID
 * Unblocks the target user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let blockedId = request.nextUrl.searchParams.get("blocked_id");
    if (!blockedId) {
      try {
        const body = await request.json();
        blockedId = body.blocked_id;
      } catch {
        // Query param fallback
      }
    }

    if (!blockedId || !UUID_RE.test(blockedId)) {
      return NextResponse.json(
        { error: "blocked_id must be a valid UUID." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("unblock_user", {
      p_blocked_id: blockedId,
    });

    if (error) {
      console.error("[blocks/delete] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code: string;
    };

    return NextResponse.json({
      success: true,
      code: result.code,
    });
  } catch (err) {
    console.error("[blocks/delete] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
