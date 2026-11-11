# Yet to do

- Google sign-in (Google SSO): configure the Google OAuth provider and finish integration later.

## Planned ideas

Assumes the app already has chess, Hand Cricket and Ludo, plus challenges, blocking and accounts.

### Games that suit a two-player, turn-based setup

- **Tic-Tac-Toe** is the simplest to add and good for a first new game.
- **Connect Four** has easy rules and works well for turn-based realtime play.
- **Checkers (Draughts)** is similar to chess but simpler.
- **Rock Paper Scissors** is very quick to build, and it's close to Hand Cricket.
- **Snakes and Ladders** is a dice game like Ludo, so parts of its engine can be reused.
- **Battleship** has hidden boards, so it needs careful handling of hidden state on the server.
- **Dots and Boxes**, **Reversi (Othello)** and **Backgammon** are more options if you want more depth.
- **Trivia or Quiz duels** are fast head-to-head rounds, and they're easy to add content to.
- **Word games** like Hangman, or a two-player word guess, for something different.

### Features beyond new games

- **Leaderboards and ratings:** wins and losses, or Elo for chess.
- **In-game chat and emoji reactions.**
- **Friends list and invite links,** so you can challenge someone directly.
- **Spectator mode,** so others can watch a live game.
- **Rematch button** and **game history** with replays.
- **Notifications** when it's your turn or you're challenged.
- **Matchmaking queue** for playing random opponents.
- **Profile avatars, achievements and badges.**
- **Tournaments** with brackets.

### Quality and polish

- Tests for each game's rules. Vitest is already set up, with some Ludo tests.
- A mobile-friendly layout and sound effects.
- Dark mode and accessibility checks.
- Rate limiting on the API routes, since the app handles accounts and real-time play.

### Suggested first step

Start with Tic-Tac-Toe or Connect Four. They're quick to build and would show how a new game plugs into the existing challenge and realtime flow.

## Fix signup database error

### Reported symptom

The signup page shows:

> Unable to complete account registration due to a server error. Please try again later.

The browser's Supabase Auth signup request returned HTTP `500`:

```json
{
  "code": "unexpected_failure",
  "message": "Database error saving new user"
}
```

### What is known

- Signup calls Supabase Auth directly from `src/core/auth/SignupForm.tsx`; there is no application signup API route.
- The error happens during Supabase user creation, before the page advances to the existing six-digit email OTP form.
- The `auth.users` trigger in `supabase/migrations/0001_profiles.sql` creates a `public.profiles` row and generates an EVOAIQU ID.
- The HTTP response does not identify which database operation failed. The exact cause is **not confirmed**; do not assume the profile trigger or change production SQL without checking logs.
- No production database migrations or Supabase Auth settings were changed during investigation.

### Investigation and remediation steps

1. In the correct Supabase project, open **Logs Explorer → Auth Logs** and find the failed signup by timestamp.
2. Open **Logs Explorer → Postgres Logs** and inspect entries from the same time. Record the SQL error, SQLSTATE if shown, and function/trigger context.
3. Check that the deployed project has the expected `public.profiles` table, `public.generate_evoora_id()` and `public.handle_new_user()` functions, and the `on_auth_user_created` trigger on `auth.users`.
4. Compare the deployed schema and function definitions with `supabase/migrations/0001_profiles.sql`. Check for missing migrations, incompatible constraints, permissions, and trigger/function errors.
5. Apply only the minimal, reviewed database fix after confirming the log cause and getting approval for any production change. Do not remove the OTP verification flow or expose database details in client-facing errors.
6. Retry in a non-production environment. Verify new-user creation, profile creation, OTP delivery and verification, invalid/expired OTP handling, resend behavior, and duplicate-email handling. Also regression-test login and logout.

### Safety and privacy

- Never place real email addresses, project URLs/refs, API keys, passwords, OTPs, or access tokens in this note.
- Do not commit credentials or paste secrets into issue trackers or chat.
- The current generic signup error is intentional to avoid exposing internal database details. Keep detailed diagnostic information in server/Supabase logs only.

### Current status

**Blocked pending the matching Supabase Auth and Postgres log entries.** The provided response confirms a database-side signup failure, but not its exact root cause. Once the logs identify the failing operation, document the confirmed cause and the approved fix here.
