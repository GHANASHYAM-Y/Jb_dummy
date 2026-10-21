/**
 * EVOAIQU — Project-Wide Architecture Standard Verification Tests
 *
 * Verifies that:
 * 1. Exactly 4 primary navigation destinations exist across the authenticated app:
 *    - Game (/games)
 *    - Chat & Stories (/chat)
 *    - Profile (/profile)
 *    - Search / Find Friends (/friends)
 * 2. Shared AppNavigation is rendered by the authenticated application layout.
 * 3. Mobile bottom navigation auto-hides during full-screen games (/play/rps/[matchId])
 *    with clear exit/back navigation to the Game arena.
 * 4. Authenticated users are redirected to the Game page (/games).
 * 5. Search API (/api/friends/search) enforces privacy controls and blocks.
 * 6. Coastal Modern color tokens and styling are consistently applied.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("EVOAIQU Architecture Standard — Navigation & Layout", () => {
  const navPath = path.resolve(__dirname, "../components/navigation/AppNavigation.tsx");
  const navCode = fs.readFileSync(navPath, "utf-8");

  const layoutPath = path.resolve(__dirname, "../app/(protected)/layout.tsx");
  const layoutCode = fs.readFileSync(layoutPath, "utf-8");

  it("defines exactly four primary navigation destinations in AppNavigation", () => {
    // Expected four destinations: /games, /chat, /profile, /friends
    expect(navCode).toContain('href: "/games"');
    expect(navCode).toContain('href: "/chat"');
    expect(navCode).toContain('href: "/profile"');
    expect(navCode).toContain('href: "/friends"');

    // Labels for the destinations
    expect(navCode).toContain('"Game"');
    expect(navCode).toContain('"Chat & Stories"');
    expect(navCode).toContain('"Profile"');
    expect(navCode).toContain('"Find Friends"');
  });

  it("implements responsive desktop navigation and mobile bottom navigation in a single shared component", () => {
    // Desktop top navigation
    expect(navCode).toContain("hidden md:flex");
    // Mobile bottom navigation bar
    expect(navCode).toContain("md:hidden fixed bottom-0");
    expect(navCode).toContain("<nav");
    expect(navCode).toContain('aria-label="Mobile Navigation"');
  });

  it("temporarily hides mobile bottom navigation on full-screen game boards with clear back navigation", () => {
    // Evaluates full-screen match route
    expect(navCode).toContain('pathname.startsWith("/play/rps/") && pathname !== "/play/rps"');
    expect(navCode).toContain("isFullScreenGame");

    const rpsBoardPath = path.resolve(__dirname, "../components/rps/RpsMatchBoard.tsx");
    const rpsBoardCode = fs.readFileSync(rpsBoardPath, "utf-8");
    expect(rpsBoardCode).toContain('id="exit-match-btn"');
    expect(rpsBoardCode).toContain('href="/play/rps"');
  });

  it("uses the single shared AppNavigation inside (protected)/layout.tsx", () => {
    expect(layoutCode).toContain("<AppNavigation");
    expect(layoutCode).toContain("</AppNavigation>");
  });
});

describe("EVOAIQU Architecture Standard — Route Protection & Auth Redirects", () => {
  const middlewarePath = path.resolve(__dirname, "../middleware.ts");
  const middlewareCode = fs.readFileSync(middlewarePath, "utf-8");

  const loginPath = path.resolve(__dirname, "../components/auth/LoginForm.tsx");
  const loginCode = fs.readFileSync(loginPath, "utf-8");

  const signupPath = path.resolve(__dirname, "../components/auth/SignupForm.tsx");
  const signupCode = fs.readFileSync(signupPath, "utf-8");

  const dashboardPath = path.resolve(__dirname, "../app/(protected)/dashboard/page.tsx");
  const dashboardCode = fs.readFileSync(dashboardPath, "utf-8");

  it("redirects authenticated users to the Game page (/games) in middleware", () => {
    expect(middlewareCode).toContain('gameUrl.pathname = "/games"');
  });

  it("defaults login and signup redirects to the Game page (/games)", () => {
    expect(loginCode).toContain('safeRedirectPath(searchParams.get("next"), "/games")');
    expect(signupCode).toContain('safeRedirectPath(searchParams.get("next"), "/games")');
  });

  it("redirects legacy dashboard route directly to /games", () => {
    expect(dashboardCode).toContain('redirect("/games")');
  });
});

describe("EVOAIQU Architecture Standard — Four Primary Sections & Features", () => {
  it("provides Game Arena section at /games", () => {
    const gamesPagePath = path.resolve(__dirname, "../app/games/page.tsx");
    expect(fs.existsSync(gamesPagePath)).toBe(true);
    const gamesCode = fs.readFileSync(gamesPagePath, "utf-8");
    expect(gamesCode).toContain("GameSectionClient");
  });

  it("provides Chat & Stories section at /chat with 24-hour stories reel and challenge integration", () => {
    const chatPagePath = path.resolve(__dirname, "../app/(protected)/chat/page.tsx");
    expect(fs.existsSync(chatPagePath)).toBe(true);
    const chatCode = fs.readFileSync(chatPagePath, "utf-8");
    expect(chatCode).toContain("ChatStoriesClient");

    const chatClientPath = path.resolve(__dirname, "../components/chat/ChatStoriesClient.tsx");
    const chatClientCode = fs.readFileSync(chatClientPath, "utf-8");
    expect(chatClientCode).toContain("VideoRecorderModal");
    expect(chatClientCode).toContain("WinnerReviewModal");
    expect(chatClientCode).toContain("/api/rps/invite");
  });

  it("provides Profile section at /profile with EVOAIQU ID, stats, and settings", () => {
    const profilePagePath = path.resolve(__dirname, "../app/(protected)/profile/page.tsx");
    expect(fs.existsSync(profilePagePath)).toBe(true);
    const profileCode = fs.readFileSync(profilePagePath, "utf-8");
    expect(profileCode).toContain("ProfileViewClient");

    const profileClientPath = path.resolve(__dirname, "../components/profile/ProfileViewClient.tsx");
    const profileClientCode = fs.readFileSync(profileClientPath, "utf-8");
    expect(profileClientCode).toContain("evoora_id");
    expect(profileClientCode).toContain("totalMatches");
    expect(profileClientCode).toContain("ProfileEditForm");
  });

  it("provides Search / Find Friends section at /friends with ID search and privacy checks", () => {
    const friendsPagePath = path.resolve(__dirname, "../app/(protected)/friends/page.tsx");
    expect(fs.existsSync(friendsPagePath)).toBe(true);

    const friendsSearchApiPath = path.resolve(__dirname, "../app/api/friends/search/route.ts");
    expect(fs.existsSync(friendsSearchApiPath)).toBe(true);
    const searchApiCode = fs.readFileSync(friendsSearchApiPath, "utf-8");
    // Verify privacy and block checking
    expect(searchApiCode).toContain("is_public");
    expect(searchApiCode).toContain("user_blocks");
    expect(searchApiCode).toContain("friendship_status");
  });
});

describe("EVOAIQU Architecture Standard — Public Website & Unauthenticated Access", () => {
  const middlewarePath = path.resolve(__dirname, "../middleware.ts");
  const middlewareCode = fs.readFileSync(middlewarePath, "utf-8");

  const navPath = path.resolve(__dirname, "../components/navigation/AppNavigation.tsx");
  const navCode = fs.readFileSync(navPath, "utf-8");

  it("provides public /about page explaining social gaming and dare stories", () => {
    const aboutPagePath = path.resolve(__dirname, "../app/about/page.tsx");
    expect(fs.existsSync(aboutPagePath)).toBe(true);
    const aboutCode = fs.readFileSync(aboutPagePath, "utf-8");
    expect(aboutCode).toContain("About EVOAIQU");
    expect(aboutCode).toContain("Skill Gaming");
    expect(aboutCode).toContain("Creative Video Dares");
  });

  it("provides public /how-to-play page detailing match rules, dares, and stories", () => {
    const howToPlayPath = path.resolve(__dirname, "../app/how-to-play/page.tsx");
    expect(fs.existsSync(howToPlayPath)).toBe(true);
    const htpCode = fs.readFileSync(howToPlayPath, "utf-8");
    expect(htpCode).toContain("How to Play");
    expect(htpCode).toContain("Rock Paper Scissors");
    expect(htpCode).toContain("Dare Categories");
  });

  it("registers /about and /how-to-play in middleware PUBLIC_ROUTES", () => {
    expect(middlewareCode).toContain('"/about"');
    expect(middlewareCode).toContain('"/how-to-play"');
  });

  it("does not render the authenticated mobile bottom navigation for unauthenticated visitors", () => {
    expect(navCode).toContain("!isFullScreenGame && Boolean(user)");
  });
});

describe("EVOAIQU Architecture Standard — Coastal Modern Design System", () => {
  const navPath = path.resolve(__dirname, "../components/navigation/AppNavigation.tsx");
  const navCode = fs.readFileSync(navPath, "utf-8");

  it("utilizes EVOAIQU Coastal Modern palette tokens", () => {
    // Ivory (#F7F8F4), Teal (#167D78), Pale Teal (#DDF2EB), Evergreen (#203331)
    expect(navCode).toContain("#F7F8F4");
    expect(navCode).toContain("#167D78");
    expect(navCode).toContain("#DDF2EB");
    expect(navCode).toContain("#203331");
  });
});
