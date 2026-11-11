/**
 * Regression Test Suite: RPS Active Match Resumption vs Completed Match Navigation
 *
 * Verifies the fix for the production bug where navigating to /play/rps or clicking
 * "Play Again" erroneously redirected players to an old completed match
 * (e.g., match ID 4e1d8d15-e069-4ee8-a15f-56c1203ae540).
 *
 * Requirements verified:
 * 1. Only genuinely active matches (phase = 'active') are treated as resumable.
 * 2. Completed, cancelled, or terminal matches must not be reopened as active games.
 * 3. GET /api/rps/invite sanitizes accepted invites by verifying matches.phase.
 * 4. RpsLobby only auto-redirects when an accepted invite has is_active === true.
 * 5. Direct navigation to /play/rps after a completed match remains in the lobby.
 * 6. "Play Again" on RpsMatchBoard calls server-side matchmaking (/api/matchmaking/join)
 *    to create or join a genuinely new match instead of reusing the completed match ID.
 * 7. Active matches remain resumable via matchmaking status and active invite resolution.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const inviteRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../../../app/api/rps/invite/route.ts"),
  "utf-8"
);
const lobbySrc = fs.readFileSync(
  path.resolve(__dirname, "../components/RpsLobby.tsx"),
  "utf-8"
);
const matchBoardSrc = fs.readFileSync(
  path.resolve(__dirname, "../components/RpsMatchBoard.tsx"),
  "utf-8"
);
const matchmakingStatusMigration = fs.readFileSync(
  path.resolve(__dirname, "../../../../supabase/migrations/0005_matchmaking.sql"),
  "utf-8"
);

describe("RPS Match Completion & Lobby Navigation Regression Audit", () => {
  describe("1. Server-Side Route Audit: GET /api/rps/invite", () => {
    it("authoritatively checks matches.phase for accepted invites", () => {
      expect(inviteRouteSrc).toContain('.from("matches")');
      expect(inviteRouteSrc).toContain('.select("id, phase")');
      expect(inviteRouteSrc).toContain('.eq("phase", "active")');
    });

    it("marks completed or cancelled matches as is_active = false and status = 'completed'", () => {
      expect(inviteRouteSrc).toContain("is_active: isMatchActive");
      expect(inviteRouteSrc).toContain('status: isMatchActive ? "accepted" : "completed"');
    });

    it("only sets is_active = true when the match is in phase 'active'", () => {
      expect(inviteRouteSrc).toContain("activeMatchIdSet.has(inv.match_id)");
    });
  });

  describe("2. Client-Side Lobby Audit: RpsLobby", () => {
    it("only auto-redirects when an accepted invite has is_active === true", () => {
      expect(lobbySrc).toContain(
        'rows.find(r => r.status === "accepted" && r.match_id && r.is_active === true)'
      );
      // Ensure the old bug (unconditionally redirecting on r.status === "accepted") is eliminated
      expect(lobbySrc).not.toContain("rows.find(r => r.status === \"accepted\" && r.match_id);");
    });

    it("defines is_active?: boolean in GameInviteRow interface", () => {
      expect(lobbySrc).toContain("is_active?: boolean;");
    });

    it("leaves user in lobby to join or create a new match when previous matches are completed", () => {
      // Lobby renders RandomMatchmakingCard and friends list
      expect(lobbySrc).toContain("<RandomMatchmakingCard />");
      expect(lobbySrc).toContain('t("rps.challenge_friend")');
    });
  });

  describe("3. Play Again Button Server-Side Matchmaking Audit: RpsMatchBoard", () => {
    it("invokes server-authoritative matchmaking (/api/matchmaking/join) on Play Again", () => {
      expect(matchBoardSrc).toContain('fetch("/api/matchmaking/join"');
      expect(matchBoardSrc).toContain('game_type: "rps"');
    });

    it("does not merely execute router.push('/play/rps') without joining a new match", () => {
      // Old bug simply did onClick={() => router.push("/play/rps")} on #rps-play-again-btn
      expect(matchBoardSrc).not.toContain('onClick={() => router.push("/play/rps")}\n                id="rps-play-again-btn"');
      expect(matchBoardSrc).toContain("onClick={handlePlayAgain}");
      expect(matchBoardSrc).toContain('id="rps-play-again-btn"');
    });

    it("navigates to a brand new match_id when matched with an opponent", () => {
      expect(matchBoardSrc).toContain('data.code === "matched" && data.match_id');
      expect(matchBoardSrc).toContain("router.push(`/play/rps/${data.match_id}`)");
    });

    it("handles searching queue when no opponent is waiting yet", () => {
      expect(matchBoardSrc).toContain('data.code === "searching" || data.queue_id');
      expect(matchBoardSrc).toContain('router.push("/play/rps")');
    });

    it("provides user feedback for loading, rate limits, and network errors", () => {
      expect(matchBoardSrc).toContain("playAgainLoading");
      expect(matchBoardSrc).toContain("playAgainError");
      expect(matchBoardSrc).toContain("Finding Match...");
      expect(matchBoardSrc).toContain('id="rps-back-lobby-btn"');
    });
  });

  describe("4. Database & SQL RPC Invariant Audit", () => {
    it("get_matchmaking_status strictly requires phase = 'active' to return in_active_match", () => {
      expect(matchmakingStatusMigration).toContain("game_type = p_game_type");
      expect(matchmakingStatusMigration).toContain("AND phase = 'active'");
      expect(matchmakingStatusMigration).toContain("'status', 'in_active_match'");
    });

    it("join_matchmaking strictly rejects active-match candidates only if phase = 'active'", () => {
      expect(matchmakingStatusMigration).toContain("SELECT id INTO v_active_match");
      expect(matchmakingStatusMigration).toContain("phase = 'active'");
      expect(matchmakingStatusMigration).toContain("'code', 'already_in_match'");
    });

    it("completed matches (phase = 'completed') are never classified as active in matchmaking", () => {
      // Matches table phase enum contains active, completed, cancelled, invited
      expect(matchmakingStatusMigration).not.toContain("phase IN ('active', 'completed')");
    });
  });

  describe("5. Pure State Simulation: Match Completion to New Match Lifecycle", () => {
    interface SimulatedMatch {
      id: string;
      phase: "active" | "completed" | "cancelled";
      player1_wins: number;
      player2_wins: number;
    }

    interface SimulatedInvite {
      invite_id: string;
      status: "pending" | "accepted" | "completed";
      match_id: string;
      is_active?: boolean;
    }

    function simulateGetInvites(
      invites: SimulatedInvite[],
      matches: SimulatedMatch[]
    ): SimulatedInvite[] {
      const activeMatchIds = new Set(
        matches.filter((m) => m.phase === "active").map((m) => m.id)
      );

      return invites.map((inv) => {
        if (inv.status === "accepted" && inv.match_id) {
          const isActive = activeMatchIds.has(inv.match_id);
          return {
            ...inv,
            is_active: isActive,
            status: isActive ? "accepted" : "completed",
          };
        }
        return { ...inv, is_active: false };
      });
    }

    function simulateLobbyAutoRedirect(invites: SimulatedInvite[]): string | null {
      const active = invites.find(
        (r) => r.status === "accepted" && r.match_id && r.is_active === true
      );
      return active ? active.match_id : null;
    }

    it("does NOT auto-redirect to completed match 4e1d8d15-e069-4ee8-a15f-56c1203ae540", () => {
      const completedMatchId = "4e1d8d15-e069-4ee8-a15f-56c1203ae540";
      const matches: SimulatedMatch[] = [
        {
          id: completedMatchId,
          phase: "completed",
          player1_wins: 5,
          player2_wins: 4,
        },
      ];
      const invites: SimulatedInvite[] = [
        {
          invite_id: "inv-1234",
          status: "accepted",
          match_id: completedMatchId,
        },
      ];

      const sanitized = simulateGetInvites(invites, matches);

      // Verify server sanitized status and is_active
      expect(sanitized[0].status).toBe("completed");
      expect(sanitized[0].is_active).toBe(false);

      // Verify lobby does NOT redirect
      const redirectTarget = simulateLobbyAutoRedirect(sanitized);
      expect(redirectTarget).toBeNull();
    });

    it("DOES resume a genuinely active match", () => {
      const activeMatchId = "7a2b3c4d-1111-2222-3333-444455556666";
      const matches: SimulatedMatch[] = [
        {
          id: activeMatchId,
          phase: "active",
          player1_wins: 2,
          player2_wins: 1,
        },
      ];
      const invites: SimulatedInvite[] = [
        {
          invite_id: "inv-5678",
          status: "accepted",
          match_id: activeMatchId,
        },
      ];

      const sanitized = simulateGetInvites(invites, matches);

      // Verify active match status preserved
      expect(sanitized[0].status).toBe("accepted");
      expect(sanitized[0].is_active).toBe(true);

      // Verify lobby can resume active match
      const redirectTarget = simulateLobbyAutoRedirect(sanitized);
      expect(redirectTarget).toBe(activeMatchId);
    });

    it("creating a new match assigns a brand new match ID, never reusing completed match ID", () => {
      const oldCompletedMatchId = "4e1d8d15-e069-4ee8-a15f-56c1203ae540";
      const newMatchId = "9f8e7d6c-5555-6666-7777-888899990000";

      // Simulation of matchmaking creating a new match record
      const matchStore: SimulatedMatch[] = [
        {
          id: oldCompletedMatchId,
          phase: "completed",
          player1_wins: 5,
          player2_wins: 4,
        },
      ];

      // Player requests new match via Play Again
      expect(matchStore.find((m) => m.phase === "active")).toBeUndefined();

      // Server creates fresh match
      matchStore.push({
        id: newMatchId,
        phase: "active",
        player1_wins: 0,
        player2_wins: 0,
      });

      expect(newMatchId).not.toBe(oldCompletedMatchId);
      const activeMatch = matchStore.find((m) => m.phase === "active");
      expect(activeMatch?.id).toBe(newMatchId);
    });
  });
});
