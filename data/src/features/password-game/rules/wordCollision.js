import dictionaryWords from "an-array-of-english-words" with { type: "json" };
import profaneWords from "profane-words";

const unsuitableWords = new Set(profaneWords);
const englishWords = new Set(
  dictionaryWords.filter(
    (word) => /^[a-z]{3,20}$/.test(word) && !unsuitableWords.has(word),
  ),
);
let maxEnglishWordLength = 0;

for (const word of englishWords) {
  maxEnglishWordLength = Math.max(maxEnglishWordLength, word.length);
}

export function hasWordCollision(password) {
  const text = password.toLowerCase();
  const wordsByOverlapStart = new Map();

  for (let start = 0; start < text.length; start += 1) {
    if (text[start] < "a" || text[start] > "z") continue;

    for (
      let end = start + 1;
      end <= text.length && end - start <= maxEnglishWordLength;
      end += 1
    ) {
      const character = text[end - 1];
      if (character < "a" || character > "z") break;

      const word = text.slice(start, end);
      if (word.length < 3 || !englishWords.has(word)) continue;

      const occurrence = { word, start, end };
      for (let overlapStart = start; overlapStart <= end - 3; overlapStart += 1) {
        const overlappingWords = wordsByOverlapStart.get(overlapStart);

        if (overlappingWords) {
          for (const other of overlappingWords) {
            const isContained =
              (occurrence.start <= other.start && occurrence.end >= other.end) ||
              (other.start <= occurrence.start && other.end >= occurrence.end);
            if (other.word !== occurrence.word && !isContained) return true;
          }
        } else {
          wordsByOverlapStart.set(overlapStart, []);
        }

        wordsByOverlapStart.get(overlapStart).push(occurrence);
      }
    }
  }

  return false;
}
