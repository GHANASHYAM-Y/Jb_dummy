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
  "/api/challenges/stories/cleanup",
  "/api/friends/invite/resolve",
  // Hand cricket lobby and solo play work without an account
  "/play/hand-cricket",
  "/play/hand-cricket/solo",
  // Ludo lobby and bot games work without an account
  "/play/ludo",
  "/play/ludo/bots",
]);

/**
 * Paths that are always public regardless of prefix matching.
 */
const PUBLIC_PREFIXES = ["/api/public/", "/_next/", "/favicon", "/icons/", "/images/", "/invite/"];
const SESSION_INDEPENDENT_ROUTES = new Set([
  "/",
  "/about",
  "/how-to-play",
  "/privacy",
  "/terms",
  "/auth/callback",
  "/api/challenges/stories/cleanup",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Keep the middleware session refresh on routes whose handlers read the
  // current user; skip it only where the response is session-independent.
  if (
    SESSION_INDEPENDENT_ROUTES.has(pathname) ||
    pathname.startsWith("/api/public/")
  ) {
    return NextResponse.next({ request });
  }

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

  // Unconfirmed email check: user exists with an email but has not confirmed it
  const isUnconfirmed = Boolean(user && user.email && !user.email_confirmed_at);

  // Handle unauthenticated or unconfirmed users attempting to access protected routes
  if ((!user || isUnconfirmed) && !isPublic(pathname)) {
    // Protected API routes return JSON error responses rather than HTML redirects
    if (pathname.startsWith("/api/")) {
      const jsonResponse = NextResponse.json(
        isUnconfirmed
          ? { error: "Email verification required.", code: "unverified_email" }
          : { error: "Not authenticated.", code: "unauthenticated" },
        { status: isUnconfirmed ? 403 : 401 }
      );

      // Preserve any cookies set/refreshed during session validation
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        jsonResponse.cookies.set(cookie.name, cookie.value, cookie);
      });

      return jsonResponse;
    }

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
