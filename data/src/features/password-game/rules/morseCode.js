const MORSE_CODE_API =
  "https://en.wikipedia.org/w/api.php?action=parse&page=Morse_code&prop=text&format=json&origin=*";

function extractSingleElementLetters(html) {
  const parsedPage = new DOMParser().parseFromString(html, "text/html");
  const alphabetTable = Array.from(parsedPage.querySelectorAll("table.wikitable")).find(
    (table) => {
      const headers = Array.from(table.querySelectorAll("th")).map((header) =>
        header.textContent.trim(),
      );
      return headers.includes("Category") && headers.includes("Character") && headers.includes("Code");
    },
  );

  if (!alphabetTable) {
    throw new Error("International Morse code alphabet table was not found.");
  }

  const codes = new Map();
  for (const row of alphabetTable.querySelectorAll("tr")) {
    const cells = row.querySelectorAll("td");

    const link = Array.from(row.querySelectorAll('a[href^="/wiki/"]')).find(
      (candidate) => /^\/wiki\/[A-Z]$/.test(candidate.getAttribute("href")),
    );
    const match = link?.getAttribute("href")?.match(/\/wiki\/([A-Z])$/);
    if (!match) continue;

    const symbols = Array.from(cells)
      .map((cell) => cell.querySelector(".morse")?.textContent ?? "")
      .join("")
      .match(/▄+/gu) ?? [];
    if (symbols.length === 0) {
      throw new Error(`International Morse code for ${match[1]} could not be read.`);
    }

    codes.set(match[1], symbols.length);
  }

  if (codes.size !== 26) {
    throw new Error(`Expected 26 Morse letter codes, but found ${codes.size}.`);
  }

  return new Set(
    Array.from(codes, ([letter, elementCount]) =>
      elementCount === 1 ? letter.toLowerCase() : null,
    ).filter(Boolean),
  );
}

export async function fetchSingleElementLetterMatcher(signal) {
  const response = await fetch(MORSE_CODE_API, { signal });
  if (!response.ok) {
    throw new Error(`Morse code source request failed: ${response.status}`);
  }

  const payload = await response.json();
  const sourceTitle = payload?.parse?.title;
  const sourceHtml = payload?.parse?.text?.["*"];
  if (sourceTitle !== "Morse code" || typeof sourceHtml !== "string") {
    throw new Error("Morse code source returned an invalid page.");
  }

  const letters = extractSingleElementLetters(sourceHtml);
  if (letters.size === 0) {
    throw new Error("No single-element Morse letters were found in the source.");
  }

  return (password) =>
    Array.from(password.toLowerCase()).some((character) => letters.has(character));
}
