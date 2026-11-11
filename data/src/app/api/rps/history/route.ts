import { NextResponse } from "next/server";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

/**
 * GET /api/rps/history
 * Returns completed RPS match history for the authenticated user.
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
    const { data, error } = await (supabase as any).rpc("get_rps_history");
    if (error) {
      console.error("[rps/history] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[rps/history] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
