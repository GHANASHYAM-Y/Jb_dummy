const NATO_ALPHABET_API =
  "https://en.wikipedia.org/w/api.php?action=parse&page=NATO_phonetic_alphabet&prop=text&format=json&origin=*";

let matcherPromise;

function extractCodewords(html) {
  const parsedPage = new DOMParser().parseFromString(html, "text/html");
  const alphabetTable = Array.from(parsedPage.querySelectorAll("table.wikitable")).find(
    (table) => {
      const headers = Array.from(table.querySelectorAll("th")).map((header) =>
        header.textContent.trim(),
      );
      return headers.includes("Symbol") && headers.includes("Code word");
    },
  );

  if (!alphabetTable) {
    throw new Error("NATO phonetic alphabet table was not found.");
  }

  const letters = new Set();
  const codewords = new Set();
  for (const row of alphabetTable.querySelectorAll("tr")) {
    const cells = Array.from(row.children).filter((cell) =>
      ["TH", "TD"].includes(cell.tagName),
    );
    if (cells.length < 2) continue;

    const letter = cells[0].textContent.trim().toUpperCase();
    const codeword = cells[1].textContent.trim().match(/^[A-Za-z]+/)?.[0]?.toLowerCase();
    if (!/^[A-Z]$/.test(letter) || !/^[a-z]+$/.test(codeword ?? "")) continue;

    letters.add(letter);
    codewords.add(codeword);
  }

  if (letters.size !== 26 || codewords.size !== 26) {
    throw new Error(
      `Expected 26 distinct NATO phonetic codewords, but found ${codewords.size}.`,
    );
  }

  return codewords;
}

async function loadMatcher(signal) {
  const response = await fetch(NATO_ALPHABET_API, { signal });
  if (!response.ok) {
    throw new Error(`NATO phonetic alphabet source failed: ${response.status}`);
  }

  const payload = await response.json();
  const sourceHtml = payload?.parse?.text?.["*"];
  if (payload?.parse?.title !== "NATO phonetic alphabet" || typeof sourceHtml !== "string") {
    throw new Error("NATO phonetic alphabet source returned an invalid page.");
  }

  const codewords = extractCodewords(sourceHtml);
  const alternatives = Array.from(codewords)
    .sort((first, second) => second.length - first.length)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const matcher = new RegExp(
    `(^|[^\\p{L}\\p{N}_])(?:${alternatives})(?=$|[^\\p{L}\\p{N}_])`,
    "iu",
  );

  return (password) => matcher.test(password);
}

export function fetchNatoCodewordMatcher(signal) {
  if (!matcherPromise) {
    matcherPromise = loadMatcher(signal).catch((error) => {
      matcherPromise = undefined;
      throw error;
    });
  }

  return matcherPromise;
}
