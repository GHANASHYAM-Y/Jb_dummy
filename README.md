# EVOAIQU — by JE Labs

> **Play. Connect. Evolve.**

A bold, futuristic social gaming platform where every match creates a story. Play Chess, Rock, Paper, Scissors, Hand Cricket or Ludo against friends or random opponents — then dare the loser to a challenge.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.4 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Auth + SSR) |
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
| 6 | 🔲 Next | Chess with chess.js |
| 7 | 🔲 | Public challenge feed, submissions, moderation |
| 8 | 🔲 | Testing, security, accessibility, deployment |
| 9 | ✅ Complete | Ludo: me vs 1–3 bots in the browser (no login), online 1 vs 1 with a friend |

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) account

### 1. Clone and install

```bash
git clone <your-repo>
cd <repo>/data
npm install
```

All app code lives in `data/`, so run every `npm`, `npx` and `supabase` command from there. On Vercel, set **Project Settings → General → Root Directory** to `data`.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → API → anon / public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → API → service_role (**server-only, never expose**) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

### 3. Apply database migrations

**Option A — Supabase Dashboard SQL Editor (quickest):**

1. Go to your Supabase project → SQL Editor
2. Run `supabase/migrations/0001_profiles.sql`
3. Run `supabase/migrations/0002_friends.sql`
4. Run `supabase/migrations/0003_rps.sql`
5. Run `supabase/migrations/0004_challenges.sql`
6. Run `supabase/migrations/0005_matchmaking.sql`
7. Run `supabase/migrations/0006_friend_invites.sql`
8. Run `supabase/migrations/0007_rps_first_to_five_and_timer.sql`
9. Run `supabase/migrations/0008_challenge_lifecycle.sql`
10. Run `supabase/migrations/0009_challenge_submissions_and_stories.sql`
11. Run the remaining files in number order, `0010_chess.sql` through `0016_ludo.sql` (Ludo)

**Option B — Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 4. Configure Auth redirects

In Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/auth/callback`

For email confirmation to work, Supabase must redirect to `/auth/callback` after the user clicks the link.

### 5. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

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
```

Inside `data/`:

```
src/
├── app/
│   ├── (auth)/          # Login, Signup pages
│   ├── (protected)/     # Dashboard, Profile, Friends, History, Play, Challenges, Matchmaking (requires auth)
│   ├── api/
│   │   ├── auth/        # Logout, Delete Account
│   │   ├── friends/     # Send, Respond, Cancel, Remove
│   │   ├── rps/         # Invite, Respond, Cancel, Move, State, History
│   │   ├── challenges/  # Assign, Respond, Match, List
│   │   └── matchmaking/ # Join, Status, Cancel
│   ├── auth/callback/   # Email verification code exchange
│   ├── games/           # Public games page
│   └── globals.css      # EVOAIQU design system
├── components/
│   ├── auth/            # LoginForm, SignupForm
│   ├── challenges/      # ChallengesClient, ChallengeSelectionModal, MatchChallengeCard
│   ├── dashboard/       # DashboardClient
│   ├── friends/         # FriendsClient (search, tabs, actions)
│   ├── landing/         # LandingPage
│   ├── matchmaking/     # RandomMatchmakingCard
│   ├── profile/         # ProfileEditForm
│   ├── rps/             # RpsMatchBoard, RpsInvitesList, ActiveGameLobby, RpsLobby
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── ui/              # Button, Spinner, Alert, Avatar, Badge, EvoIdBadge, …
├── contexts/
│   └── I18nContext.tsx  # EN / Tamil locale provider
├── lib/
│   ├── challenges.ts    # Curated challenge catalog, pure validators, metadata
│   ├── rps.ts           # Pure RPS rules, adjudication, scoring
│   ├── i18n.ts          # Translation strings (EN + Tamil)
│   └── supabase/        # Browser and Server Supabase clients
├── types/
│   └── database.ts      # TypeScript schema & RPC definitions
└── __tests__/           # Milestone 2, 3A, 3B, 4, 5 automated test suites (300 passing tests)
supabase/
└── migrations/
    ├── 0001_profiles.sql    # Profiles table, RLS, trigger, ID generator
    ├── 0002_friends.sql     # Friend requests table, DB functions, RLS
    ├── 0003_rps.sql         # RPS invites, matches, rounds, hidden moves, RPCs
    ├── 0004_challenges.sql  # Challenges table, RLS, assign/respond RPCs
    ├── 0005_matchmaking.sql # Matchmaking queue, user blocks, atomic pairing RPCs
    ├── ...
    └── 0016_ludo.sql        # Ludo matches and online 1 vs 1 state
```

---

## Commands

> **Which server to use:** `npm run dev` (port 3000) recompiles pages as you open them, so clicks take 0.5–4 s. Use it only while editing code. To just use or test the app, run `npm run prod` (builds, then serves on port 3001; clicks take about 0.2–0.5 s) or `npm run start:prod` to reuse the last build.

```bash
npm run dev      # Start dev server (Turbopack)
npm run prod         # Production build, then serve on port 3001
npm run start:prod   # Serve the last production build on port 3001
npm run build    # Production build
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
