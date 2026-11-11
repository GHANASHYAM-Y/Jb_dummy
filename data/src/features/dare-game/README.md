# Dare Game (challenges, submissions and stories)

After a match the winner picks a dare for the loser. The loser accepts or skips (no penalty), can film a short video, and accepted dares appear as 24-hour stories. This module is used by the four match games (Chess, Hand Cricket, Ludo, Rock Paper Scissors) through its entry point, so it must never import any game.

## Where it lives in the app

- Pages: `/challenges`, `/stories`, `/chat` (stories reel)
- API: `/api/challenges/*` including `assign`, `respond`, `cancel`, `complete`, `match`, `submit`, `submission/*`, `stories/*` (`src/app/api/challenges`)
- Database: migrations `0004_challenges.sql`, `0008_challenge_lifecycle.sql`, `0009_challenge_submissions_and_stories.sql` (includes the private storage bucket for videos)
- Daily cleanup of expired stories: `vercel.json` cron calling `/api/challenges/stories/cleanup`

## Folder map

| Folder | Contents |
|--------|----------|
| `components/` | Challenge picker, per-match dare card, video recorder, winner review, challenges page, stories reel |
| `lib/challenges.ts` | The curated dare catalog, validators and category metadata |

## Public entry points

- `index.ts` (client-safe): `ChallengeSelectionModal`, `MatchChallengeCard` (used by the games), `ChallengesClient`, `ChatStoriesClient` (used by pages)
- `server.ts`: `getChallengeById`, `isValidVisibility` (used by API routes)

Everything else in this folder is internal. Other code imports only these entry points (enforced by `eslint.config.mjs` and `src/__tests__/architecture-boundaries.test.ts`).

## Working on this game

- Do not import any game from here. A game depends on dare-game, never the reverse.
- Keep the public surface small: changing `MatchChallengeCard` or `ChallengeSelectionModal` props affects four games.

## Tests

`__tests__/`: submission flow, submit route, stories realtime lifecycle, stories cleanup route, challenge migration and end-to-end audit tests.
