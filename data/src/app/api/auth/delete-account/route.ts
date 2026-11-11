import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { createServiceRoleClient } from "@/core/supabase/server";

/**
 * DELETE /api/auth/delete-account
 *
 * Permanently deletes the authenticated user's account.
 *
 * Security model:
 *  1. Verify the request carries a valid session (server-side getUser()).
 *  2. Require an explicit "confirm=DELETE" body field — prevents CSRF-style
 *     accidental deletions.
 *  3. Use the service-role client (Admin API) for the auth.users deletion —
 *     the anon key cannot delete auth users.  The service-role key NEVER
 *     leaves the server.
 *  4. Cascade deletion of the profiles row is handled by the FK:
 *     profiles.id REFERENCES auth.users(id) ON DELETE CASCADE.
 *  5. Other user data (matches, challenges, notifications) that references
 *     the user ID will be handled in future migrations with appropriate
 *     ON DELETE behavior (anonymise or cascade as appropriate).
 *
 * Data retention note:
 *  - Match records are retained for platform integrity but player_id fields
 *    will point to a deleted user (null FK after cascade).  Future migration
 *    should decide: anonymise (set to a sentinel UUID) or cascade.
 *  - This is documented in supabase/migrations/0001_profiles.sql.
 */
export async function DELETE(request: NextRequest) {
  try {
    // ── 1. Verify session ───────────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to delete your account." },
        { status: 401 },
      );
    }

    // ── 2. Require explicit body confirmation ───────────────────────────────
    let body: { confirm?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    if (body.confirm !== "DELETE") {
      return NextResponse.json(
        { error: "Confirmation required. Send { \"confirm\": \"DELETE\" }." },
        { status: 400 },
      );
    }

    // ── 3. Delete via Admin API (service role — server only) ────────────────
    const admin = createServiceRoleClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("[delete-account] Admin deleteUser error:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete account. Please try again or contact support." },
        { status: 500 },
      );
    }

    // ── 4. Sign out the session (best effort — user is already gone) ────────
    await supabase.auth.signOut().catch(() => null);

    return NextResponse.json(
      { success: true, message: "Account deleted successfully." },
      { status: 200 },
    );
  } catch (err) {
    console.error("[delete-account] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
