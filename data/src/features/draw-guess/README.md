# Draw & Guess

A Pictionary-style game for two friends. One player gets a secret word and draws it; the other types guesses. 4 rounds, roles swap every round, the most points wins.

## Where it lives in the app

- Pages: `/play/draw-guess` (lobby: create a room, join with a code) and `/play/draw-guess/[roomId]` (the game)
- API: `/api/draw-guess/create`, `join`, and `room/[roomId]` with `advance` and `guess`
- Database: migration `0018_draw_guess.sql` (rooms, guesses, word list, five RPCs)

## How it works

- **Rooms, not matches.** A host creates a room and shares a 5-character code. This game does not use `public.matches`, so the shared lifecycle (disconnects, timeouts) and the post-match dare system do not apply yet.
- **The secret word never leaves the server** except to the drawer, or to both players once the round is over. Clients cannot read the room table; everything goes through `draw_get_state`.
- **Guesses are checked on the server** by `draw_guess`. Scores: guesser 50 + seconds left, drawer 25 + half the seconds left.
- **The picture is not stored.** The drawer broadcasts stroke points over a Supabase Realtime channel (`draw-guess:<roomId>`). A guesser who joins late asks the drawer to resend the picture (`sync-req`).
- **Room state is polled** every 1.5 seconds, plus an instant refresh when the other player sends a `poke`. A round whose clock ran out is closed by the next state read.

## Folder map

| Folder | Contents |
|--------|----------|
| `components/` | `DrawGuessLobby` and `DrawGuessBoard` (canvas, tools, guess form, scores) |
| `engine/engine.ts` | Pure helpers: room codes, guess normalising, scoring, stroke validation |
| `server/server.ts` | API helpers: auth, RPC calls, room loading |
| `types.ts` | Room, snapshot and stroke types |

## Public entry points

- `index.ts` (client-safe): `DrawGuessLobby`, `DrawGuessBoard`, `DrawOpenRoom`
- `server.ts`: server helpers and the validation functions the routes use

Everything else in this folder is internal. Other code imports only these entry points (enforced by `eslint.config.mjs` and `src/__tests__/architecture-boundaries.test.ts`).

## Not built yet

- More than 2 players, and inviting a friend directly from the lobby
- Hints that reveal letters over time, a Tamil word list, replaying a drawing
- Dares for the loser and match history (needs integration with `public.matches`)
- A cron call to `cleanup_draw_rooms()` (the function exists; nothing schedules it)

## Tests

`__tests__/draw-guess.test.ts` covers the engine, the routes and the migration.
