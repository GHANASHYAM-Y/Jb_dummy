/**
 * EVOAIQU — Game Lobby UX & Navigation Verification Tests (Stage A)
 *
 * Verifies that:
 * 1. Game cards provide explicit, game-specific entry points:
 *    - Rock Paper Scissors routes to /play/rps
 *    - Speed Chess routes to /play/chess
 *    - Mystery Duel is marked upcoming/disabled
 * 2. Arena Modes eliminate duplicate/misleading CTAs:
 *    - RPS Instant Matchmaking clearly designates the RPS 10s blitz queue
 *    - Play With Friends provides distinct challenge actions for both RPS and Chess
 *    - Friend search routes to /friends
 * 3. Accessibility requirements are met:
 *    - Interactive buttons enforce min-h-[44px] / min-w-[44px] touch targets
 *    - Secondary text tokens use WCAG AA compliant #52605C contrast
 *    - Keyboard focus indicators (focus-visible:ring-2) are present on interactive elements
 * 4. Statistics and profile data display logic remains intact.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("EVOAIQU Game Lobby (Stage A) — UX & Navigation Standards", () => {
  const lobbyPath = path.resolve(__dirname, "../components/games/GameSectionClient.tsx");
  const lobbyCode = fs.readFileSync(lobbyPath, "utf-8");

  const mmCardPath = path.resolve(__dirname, "../components/matchmaking/RandomMatchmakingCard.tsx");
  const mmCardCode = fs.readFileSync(mmCardPath, "utf-8");

  const appNavPath = path.resolve(__dirname, "../components/navigation/AppNavigation.tsx");
  const appNavCode = fs.readFileSync(appNavPath, "utf-8");

  const globalsCssPath = path.resolve(__dirname, "../app/globals.css");
  const globalsCssCode = fs.readFileSync(globalsCssPath, "utf-8");

  const chessMatchPath = path.resolve(__dirname, "../components/chess/ChessMatchBoard.tsx");
  const chessMatchCode = fs.readFileSync(chessMatchPath, "utf-8");

  const chatStoriesPath = path.resolve(__dirname, "../components/chat/ChatStoriesClient.tsx");
  const chatStoriesCode = fs.readFileSync(chatStoriesPath, "utf-8");

  describe("1. Game Selection Cards & Specific Entry Points", () => {
    it("provides explicit Play Rock, Paper, Scissors action routing to /play/rps", () => {
      expect(lobbyCode).toContain('href="/play/rps"');
      expect(lobbyCode).toContain("Play Rock, Paper, Scissors");
    });

    it("provides explicit Play Speed Chess action routing to /play/chess", () => {
      expect(lobbyCode).toContain('href="/play/chess"');
      expect(lobbyCode).toContain("Play Speed Chess");
    });

    it("keeps Mystery Dare Duel properly disabled with Coming Soon state", () => {
      expect(lobbyCode).toContain("Mystery Dare Duel");
      expect(lobbyCode).toContain("Coming Soon");
      expect(lobbyCode).toContain("disabled");
      expect(lobbyCode).toContain("cursor-not-allowed");
    });
  });

  describe("2. Arena Modes & Distinct Friend Challenges", () => {
    it("clearly designates Instant Matchmaking for RPS queue", () => {
      expect(lobbyCode).toContain("RPS Instant Matchmaking");
      expect(lobbyCode).toContain("RandomMatchmakingCard");
    });

    it("provides separate, genuine friend challenge triggers for both RPS and Chess", () => {
      expect(lobbyCode).toContain("Challenge in RPS");
      expect(lobbyCode).toContain("Challenge in Chess");
      expect(lobbyCode).toContain("Find & Add Friends");
      expect(lobbyCode).toContain('href="/friends"');
    });

    it("preserves personal invite link with copy functionality", () => {
      expect(lobbyCode).toContain("Your Personal Invite Link");
      expect(lobbyCode).toContain("handleCopyInvite");
      expect(lobbyCode).toContain("copiedInvite");
    });
  });

  describe("3. Accessibility, Touch Targets & Contrast Standards", () => {
    it("enforces 44px minimum touch targets on critical icon buttons", () => {
      // Copy Evoora ID button
      expect(lobbyCode).toContain("min-w-[44px] min-h-[44px]");
      expect(lobbyCode).toContain("handleCopyId");

      // Personal invite copy button
      expect(lobbyCode).toContain("min-h-[44px] min-w-[44px]");

      // Matchmaking cancel button
      expect(mmCardCode).toContain("min-h-[44px] min-w-[44px]");
      expect(mmCardCode).toContain('id="cancel-matchmaking-btn"');
    });

    it("applies WCAG AA compliant text color (#52605C) across secondary copy", () => {
      expect(lobbyCode).toContain("text-[#52605C]");
      expect(mmCardCode).toContain("text-[#52605C]");
    });

    it("implements visible keyboard focus states on interactive buttons and cards", () => {
      expect(lobbyCode).toContain("focus-visible:ring-2");
      expect(lobbyCode).toContain("focus-visible:ring-[#167D78]");
      expect(lobbyCode).toContain("focus-within:ring-2");
      expect(mmCardCode).toContain("focus-visible:ring-2");
    });
  });

  describe("4. Preserved Logic & State Integrity", () => {
    it("preserves performance statistics calculation (Matches, Wins, Win Rate)", () => {
      expect(lobbyCode).toContain("totalMatches");
      expect(lobbyCode).toContain("wins");
      expect(lobbyCode).toContain("winRate");
      expect(lobbyCode).toContain("Matches");
      expect(lobbyCode).toContain("Win Rate");
    });

    it("preserves pending alerts for dares and friend requests", () => {
      expect(lobbyCode).toContain("pendingChallengesCount");
      expect(lobbyCode).toContain("pendingRequestsCount");
      expect(lobbyCode).toContain('href="/chat?tab=stories"');
    });

    it("preserves recent match history render and empty state", () => {
      expect(lobbyCode).toContain("Recent Matches");
      expect(lobbyCode).toContain("No Matches Played Yet");
      expect(lobbyCode).toContain("Start Your First Duel");
    });
  });

  describe("5. Stage B Mobile Viewport Optimization & Layout Hierarchy", () => {
    it("applies compact responsive vertical spacing to prevent mobile scroll fatigue", () => {
      // Outer layout padding
      expect(lobbyCode).toContain("py-4 sm:py-8 lg:py-10");
      // Inter-section vertical spacing
      expect(lobbyCode).toContain("space-y-6 sm:space-y-8 lg:space-y-10");
      // Hero card padding
      expect(lobbyCode).toContain("p-4 sm:p-7 lg:p-8");
      // Arena modes cards padding
      expect(lobbyCode).toContain("p-4 sm:p-7 lg:p-8");
      // Matchmaking card padding
      expect(mmCardCode).toContain("p-4 sm:p-6");
    });

    it("implements collapsible platform rules on mobile while preserving full desktop 3-column view", () => {
      // Mobile accordion trigger
      expect(lobbyCode).toContain("md:hidden");
      expect(lobbyCode).toContain("setRulesExpanded");
      expect(lobbyCode).toContain("aria-expanded={rulesExpanded}");
      expect(lobbyCode).toContain('aria-controls="arena-rules-content"');
      expect(lobbyCode).toContain("Platform Rules & Guarantees");

      // Animated chevron toggle
      expect(lobbyCode).toContain("ChevronDown");
      expect(lobbyCode).toContain("rulesExpanded && \"rotate-180\"");

      // Content disclosure: hidden md:block when collapsed, block when expanded
      expect(lobbyCode).toContain('id="arena-rules-content"');
      expect(lobbyCode).toContain('rulesExpanded ? "block border-t border-[#E2E8E2] md:border-t-0" : "hidden md:block"');

      // Desktop 3-column grid preservation
      expect(lobbyCode).toContain("grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6");
    });

    it("prevents horizontal overflow at 375px and 390px viewports", () => {
      // Stat box responsive layout and padding to fit 375px screens
      expect(lobbyCode).toContain("gap-2 sm:gap-6");
      expect(lobbyCode).toContain("px-3 sm:px-5 py-2.5 sm:py-3");

      // Full-width invite copy button on mobile
      expect(lobbyCode).toContain("w-full sm:w-auto shrink-0 min-h-[44px]");

      // Game cards grid responsive columns
      expect(lobbyCode).toContain("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3");

      // Arena modes responsive grid
      expect(lobbyCode).toContain("grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-7");
    });

    it("maintains the Coastal Modern Light design system tokens", () => {
      // Teal primary brand token
      expect(lobbyCode).toContain("#167D78");
      // Teal light background token
      expect(lobbyCode).toContain("#DDF2EB");
      // Coral secondary/accent token
      expect(lobbyCode).toContain("#D95F49");
      // Coral soft background
      expect(lobbyCode).toContain("#FCE6DE");
      // Charcoal dark text token
      expect(lobbyCode).toContain("#203331");
      // Ivory background token
      expect(lobbyCode).toContain("#F7F8F4");
    });
  });

  describe("6. Mobile Safe-Area Insets & Responsive Overflow Guards", () => {
    it("defines .safe-bottom utility in globals.css using env(safe-area-inset-bottom, 0px)", () => {
      expect(globalsCssCode).toContain(".safe-bottom");
      expect(globalsCssCode).toContain("padding-bottom: env(safe-area-inset-bottom, 0px);");
    });

    it("applies safe-bottom and dynamic safe-area calculation to AppNavigation main content", () => {
      expect(appNavCode).toContain("safe-bottom");
      expect(appNavCode).toContain("pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8");
    });

    it("enforces min-w-0 and truncate on chess player cards to prevent horizontal overflow on narrow viewports", () => {
      expect(chessMatchCode).toContain("min-w-0");
      expect(chessMatchCode).toContain("truncate");
      expect(chessMatchCode).toContain("shrink-0");
    });

    it("includes duration indicator badge in the story viewer modal when available", () => {
      expect(chatStoriesCode).toContain("activeStoryViewer.duration_seconds > 0");
      expect(chatStoriesCode).toContain("activeStoryViewer.duration_seconds}s");
    });
  });
});

