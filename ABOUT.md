# About EVOAIQU

**EVOAIQU** (by JE Labs) is a social gaming website: *Play. Connect. Evolve.*
Players battle friends or strangers in short games. The loser can then be **dared** to a real-life challenge, filmed as a short video and shown as a "story".

This page explains what is in the project and how the parts fit together.
To run it on your computer, follow [SETUP.md](SETUP.md).

---

## 1. The games

| Game | Play modes | Needs an account? | Page |
|------|-----------|-------------------|------|
| Rock, Paper, Scissors | Friend invite, random matchmaking. First to 5, 10-second rounds. | Yes | `/play/rps` |
| Speed Chess | Online vs a friend. Server checks every move (chess.js). | Yes | `/play/chess` |
| Hand Cricket | Online vs a friend, or solo vs the computer. 2 overs each, hidden throws. | Online: yes. Solo: no | `/play/hand-cricket` |
| Ludo | Online 1 vs 1 with a friend, or you vs 1 to 3 bots in the browser. | Online: yes. Bots: no | `/play/ludo` |
| Password Game | Solo puzzle: one password, 26 rules, fire/water/lightning/ice events. | No | `/play/password-game` |

Around the games:

- **Friends**: search by EVOAIQU ID (`EVO-XXXXXX`), send or accept requests, invite by link, block users.
- **Dares (Challenges)**: after a game the winner picks a dare for the loser. The loser accepts or skips, with no penalty for skipping.
- **Stories**: accepted dares can be filmed, and the video appears for 24 hours.
- **Dashboard, history, profile, settings**, plus an English / Tamil language switch.

---

## 2. The three folders

```
JB Porject/
├── data/      The real application. Everything you run lives here.
├── support/   Written documents: reports, audits, to-do notes. Not code.
├── others/    Extras: a clickable UI mock-up and an old backup test.
├── README.md  Short overview.
├── SETUP.md   How to install and run it.
├── ABOUT.md   This file.
├── setup.ps1 / setup.sh      One-command install helpers.
└── start-servers.bat         Windows: opens the dev and production servers.
```

### `data/`: the app

Run all commands here.

```
data/
├── src/
│   ├── app/                 Routing only: pages and API routes (Next.js App Router)
│   │   ├── (auth)/          login, signup
│   │   ├── (protected)/     dashboard, friends, play/*, challenges, stories, profile, settings...
│   │   ├── api/             The server endpoints, one folder per feature
│   │   └── games, about, how-to-play, privacy, terms   public pages
│   ├── features/            One self-contained module per game (each has a README.md)
│   │   ├── hand-cricket/  rock-paper-scissors/  ludo/  chess/
│   │   ├── password-game/   fully self-contained
│   │   └── dare-game/       dares, videos, stories (used by the match games)
│   ├── shared/              Building blocks used by several games: ui/, game/, lib/
│   ├── core/                The platform: auth, navigation, i18n, supabase, friends, profile, home
│   ├── middleware.ts        Decides which pages need a login
│   └── __tests__/           Cross-cutting architecture tests (each module also has its own __tests__/)
├── supabase/migrations/     17 numbered SQL files that build the database
├── public/                  Static images
├── .env.example             Template for your secrets (copy to .env.local)
├── package.json             Packages and npm scripts
└── next.config.ts, tsconfig.json, vitest.config.mjs, eslint.config.mjs, vercel.json
```

The rules for how these folders may import each other are in [support/architecture/ARCHITECTURE.md](support/architecture/ARCHITECTURE.md).

### `support/`: documents

| File | What it is |
|------|------------|
| `architecture/ARCHITECTURE.md` | How `data/src/` is organised and the import rules between games. |
| `Yet_To_Do/Yet_to_do.md` | Open tasks. Includes the signup "server error" investigation and Google sign-in. |
| `production_readiness_report.md`, `post_remediation_release_gate_report.md` | Release checks. |
| `ui_redesign_audit.md`, `ui_redesign_completion_report.md`, `post_redesign_acceptance_report.md` | The UI redesign history. |
| `rps_arena_*`, `two_browser_uat_report.md` | RPS build and two-browser test reports. |
| `story_maintenance_rpc_hardening_report.md` | Story cleanup security work. |
| `show_of_hands_feature_teardown.md` | Research notes. |

### `others/`: extras

- `demo/ui_layout_concepts.html`: a standalone clickable prototype of several UI layouts. Open it by double-clicking. It uses fake data and is not connected to the app.
- `backup/`: an old copy of a test file, kept for reference.

---

## 3. Technology

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, custom neon-navy design in `src/app/globals.css` |
| Database, login, live updates | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Chess rules | chess.js |
| Tests | Vitest |
| Hosting | Vercel (set Root Directory to `data`) |

> **Warning for developers and AI tools:** this Next.js version has breaking changes from older releases. Before writing Next.js code, read the guides in `data/node_modules/next/dist/docs/` (see `data/AGENTS.md`).

---

## 4. How a game works (the pattern to know)

Most multiplayer games follow the same safe pattern, so cheating from the browser is not possible:

1. **A player clicks** (roll, move, throw). The browser calls an API route such as `/api/ludo/match/<id>/move`.
2. **The server checks the request**: who is logged in, whether it is their turn, whether the move is legal. Dice are rolled on the server.
3. **The rules engine** (`src/features/<game>/engine/`) works out the new board. Engines are plain functions with no database access, which makes them easy to test.
4. **The result is saved** through a database function (RPC). Writes go through functions only. Players cannot edit game tables directly (row-level security blocks it).
5. **Both players are updated live** through Supabase Realtime, with a short poll as a backup.
6. **Timeouts and exits are shared by all games**: a turn clock, disconnect and reconnect handling, and a cleanup job (`/api/games/timeout/cleanup`) that ends abandoned matches. Ludo also forfeits a player who misses 3 turns in a row.
7. **When a match ends with a winner**, the dare flow can start.

Solo modes (Ludo vs bots, Hand Cricket solo, Password Game) run entirely in the browser with no database.

Every database change is a numbered file in `data/supabase/migrations/`. Never edit an old one that has already been run: add a new number.

---

## 5. Who can open what

`src/middleware.ts` holds the list. Public pages (home, games, about, how-to-play, privacy, terms, and the solo games) open for anyone. Everything else redirects to `/login`.
To make a new page public, add its path to `PUBLIC_ROUTES` there.

---

## 6. Where to find things quickly

| I want to... | Look in |
|--------------|---------|
| Understand one game | `data/src/features/<game>/README.md` |
| Change how a game's rules work | `data/src/features/<game>/engine/` (Password Game: `rules/rules.js`) |
| Change what an API does | `data/src/app/api/<feature>/.../route.ts` |
| Change a screen | `data/src/features/<game>/components/` (platform screens: `data/src/core/`) |
| Add or change a database table or function | A new file in `data/supabase/migrations/` |
| Add a game card to the games page | `data/src/core/home/GameSectionClient.tsx` |
| Add a whole new game | `support/architecture/ARCHITECTURE.md`, section 6 |
| Change colours or the theme | `data/src/app/globals.css` |
| Change text or add a language | `data/src/core/i18n/translations.ts` |
| See what the tests expect | `__tests__/` inside each module, plus `data/src/__tests__/` |

---

## 7. Known open items

- Google sign-in is not set up yet.
- The signup "Database error saving new user" issue is documented but its cause is unconfirmed (`support/Yet_To_Do/Yet_to_do.md`).
- Online Ludo is friends only (no random matching) by design.
- 8 older tests fail on a clean checkout (they check SQL text in migrations 0003 to 0009). They are unrelated to new work.
- The generated database types do not yet include the Ludo and Hand Cricket tables, so those server calls are not type-checked.
- Identical code that several games copied has been merged; the similar-looking code that was kept separate, and why, is listed in `support/architecture/ARCHITECTURE.md`, section 7.
