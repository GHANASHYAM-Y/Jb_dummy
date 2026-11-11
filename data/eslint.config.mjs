import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Architecture boundaries (see support/architecture/ARCHITECTURE.md).
 *
 *   app/        -> may import anything, through each feature's public entry points
 *   features/X  -> may import shared/ and core/, and ONLY the dare-game entry point
 *                  from other features (the four match games embed dares)
 *   core/       -> may import shared/. core/home (landing + games hub) may also
 *                  import each feature's client entry point (index.ts)
 *   shared/     -> ui/ and lib/ are strict leaves. shared/game may use only core/i18n
 *                  and core/supabase. Nothing in shared/ imports features/ or app/
 *
 * Tests are exempt: they may read internals. The same rules are also checked,
 * including relative imports, by src/__tests__/architecture-boundaries.test.ts.
 */
const FEATURES = [
  "chess",
  "dare-game",
  "hand-cricket",
  "ludo",
  "password-game",
  "rock-paper-scissors",
];
const SHARED_FEATURE = "dare-game"; // the only feature other features may use
const NOT_TESTS = ["**/__tests__/**"];

const noAppImports = {
  group: ["@/app/**"],
  message: "Only app/ may import from app/. Move shared code into shared/ or core/.",
};

const featureBlocks = FEATURES.map((feature) => {
  const others = FEATURES.filter((f) => f !== feature);
  const patterns = [
    noAppImports,
    ...others
      .filter((o) => o !== SHARED_FEATURE)
      .map((o) => ({
        group: [`@/features/${o}`, `@/features/${o}/**`],
        message: `features/${feature} must not import features/${o}. Games are independent modules.`,
      })),
    {
      group: [`@/features/${SHARED_FEATURE}/**`],
      message: `Import the dare-game public entry point ("@/features/${SHARED_FEATURE}"), not its internals.`,
    },
  ].filter((p) => !(feature === SHARED_FEATURE && p.group[0].startsWith(`@/features/${SHARED_FEATURE}`)));

  if (feature === "password-game") {
    // The Password Game is fully self-contained: no app code at all.
    patterns.push({
      group: ["@/core/**", "@/shared/**", `@/features/${SHARED_FEATURE}`],
      message: "features/password-game must stay self-contained (npm packages and its own files only).",
    });
  }
  // dare-game is consumed by the games, so it must never depend on them: the
  // rules above already forbid it from importing any other feature.

  return {
    files: [`src/features/${feature}/**/*.{ts,tsx,js,jsx}`],
    ignores: NOT_TESTS,
    rules: { "no-restricted-imports": ["error", { patterns }] },
  };
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scratch/**",
    ".worktree*/**",
  ]),
  ...featureBlocks,
  {
    // shared/ui and shared/lib are strict leaves: they import nothing from the app
    files: ["src/shared/ui/**/*.{ts,tsx,js,jsx}", "src/shared/lib/**/*.{ts,tsx,js,jsx}"],
    ignores: NOT_TESTS,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/**", "@/core/**", "@/app/**"], message: "shared/ui and shared/lib must not depend on features/, core/ or app/." },
          ],
        },
      ],
    },
  },
  {
    // shared/game (lifecycle UI used by the match games) may use only the
    // platform infrastructure it needs: translations and database types.
    files: ["src/shared/game/**/*.{ts,tsx,js,jsx}"],
    ignores: NOT_TESTS,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/**", "@/app/**"], message: "shared/game must not depend on features/ or app/." },
            {
              // everything in core/ except i18n and supabase
              group: ["auth", "dashboard", "friends", "home", "navigation", "profile", "settings"].map((d) => `@/core/${d}/**`),
              message: "shared/game may only use core/i18n and core/supabase.",
            },
          ],
        },
      ],
    },
  },
  {
    // core/ is the platform: it must not know about individual games...
    files: ["src/core/**/*.{ts,tsx,js,jsx}"],
    ignores: [...NOT_TESTS, "src/core/home/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/**", "@/app/**"], message: "core/ must not import features/ or app/. Only core/home may use feature entry points." },
          ],
        },
      ],
    },
  },
  {
    // ...except core/home (landing + games hub), which composes the games
    // through their client entry points only.
    files: ["src/core/home/**/*.{ts,tsx,js,jsx}"],
    ignores: NOT_TESTS,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/*/**"], message: "core/home may import a feature only through its entry point (@/features/<name>)." },
            { group: ["@/app/**"], message: "core/ must not import app/." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
