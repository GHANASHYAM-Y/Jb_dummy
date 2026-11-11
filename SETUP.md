# EVOAIQU — Setup Guide

How to get this project running on a new laptop, from nothing to a working app.
Want to know what the project *is* and where things live? Read [ABOUT.md](ABOUT.md) first.

**Time needed:** about 20 minutes, most of it creating the Supabase project.

---

## 1. Install the tools

| Tool | Version | Check it with | Get it from |
|------|---------|---------------|-------------|
| Node.js | **20.9 or newer** (22 works) | `node -v` | https://nodejs.org |
| npm | comes with Node | `npm -v` | — |
| Git | any recent | `git --version` | https://git-scm.com |
| A Supabase account | free tier is enough | — | https://supabase.com |

You do **not** need Docker, Python or a local database. The database lives in Supabase.

---

## 2. Get the code

```bash
git clone https://github.com/GHANASHYAM-Y/Jb_dummy.git
cd Jb_dummy
```

> **Important:** the app is inside the `data/` folder, not the repo root.
> Every `npm`, `npx` and `supabase` command below is run from `data/`.

---

## 3. Quick path (script)

The scripts check your Node version, install the packages and create `data/.env.local` for you.

| System | Command (from the repo root) |
|--------|------------------------------|
| Windows (PowerShell) | `powershell -ExecutionPolicy Bypass -File .\setup.ps1` |
| macOS / Linux / Git Bash | `bash setup.sh` |

They stop before the Supabase steps, because those need your own keys. Continue at **step 4**.

Prefer to do it by hand?

```bash
cd data
npm install
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
```

---

## 4. Create the Supabase project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Pick a name, a region close to you, and a database password. Save the password somewhere.
3. Wait about two minutes until the project says it is ready.
4. Open **Project Settings → API** (or **API Keys**). You will copy three things in the next step.

---

## 5. Fill in `data/.env.local`

Open `data/.env.local` and set these values:

| Variable | Where to get it | Secret? |
|----------|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → **Project URL** | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → **anon / public** key | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role** key | **Yes. Server only.** |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local work | No |
| `CRON_SECRET` | Make up any long random string | **Yes** |

Generate a `CRON_SECRET` with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

> Never commit `.env.local`. It is already in `.gitignore`.
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is accepted instead of the anon key if your project uses the newer key format.

The `SUPABASE_SERVICE_ROLE_KEY` is **required for online Ludo, Chess, Hand Cricket and account deletion**. Those routes check every move on the server and write through the service role.

---

## 6. Create the database tables

The database is built by 17 SQL files in `data/supabase/migrations/`. **Run them in number order, each once.**

| # | File | Adds |
|---|------|------|
| 1 | `0001_profiles.sql` | Profiles, EVOAIQU IDs, signup trigger |
| 2 | `0002_friends.sql` | Friend requests and friendships |
| 3 | `0003_rps.sql` | Rock Paper Scissors matches |
| 4 | `0004_challenges.sql` | Dares |
| 5 | `0005_matchmaking.sql` | Random matchmaking, blocked users |
| 6 | `0006_friend_invites.sql` | Invite links |
| 7 | `0007_rps_first_to_five_and_timer.sql` | RPS scoring and turn timer |
| 8 | `0008_challenge_lifecycle.sql` | Dare states |
| 9 | `0009_challenge_submissions_and_stories.sql` | Dare videos, stories, private storage bucket |
| 10 | `0010_chess.sql` | Chess tables |
| 11 | `0011_chess_rpcs.sql` | Chess functions |
| 12 | `0012_chess_rpc_security.sql` | Chess security fixes |
| 13 | `0013_story_maintenance_rpc_security.sql` | Story cleanup security |
| 14 | `0014_game_lifecycle_and_timeouts.sql` | Timeouts, disconnects, forfeits (all games) |
| 15 | `0015_hand_cricket.sql` | Hand Cricket |
| 16 | `0016_ludo.sql` | Ludo online matches |
| 17 | `0017_ludo_forfeit_and_cleanup.sql` | Ludo forfeit after 3 missed turns, cleanup trigger |

**Option A: the Supabase website (easiest).**
Open your project, go to **SQL Editor → New query**, paste one file, press **Run**, and repeat for the next file. Wait for "Success" each time.

**Option B: the Supabase CLI.**

```bash
cd data
npx supabase login
npx supabase link --project-ref <your-project-ref>   # the ref is in your project URL
npx supabase db push
```

If a file errors, stop and fix it before running the next one. Later files depend on earlier ones.

---

## 7. Set up sign-in redirects

In Supabase go to **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** add `http://localhost:3000/auth/callback`

Without this, the email confirmation link will not bring the user back to the app.

---

## 8. Run it

```bash
cd data
npm run dev
```

Open http://localhost:3000.

There is also a Windows helper, `start-servers.bat` in the repo root. It installs packages if needed, then runs a dev server (port 3000) and a production-style server (port 3001, which builds first and takes a couple of minutes) together in one window. Press Ctrl+C to stop both.

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server on port 3000. Pages compile when you first open them, so the first click on a page is slow. Use this while editing code. |
| `npm run prod` | Builds, then serves on port 3001. Much faster to click through. Use this to test or demo. |
| `npm run start:prod` | Serves the last build on port 3001 without rebuilding. |
| `npm run build` | Production build only. |
| `npm test` | Runs the automated tests once. |
| `npm run lint` | Style and mistake check. |
| `npx tsc --noEmit` | Type check. |

---

## 9. Check that it works

Work through this list. Each item proves one part of the setup.

- [ ] `/` , `/games`, `/about` open. This proves Node and the packages are fine.
- [ ] `/play/password-game` and `/play/ludo/bots` open and play **without** logging in.
- [ ] `/signup` creates an account and sends a confirmation email or code. This proves `.env.local` and the redirect settings.
- [ ] After login, `/dashboard` shows your **EVO-XXXXXX** ID. This proves migration 0001 and its signup trigger.
- [ ] Add a second account as a friend (use a second browser or a private window), then start an online match. This proves the service-role key and the game migrations.

---

## Running with no Supabase keys

You can still start the app without `.env.local`. Public pages and the solo games (Password Game, Ludo vs bots, Hand Cricket solo) work. Anything that needs an account or a friend will not.
You will see "Missing Supabase environment variables" warnings in the terminal. That is expected.

---

## Troubleshooting

| Problem | Likely cause and fix |
|---------|----------------------|
| `npm: command not found` / `node` not found | Install Node.js, then open a **new** terminal. |
| `npm install` fails on an old Node | Run `node -v`. You need 20.9 or newer. |
| `ENOENT package.json` | You are in the repo root. Run `cd data` first. |
| "Missing Supabase environment variables" | `data/.env.local` is missing, misspelled, or the dev server was not restarted after you edited it. Restart `npm run dev`. |
| Signup says "Unable to complete account registration due to a server error" | Migration `0001_profiles.sql` did not run, or ran with an error. See `support/Yet_To_Do/Yet_to_do.md` for the investigation notes on this exact error. |
| Confirmation email link goes to the wrong place | Step 7: Site URL and Redirect URLs. |
| Online Ludo says "not available right now" | `SUPABASE_SERVICE_ROLE_KEY` is missing or wrong. |
| "function ... does not exist" in a game | A migration was skipped. Re-check step 6 in order, including 0017. |
| Port 3000 already in use | Another app uses it. Run `npx next dev -p 3005` instead. |
| 8 tests fail on `npm test` | Known and unrelated to your setup. They are in `challenge-submission-flow`, `game-lobby-floating-indicator`, `milestone3b-rps`, `milestone4-challenges` and `milestone5-matchmaking`, and they check older SQL text. They fail on a clean checkout too. |

---

## Deploying (optional)

- Host on **Vercel**. In **Project Settings → General**, set **Root Directory** to `data`.
- Add the same five variables from step 5 in Vercel, using your real site address for `NEXT_PUBLIC_APP_URL`.
- Add that address to the Supabase **Redirect URLs** too.
- `data/vercel.json` already schedules the daily story cleanup (`/api/challenges/stories/cleanup`). It authenticates with `CRON_SECRET`.
- Game timeout cleanup is `POST /api/games/timeout/cleanup` with header `Authorization: Bearer <CRON_SECRET>`. Something must call it regularly in production. Local development does not need it.
