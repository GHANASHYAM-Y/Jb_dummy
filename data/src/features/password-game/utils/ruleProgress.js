/**
 * Evaluates every rule on each edit. A rule that becomes invalid must only
 * remove its own point; it must not reset the score to the first failed rule.
 */
export function getRuleProgress(rules, password, liveData = {}) {
  const evaluatedRules = rules.map((rule) => {
    // Remote/async rules need an asynchronous state flow. Until that exists,
    // leave them incomplete instead of treating their Promise as a pass.
    const isAsync = rule.check.constructor.name === "AsyncFunction";
    const passed = isAsync ? false : Boolean(rule.check(password, liveData));

    return { rule, passed };
  });

  const current = evaluatedRules.find((entry) => !entry.passed);

  return {
    evaluatedRules,
    unlockedRules: evaluatedRules.map((entry) => entry.rule),
    completedRules: evaluatedRules.filter((entry) => entry.passed).length,
    currentRule: current?.rule,
    passedRuleIds: new Set(
      evaluatedRules.filter((entry) => entry.passed).map((entry) => entry.rule.id),
    ),
  };
}

/**
 * What the player sees, given how far they have already got.
 *
 * - The "current rule" is the frontier: the furthest rule the player is working on.
 * - A rule before the frontier that fails again is "broken" (an edit undid it). Broken
 *   rules are shown as errors TOGETHER with the current rule, never instead of it.
 * - While anything is broken, no new rule unlocks: if the player also solves the
 *   current rule, it waits ("solved, next rule unlocks after the fix").
 * - Solved rules stay visible; rules beyond the frontier stay hidden until reached.
 *
 * @param {{ rule: object, passed: boolean }[]} evaluatedRules
 * @param {number} reachedIndex  furthest frontier index so far (kept by the caller)
 */
export function getRuleView(evaluatedRules, reachedIndex) {
  const total = evaluatedRules.length;
  const brokenIndexes = [];
  evaluatedRules.forEach(({ passed }, index) => {
    if (!passed && index < reachedIndex) brokenIndexes.push(index);
  });
  const hasBroken = brokenIndexes.length > 0;

  let frontierIndex;
  if (hasBroken) {
    frontierIndex = reachedIndex; // gated: stay on the rule the player was working on
  } else {
    const firstFailing = evaluatedRules.findIndex(({ passed }) => !passed);
    frontierIndex = firstFailing === -1 ? total : firstFailing; // >= reachedIndex here
  }
  const reached = Math.max(reachedIndex, frontierIndex);
  const frontier = frontierIndex < total ? evaluatedRules[frontierIndex] : undefined;
  const frontierSolved = Boolean(frontier?.passed);

  const brokenRules = brokenIndexes.map((index) => evaluatedRules[index]);
  const solvedRules = evaluatedRules
    .filter(({ passed }, index) => passed && index <= reached && index !== frontierIndex)
    .reverse();

  const brokenSet = new Set(brokenIndexes);
  const segments = evaluatedRules
    .map((entry, index) => ({ ...entry, index }))
    .filter(({ rule }) => rule.category !== "Chaos")
    .map(({ rule, passed, index }) => {
      let state = "todo";
      if (brokenSet.has(index)) state = "broken";
      else if (index === frontierIndex) state = "now";
      else if (index <= reached && passed) state = "done";
      return { id: rule.id, state };
    });

  return {
    reachedIndex: reached,
    hasBroken,
    brokenRules,
    currentRule: frontier?.rule,
    currentSolved: frontierSolved,
    solvedRules,
    segments,
  };
}
