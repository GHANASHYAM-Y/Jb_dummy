/**
 * Ludo wiring: source checks that the game is reachable from the rest of the app.
 * Newline-agnostic so CRLF checkouts pass.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf-8").replace(/\r\n/g, "\n");

describe("Ludo integration wiring", () => {
  it("adds ludo to GameType", () => {
    const src = read("core/supabase/database.ts");
    expect(src).toMatch(/export type GameType =[^;]*"ludo"/);
  });

  it("lists the Ludo lobby and bot routes as public", () => {
    const src = read("middleware.ts");
    const block = src.slice(src.indexOf("PUBLIC_ROUTES"));
    const list = block.slice(0, block.indexOf("]"));
    expect(list).toContain('"/play/ludo"');
    expect(list).toContain('"/play/ludo/bots"');
  });

  it("treats Ludo sub-routes (not the lobby) as full-screen games", () => {
    const src = read("core/navigation/AppNavigation.tsx");
    expect(src).toContain('pathname.startsWith("/play/ludo/") && pathname !== "/play/ludo"');
  });

  it("shows a Ludo card and friend challenge link on the games page", () => {
    const src = read("core/home/GameSectionClient.tsx");
    expect(src).toMatch(/import \{[^}]*\bDices\b[^}]*\} from "lucide-react"/);
    expect(src).toContain("Play Ludo");
    expect(src).toContain("Challenge in Ludo");
    expect((src.match(/href="\/play\/ludo"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(src.indexOf("Play Hand Cricket")).toBeLessThan(src.indexOf("Play Ludo"));
  });

  it("links Ludo in the footer after Hand Cricket", () => {
    const src = read("core/home/landing/FuturisticFooter.tsx");
    const ludo = src.indexOf('{ href: "/play/ludo", label: "Ludo" }');
    expect(ludo).toBeGreaterThan(-1);
    expect(src.indexOf('label: "Hand Cricket"')).toBeLessThan(ludo);
  });
});
