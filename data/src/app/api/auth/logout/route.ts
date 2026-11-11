import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";

/**
 * POST /api/auth/logout
 *
 * Signs out the current user server-side, clearing the session cookie.
 * The client should call this endpoint rather than supabase.auth.signOut()
 * directly so that the server-side session is properly invalidated before
 * redirecting.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify the caller is authenticated before attempting sign out
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Redirect to home page after logout
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"), {
      status: 302,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
