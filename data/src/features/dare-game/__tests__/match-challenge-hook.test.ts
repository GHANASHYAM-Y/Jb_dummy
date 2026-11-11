/**
 * EVOAIQU — useMatchChallenge (dare loading after a match)
 *
 * Ludo and Hand Cricket load their match dare through this hook. These checks
 * pin the behaviour the boards had before it was extracted.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const SRC = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf-8").replace(/\r\n/g, "\n");
const hook = read("features/dare-game/hooks/useMatchChallenge.ts");

describe("useMatchChallenge", () => {
  it("is a client hook exported from the dare-game entry point", () => {
    expect(hook.startsWith('"use client";')).toBe(true);
    expect(read("features/dare-game/index.ts")).toContain('export { useMatchChallenge } from "./hooks/useMatchChallenge";');
  });

  it("does nothing until the match is decided", () => {
    expect(hook).toContain("if (!decided) return;");
  });

  it("fetches the match dare without caching and clears it when there is none", () => {
    expect(hook).toContain("fetch(`/api/challenges/match?match_id=${encodeURIComponent(matchId)}`, { cache: \"no-store\" })");
    expect(hook).toContain("if (active && data?.ok) setChallenge(data.challenge ?? null);");
  });

  it("lets the loser keep checking every 5 seconds, and stops on cleanup", () => {
    expect(hook).toContain("const LOSER_POLL_MS = 5_000;");
    expect(hook).toContain("const id = pollWhileWaiting ? setInterval(load, LOSER_POLL_MS) : null;");
    expect(hook).toContain("if (id) clearInterval(id);");
  });

  for (const board of ["features/ludo/components/LudoMatchBoard.tsx", "features/hand-cricket/components/HandCricketMatchBoard.tsx"]) {
    it(`${board.split("/")[1]} uses it for decided, non-draw matches with the loser polling`, () => {
      const src = read(board);
      expect(src).toContain('decided: phase === "completed" && !match.is_draw,');
      expect(src).toContain("pollWhileWaiting: iLost,");
      expect(src).not.toContain("/api/challenges/match");
    });
  }
});
