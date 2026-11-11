# Password Game

A solo puzzle: one password that must satisfy 26 increasingly strange rules while fire, water, lightning and ice events damage it. Runs entirely in the browser with no login. **This module is fully self-contained**: it imports only npm packages and its own files, which lint and a test enforce. It stays plain JavaScript/JSX on purpose.

## Where it lives in the app

- Page: `/play/password-game`
- No API and no database. Some rules fetch live data in the browser (exchange rate, Wikipedia and Wiktionary tables) and show a Retry button if the fetch fails.

## Folder map

| Folder | Contents |
|--------|----------|
| `components/PasswordGame.jsx` | The whole game screen |
| `components/effects/` | Fire, water, lightning and ice effect views |
| `hooks/` | One hook per chaos event (`useFireEvent`, ...) |
| `rules/` | `rules.js` (the rule list) and the data sources some rules use |
| `utils/` | Rule progress and fire helpers |
| `styles/` | CSS, all scoped under `.pw-game` so it cannot leak into the site |

## Public entry points

- `index.ts` (client-safe): `PasswordGame`
- No `server.ts`: there is no server code.

Everything else in this folder is internal. Other code imports only these entry points (enforced by `eslint.config.mjs` and `src/__tests__/architecture-boundaries.test.ts`).

## Working on this game

- Add a rule in `rules/rules.js`; add a hint in `components/PasswordGame.jsx` if it needs one.
- Keep every CSS selector under `.pw-game` and prefix new keyframes with `pw-` (a test checks this).
- Do not import anything from the rest of the app.

## Tests

`__tests__/password-game.test.ts`: rule engine, CSS scoping, route wiring.
