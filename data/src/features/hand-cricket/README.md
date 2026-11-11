# Hand Cricket

A toss, squads, and a short innings each (the number of overs is picked in the lobby), with hidden throws of 1 to 6. Play a friend online, or play solo against the computer in the browser with no login.

## Where it lives in the app

- Pages: `/play/hand-cricket`, `/play/hand-cricket/[matchId]`, `/play/hand-cricket/solo`
- API: `/api/hand-cricket/create` and `match/[matchId]` with `join`, `cancel`, `squad`, `toss`, `throw`, `timeout`
- Database: migration `0015_hand_cricket.sql`; timeouts and disconnects use the shared lifecycle in `0014`

## Folder map

| Folder | Contents |
|--------|----------|
| `components/` | Lobby, online match board, solo game, shared scoreboard pieces |
| `engine/engine.ts` | Rules, scoring, squads, the computer opponent (pure functions) |
| `engine/snapshot.ts` | Turns a server match snapshot into engine state so online and solo share the scoreboard |
| `server/server.ts` | API helpers: auth, RPC calls, match loading |
| `types.ts` | Match and snapshot types |

## Public entry points

- `index.ts` (client-safe): `HandCricketLobby`, `HandCricketMatchBoard`, `HandCricketSolo`, `HandCricketOpenMatch`
- `server.ts`: server helpers and the validation functions the routes use

Everything else in this folder is internal. Other code imports only these entry points (enforced by `eslint.config.mjs` and `src/__tests__/architecture-boundaries.test.ts`).

## Working on this game

- The solo game runs entirely in the browser, so engine changes affect solo and online play together.
- The online board embeds the dare flow through `@/features/dare-game` (including `useMatchChallenge`).
- Disconnect and reconnect reporting comes from `shared/game/useMatchConnection`, shared with Ludo and Hand Cricket.

## Tests

`__tests__/hand-cricket.test.ts` covers the engine, snapshots, routes and the migration.
