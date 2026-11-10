import { NextResponse, connection } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET / POST /api/games/timeout/cleanup
 *
 * Authoritative background timeout & lifecycle cleanup:
 *  - 10-minute matchmaking waiting timeout (single player -> abort)
 *  - 10-minute ready game start timeout (both joined, didn't start -> abort)
 *  - 10-minute game inactivity timeout (no valid action -> abort)
 *  - 60-second disconnect timeout (opponent disconnect -> win; dual disconnect -> abort)
 *  - 10-minute stale matchmaking queue cleanup
 *
 * Triggered via Vercel Cron or maintenance worker.
 * Security: Requires Bearer Authorization with CRON_SECRET. Fails closed if unset.
 */
export async function POST(request: Request) {
  await connection();
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || cronSecret.trim() === "") {
      console.error("[games/timeout/cleanup] Server misconfiguration: CRON_SECRET is not configured.");
      return NextResponse.json(
        { error: "Server misconfiguration.", code: "server_misconfiguration" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized.", code: "unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("cleanup_game_timeouts");

    if (error) {
      console.error("[games/timeout/cleanup] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        summary: data,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[games/timeout/cleanup] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export const GET = POST;

