/**
 * EVOAIQU — architecture boundary tests
 *
 * Guards the module structure described in support/architecture/ARCHITECTURE.md:
 *
 *   features/<game>   self-contained game modules
 *   shared/           game-agnostic building blocks
 *   core/             platform (auth, navigation, i18n, supabase, friends, ...)
 *   app/              routing only
 *
 * Imports are resolved for real (alias and relative), so a relative path cannot
 * be used to sneak across a boundary. Tests are exempt: they may read internals.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const SRC = path.resolve(__dirname, "..");
const FEATURES = ["chess", "dare-game", "hand-cricket", "ludo", "password-game", "rock-paper-scissors"];
/** The one feature other features may use (the four match games embed dares). */
const SHARED_FEATURE = "dare-game";

const posix = (p: string) => p.split(path.sep).join("/");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(SRC)
  .map((p) => posix(path.relative(SRC, p)))
  .filter((r) => /\.(tsx?|jsx?)$/.test(r) && !/(^|\/)__tests__\//.test(r));

const exists = (r: string) => fs.existsSync(path.join(SRC, r)) && fs.statSync(path.join(SRC, r)).isFile();

function resolveSpec(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null; // npm package
  for (const e of ["", ".ts", ".tsx", ".js", ".jsx", ".css"]) {
    if (exists(base + e) && (e || /\.[a-z]+$/.test(base))) return base + e;
  }
  for (const i of ["/index.ts", "/index.tsx", "/index.js", "/index.jsx"]) if (exists(base + i)) return base + i;
  return null;
}

const SPEC_RES = [
  /(?:import|export)\s[^'"`;]*?from\s*(['"])([^'"]+)\1/g,
  /import\s*(['"])([^'"]+)\1/g,
  /import\(\s*(['"])([^'"]+)\1\s*\)/g,
];

interface Edge {
  from: string;
  to: string;
  spec: string;
}

const edges: Edge[] = [];
const npmImports = new Map<string, Set<string>>();
for (const f of files) {
  const text = fs.readFileSync(path.join(SRC, f), "utf-8");
  for (const re of SPEC_RES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const spec = m[2];
      const to = resolveSpec(f, spec);
      if (to) edges.push({ from: f, to, spec });
      else if (!spec.startsWith(".") && !spec.startsWith("@/")) {
        const set = npmImports.get(f) ?? new Set<string>();
        set.add(spec);
        npmImports.set(f, set);
      }
    }
  }
}

const featureOf = (r: string) => (r.startsWith("features/") ? r.split("/")[1] : null);
const topOf = (r: string) => r.split("/")[0];
const isFeatureEntry = (r: string) => /^features\/[^/]+\/(index|server)\.ts$/.test(r);

const fmt = (list: Edge[]) => list.map((e) => `${e.from} -> ${e.to}`);

describe("Architecture — module structure", () => {
  it("has the expected top-level folders and no leftovers from the old layout", () => {
    for (const d of ["app", "features", "shared", "core"]) expect(fs.existsSync(path.join(SRC, d))).toBe(true);
    for (const d of ["components", "lib", "contexts", "types"]) expect(fs.existsSync(path.join(SRC, d))).toBe(false);
  });

  it("has one folder per game", () => {
    const dirs = fs
      .readdirSync(path.join(SRC, "features"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    expect(dirs).toEqual([...FEATURES].sort());
  });

  it("every feature has a client entry point (index.ts)", () => {
    for (const f of FEATURES) expect(exists(`features/${f}/index.ts`), `features/${f}/index.ts`).toBe(true);
  });

  it("client entry points never re-export server code", () => {
    for (const f of FEATURES) {
      const text = fs.readFileSync(path.join(SRC, "features", f, "index.ts"), "utf-8");
      expect(text, `features/${f}/index.ts`).not.toMatch(/from\s+["']\.\/server\//);
      expect(text, `features/${f}/index.ts`).not.toMatch(/next\/server|supabase\/server/);
    }
  });

  it("server entry points are only imported by server code (routes and server pages), never client components", () => {
    const offenders: string[] = [];
    for (const e of edges) {
      if (!/^features\/[^/]+\/server\.ts$/.test(e.to)) continue;
      const text = fs.readFileSync(path.join(SRC, e.from), "utf-8");
      if (/^\s*["']use client["']/.test(text)) offenders.push(`${e.from} (use client) -> ${e.to}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("Architecture — features are independent", () => {
  it("no feature imports another feature, except the dare-game entry point", () => {
    const bad = edges.filter((e) => {
      const a = featureOf(e.from);
      const b = featureOf(e.to);
      if (!a || !b || a === b) return false;
      return !(b === SHARED_FEATURE && e.to === `features/${SHARED_FEATURE}/index.ts`);
    });
    expect(fmt(bad)).toEqual([]);
  });

  it("dare-game does not import any game (no circular dependency)", () => {
    const bad = edges.filter((e) => featureOf(e.from) === SHARED_FEATURE && featureOf(e.to) && featureOf(e.to) !== SHARED_FEATURE);
    expect(fmt(bad)).toEqual([]);
  });

  it("no feature imports app/ code", () => {
    const bad = edges.filter((e) => featureOf(e.from) && topOf(e.to) === "app");
    expect(fmt(bad)).toEqual([]);
  });

  it("password-game is fully self-contained (own files and npm packages only)", () => {
    const bad = edges.filter((e) => featureOf(e.from) === "password-game" && featureOf(e.to) !== "password-game");
    expect(fmt(bad)).toEqual([]);
  });

  it("only app/ and core/home reach into a feature, and only through its entry points", () => {
    const bad = edges.filter((e) => {
      const to = featureOf(e.to);
      if (!to) return false;
      const from = featureOf(e.from);
      if (from === to) return false; // inside its own module
      if (from) return false; // feature-to-feature is covered above
      return !isFeatureEntry(e.to);
    });
    expect(fmt(bad)).toEqual([]);
  });

  it("core/home uses only client entry points; the rest of core never imports features", () => {
    const bad = edges.filter((e) => {
      if (topOf(e.from) !== "core" || !featureOf(e.to)) return false;
      if (e.from.startsWith("core/home/")) return !/^features\/[^/]+\/index\.ts$/.test(e.to);
      return true;
    });
    expect(fmt(bad)).toEqual([]);
  });
});

describe("Architecture — shared and core", () => {
  it("shared/ui and shared/lib are strict leaves (no features, core or app)", () => {
    const bad = edges.filter(
      (e) => /^shared\/(ui|lib)\//.test(e.from) && ["features", "core", "app"].includes(topOf(e.to)),
    );
    expect(fmt(bad)).toEqual([]);
  });

  it("shared/game uses only core/i18n and core/supabase, never features or app", () => {
    const bad = edges.filter((e) => {
      if (!e.from.startsWith("shared/game/")) return false;
      if (["features", "app"].includes(topOf(e.to))) return true;
      return topOf(e.to) === "core" && !/^core\/(i18n|supabase)\//.test(e.to);
    });
    expect(fmt(bad)).toEqual([]);
  });

  it("core/i18n and core/supabase do not depend on shared/game (no folder cycle)", () => {
    const bad = edges.filter((e) => /^core\/(i18n|supabase)\//.test(e.from) && e.to.startsWith("shared/game/"));
    expect(fmt(bad)).toEqual([]);
  });

  it("core/ never imports app/", () => {
    const bad = edges.filter((e) => topOf(e.from) === "core" && topOf(e.to) === "app");
    expect(fmt(bad)).toEqual([]);
  });

  it("password-game uses only npm packages it declares", () => {
    const pw = JSON.parse(fs.readFileSync(path.resolve(SRC, "../package.json"), "utf-8"));
    const declared = new Set(Object.keys({ ...pw.dependencies, ...pw.devDependencies }));
    const used = new Set<string>();
    for (const [f, set] of npmImports) if (featureOf(f) === "password-game") set.forEach((s) => used.add(s));
    const undeclared = [...used].filter((s) => !s.startsWith("node:") && !declared.has(s.startsWith("@") ? s.split("/").slice(0, 2).join("/") : s.split("/")[0]));
    expect(undeclared).toEqual([]);
  });
});
