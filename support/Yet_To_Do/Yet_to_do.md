# Yet to do

- Google sign-in (Google SSO): configure the Google OAuth provider and finish integration later.

## Planned ideas

Assumes the app already has chess, Hand Cricket and Ludo, plus challenges, blocking and accounts.

### Games that suit a two-player, turn-based setup

- **Tic-Tac-Toe** is the simplest to add and good for a first new game.
- **Connect Four** has easy rules and works well for turn-based realtime play.
- **Checkers (Draughts)** is similar to chess but simpler.
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
- **Profile avatars, achievements and badges.**
- **Tournaments** with brackets.

### Quality and polish

- Tests for each game's rules. Vitest is already set up, with some Ludo tests.
- A mobile-friendly layout and sound effects.
- Dark mode and accessibility checks.
- Rate limiting on the API routes, since the app handles accounts and real-time play.

### Suggested first step

Start with Tic-Tac-Toe or Connect Four. They're quick to build and would show how a new game plugs into the existing challenge and realtime flow.

## Badges and achievements (design plan)

### Structure

**Tiers** (same shape in every category, only color and trim change):

| Tier | Color | Trim |
|---|---|---|
| Bronze | warm copper | plain rim |
| Silver | cool grey | plain rim |
| Gold | yellow gold | laurel rim |
| Platinum | icy blue-white | laurel rim and glow |
| Legend | purple and gold | wings and glow |

**Categories:** Milestones, Wins, Chess, Hand Cricket, Ludo, Social, Streaks, Special.

**Per badge, store:** `id`, name, category, tier, how to earn it, image file name (`badge_<id>.png`).

### Badge list (about 30 to start)

**Milestones**
- `first_game`: First Move. Play your first game.
- `games_10`, `games_50`, `games_100`: Regular, Veteran, Centurion. Play 10, 50 and 100 games.
- `first_win`: First Blood. Win your first game.

**Wins**
- `wins_10`, `wins_50`, `wins_100`: Rising Star, Champion, Grandmaster. Win 10, 50 and 100 games.

**Streaks**
- `streak_3`: Hot Streak. Win 3 games in a row.
- `streak_5`: Unstoppable. Win 5 games in a row.
- `streak_10`: Untouchable. Win 10 games in a row.
- `daily_7`: Weekly Warrior. Play 7 days in a row.

**Chess**
- `chess_first`: Pawn Pusher. Win your first chess game.
- `chess_10`: Knight Rider. Win 10 chess games.
- `chess_checkmate_fast`: Blitzkrieg. Checkmate in 20 moves or fewer.
- `chess_comeback`: Phoenix. Win after losing your queen.

**Hand Cricket**
- `cricket_first`: Opening Bat. Win your first Hand Cricket game.
- `cricket_six`: Six Hitter. Score a 6 on 5 balls in a row.
- `cricket_chase`: Chase Master. Win a chase on the last ball.
- `cricket_hat`: Hat-trick. Take 3 wickets in a row.

**Ludo**
- `ludo_first`: Home Run. Win your first Ludo game.
- `ludo_capture`: Token Hunter. Capture 10 opponent tokens in total.
- `ludo_sixes`: Lucky Roller. Roll three 6s in a row.
- `ludo_shutout`: Clean Sweep. Win without having a token captured.

**Social**
- `friend_first`: Better Together. Add your first friend.
- `challenge_sent`: Challenger. Send 10 challenges.
- `rematch`: Revenge. Win a rematch after losing.
- `spectator`: Front Row. Watch 5 live games.

**Special**
- `early_bird`: Founder. Joined during launch.
- `all_games`: All-Rounder. Win at least once in every game.
- `forfeit_never`: Fair Play. Finish 50 games without forfeiting.

### Image specs

- 512 x 512 px, PNG, transparent background.
- Same shape for every badge (shield or circular medal).
- Flat, glossy vector game-badge style with a simple center icon. No text inside the image; the name is shown in the app.
- Same lighting (top-left), line weight and rim design across the whole set.
- Icon must be clear at 64 x 64 px, so avoid fine detail.

### Prompt template (Gemini / ChatGPT)

```
Game achievement badge icon, [shield/circular medal] shape, flat glossy vector
style, [TIER] tier with [COLOR] metallic rim, center icon: [ICON DESCRIPTION],
top-left lighting, clean bold outlines, no text, no letters, transparent
background, centered, 512x512, consistent with a mobile game badge set.
```

Example for `chess_first`:

```
Game achievement badge icon, circular medal shape, flat glossy vector style,
Bronze tier with warm copper metallic rim, center icon: a single chess pawn,
top-left lighting, clean bold outlines, no text, no letters, transparent
background, centered, 512x512, consistent with a mobile game badge set.
```

### Tips for a matching set

- Make the first badge you like, then use it as the reference image ("match this style") for the rest.
- Generate all five tiers of one icon in the same chat so the colors stay consistent.
- If the tool can't produce transparent backgrounds, generate on plain white and remove the background afterward.

### Implementation (after images are ready)

- Name images `badge_<id>.png` and put them in `data/public/badges/`.
- Add a `badges` table and an `earned_badges` table (Supabase migration).
- Add award logic after each game finishes.
- Add a badges section to the profile page.

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
