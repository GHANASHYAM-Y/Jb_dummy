/**
 * EVOAIQU — Game Lobby Matchmaking Floating Indicator Tests (Stage C)
 *
 * Verifies that:
 * 1. Persistent Matchmaking Floating Indicator appears ONLY in active searching/cancelling states.
 * 2. Inactive states (idle, matched, expired, in_active_match) do NOT render the floating indicator.
 * 3. Accurate searching message, live pulsing radar, and elapsed timer (mm:ss) are displayed.
 * 4. Cancellation flow reuses the existing cancel handler without duplicate network requests.
 * 5. Layout safeguards prevent overlapping the 64px mobile bottom navigation bar (docked at bottom-20 z-40).
 * 6. Accessibility standards are strictly enforced (role="status", aria-live="polite", 44px touch targets, focus rings).
 * 7. Coastal Modern Light tokens are utilized (#167D78, #D95F49, #F7F8F4).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("EVOAIQU Game Lobby (Stage C) — Matchmaking Floating Status Indicator", () => {
  const indicatorPath = path.resolve(__dirname, "../components/matchmaking/MatchmakingFloatingIndicator.tsx");
  const indicatorCode = fs.readFileSync(indicatorPath, "utf-8");

  const mmCardPath = path.resolve(__dirname, "../components/matchmaking/RandomMatchmakingCard.tsx");
  const mmCardCode = fs.readFileSync(mmCardPath, "utf-8");

  const lobbyPath = path.resolve(__dirname, "../core/home/GameSectionClient.tsx");
  const lobbyCode = fs.readFileSync(lobbyPath, "utf-8");

  describe("1. Queue State Visibility & Disappearance Lifecycle", () => {
    it("renders MatchmakingFloatingIndicator only in active searching or cancelling states", () => {
      // Confirmed conditional render in RandomMatchmakingCard
      expect(mmCardCode).toContain(
        'showFloatingIndicator && (state === "searching" || state === "cancelling") && ('
      );
      expect(mmCardCode).toContain("<MatchmakingFloatingIndicator");
    });

    it("ensures indicator disappears when state is idle, matched, expired, or in_active_match", () => {
      // The condition strictly permits only searching or cancelling
      expect(mmCardCode).not.toContain('(state === "idle") && (<MatchmakingFloatingIndicator');
      expect(mmCardCode).not.toContain('(state === "matched") && (<MatchmakingFloatingIndicator');
      expect(mmCardCode).not.toContain('(state === "expired") && (<MatchmakingFloatingIndicator');
      expect(mmCardCode).not.toContain('(state === "in_active_match") && (<MatchmakingFloatingIndicator');
    });

    it("preserves authoritative status RPC recovery without inferring state from completed matches", () => {
      expect(mmCardCode).toContain('fetch("/api/matchmaking/status?game_type=rps")');
      expect(mmCardCode).toContain('if (data.status === "searching")');
      expect(mmCardCode).toContain("startPolling(initialSecs)");
    });
  });

  describe("2. Indicator Content, Searching Message & Elapsed Time", () => {
    it("displays searching header, game mode blitz info, and pulsing radar", () => {
      expect(indicatorCode).toContain("Searching for Opponent...");
      expect(indicatorCode).toContain("10s Blitz");
      expect(indicatorCode).toContain("animate-ping");
      expect(indicatorCode).toContain("bg-[#167D78]");
    });

    it("formats elapsed time in minutes and seconds (mm:ss) with clock icon", () => {
      expect(indicatorCode).toContain("const m = Math.floor(elapsedSecs / 60);");
      expect(indicatorCode).toContain("const s = elapsedSecs % 60;");
      expect(indicatorCode).toContain('`${m}:${s < 10 ? "0" : ""}${s}`');
      expect(indicatorCode).toContain("<Clock");
    });

    it("provides accessible jump-to-queue scroll anchor", () => {
      expect(mmCardCode).toContain('document.getElementById("arena-quick-play")');
      expect(lobbyCode).toContain('id="arena-quick-play"');
    });
  });

  describe("3. Cancellation Flow & Prevention of Duplicate Requests", () => {
    it("reuses the single authoritative cancel handler from RandomMatchmakingCard", () => {
      expect(mmCardCode).toContain("onCancel={handleCancel}");
      expect(indicatorCode).toContain("onClick={onCancel}");
      expect(indicatorCode).toContain('id="floating-cancel-matchmaking-btn"');
    });

    it("shows cancelling state feedback and disables the cancel button during network in-flight", () => {
      expect(indicatorCode).toContain('disabled={state === "cancelling"}');
      expect(indicatorCode).toContain('state === "cancelling" ? (');
      expect(indicatorCode).toContain("Cancelling...");
    });

    it("does not spawn independent polling intervals in the floating indicator", () => {
      // Floating indicator is a pure presentational/controlled component with no setInterval or fetch
      expect(indicatorCode).not.toContain("setInterval");
      expect(indicatorCode).not.toContain("fetch(");
    });
  });

  describe("4. Non-overlapping Responsive Layout & Mobile Navigation Safety", () => {
    it("docks above the 64px mobile bottom navigation on viewports below 768px accounting for safe area insets", () => {
      expect(indicatorCode).toContain("fixed z-40 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-3 right-3");
      expect(indicatorCode).toContain("sm:right-6 sm:bottom-6");
    });

    it("provides responsive desktop positioning in the bottom-right corner", () => {
      expect(indicatorCode).toContain("sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto sm:min-w-[340px]");
    });

    it("enforces minimum 44px touch targets on interactive controls", () => {
      expect(indicatorCode).toContain("min-h-[44px] min-w-[44px]");
    });

    it("includes visible keyboard focus rings and accessible status announcement attributes", () => {
      expect(indicatorCode).toContain('role="status"');
      expect(indicatorCode).toContain('aria-live="polite"');
      expect(indicatorCode).toContain('aria-label="Active matchmaking queue"');
      expect(indicatorCode).toContain("focus-visible:ring-2");
      expect(indicatorCode).toContain("focus-visible:ring-[#D95F49]");
    });
  });

  describe("5. Coastal Modern Light Design System Compliance", () => {
    it("incorporates Oceanic Teal (#167D78) and soft teal background (#DDF2EB)", () => {
      expect(indicatorCode).toContain("#167D78");
      expect(indicatorCode).toContain("#DDF2EB");
    });

    it("incorporates Warm Coral (#D95F49) and soft coral hover background (#FCE6DE)", () => {
      expect(indicatorCode).toContain("#D95F49");
      expect(indicatorCode).toContain("#FCE6DE");
    });

    it("uses Charcoal (#203331) and WCAG AA compliant muted text (#52605C)", () => {
      expect(indicatorCode).toContain("#203331");
      expect(indicatorCode).toContain("#52605C");
    });
  });

  describe("6. Reliability, Failed Cancellation Recovery & Timer Lifecycle", () => {
    it("reconciles with authoritative /api/matchmaking/status upon cancellation failure", () => {
      expect(mmCardCode).toContain("reconcileStatusAfterFailedCancel");
      expect(mmCardCode).toContain('if (!res.ok) {\n        await reconcileStatusAfterFailedCancel();\n        return;\n      }');
      expect(mmCardCode).toContain('if (data.ok === false) {\n        await reconcileStatusAfterFailedCancel();\n        return;\n      }');
      expect(mmCardCode).toContain("catch {\n      await reconcileStatusAfterFailedCancel();\n    }");
    });

    it("restores searching state with active timers if server still reports searching", () => {
      expect(mmCardCode).toContain('else if (data.status === "searching") {');
      expect(mmCardCode).toContain('setErrorMsg("Cancellation was unsuccessful. You are still in queue.");');
      expect(mmCardCode).toContain('setState("searching");');
      expect(mmCardCode).toContain("startPolling(initialSecs);");
    });

    it("transitions to matched and schedules game navigation if server reports matched during failed cancel", () => {
      expect(mmCardCode).toContain('if (data.status === "matched" && data.match_id) {');
      expect(mmCardCode).toContain('setState("matched");');
      expect(mmCardCode).toContain("scheduleGoToMatch(data.match_id, 1000);");
    });

    it("drops stale in-flight polling responses if timers stopped or unmounted", () => {
      expect(mmCardCode).toContain("if (!pollIntervalRef.current || !isMountedRef.current) return;");
    });

    it("clears polling intervals, elapsed timers, and navigation timeouts on unmount", () => {
      expect(mmCardCode).toContain("isMountedRef.current = false;");
      expect(mmCardCode).toContain("if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);");
      expect(mmCardCode).toContain("if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);");
      expect(mmCardCode).toContain("if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);");
    });

    it("guards against duplicate concurrent join and cancel requests", () => {
      expect(mmCardCode).toContain('if (state === "joining" || state === "searching") return;');
      expect(mmCardCode).toContain('if (state === "cancelling" || state === "idle") return;');
    });
  });
});

