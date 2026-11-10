# Show of Hands (Hand Cricket): Feature Teardown

**Date:** 10 November 2026
**Subject:** [playshowofhands.fun](https://playshowofhands.fun), a mobile hand cricket game built by a friend
**Purpose:** a reference for a possible hand cricket game mode in EVOAIQU, alongside Chess and RPS
**Method:** I used the live site in headless Chrome: every public page, one full solo match against the computer (136 balls), and the "Play with Friend" dialog. **No source code was obtained.** The site is a client-rendered single-page app, and the real source has to come from its owner.

---

## 1. Stack Seen From Outside

- Vite-built SPA (hashed `/assets/*.js` bundles), Tailwind-style utility classes, mobile-first layout (about 430px wide)
- Supabase backend (`rpc/get_leaderboard`, a public `avatars` storage bucket)
- Mixpanel analytics
- PWA manifest; fonts are Big Shoulders Display, Inter, and JetBrains Mono

## 2. Navigation (Bottom Bar)

Ground (home) · Pavilion (`/teams`) · Stats (`/stats`) · Leaderboard (`/leaderboard`) · Profile (`/profile`), plus About, Notifications, and `/auth` (sign in, forgot password, create account).

## 3. Home ("Ground")

- "Tonight's fixture": two fixed sides, **Tyrants** vs **Nobles**. The player picks a side.
- Buttons: **Play with Friend** and **Play Solo**. The "Sign in to keep your record" prompt appears on home.
- A rotating cricket quote and both 12-player squads with ratings.
- First-run coach marks ("Got it").

## 4. Squads ("Pavilion", `/teams`)

- 11 + 1 batting order (the 12th player is a Reserve), each with a role (Bat, Leg-spin, Off-spin, Fast, Medium, Seam) and a **Bat / Bowl rating** (for example `68 / 12`).
- Captain (C), vice-captain (VC), and wicketkeeper (WKB) tags.
- Rename the team, tap a player to edit them (a player edit drawer), hold the grip handle to reorder.

## 5. Match Flow (Solo, Against the Computer)

1. **Toss**: call Heads or Tails, a coin-flip animation, then the winner picks **"Bat first: Set a target"** or **"Bowl first: Chase it down"**.
2. **Innings**: **3 overs** a side. The scoreboard shows score/wickets, overs, run rate, and the balls of the current over. The striker and non-striker show runs (balls), and the bowler shows wickets-runs and overs.
3. **Each ball**: a 1–6 number pad (`aria-label="Throw N"`) with a **5-second shot clock**. Both hands reveal with glove animations.
   - Batting: if your number matches the bowler's, you're out. Otherwise you score your number.
   - Bowling: matching the batter takes a wicket.
   - Running out of time while batting gives a dot ball ("No hand from Joseph. Dot ball.").
4. **Bowler selection** when bowling: "One over each. Tap a bowler to start the over." The list shows O-M-R-W figures. The computer picks its own bowlers.
5. **Commentary**: one line per ball that changes with the outcome and player names. 5s get fielding-mishap jokes, wickets vary between LBW, stumped, and caught, and there are new-bowler and new-batter intros.
6. **Innings break**: target, balls left, top score, best bowling, then a **"Defend N"** button.
7. **Chase**: shows "NEED X off Y" and the required run rate (RRR).
8. **Result**: won or lost by N runs or wickets, balls to spare, **Player of the Match** with a one-line blurb, the full scorecard, **Play again**, and **Back to Ground**. It's laid out as a shareable card.
9. Available throughout: a live scorecard (batting R/B/4s/6s/SR, bowling O/R/W/Econ, yet to bat) and pause/resume.

## 6. Multiplayer ("Play with Friend")

- Opening the dialog immediately shows an invite link: `/match?r=<room-uuid>&s=0,1`. The friend plays the other side (Nobles). Two players per match.
- Buttons: **Copy link**, **Start the match**, **Play later**.
- `r` is the room ID. `s=0,1` is probably the side/seat assignment, but that hasn't been confirmed.

## 7. Accounts and Stats

- Guests can play, but nothing is saved. Signing in saves matches and per-ball stats (the "Scorebook" on `/stats`).
- **Leaderboard**: tabs for *With friends* and *All matches*, a top 10 by **win % in friend matches** (ties broken by wins). You need 3 signed-in friend matches to be ranked.
- **Profile ("Kit Bag")**: wins, losses, and record. It links the privacy policy.

## 8. Ideas Worth Borrowing for EVOAIQU

- **Shot clock with auto-resolve on timeout**: fits the existing authoritative timeout system (`0014_game_lifecycle_and_timeouts`).
- **Invite-link rooms**: map onto the existing `/invite` and matchmaking flows.
- **Short matches (3 overs)**: keep games quick and mobile-friendly.
- **Generated commentary plus Player of the Match**: make each match feel like a story, which fits the platform's "every match creates a story" idea, and the result card could lead straight into the dare/challenge flow.
