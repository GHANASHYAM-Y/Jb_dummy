# Ludo

Classic rules: roll a 6 to leave the yard, capture rivals off the safe squares, race four tokens home. Play 1 to 3 bots in the browser with no login, or 1 vs 1 online with a friend. Online games are checked on the server, and a player who lets the 20-second clock run out three turns in a row forfeits.

## Where it lives in the app

- Pages: `/play/ludo`, `/play/ludo/[matchId]`, `/play/ludo/bots`
- API: `/api/ludo/create` and `match/[matchId]` with `join`, `cancel`, `roll`, `move`, `timeout`
- Database: migrations `0016_ludo.sql` and `0017_ludo_forfeit_and_cleanup.sql`

## Folder map

| Folder | Contents |
|--------|----------|
| `components/` | Lobby, board, dice, bot game, online match screen |
| `engine/engine.ts` | Rules, captures and the bot (pure functions) |
| `engine/board.ts` | Board geometry for drawing |
| `server/server.ts` | Planning and saving a move on the server, API helpers |
| `types.ts` | Match and snapshot types |

## Public entry points

- `index.ts` (client-safe): `LudoLobby`, `LudoMatchBoard`, `LudoBotGame`, `LudoOpenMatch`
- `server.ts`: server helpers used by the API routes

Everything else in this folder is internal. Other code imports only these entry points (enforced by `eslint.config.mjs` and `src/__tests__/architecture-boundaries.test.ts`).

## Working on this game

- The server rolls the dice and validates every move; the browser never sends a board.
- The online board embeds the dare flow through `@/features/dare-game`.

## Tests

`__tests__/`: `ludo-engine` (rules), `ludo-api` (routes, forfeit, migrations 0016 and 0017), `ludo-integration` (wiring).
