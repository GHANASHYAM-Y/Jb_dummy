# Tic Tac Toe

Three in a row on a 3 by 3 board. Play the computer (easy, medium or hard) or a friend on the same device. Runs entirely in the browser with no login.

## Where it lives in the app

- Page: `/play/tic-tac-toe` (public)
- No API and no database

## Folder map

| Folder | Contents |
|--------|----------|
| `components/TicTacToe.tsx` | The whole game screen: mode, difficulty, board, score |
| `engine/engine.ts` | Rules, win detection and the computer opponent (pure functions) |

## How the computer plays

- **Hard** always plays a perfect move (minimax with alpha-beta pruning), so it never loses.
- **Medium** plays the perfect move 60% of the time, otherwise a random one.
- **Easy** always plays a random move.
- The player who opens alternates every round.

## Public entry points

- `index.ts` (client-safe): `TicTacToe`

Everything else in this folder is internal (enforced by `eslint.config.mjs` and `src/__tests__/architecture-boundaries.test.ts`).

## Not built yet

- Online play against a friend (needs a table and RPCs like Rock Paper Scissors)
- Win/loss history (the score here resets when you leave the page)

## Tests

`__tests__/tic-tac-toe.test.ts` covers the engine and checks the computer cannot be beaten on hard.
