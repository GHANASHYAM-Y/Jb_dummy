/**
 * Classifies one password character for the colour-coded tiles.
 * Matches the game's own counting: vowels are a, e, i, o, u (y counts as a
 * consonant), and symbols are anything that is not a letter, digit or space.
 */
export function classifyCharacter(character) {
  if (/[aeiou]/i.test(character)) return "vowel";
  if (/[a-z]/i.test(character)) return "consonant";
  if (/\d/.test(character)) return "digit";
  if (/\s/.test(character)) return "space";
  return "symbol";
}

export const TILE_LABEL = { vowel: "VOW", consonant: "CON", digit: "DIG", symbol: "SYM", space: "SPC" };

/** One entry per Unicode code point, so an emoji is one tile. */
export function toTiles(password) {
  return Array.from(password).map((character) => ({ character, kind: classifyCharacter(character) }));
}
