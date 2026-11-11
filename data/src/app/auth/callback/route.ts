import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { safeRedirectPath } from "@/shared/lib/utils";

/**
 * /auth/callback — Supabase Auth email verification callback.
 *
 * After a user clicks the confirmation email link, Supabase redirects here
 * with a code that we exchange for a session.
 *
 * Security: the `next` param is validated to be a relative path within this
 * origin to prevent open-redirect attacks.
 */

/**
 * Validate that `next` is a safe same-origin relative path.
 * Rejects:
 *  - External URLs (https://evil.com)
 *  - Protocol-relative URLs (//evil.com)
 *  - Anything that doesn't start with a single /
 *  - The bare / (keep — safe)
 *
 * Returns the validated path or falls back to /dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = safeRedirectPath(searchParams.get("next"));
  const next = rawNext === "/dashboard" ? "/games" : rawNext;

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the intended same-origin destination after confirmation
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to login with an error hint
  return NextResponse.redirect(
    `${origin}/login?error=verification_failed`,
  );
}
