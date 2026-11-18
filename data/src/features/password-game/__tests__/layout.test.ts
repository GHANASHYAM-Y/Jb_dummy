/**
 * Password Game — Focus Console layout with character tiles and an event log.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { classifyCharacter, toTiles, TILE_LABEL } from "../utils/characters";
import { describeRules, formatElapsed, CHAOS_MESSAGES } from "../hooks/useEventLog";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", rel), "utf-8").replace(/\r\n/g, "\n");
const game = read("components/PasswordGame.jsx");

describe("character tiles", () => {
  it("classifies characters the same way the game counts them", () => {
    expect(classifyCharacter("a")).toBe("vowel");
    expect(classifyCharacter("E")).toBe("vowel");
    expect(classifyCharacter("y")).toBe("consonant"); // the game does not count y as a vowel
    expect(classifyCharacter("M")).toBe("consonant");
    expect(classifyCharacter("7")).toBe("digit");
    expect(classifyCharacter("!")).toBe("symbol");
    expect(classifyCharacter("😀")).toBe("symbol");
    expect(classifyCharacter(" ")).toBe("space");
  });

  it("makes one tile per Unicode code point, so an emoji is one tile", () => {
    expect(toTiles("Ab😀1")).toEqual([
      { character: "A", kind: "vowel" },
      { character: "b", kind: "consonant" },
      { character: "😀", kind: "symbol" },
      { character: "1", kind: "digit" },
    ]);
    expect(toTiles("")).toEqual([]);
  });

  it("matches the sample from the design: Mars!Wednesday17", () => {
    const kinds = toTiles("Mars!Wednesday17").map((t) => t.kind);
    expect(kinds.filter((k) => k === "vowel")).toHaveLength(4);
    expect(kinds.filter((k) => k === "consonant")).toHaveLength(9);
    expect(kinds.filter((k) => k === "digit")).toHaveLength(2);
    expect(kinds.filter((k) => k === "symbol")).toHaveLength(1);
  });

  it("has a short label for every kind", () => {
    for (const kind of ["vowel", "consonant", "digit", "symbol", "space"]) {
      expect(TILE_LABEL[kind as keyof typeof TILE_LABEL]).toMatch(/^[A-Z]{3}$/);
    }
  });
});

describe("event log text", () => {
  const rule = (id: number | string, category: string, text: string) => ({ id, category, text });

  it("formats elapsed time as mm:ss", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(65_400)).toBe("01:05");
    expect(formatElapsed(-50)).toBe("00:00");
  });

  it("describes a single rule with its text", () => {
    expect(describeRules("solved", [rule(5, "Space", "Must contain a planet name")])).toBe(
      "Rule 5 solved: Must contain a planet name",
    );
    expect(describeRules("broken", [rule("chaos-fire", "Chaos", 'Contains the word "fire"')])).toBe(
      'Chaos event broken: Contains the word "fire"',
    );
  });

  it("groups several rules from one edit into one entry", () => {
    expect(
      describeRules("broken", [rule(1, "Foundation", "a"), rule(2, "Foundation", "b"), rule("chaos-ice", "Chaos", "c")]),
    ).toBe("3 rules broken: #1, #2, event");
  });

  it("has a message for every phase the chaos hooks use", () => {
    expect(Object.keys(CHAOS_MESSAGES.fire).sort()).toEqual(["active", "completed", "failed"]);
    expect(Object.keys(CHAOS_MESSAGES.water).sort()).toEqual(["active", "armed", "cleared", "draining", "failed", "warning"]);
    expect(Object.keys(CHAOS_MESSAGES.lightning).sort()).toEqual(["armed", "cleared", "ended", "targeting", "waiting"]);
    expect(Object.keys(CHAOS_MESSAGES.ice).sort()).toEqual(["armed", "cleared", "shattered", "targeting"]);
  });
});

describe("Focus Console layout wiring", () => {
  it("keeps the input behaviour the chaos effects rely on", () => {
    expect(game).toContain("onBeforeInput={capturePasswordEdit}");
    expect(game).toContain("onChange={(e) => updatePassword(e.target.value)}");
    expect(game).toContain('className={`password-input ${fire.phase === "active" ? "password-burning" : ""}`}');
    for (const effect of ["<FireEffect {...fire} />", "<LightningEffect {...lightning} password={password} />", "<IceEffect {...ice} password={password} />"]) {
      expect(game).toContain(effect);
    }
  });

  it("still shows the full-screen fire failure with a retry", () => {
    expect(game).toContain('<div className="app-container fire-game-over">');
    expect(game).toContain("onClick={fire.retry}");
    expect(game).toContain("onClick={water.retry}");
  });

  it("renders tiles, the legend, progress segments, the event log and solved rules", () => {
    expect(game).toContain('className={`pw-tile pw-tile-${kind}`}');
    expect(game).toContain('aria-label="Character counts"');
    expect(game).toContain('className={`pw-segment pw-segment-${state}`}');
    expect(game).toContain("useEventLog({");
    expect(game).toContain('id="pw-log-title"');
    expect(game).toContain('id="pw-solved-list"');
  });

  it("shows broken rules as errors together with the current rule", () => {
    expect(game).toContain("getRuleView(evaluatedRules, furthestIndex)");
    expect(game).toContain("if (reachedIndex > furthestIndex) setFurthestIndex(reachedIndex);");
    expect(game).toContain("{hasBroken && (");
    expect(game).toContain("Broken by your last edit");
    expect(game).toContain('id="pw-current-rule"');
    expect(game).toContain("The next rule unlocks once the broken");
  });

  it("loads live data for any rule on screen, not only the lowest failing one", () => {
    expect(game).toContain("const shownRuleIds = new Set([currentRule?.id, ...brokenRules.map(({ rule }) => rule.id)]);");
    for (const flag of ["needWordCollision", "needSignalFlags", "needMorseCode", "needNatoAlphabet", "needGreekWords"]) {
      expect(game).toContain(`if (!${flag} || liveData.`);
    }
  });

  it("shows vowels, consonants, special characters, digits and the total", () => {
    for (const label of ["Vowels", "Consonants", "Special characters", "Digits", "Total characters"]) {
      expect(game).toContain(`<small>${label}</small>`);
    }
  });

  it("offers every live-data retry", () => {
    for (const retry of ["retryLiveData", "retrySignalFlagSource", "retryMorseCodeSource", "retryNatoAlphabetSource", "retryGreekEnglishWordSources"]) {
      expect(game).toContain(`retry: ${retry}`);
    }
  });
});
