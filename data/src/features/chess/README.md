# Speed Chess

Online chess against a friend. Moves are checked on the server with chess.js, and the clock is authoritative on the server. The winner can pick a dare for the loser.

## Where it lives in the app

- Pages: `/play/chess`, `/play/chess/[matchId]` (`src/app/(protected)/play/chess`)
- API: `/api/chess/create`, `/api/chess/match/[matchId]` plus `move`, `draw`, `resign`, `timeout` (`src/app/api/chess`)
- Database: migrations `0010_chess.sql`, `0011_chess_rpcs.sql`, `0012_chess_rpc_security.sql`; timeouts and disconnects use the shared lifecycle in `0014`

## Folder map

| Folder | Contents |
|--------|----------|
| `components/` | Lobby, board, pieces, match screen, victory modal |
| `engine/` | `engine.ts`: legal moves, move validation, clocks, draw claims (pure functions) |
| `sound/` | Synthesized move/capture/check sounds (no audio files) |
| `types.ts` | Match state and board types |

## Public entry points

- `index.ts` (client-safe): `ChessLobby`, `ChessMatchBoard`
- `server.ts` (API routes and server pages): engine functions and `ChessMatchState`

Everything else in this folder is internal. Other code imports only these entry points (enforced by `eslint.config.mjs` and `src/__tests__/architecture-boundaries.test.ts`).

## Working on this game

- Rules live in `engine/engine.ts`; keep them free of React and database code.
- The victory modal embeds the dare flow through `@/features/dare-game`. That is the only other feature this game may import.

## Tests

`__tests__/chess-engine.test.ts` (rules) and `chess-server-moves.test.ts` (routes and migrations).
