# Rock, Paper, Scissors (with random matchmaking)

First to 5, 10-second rounds, hidden moves revealed together. Challenge a friend or use random matchmaking, which currently supports only this game.

## Where it lives in the app

- Pages: `/play/rps`, `/play/rps/[matchId]`, `/history`, `/matchmaking`
- API: `/api/rps/*` and `/api/matchmaking/*` (`join`, `status`, `cancel`)
- Database: migrations `0003_rps.sql`, `0005_matchmaking.sql`, `0007_rps_first_to_five_and_timer.sql`

## Folder map

| Folder | Contents |
|--------|----------|
| `components/` | Lobby, match board, duel stage, round timer, confetti, history, hand graphic |
| `engine/rps.ts` | Move validation, round adjudication, scoring (pure functions) |
| `matchmaking/` | Random matchmaking card and floating "searching" indicator |
| `sound/RpsAudio.ts` | Synthesized sounds and haptics with a mute toggle |

## Public entry points

- `index.ts` (client-safe): `RpsLobby`, `RpsMatchBoard`, `HistoryClient`, `RandomMatchmakingCard`, `HandGraphic` (the landing page reuses the hand graphic)
- `server.ts`: `isValidMove` (used by the move routes)

Everything else in this folder is internal. Other code imports only these entry points (enforced by `eslint.config.mjs` and `src/__tests__/architecture-boundaries.test.ts`).

## Working on this game

- Matchmaking lives here because the API only accepts `rps` today. If another game gets matchmaking, move the generic parts to `shared/`.
- The match board embeds the dare flow through `@/features/dare-game`.

## Tests

`__tests__/`: engine and migration (`milestone3b-rps`), move matrix, first-to-five timer, resumption, loading, timeout route, matchmaking and the floating indicator.
