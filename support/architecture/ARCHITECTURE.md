# EVOAIQU — Application Architecture

How the code in `data/src/` is organised, why, and the rules that keep each game independent.
For installation see [SETUP.md](../../SETUP.md); for a project overview see [ABOUT.md](../../ABOUT.md).

---

## 1. The four layers

```
data/src/
├── app/          Routing only (Next.js App Router). Pages and API routes stay thin.
├── features/     One self-contained module per game.
├── shared/       Small, game-agnostic building blocks used by several games.
├── core/         The platform: auth, navigation, i18n, Supabase, friends, profile, home.
└── middleware.ts Decides which pages need a login (Next.js requires it here).
```

Who may import whom:

```
            app/  (routes and pages)
           /    \
          v      v
   features/*   core/home  ── uses features only through their entry points
      |    \       |
      |     v      v
      |   features/dare-game   (the only feature other features may use)
      v
   shared/  ──>  core/i18n, core/supabase   (shared/game only)
      ^
   core/*  (uses shared/; never imports features/)
```

| From | May import | Must not import |
|------|-----------|-----------------|
| `app/` | everything, through feature entry points | — |
| `features/<game>` | its own files, `shared/`, `core/`, and `@/features/dare-game` | any other game, `app/` |
| `features/dare-game` | its own files, `shared/`, `core/` | any game (games depend on it, never the reverse) |
| `features/password-game` | its own files and npm packages only | everything else in the app |
| `core/home` | `shared/`, `core/`, feature **client** entry points (`@/features/<game>`) | feature internals, `server.ts` entries, `app/` |
| rest of `core/` | `shared/`, `core/` | `features/`, `app/` |
| `shared/ui`, `shared/lib` | nothing in the app (leaves) | `features/`, `core/`, `app/` |
| `shared/game` | `shared/`, `core/i18n`, `core/supabase` | other `core/` folders, `features/`, `app/` |

Tests (`**/__tests__/**`) are exempt and may read internals.

---

## 2. Feature modules (the games)

| Module | Game | Routes | Details |
|--------|------|--------|---------|
| `features/hand-cricket` | Hand Cricket | `/play/hand-cricket`, `/[matchId]`, `/solo` | [README](../../data/src/features/hand-cricket/README.md) |
| `features/rock-paper-scissors` | Rock, Paper, Scissors + random matchmaking | `/play/rps`, `/[matchId]`, `/history`, `/matchmaking` | [README](../../data/src/features/rock-paper-scissors/README.md) |
| `features/dare-game` | Dares, video submissions, stories | `/challenges`, `/stories`, `/chat` | [README](../../data/src/features/dare-game/README.md) |
| `features/password-game` | Password Game | `/play/password-game` | [README](../../data/src/features/password-game/README.md) |
| `features/ludo` | Ludo | `/play/ludo`, `/[matchId]`, `/bots` | [README](../../data/src/features/ludo/README.md) |
| `features/chess` | Speed Chess | `/play/chess`, `/[matchId]` | [README](../../data/src/features/chess/README.md) |

Folders inside a feature are chosen per game, not forced to match. Common names:

| Folder | Holds |
|--------|-------|
| `components/` | React components for this game |
| `engine/` | Pure rules (no React, no database). Easy to unit-test |
| `server/` | Server-only helpers for this game's API routes |
| `hooks/`, `rules/`, `styles/`, `utils/`, `sound/`, `matchmaking/`, `lib/` | Used only where a game needs them |
| `types.ts` | The game's types |
| `__tests__/` | The game's tests |
| `README.md` | What the game is, where it lives, how to change it |

### Entry points

Every feature exposes:

- **`index.ts`**: client-safe. UI components and types that pages and other features may use.
- **`server.ts`** (only where needed): server helpers and pure rules for API routes and server pages. Never import it from a `"use client"` file.

Everything else in a feature is internal. Import `@/features/ludo`, never `@/features/ludo/components/LudoLobby`.

Inside its own folder a feature may import its files however it likes.

---

## 3. Shared module (`shared/`)

Only code that several games genuinely use:

| Path | What | Used by |
|------|------|---------|
| `shared/ui/` | Buttons, badges, alerts, avatar, spinner, `sheet`, `dialog`, page loader | Everything |
| `shared/game/GameLifecycleBanner.tsx` | Turn clock / disconnect / reconnect banner | Chess, Hand Cricket, Ludo, RPS |
| `shared/lib/utils.ts` | `cn()` class helper and small utilities | Everything |

The shared server-side lifecycle (disconnect, reconnect, leave, timeout cleanup) is in `app/api/games/*` and migration `0014_game_lifecycle_and_timeouts.sql`. Its tests live in `shared/game/__tests__/`.

Game-specific things stay in the game even when two games have something similar (for example the two sound engines). See "Known duplication" below.

---

## 4. Core platform (`core/`)

| Path | What |
|------|------|
| `core/auth/` | Login and signup forms |
| `core/navigation/` | App navigation, navbar, footer |
| `core/i18n/` | English / Tamil translations, provider, language selector |
| `core/supabase/` | Browser and server clients, `database.ts` (the database types) |
| `core/friends/` | Friends page and invite landing |
| `core/profile/`, `core/settings/`, `core/dashboard/` | User profile, account deletion, dashboard |
| `core/home/` | Landing page and the games hub (`GameSectionClient`), the only part of core that composes games |
| `core/__tests__/` | Auth, security, friends, navigation and middleware tests |

`core/supabase/database.ts` still contains the types for every game's tables. It is the database contract, so it stays in one place.

---

## 5. How the rules are enforced

1. **ESLint** (`data/eslint.config.mjs`, `no-restricted-imports`): errors in the editor and in `npm run lint` when an alias import crosses a boundary.
2. **Boundary test** (`data/src/__tests__/architecture-boundaries.test.ts`): resolves every real import, including relative paths, and fails on any violation. It also checks that client entry points never re-export server code and that no client component imports a `server.ts` entry.

---

## 6. Adding a new game

1. Create `features/<game>/` with `components/`, an `engine/` for pure rules, and a `README.md`.
2. Add `index.ts` (and `server.ts` if the game has API routes).
3. Add pages under `app/(protected)/play/<game>/` and routes under `app/api/<game>/` that import only those entry points.
4. If the page is public, add it to `PUBLIC_ROUTES` in `middleware.ts`.
5. Add the game card in `core/home/GameSectionClient.tsx` and a footer link in `core/home/landing/FuturisticFooter.tsx`.
6. Add the folder name to `FEATURES` in `eslint.config.mjs` and in `architecture-boundaries.test.ts`.
7. Database changes go in a new numbered migration in `data/supabase/migrations/`.

---

## 7. Known duplication (planned "Phase B", not done yet)

The reorganisation only moved code. These duplicates were found and left alone on purpose, because removing them changes game code:

| Duplication | Where | Suggested home |
|-------------|-------|----------------|
| UUID regex copied into ~34 route files | `app/api/**` | `shared/lib/validation.ts` |
| API helpers (`httpStatusForCode`, `requireUser`, `readJson`, `UUID_RE`) written twice | `features/ludo/server/server.ts`, `features/hand-cricket/server/server.ts` | `shared/server/` |
| Disconnect / reconnect / polling wiring repeated | the four match boards | a `useMatchConnection` hook in `shared/game/` |
| Dare loading glue repeated after a match | Ludo, Hand Cricket, RPS boards | a hook exported by `features/dare-game` |
| Web Audio setup written twice | `chess/sound/sounds.ts`, `rock-paper-scissors/sound/RpsAudio.ts` | `shared/audio/` |

Unused code found and kept for now: `core/dashboard/DashboardClient.tsx` (only a source-text test reads it), `shared/ui/dialog.tsx`, and five default Next.js SVGs in `data/public/`.

---

## 8. History

The move from the old `components/`, `lib/`, `contexts/` and `types/` layout was done on branch `refactor/feature-modules`, one commit per module, with `git mv` so file history is preserved (`git log --follow <file>`).
