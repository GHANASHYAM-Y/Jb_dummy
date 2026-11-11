const GREEK_ALPHABET_API =
  "https://en.wikipedia.org/w/api.php?action=parse&page=Greek_alphabet&prop=text&format=json&origin=*";
const ENGLISH_WIKTIONARY_API = "https://en.wiktionary.org/w/api.php";

let matcherPromise;
const dictionaryResults = new Map();

function extractGreekNames(html) {
  const parsedPage = new DOMParser().parseFromString(html, "text/html");
  const alphabetTable = Array.from(parsedPage.querySelectorAll("table.wikitable")).find(
    (table) => {
      const headers = Array.from(table.querySelectorAll("th")).map((header) =>
        header.textContent.trim(),
      );
      return headers.includes("Letter") && headers.includes("Name");
    },
  );

  if (!alphabetTable) {
    throw new Error("Greek alphabet letter-name table was not found.");
  }

  const names = new Set();
  for (const row of alphabetTable.querySelectorAll("tr")) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) continue;

    const name = cells[1].textContent.split(",")[0].trim().toLowerCase();
    if (/^[a-z]+$/.test(name ?? "")) names.add(name);
  }

  if (names.size !== 24) {
    throw new Error(`Expected 24 Greek letter names, but found ${names.size}.`);
  }

  return names;
}

async function isEnglishDictionaryWord(word, signal) {
  if (!dictionaryResults.has(word)) {
    const url = new URL(ENGLISH_WIKTIONARY_API);
    url.searchParams.set("action", "parse");
    url.searchParams.set("page", word);
    url.searchParams.set("prop", "wikitext");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const request = fetch(url, { signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`English Wiktionary request failed for ${word}: ${response.status}`);
        }

        const payload = await response.json();
        const parsedPage = payload?.parse;
        const wikitext = parsedPage?.wikitext?.["*"];
        if (!parsedPage || parsedPage.title?.toLowerCase() !== word) return false;
        if (typeof wikitext !== "string") {
          throw new Error(`English Wiktionary returned no dictionary text for ${word}.`);
        }

        const sections = wikitext.split(/^==([^=\r\n]+)==[ \t]*$/m);
        let englishSection;
        for (let index = 1; index < sections.length; index += 2) {
          if (sections[index].trim().toLowerCase() === "english") {
            englishSection = sections[index + 1];
            break;
          }
        }

        if (!englishSection) return false;

        return /^===[^=\r\n]+===\s*$/m.test(englishSection) &&
          /^#(?![:*#])\s*\S/m.test(englishSection);
      })
      .catch((error) => {
        dictionaryResults.delete(word);
        throw error;
      });

    dictionaryResults.set(word, request);
  }

  return dictionaryResults.get(word);
}

async function verifyEnglishNames(names, signal) {
  const words = Array.from(names);
  const verified = new Set();
  const batchSize = 4;

  for (let index = 0; index < words.length; index += batchSize) {
    const batch = words.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (word) => [word, await isEnglishDictionaryWord(word, signal)]),
    );

    for (const [word, isVerified] of results) {
      if (isVerified) verified.add(word);
    }
  }

  if (verified.size === 0) {
    throw new Error("The English dictionary did not verify any Greek letter names.");
  }

  return verified;
}

async function loadMatcher(signal) {
  const response = await fetch(GREEK_ALPHABET_API, { signal });
  if (!response.ok) {
    throw new Error(`Greek alphabet source failed: ${response.status}`);
  }

  const payload = await response.json();
  const sourceHtml = payload?.parse?.text?.["*"];
  if (payload?.parse?.title !== "Greek alphabet" || typeof sourceHtml !== "string") {
    throw new Error("Greek alphabet source returned an invalid page.");
  }

  const greekNames = extractGreekNames(sourceHtml);
  const verifiedWords = await verifyEnglishNames(greekNames, signal);
  const alternatives = Array.from(verifiedWords)
    .sort((first, second) => second.length - first.length)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const matcher = new RegExp(
    `(^|[^\\p{L}\\p{N}_])(?:${alternatives})(?=$|[^\\p{L}\\p{N}_])`,
    "iu",
  );

  return (password) => matcher.test(password);
}

export function fetchGreekEnglishWordMatcher(signal) {
  if (!matcherPromise) {
    matcherPromise = loadMatcher(signal).catch((error) => {
      matcherPromise = undefined;
      throw error;
    });
  }

  return matcherPromise;
}
