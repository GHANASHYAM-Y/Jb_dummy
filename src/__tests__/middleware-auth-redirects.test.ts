/**
 * EVOAIQU — Middleware Authentication & API Redirects Test Suite (SEC-03)
 *
 * Verifies:
 *  1. Unauthenticated request to protected API routes returns JSON 401 without redirecting.
 *  2. Unconfirmed email request to protected API routes returns JSON 403 without redirecting.
 *  3. Unauthenticated request to protected web pages redirects to /login?next=...
 *  4. Unconfirmed email request to protected web pages redirects to /login?error=unverified_email.
 *  5. Authenticated & confirmed users can access protected pages without redirection.
 *  6. Authenticated & confirmed users visiting /login or /signup are redirected to /games.
 *  7. Public routes (pages and API endpoints) remain accessible without authentication.
 *  8. Public cron and invite-resolver API endpoints pass through to route-level handlers.
 *  9. Supabase session refresh cookies are preserved when returning JSON 401/403 responses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedCookieConfig: any = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((url: string, key: string, options: unknown) => {
    capturedCookieConfig = options;
    return {
      auth: {
        getUser: mockGetUser,
      },
    };
  }),
}));

// Import middleware after mocks
import { middleware } from "@/middleware";

describe("Middleware Authentication & Protected API Response Handling (SEC-03)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://real-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "real-anon-jwt-token-12345",
    };
    capturedCookieConfig = null;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── 1. Protected API Routes (Unauthenticated) ──────────────────────────────
  it("returns JSON 401 for unauthenticated requests to protected API routes without redirecting", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const protectedApiPaths = [
      "/api/matchmaking/join",
      "/api/matchmaking/status",
      "/api/chess/match/11111111-1111-4111-8111-111111111111/move",
      "/api/rps/move",
      "/api/rps/timeout",
      "/api/challenges/assign",
      "/api/friends/send",
      "/api/blocks",
      "/api/auth/delete-account",
    ];

    for (const pathname of protectedApiPaths) {
      const req = new NextRequest(`http://localhost:3000${pathname}`, {
        method: "POST",
      });

      const res = await middleware(req);
      expect(res.status).toBe(401);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(res.headers.get("location")).toBeNull(); // Must NOT redirect!

      const body = await res.json();
      expect(body).toEqual({
        error: "Not authenticated.",
        code: "unauthenticated",
      });
    }
  });

  // ── 2. Protected API Routes (Unconfirmed Email) ────────────────────────────
  it("returns JSON 403 for unconfirmed email accounts on protected API routes without redirecting", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "unconfirmed-user-uuid",
          email: "unconfirmed@example.com",
          email_confirmed_at: null, // Unverified!
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/matchmaking/join", {
      method: "POST",
    });

    const res = await middleware(req);
    expect(res.status).toBe(403);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("location")).toBeNull(); // Must NOT redirect!

    const body = await res.json();
    expect(body).toEqual({
      error: "Email verification required.",
      code: "unverified_email",
    });
  });

  // ── 3. Protected Web Pages (Unauthenticated) ───────────────────────────────
  it("redirects unauthenticated requests to protected web pages to /login?next=...", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/profile", {
      method: "GET",
    });

    const res = await middleware(req);
    expect(res.status).toBe(307); // Next.js temporary redirect

    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fprofile");
  });

  // ── 4. Protected Web Pages (Unconfirmed Email) ─────────────────────────────
  it("redirects unconfirmed accounts visiting protected web pages to /login?error=unverified_email", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "unconfirmed-user-uuid",
          email: "unconfirmed@example.com",
          email_confirmed_at: null,
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/settings", {
      method: "GET",
    });

    const res = await middleware(req);
    expect(res.status).toBe(307);

    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("error=unverified_email");
  });

  // ── 5. Protected Web Pages (Authenticated & Confirmed) ─────────────────────
  it("allows authenticated and confirmed users to access protected web pages without redirection", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "confirmed-user-uuid",
          email: "confirmed@example.com",
          email_confirmed_at: "2026-01-01T00:00:00Z",
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/profile", {
      method: "GET",
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  // ── 6. Auth Page Redirection for Logged-In Users ───────────────────────────
  it("redirects authenticated and verified users away from /login to /games", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "confirmed-user-uuid",
          email: "confirmed@example.com",
          email_confirmed_at: "2026-01-01T00:00:00Z",
        },
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/login", {
      method: "GET",
    });

    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/games");
  });

  // ── 7. Public Web Pages ───────────────────────────────────────────────────
  it("skips session lookup for session-independent public pages", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const publicPages = [
      "/",
      "/about",
      "/how-to-play",
      "/privacy",
      "/terms",
      "/auth/callback",
    ];

    for (const pathname of publicPages) {
      const req = new NextRequest(`http://localhost:3000${pathname}`, {
        method: "GET",
      });

      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    }

    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("refreshes sessions on public pages whose handlers read the current user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const sessionAwarePublicPages = [
      "/games",
      "/challenges",
      "/auth/reset-password",
      "/invite/sample-invite-token-12345",
    ];

    for (const pathname of sessionAwarePublicPages) {
      const req = new NextRequest(`http://localhost:3000${pathname}`, {
        method: "GET",
      });

      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    }

    expect(mockGetUser).toHaveBeenCalledTimes(sessionAwarePublicPages.length);
  });

  // ── 8. Public / Route-Authoritative API Endpoints ─────────────────────────
  it("allows public and cron API endpoints to pass through without user authentication", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const publicApiEndpoints = [
      "/api/challenges/stories/cleanup",
      "/api/public/health",
    ];

    for (const pathname of publicApiEndpoints) {
      const req = new NextRequest(`http://localhost:3000${pathname}`, {
        method: "GET",
      });

      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    }

    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("refreshes the session before the invite resolver uses caller identity", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "confirmed-user-uuid",
          email: "confirmed@example.com",
          email_confirmed_at: "2026-01-01T00:00:00Z",
        },
      },
      error: null,
    });

    const req = new NextRequest(
      "http://localhost:3000/api/friends/invite/resolve?token=test-token-12345",
      { method: "GET" },
    );

    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  // ── 9. Cookie Preservation During Session Refresh ─────────────────────────
  it("preserves updated session cookies on JSON error responses", async () => {
    mockGetUser.mockImplementation(() => {
      // Simulate Supabase SSR updating/clearing a cookie during getUser()
      if (capturedCookieConfig?.cookies?.setAll) {
        capturedCookieConfig.cookies.setAll([
          { name: "sb-auth-token", value: "new-token-val", options: { path: "/" } },
        ]);
      }
      return Promise.resolve({ data: { user: null }, error: null });
    });

    const req = new NextRequest("http://localhost:3000/api/matchmaking/join", {
      method: "POST",
    });

    const res = await middleware(req);
    expect(res.status).toBe(401);
    expect(res.cookies.get("sb-auth-token")?.value).toBe("new-token-val");
  });
});
