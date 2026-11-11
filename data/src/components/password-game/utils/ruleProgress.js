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
