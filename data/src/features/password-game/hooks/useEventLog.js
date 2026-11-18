import { useEffect, useRef, useState } from "react";

/**
 * Event log for the Password Game.
 *
 * Records, newest first:
 * - rules the player solves, and solved rules a later edit breaks
 *   (only rules the player can already see, so nothing is revealed early);
 * - chaos event phase changes (fire, water, lightning, ice).
 *
 * Several rule changes from one edit are grouped into one entry. Times are
 * measured from the first character the player types.
 */

const MAX_ENTRIES = 40;

export const CHAOS_MESSAGES = {
  fire: {
    active: "Fire started. Delete the flames before they spread.",
    completed: "Fire put out.",
    failed: "Fire burned the whole password.",
  },
  water: {
    armed: "Water is now possible.",
    warning: "Flood warning.",
    active: "Flood! Characters are being swept away.",
    draining: "The water is draining.",
    failed: "The flood washed the password away.",
    cleared: "Flood survived.",
  },
  lightning: {
    armed: "Lightning armed.",
    targeting: "Lightning is targeting a character.",
    waiting: "Lightning struck.",
    cleared: "Lightning passed.",
    ended: "Lightning destroyed the password.",
  },
  ice: {
    armed: "Ice armed.",
    targeting: "Ice is freezing a character.",
    shattered: "Ice shattered a character.",
    cleared: "The ice melted.",
  },
};

const CHAOS_NAMES = { fire: "Fire", water: "Water", lightning: "Lightning", ice: "Ice" };

function ruleLabel(rule) {
  return rule.category === "Chaos" ? "event" : `#${rule.id}`;
}

export function describeRules(verb, rules) {
  if (rules.length === 1) {
    const [rule] = rules;
    const text = typeof rule.text === "string" ? `: ${rule.text}` : "";
    return `${rule.category === "Chaos" ? "Chaos event" : `Rule ${rule.id}`} ${verb}${text}`;
  }
  return `${rules.length} rules ${verb}: ${rules.map(ruleLabel).join(", ")}`;
}

export function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * @param {object} options
 * @param {string} options.password
 * @param {{ rule: object }[]} options.solvedRules  rules currently shown as solved
 * @param {{ fire: string, water: string, lightning: string, ice: string }} options.chaosPhases
 */
export function useEventLog({ password, solvedRules, chaosPhases }) {
  const [entries, setEntries] = useState([]);
  const startRef = useRef(null);
  const nextIdRef = useRef(0);
  const prevSolvedRef = useRef(new Map());
  const prevPhasesRef = useRef(chaosPhases);

  const solvedKey = solvedRules.map(({ rule }) => rule.id).join("|");
  const phaseKey = Object.keys(CHAOS_NAMES).map((name) => chaosPhases[name]).join("|");

  // The clock starts with the first character typed
  useEffect(() => {
    if (startRef.current === null && password.length > 0) startRef.current = Date.now();
  }, [password]);

  useEffect(() => {
    const elapsed = startRef.current === null ? 0 : Date.now() - startRef.current;
    const time = formatElapsed(elapsed);
    const added = [];

    // Rules solved / broken since the last check
    const current = new Map(solvedRules.map(({ rule }) => [rule.id, rule]));
    const previous = prevSolvedRef.current;
    const solved = [...current.values()].filter((rule) => !previous.has(rule.id));
    const broken = [...previous.values()].filter((rule) => !current.has(rule.id));
    prevSolvedRef.current = current;
    if (broken.length > 0) added.push({ kind: "broken", text: describeRules("broken", broken) });
    if (solved.length > 0) added.push({ kind: "solved", text: describeRules("solved", solved) });

    // Chaos phase changes
    const before = prevPhasesRef.current;
    for (const name of Object.keys(CHAOS_NAMES)) {
      const phase = chaosPhases[name];
      if (phase && phase !== before[name] && phase !== "idle") {
        const text = CHAOS_MESSAGES[name][phase] ?? `${CHAOS_NAMES[name]}: ${phase}.`;
        added.push({ kind: "chaos", chaos: name, text });
      }
    }
    prevPhasesRef.current = { ...chaosPhases };

    if (added.length === 0) return;
    const stamped = added.map((entry) => ({ ...entry, time, id: nextIdRef.current++ }));
    setEntries((list) => [...stamped.reverse(), ...list].slice(0, MAX_ENTRIES));
    // solvedKey and phaseKey capture every change that matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solvedKey, phaseKey]);

  return entries;
}
