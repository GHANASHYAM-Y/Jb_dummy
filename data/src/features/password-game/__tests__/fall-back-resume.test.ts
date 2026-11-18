/**
 * Password Game — broken rules are shown TOGETHER with the current rule.
 *
 * If an edit breaks a rule the player already solved, that rule is shown as an
 * error above the rule the player is working on (never instead of it). Other
 * solved rules stay solved. No new rule unlocks until the broken one is fixed.
 * Rules beyond the furthest one reached stay hidden.
 */

import { describe, it, expect } from "vitest";
import { rules } from "../rules/rules";
import { getRuleProgress, getRuleView as getRuleViewJs } from "../utils/ruleProgress";

// The game is plain JavaScript; give its results a shape for the assertions.
interface Rule { id: number | string; category?: string; text?: string }
interface Entry { rule: Rule; passed: boolean }
interface View {
  reachedIndex: number;
  hasBroken: boolean;
  brokenRules: Entry[];
  currentRule?: Rule;
  currentSolved: boolean;
  solvedRules: Entry[];
  segments: { id: number | string; state: string }[];
}
const getRuleView = (evaluated: unknown, furthest: number) =>
  getRuleViewJs(evaluated as never, furthest) as unknown as View;

const ids = (entries: Entry[]) => entries.map(({ rule }) => rule.id).sort((a, b) => Number(a) - Number(b));
const states = (v: View) => Object.fromEntries(v.segments.map((s) => [s.id, s.state]));

/** Plays a sequence of passwords, carrying the furthest index like the component does. */
function play(passwords: string[]) {
  let furthest = 0;
  return passwords.map((password) => {
    const { evaluatedRules } = getRuleProgress(rules, password, {});
    const view = getRuleView(evaluatedRules, furthest);
    furthest = Math.max(furthest, view.reachedIndex);
    return view;
  });
}

describe("broken rule + current rule together (real rules)", () => {
  // "Mars!Abc1" passes rules 1-5 and stops at rule 6 (needs a prime above 10).
  // "Mars!Abcd" removes the digit: rule 2 breaks, rules 3-5 still pass.
  const [onSix, brokeTwo, fixedTwo] = play(["Mars!Abc1", "Mars!Abcd", "Mars!Abc1"]);

  it("reaches rule 6 normally", () => {
    expect(onSix.currentRule?.id).toBe(6);
    expect(onSix.hasBroken).toBe(false);
    expect(ids(onSix.solvedRules)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows rule 2 as broken AND keeps rule 6 as the current rule", () => {
    expect(brokeTwo.hasBroken).toBe(true);
    expect(ids(brokeTwo.brokenRules)).toEqual([2]);
    expect(brokeTwo.currentRule?.id).toBe(6);
    expect(brokeTwo.currentSolved).toBe(false);
  });

  it("keeps rules 3-5 solved, and rule 7 hidden", () => {
    expect(ids(brokeTwo.solvedRules)).toEqual([1, 3, 4, 5]);
    expect(states(brokeTwo)[2]).toBe("broken");
    expect(states(brokeTwo)[3]).toBe("done");
    expect(states(brokeTwo)[6]).toBe("now");
    expect(states(brokeTwo)[7]).toBe("todo");
  });

  it("clears the error once rule 2 is fixed, still on rule 6", () => {
    expect(fixedTwo.hasBroken).toBe(false);
    expect(fixedTwo.brokenRules).toEqual([]);
    expect(fixedTwo.currentRule?.id).toBe(6);
  });
});

describe("getRuleView (synthetic rules)", () => {
  const mk = (passed: boolean[]) =>
    passed.map((p, i) => ({ rule: { id: i + 1, category: "Core", text: `r${i + 1}` }, passed: p }));

  it("solving the current rule while one is broken does not unlock the next rule", () => {
    // Player was on rule 3 (index 2). One edit solves rule 3 and breaks rule 2;
    // rule 4 also happens to pass. (Like breaking 8 while solving 12.)
    const view = getRuleView(mk([true, false, true, true]), 2);
    expect(ids(view.brokenRules)).toEqual([2]);
    expect(view.currentRule?.id).toBe(3);
    expect(view.currentSolved).toBe(true);
    expect(ids(view.solvedRules)).toEqual([1]); // rule 3 is in its card; rule 4 stays hidden
    expect(view.segments.map((s) => s.state)).toEqual(["done", "broken", "now", "todo"]);
  });

  it("after the fix, it moves on to the next unsolved rule", () => {
    const view = getRuleView(mk([true, true, true, false]), 2);
    expect(view.hasBroken).toBe(false);
    expect(view.currentRule?.id).toBe(4);
    expect(view.reachedIndex).toBe(3);
  });

  it("lists every broken rule, in order", () => {
    const view = getRuleView(mk([true, false, true, false, false]), 4);
    expect(ids(view.brokenRules)).toEqual([2, 4]);
    expect(view.currentRule?.id).toBe(5);
  });

  it("never reveals a rule beyond the furthest one reached, even if it passes", () => {
    const view = getRuleView(mk([true, false, false, true, false]), 0);
    expect(view.hasBroken).toBe(false);
    expect(view.currentRule?.id).toBe(2);
    expect(ids(view.solvedRules)).toEqual([1]);
    expect(view.segments.map((s) => s.state)).toEqual(["done", "now", "todo", "todo", "todo"]);
  });

  it("when everything was solved and one rule breaks, there is no current rule, only the error", () => {
    const broken = getRuleView(mk([true, true, false]), 3);
    expect(ids(broken.brokenRules)).toEqual([3]);
    expect(broken.currentRule).toBeUndefined();
    const done = getRuleView(mk([true, true, true]), 3);
    expect(done.hasBroken).toBe(false);
    expect(done.currentRule).toBeUndefined();
    expect(done.solvedRules).toHaveLength(3);
  });

  it("the furthest point never moves backwards", () => {
    expect(getRuleView(mk([false, true, true]), 2).reachedIndex).toBe(2);
  });
});
