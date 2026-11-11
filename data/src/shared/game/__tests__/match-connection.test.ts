/**
 * EVOAIQU — shared match connection hook
 *
 * Ludo and Hand Cricket share useMatchConnection for disconnect/reconnect
 * reporting. These checks pin the behaviour the boards relied on before the
 * hook was extracted.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const SRC = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf-8").replace(/\r\n/g, "\n");

const hook = read("shared/game/useMatchConnection.ts");

describe("useMatchConnection", () => {
  it("is a client hook", () => {
    expect(hook.startsWith('"use client";')).toBe(true);
  });

  it("reports a disconnect with keepalive only while the match is live", () => {
    expect(hook).toContain('const LIVE_PHASES: MatchPhase[] = ["active", "reconnecting"];');
    expect(hook).toMatch(/if \(LIVE_PHASES\.includes\(phaseRef\.current\)\) \{\s*void postJson\("\/api\/games\/disconnect", \{ match_id: matchId \}, true\)/);
  });

  it("reconnects when back online, then refreshes even if the request fails", () => {
    expect(hook).toContain('postJson("/api/games/reconnect", { match_id: matchId }).catch(() => null)');
    expect(hook).toMatch(/void request\.finally\(\(\) => \{\s*void refresh\(\);/);
  });

  it("sends at most one reconnect per server disconnect timestamp", () => {
    expect(hook).toContain("reconnectedForRef.current === myDisconnectedAt) return;");
    expect(hook).toContain("reconnectedForRef.current = myDisconnectedAt;");
  });

  it("removes its window listeners on cleanup", () => {
    expect(hook).toContain('window.removeEventListener("offline", handleOffline);');
    expect(hook).toContain('window.removeEventListener("online", handleOnline);');
  });

  for (const [game, board, side] of [
    ["Ludo", "features/ludo/components/LudoMatchBoard.tsx", "iAmP1 ?"],
    ["Hand Cricket", "features/hand-cricket/components/HandCricketMatchBoard.tsx", 'mySide === "A" ?'],
  ] as const) {
    it(`${game} uses the shared hook with its own seat`, () => {
      const src = read(board);
      expect(src).toContain('import { useMatchConnection } from "@/shared/game/useMatchConnection";');
      expect(src).toContain("useMatchConnection({ matchId, phaseRef, live, myDisconnectedAt, refresh });");
      expect(src).toContain(`const myDisconnectedAt = ${side} match.player1_disconnected_at : match.player2_disconnected_at;`);
      expect(src).not.toContain("/api/games/disconnect");
    });
  }
});
