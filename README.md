# EVOAIQU — by JE Labs

> **Play. Connect. Evolve.**

A bold, futuristic social gaming platform where every match creates a story. Play Chess, Rock, Paper, Scissors, Hand Cricket or Ludo against friends or random opponents — then dare the loser to a challenge. There is also a solo Password Game.

## Start here

| I want to... | Read |
|--------------|------|
| Understand what this project is and what each folder holds | [ABOUT.md](ABOUT.md) |
| Install and run it on a new laptop | [SETUP.md](SETUP.md) |
| See how the code is organised (one module per game) | [support/architecture/ARCHITECTURE.md](support/architecture/ARCHITECTURE.md) |
| Install in one command | `setup.ps1` (Windows) or `bash setup.sh` (macOS / Linux / Git Bash) |
| See open tasks and reports | [`support/`](support/) |

> The app lives in `data/`. Run every `npm` command from there.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.4 (App Router, Turbopack), React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + Storage, SSR) |
| Chess rules | chess.js |
| Tests | Vitest |
| Icons | Lucide React |

---

## Milestones

| # | Status | Description |
|---|--------|-------------|
| 1 | ✅ Complete | Project scaffold, design system, auth UI, public pages, i18n |
| 2 | ✅ Complete | Profiles, EVOAIQU IDs, real dashboard, profile page, account deletion |
| 3A | ✅ Complete | Friend system: send/accept/reject/cancel/remove, friends page |
| 3B | ✅ Complete | Multiplayer Rock, Paper, Scissors, hidden moves, match history |
| 4 | ✅ Complete | Secure challenge assignment system integrated with completed RPS matches |
| 5 | ✅ Complete | Secure random matchmaking for RPS, atomic pairing, reconnect handling, user blocks |
| 5.5 | ✅ Complete | 24-hour challenge video submissions, stories reel, one-time winner review, media retention cleanup |
| 6 | ✅ Complete | Chess with chess.js: online vs a friend, server-checked moves, clocks |
| 7 | 🔲 | Public challenge feed, submissions, moderation |
| 8 | 🔲 | Testing, security, accessibility, deployment |
| 8.5 | ✅ Complete | Hand Cricket: online vs a friend, or solo vs the computer |
| 9 | ✅ Complete | Ludo: me vs 1–3 bots in the browser (no login), online 1 vs 1 with a friend, forfeit after 3 missed turns |
| 10 | ✅ Complete | Password Game: solo puzzle with 26 rules and fire, water, lightning and ice chaos events (no login, `/play/password-game`) |

---

## Local Development Setup

The full step-by-step guide, with a checklist and troubleshooting, is in **[SETUP.md](SETUP.md)**. The short version:

```bash
git clone https://github.com/GHANASHYAM-Y/Jb_dummy.git
cd Jb_dummy
bash setup.sh                  # Windows: powershell -ExecutionPolicy Bypass -File .\setup.ps1
# then fill in data/.env.local and run the SQL migrations (SETUP.md steps 4 to 7)
cd data
npm run dev                    # http://localhost:3000
```

Needs Node.js 20.9+ and a free [Supabase](https://supabase.com) project. On Vercel, set **Project Settings → General → Root Directory** to `data`.

### Environment variables (`data/.env.local`)

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → API → anon / public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → API → service_role (**server-only, never expose**) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |
| `CRON_SECRET` | Any long random string. Protects the cleanup endpoints. |

### Database migrations

Run the 17 files in `data/supabase/migrations/` in number order, `0001_profiles.sql` through `0017_ludo_forfeit_and_cleanup.sql`, either in the Supabase SQL Editor or with `npx supabase db push` (details and the full list are in SETUP.md step 6).

### Auth redirects

In Supabase → **Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to **Redirect URLs**.

---

## How Profile Creation Works

When a user signs up:

1. Supabase creates a row in `auth.users`.
2. A PostgreSQL trigger (`on_auth_user_created`) fires **immediately** on the server.
3. The trigger calls `generate_evoora_id()` which generates a unique `EVO-XXXXXX` ID using `pgcrypto.gen_random_bytes()`.
4. A row is inserted into `public.profiles` with a collision-safe retry loop (max 10 attempts).
5. The insert is `ON CONFLICT DO NOTHING` — repeated callbacks or retries cannot create duplicates.

The trigger runs as `SECURITY DEFINER` so it can bypass RLS. Users can never:
- Choose their own EVOAIQU ID
- Change their EVOAIQU ID after creation
- See another user's private profile

---

## Security Architecture

| Concern | Mitigation |
|---------|-----------|
| Auth session | Supabase SSR with `@supabase/ssr`, session refreshed in middleware |
| Protected routes | Middleware + server-side `getUser()` in every protected page |
| Profile mutations | RLS `UPDATE` policy + column-level GRANT (only editable fields) |
| EVOAIQU ID immutability | Not included in any client-facing UPDATE type or GRANT |
| Account deletion | Server Route Handler with `getUser()` + service-role Admin API |
| Service-role key | Never in `NEXT_PUBLIC_*` vars, never in client bundles |
| SQL injection | Supabase client uses parameterised queries |
| Client-side validation | Belt-and-suspenders only; server/DB constraints are authoritative |
| Friend mutations | All via SECURITY DEFINER DB functions — no direct client INSERT/UPDATE/DELETE |
| Friend request authZ | Caller identity from verified session, never from request body |
| Cross-user accept | DB function verifies `receiver_id = auth.uid()` before accepting |
| Duplicate requests | UNIQUE constraint on normalised `LEAST/GREATEST(sender,receiver)` pair |
| RPS Hidden Moves | Moves hidden via RLS policy until round completion; excluded from Realtime |
| Authoritative RPS Winner | Derived server-side inside `submit_move` DB function; ties/draws tracked |
| Challenge Assignment | Only verified match winner can assign; loser is inferred from match record |
| No Self/Duplicate Dares | `no_self_challenge` check + `unique_match_challenge` constraint on `match_id` |
| Challenge Privacy | Private by default; public-intended visibility does not authorize public video upload |
| Recipient Agency | Recipient alone can accept or skip; skipping is penalty-free |
| Matchmaking Atomicity | `SELECT ... FOR UPDATE SKIP LOCKED` inside transactional RPC prevents race conditions and duplicate pairings |
| No Self / Blocked Pairing | Self-pairing strictly forbidden; `public.user_blocks` prevents matching with blocked users |
| Single Active Search | Partial unique index `unique_active_queue_per_user` prevents concurrent searches per player |
| Matchmaking Privacy | RLS on queue restricts row access to caller; opponent identity revealed only in completed match |
| Stale Queue Recovery | 60-second TTL auto-expires abandoned searches; refresh recovery resumes active games |

---

## Project Structure

```
data/      # The Next.js app: src/, public/, supabase/, package.json, configs, .env files
support/   # Docs: reports, audits, Yet_To_Do notes, research
others/    # Everything else: demo/ (layout concepts), backup/
README.md  # This overview
SETUP.md   # Install and run guide
ABOUT.md   # What each part is and how it fits together
setup.ps1, setup.sh, start-servers.bat   # Setup and start helpers
```

Inside `data/` (full rules in [support/architecture/ARCHITECTURE.md](support/architecture/ARCHITECTURE.md)):

```
src/
├── app/                 # Routing only: pages, layouts and API routes (Next.js App Router)
├── features/            # One module per game, each with components/, engine/, __tests__/ and a README.md
│   ├── hand-cricket/
│   ├── rock-paper-scissors/   # includes random matchmaking
│   ├── dare-game/             # dares, video submissions, stories (used by the match games)
│   ├── password-game/         # fully self-contained
│   ├── ludo/
│   └── chess/
├── shared/              # ui/ (buttons, badges, sheet...), game/ (lifecycle banner), lib/ (cn helper)
├── core/                # auth, navigation, i18n, supabase (+ database types), friends, profile, settings, dashboard, home
├── middleware.ts        # Which pages need a login
└── __tests__/           # Cross-cutting architecture tests
supabase/
└── migrations/
    ├── 0001_profiles.sql    # Profiles table, RLS, trigger, ID generator
    ├── 0002_friends.sql     # Friend requests table, DB functions, RLS
    ├── 0003_rps.sql         # RPS invites, matches, rounds, hidden moves, RPCs
    ├── 0004_challenges.sql  # Challenges table, RLS, assign/respond RPCs
    ├── 0005_matchmaking.sql # Matchmaking queue, user blocks, atomic pairing RPCs
    ├── ...                  # 0006 to 0014: invites, RPS timer, dares, stories, chess, lifecycle
    ├── 0015_hand_cricket.sql
    ├── 0016_ludo.sql        # Ludo matches and online 1 vs 1 state
    └── 0017_ludo_forfeit_and_cleanup.sql   # Ludo forfeit after 3 missed turns, cleanup trigger
```

---

## Commands

> **Which server to use:** `npm run dev` (port 3000) recompiles pages as you open them, so clicks take 0.5–4 s. Use it only while editing code. To just use or test the app, run `npm run prod` (builds, then serves on port 3001; clicks take about 0.2–0.5 s) or `npm run start:prod` to reuse the last build.

```bash
npm run dev      # Start dev server (Turbopack)
npm run prod         # Production build, then serve on port 3001
npm run start:prod   # Serve the last production build on port 3001
npm run build    # Production build
npm test         # Run the automated tests once
npm run lint     # ESLint check
npx tsc --noEmit # TypeScript type check
```

---

## Without Supabase Credentials

The app runs in "no-auth" mode:
- Public pages (`/`, `/games`, `/challenges`, etc.) work fully
- Auth pages show forms but sign-in/up will fail gracefully
- Protected pages (`/dashboard`, `/profile`) show a setup notice
- Middleware passes through without crashing

---

*Built with ❤️ by JE Labs*
localhos