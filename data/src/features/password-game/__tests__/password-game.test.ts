/**
 * EVOAIQU — Password Game integration tests
 *
 * The game is a solo, browser-only puzzle ported from a standalone Vite app.
 * These tests check that:
 *  1. The rule engine still behaves (first rules, progress, async rules).
 *  2. Its CSS is scoped under .pw-game, so it cannot leak into the site.
 *  3. The route, public-access entry, game card and footer link are wired up.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { rules } from "@/features/password-game/rules/rules";
import { getRuleProgress } from "@/features/password-game/utils/ruleProgress";

const root = path.resolve(__dirname, "../../..");
const gameDir = path.join(root, "features/password-game");
const read = (...p: string[]) => fs.readFileSync(path.join(root, ...p), "utf-8");

// ── 1. Rule engine ───────────────────────────────────────────────────────────

describe("Password Game — rule engine", () => {
  const core = rules.filter((r: { category: string }) => r.category !== "Chaos");

  it("has 26 numbered core rules, in order", () => {
    expect(core).toHaveLength(26);
    expect(core.map((r: { id: number | string }) => r.id)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
  });

  it("starts at rule 1 for an empty password", () => {
    const progress = getRuleProgress(rules, "");
    expect(progress.currentRule?.id).toBe(1);
    expect(progress.completedRules).toBe(0);
  });

  it("moves to the next rule as the foundation rules are met", () => {
    expect(getRuleProgress(rules, "abcdefgh").currentRule?.id).toBe(2);
    expect(getRuleProgress(rules, "abcdefg1").currentRule?.id).toBe(3);
    expect(getRuleProgress(rules, "Abcdefg1").currentRule?.id).toBe(4);
    expect(getRuleProgress(rules, "Abcdef1!").currentRule?.id).toBe(5);
  });

  it("a rule that stops passing only removes its own point", () => {
    const ok = getRuleProgress(rules, "Mars!11Aa");
    expect(ok.passedRuleIds.has(5)).toBe(true);
    const broken = getRuleProgress(rules, "M@rs!11Aa");
    expect(broken.passedRuleIds.has(5)).toBe(false);
    expect(broken.passedRuleIds.has(1)).toBe(true);
  });

  it("never treats a rule that needs live data as passed before it loads", () => {
    const progress = getRuleProgress(rules, "Mars!11Aa", {});
    expect(progress.passedRuleIds.has(18)).toBe(false);
  });
});

// ── 2. CSS scoping ───────────────────────────────────────────────────────────

describe("Password Game — CSS is scoped to .pw-game", () => {
  const cssFiles = [
    "styles/password-game.css",
    "styles/ChaosEffects.css",
    "styles/IceEffect.css",
    "styles/LightningEffect.css",
    "styles/WaterEffect.css",
  ];

  /** Selectors of every top-level (or @media-nested) style rule. */
  function selectorsOf(css: string): string[] {
    const flat = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const out: string[] = [];
    // Drop @keyframes bodies: their "from/to/50%" steps are not selectors
    const noKeyframes = flat.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    for (const m of noKeyframes.matchAll(/([^{}@;]+)\{/g)) {
      for (const sel of m[1].split(",")) out.push(sel.trim());
    }
    // "@media (...)" preludes are at-rules, not selectors
    return out.filter((sel) => sel && !/^(media|supports)[ (]/.test(sel));
  }

  for (const file of cssFiles) {
    it(`${file}: every selector starts with .pw-game`, () => {
      const css = fs.readFileSync(path.join(gameDir, file), "utf-8");
      const bad = selectorsOf(css).filter((s) => !s.startsWith(".pw-game"));
      expect(bad).toEqual([]);
    });
  }

  it("does not style body, html or :root directly", () => {
    for (const file of cssFiles) {
      const css = fs.readFileSync(path.join(gameDir, file), "utf-8");
      expect(css).not.toMatch(/(^|\n)\s*(body|html|:root|#root)\b/);
    }
  });

  it("namespaces keyframes and animation references with pw-", () => {
    for (const file of cssFiles) {
      const css = fs.readFileSync(path.join(gameDir, file), "utf-8");
      for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) expect(m[1].startsWith("pw-")).toBe(true);
      for (const m of css.matchAll(/animation:\s*([\w-]+)/g)) {
        if (m[1] !== "none") expect(m[1].startsWith("pw-")).toBe(true);
      }
    }
  });

  it("renders everything inside a .pw-game wrapper", () => {
    const tsx = fs.readFileSync(path.join(gameDir, "components/PasswordGame.jsx"), "utf-8");
    expect(tsx.startsWith('"use client";')).toBe(true);
    expect(tsx).toContain('<div className="pw-game">');
  });
});

// ── 3. Wiring ────────────────────────────────────────────────────────────────

describe("Password Game — route and navigation", () => {
  it("has a page at /play/password-game", () => {
    const page = read("app/(protected)/play/password-game/page.tsx");
    expect(page).toContain("@/features/password-game");
    expect(page).toContain("export default function PasswordGamePage");
  });

  it("is public so guests can play without an account", () => {
    expect(read("middleware.ts")).toContain('"/play/password-game"');
  });

  it("appears on the games page and in the footer", () => {
    const games = read("core/home/GameSectionClient.tsx");
    expect(games).toContain('href="/play/password-game"');
    expect(games).toContain("Play Password Game");
    expect(read("core/home/landing/FuturisticFooter.tsx")).toContain('href: "/play/password-game"');
  });

  it("loads its dictionary lazily instead of in the main bundle", () => {
    const tsx = fs.readFileSync(path.join(gameDir, "components/PasswordGame.jsx"), "utf-8");
    expect(tsx).toContain('import("../rules/wordCollision")');
    expect(tsx).not.toMatch(/^import .*wordCollision/m);
  });
});
