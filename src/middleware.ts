import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Public routes that do NOT require authentication.
 */
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/games",
  "/challenges",
  "/privacy",
  "/terms",
  "/about",
  "/how-to-play",
  "/auth/callback",
  "/auth/reset-password",
]);

/**
 * Paths that are always public regardless of prefix matching.
 */
const PUBLIC_PREFIXES = ["/api/public/", "/_next/", "/favicon", "/icons/", "/images/", "/invite/"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  // ── Graceful degradation when Supabase credentials are not configured ──────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !supabaseUrl ||
    supabaseUrl === "https://your-project.supabase.co" ||
    !supabaseKey ||
    supabaseKey === "your-anon-key-here"
  ) {
    // No credentials — pass through without auth checks.
    // Authenticated routes will show a setup notice instead of crashing.
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — IMPORTANT: do not remove without reading Supabase SSR docs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unconfirmed email check: user exists with an email but has not confirmed it
  const isUnconfirmed = Boolean(user && user.email && !user.email_confirmed_at);

  // Redirect unauthenticated or unconfirmed users away from protected routes
  if ((!user || isUnconfirmed) && !isPublic(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (isUnconfirmed) {
      loginUrl.searchParams.set("error", "unverified_email");
    } else {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated AND verified users away from auth pages to Game section (/games)
  // Preserves /dashboard legacy compatibility mapping
  if (user && !isUnconfirmed && (pathname === "/login" || pathname === "/signup")) {
    const gameUrl = request.nextUrl.clone();
    gameUrl.pathname = "/games";
    gameUrl.searchParams.delete("next");
    return NextResponse.redirect(gameUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT static files and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
