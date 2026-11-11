const SIGNAL_FLAGS_API =
  "https://en.wikipedia.org/w/api.php?action=parse&page=International_maritime_signal_flags&prop=text&format=json&origin=*";

function extractFlagNames(html) {
  const parsedPage = new DOMParser().parseFromString(html, "text/html");
  const flagTable = Array.from(parsedPage.querySelectorAll("table.wikitable")).find(
    (table) =>
      table.querySelector("caption")?.textContent.trim() ===
      "Letter flags and ICS meanings",
  );

  if (!flagTable) {
    throw new Error("Signal flag alphabet table was not found in the source.");
  }

  const names = new Set();
  for (const header of flagTable.querySelectorAll('th[scope="row"][id]')) {
    if (!/^[A-Z]$/.test(header.id)) continue;

    for (const lineBreak of header.querySelectorAll("br")) {
      lineBreak.replaceWith(" ");
    }

    const match = header.textContent.replace(/\s+/g, " ").trim().match(/^[A-Z]\s+([A-Za-z]+)$/);
    if (match) names.add(match[1].toLowerCase());
  }

  if (names.size !== 26) {
    throw new Error(`Expected 26 signal flag names, but found ${names.size}.`);
  }

  return names;
}

export async function fetchSignalFlagMatcher(signal) {
  const response = await fetch(SIGNAL_FLAGS_API, { signal });
  if (!response.ok) {
    throw new Error(`Signal flag source request failed: ${response.status}`);
  }

  const payload = await response.json();
  const sourceTitle = payload?.parse?.title;
  const sourceHtml = payload?.parse?.text?.["*"];
  if (
    sourceTitle !== "International maritime signal flags" ||
    typeof sourceHtml !== "string"
  ) {
    throw new Error("Signal flag source returned an invalid page.");
  }

  const names = extractFlagNames(sourceHtml);
  const alternatives = Array.from(names)
    .sort((first, second) => second.length - first.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const matcher = new RegExp(
    `(^|[^\\p{L}\\p{N}_])(?:${alternatives})(?=$|[^\\p{L}\\p{N}_])`,
    "iu",
  );

  return (password) => matcher.test(password);
}
