# Memory Match

Flip two cards at a time and find every matching pair. Solo (moves, time, stars, and a personal best saved in the browser) or two players on one device. Runs entirely in the browser with no login.

## Where it lives in the app

- Page: `/play/memory-match` (public)
- No API and no database. The personal best per level is kept in `localStorage`.

## Folder map

| Folder | Contents |
|--------|----------|
| `components/MemoryMatch.tsx` | Setup screen, board, timer, result |
| `engine/engine.ts` | The rules as a reducer: `createGame`, `flip`, `hideMismatch`, scoring (pure functions) |

## Rules

- Levels: easy (6 pairs), medium (8 pairs), hard (12 pairs).
- Two players take turns. Finding a pair keeps your turn; a mismatch passes it.
- The deck is shuffled only after you press Start, never while rendering, so the server and browser agree.

## Public entry points

- `index.ts` (client-safe): `MemoryMatch`

Everything else in this folder is internal (enforced by `eslint.config.mjs` and `src/__tests__/architecture-boundaries.test.ts`).

## Not built yet

- Online play against a friend, and a shared leaderboard
- Card themes beyond emoji

## Tests

`__tests__/memory-match.test.ts` covers the engine, scoring and best-score helpers.
