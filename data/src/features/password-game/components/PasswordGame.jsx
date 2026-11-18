"use client";

import { rules } from "../rules/rules";
import { useEffect, useMemo, useState } from "react";
import FireEffect from "./effects/FireEffect";
import { useFireEvent } from "../hooks/useFireEvent";
import WaterEffect from "./effects/WaterEffect";
import { useWaterEvent } from "../hooks/useWaterEvent";
import LightningEffect from "./effects/LightningEffect";
import { useLightningEvent } from "../hooks/useLightningEvent";
import IceEffect from "./effects/IceEffect";
import { useIceEvent } from "../hooks/useIceEvent";
import { getRuleProgress, getRuleView } from "../utils/ruleProgress";
import { useEventLog } from "../hooks/useEventLog";
import { TILE_LABEL, toTiles } from "../utils/characters";
import "../styles/password-game.css";

export default function PasswordGame() {
  const [password, setPassword] = useState("");
  const passwordCharacterCount = Array.from(password).length;
  const [liveData, setLiveData] = useState({
    exchangeRate: null,
    exchangeRateStatus: "loading",
    wordCollisionStatus: "idle",
    signalFlagStatus: "idle",
    morseCodeStatus: "idle",
    natoAlphabetStatus: "idle",
    greekEnglishWordsStatus: "idle",
  });
  const [liveDataAttempt, setLiveDataAttempt] = useState(0);
  const [showHelper, setShowHelper] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadExchangeRate() {
      try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Exchange-rate request failed: ${response.status}`);

        const data = await response.json();
        const rate = Number(data?.rates?.INR);
        if (!Number.isFinite(rate)) throw new Error("Exchange-rate response did not contain INR.");

        if (!controller.signal.aborted) {
          setLiveData((current) => ({
            ...current,
            exchangeRate: Math.floor(rate),
            exchangeRateStatus: "ready",
          }));
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Could not load the current USD to INR exchange rate.", error);
        setLiveData((current) => ({
          ...current,
          exchangeRate: null,
          exchangeRateStatus: "unavailable",
        }));
      }
    }

    loadExchangeRate();
    return () => controller.abort();
  }, [liveDataAttempt]);

  const {
    evaluatedRules,
    completedRules,
    passedRuleIds,
  } = useMemo(
    () => getRuleProgress(rules, password, liveData),
    [password, liveData],
  );

  // Remember the furthest rule reached. A solved rule that an edit breaks is
  // shown as an error TOGETHER with the current rule; no new rule unlocks until
  // it is fixed. Rules beyond the furthest one reached stay hidden.
  const [furthestIndex, setFurthestIndex] = useState(0);
  const {
    reachedIndex,
    hasBroken,
    brokenRules,
    currentRule,
    currentSolved,
    solvedRules,
    segments,
  } = getRuleView(evaluatedRules, furthestIndex);
  // Adjust state during render (React's pattern for state derived from props):
  // the guard makes it settle in one extra pass and it only ever moves forward.
  if (reachedIndex > furthestIndex) setFurthestIndex(reachedIndex);

  // Live data loads for any rule on screen: the current rule or a broken one
  const shownRuleIds = new Set([currentRule?.id, ...brokenRules.map(({ rule }) => rule.id)]);
  const needWordCollision = shownRuleIds.has(21);
  const needSignalFlags = shownRuleIds.has(23);
  const needMorseCode = shownRuleIds.has(24);
  const needNatoAlphabet = shownRuleIds.has(25);
  const needGreekWords = shownRuleIds.has(26);

  useEffect(() => {
    if (!needWordCollision || liveData.wordCollisionStatus !== "idle") {
      return undefined;
    }

    let active = true;
    import("../rules/wordCollision")
      .then(({ hasWordCollision }) => {
        if (!active) return;

        setLiveData((current) => ({
          ...current,
          hasWordCollision,
          wordCollisionStatus: "ready",
        }));
      })
      .catch((error) => {
        if (!active) return;

        console.error("Could not load the local English dictionary for Rule 21.", error);
        setLiveData((current) => ({
          ...current,
          wordCollisionStatus: "error",
        }));
      });

    return () => {
      active = false;
    };
  }, [needWordCollision, liveData.wordCollisionStatus]);

  useEffect(() => {
    if (!needSignalFlags || liveData.signalFlagStatus !== "idle") {
      return undefined;
    }

    const controller = new AbortController();
    import("../rules/signalFlags")
      .then(({ fetchSignalFlagMatcher }) =>
        fetchSignalFlagMatcher(controller.signal),
      )
      .then((hasSignalFlagWord) => {
        if (controller.signal.aborted) return;

        setLiveData((current) => ({
          ...current,
          hasSignalFlagWord,
          signalFlagStatus: "ready",
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        console.error("Could not load the international maritime signal flag vocabulary.", error);
        setLiveData((current) => ({
          ...current,
          signalFlagStatus: "error",
        }));
      });

    return () => controller.abort();
  }, [needSignalFlags, liveData.signalFlagStatus]);

  useEffect(() => {
    if (!needMorseCode || liveData.morseCodeStatus !== "idle") {
      return undefined;
    }

    const controller = new AbortController();
    import("../rules/morseCode")
      .then(({ fetchSingleElementLetterMatcher }) =>
        fetchSingleElementLetterMatcher(controller.signal),
      )
      .then((hasSingleElementMorseLetter) => {
        if (controller.signal.aborted) return;

        setLiveData((current) => ({
          ...current,
          hasSingleElementMorseLetter,
          morseCodeStatus: "ready",
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        console.error("Could not load the International Morse code alphabet.", error);
        setLiveData((current) => ({
          ...current,
          morseCodeStatus: "error",
        }));
      });

    return () => controller.abort();
  }, [needMorseCode, liveData.morseCodeStatus]);

  useEffect(() => {
    if (!needNatoAlphabet || liveData.natoAlphabetStatus !== "idle") {
      return undefined;
    }

    const controller = new AbortController();
    import("../rules/natoPhonetic")
      .then(({ fetchNatoCodewordMatcher }) =>
        fetchNatoCodewordMatcher(controller.signal),
      )
      .then((hasNatoCodeword) => {
        if (controller.signal.aborted) return;

        setLiveData((current) => ({
          ...current,
          hasNatoCodeword,
          natoAlphabetStatus: "ready",
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        console.error("Could not load the NATO phonetic alphabet.", error);
        setLiveData((current) => ({
          ...current,
          natoAlphabetStatus: "error",
        }));
      });

    return () => controller.abort();
  }, [needNatoAlphabet, liveData.natoAlphabetStatus]);

  useEffect(() => {
    if (!needGreekWords || liveData.greekEnglishWordsStatus !== "idle") {
      return undefined;
    }

    const controller = new AbortController();
    import("../rules/greekEnglishWords")
      .then(({ fetchGreekEnglishWordMatcher }) =>
        fetchGreekEnglishWordMatcher(controller.signal),
      )
      .then((hasGreekEnglishWord) => {
        if (controller.signal.aborted) return;

        setLiveData((current) => ({
          ...current,
          hasGreekEnglishWord,
          greekEnglishWordsStatus: "ready",
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        console.error("Could not verify Greek letter names with the English dictionary.", error);
        setLiveData((current) => ({
          ...current,
          greekEnglishWordsStatus: "error",
        }));
      });

    return () => controller.abort();
  }, [needGreekWords, liveData.greekEnglishWordsStatus]);

  const fireTriggered = passedRuleIds.has("chaos-fire");
  const fire = useFireEvent({
    password,
    fireTriggered,
    onPasswordChange: setPassword,
  });
  const rule19Complete = passedRuleIds.has(19);
  const fireIsActive = ["active"].includes(fire.phase);
  const rule30Complete = passedRuleIds.has("chaos-lightning-bolt");
  const water = useWaterEvent({
    password,
    rule19Complete,
    progressLevel: completedRules,
    blocked: fireIsActive,
    onPasswordChange: setPassword,
  });
  const waterIsActive = ["warning", "active", "draining"].includes(water.phase);
  const lightning = useLightningEvent({
    password,
    rule30Complete,
    progressLevel: completedRules,
    blocked: fireIsActive || waterIsActive,
    onPasswordChange: setPassword,
  });
  const lightningIsActive = ["targeting", "waiting"].includes(lightning.phase);
  const rule24Complete = passedRuleIds.has("chaos-ice");
  const ice = useIceEvent({
    password,
    rule24Complete,
    progressLevel: completedRules,
    blocked: fireIsActive || waterIsActive || lightningIsActive,
    onPasswordChange: setPassword,
  });
  const updatePassword = (nextPassword) => {
    fire.updatePassword(nextPassword);
    lightning.reconcilePassword(nextPassword);
    ice.reconcilePassword(nextPassword);
  };
  const capturePasswordEdit = (event) => {
    lightning.captureEdit(event);
    ice.captureEdit(event);
  };
  const retryLiveData = () => {
    setLiveData((current) => ({
      ...current,
      exchangeRateStatus: "loading",
    }));
    setLiveDataAttempt((attempt) => attempt + 1);
  };
  const retrySignalFlagSource = () => {
    setLiveData((current) => ({
      ...current,
      signalFlagStatus: "idle",
      hasSignalFlagWord: undefined,
    }));
  };
  const retryMorseCodeSource = () => {
    setLiveData((current) => ({
      ...current,
      morseCodeStatus: "idle",
      hasSingleElementMorseLetter: undefined,
    }));
  };
  const retryNatoAlphabetSource = () => {
    setLiveData((current) => ({
      ...current,
      natoAlphabetStatus: "idle",
      hasNatoCodeword: undefined,
    }));
  };
  const retryGreekEnglishWordSources = () => {
    setLiveData((current) => ({
      ...current,
      greekEnglishWordsStatus: "idle",
      hasGreekEnglishWord: undefined,
    }));
  };

  const coreRules = rules.filter(({ category }) => category !== "Chaos");
  const completedCoreRules = evaluatedRules.filter(
    ({ rule, passed }) => rule.category !== "Chaos" && passed,
  ).length;
  const progress = (completedCoreRules / coreRules.length) * 100;

  const letters = Array.from(password.toLowerCase()).filter((character) => /[a-z]/.test(character));
  const vowelCount = letters.filter((character) => "aeiou".includes(character)).length;
  const consonantCount = letters.length - vowelCount;
  const specialCharacterCount = Array.from(password).filter(
    (character) => /[^a-zA-Z0-9\s]/u.test(character),
  ).length;
  const digitCount = Array.from(password).filter((character) => /\d/.test(character)).length;
  const digitSum = Array.from(password)
    .filter((character) => /\d/.test(character))
    .reduce((sum, digit) => sum + Number(digit), 0);
  const letterCount = vowelCount + consonantCount;
  const statPercent = (count, total) => (total ? Math.round((count / total) * 100) : 0);
  const ruleHints = {
    1: "Start with at least 8 characters.",
    2: "Add a digit anywhere in the password.",
    3: "Add an uppercase letter (A–Z).",
    4: "Add a symbol such as @, !, or /.",
    5: "Try a planet name, such as Mars or Earth.",
    6: "Use a prime number greater than 10, such as 11, 13, or 17.",
    7: "Put the planet name before today's weekday.",
    8: vowelCount === consonantCount
      ? "Your vowel and consonant totals are balanced."
      : `Add or remove ${Math.abs(vowelCount - consonantCount)} ${vowelCount < consonantCount ? "vowel" : "consonant"}${Math.abs(vowelCount - consonantCount) === 1 ? "" : "s"}.`,
    9: "Keep exactly 3 uppercase letters.",
    12: digitSum < 30
      ? `Your digit sum is ${digitSum}. Add ${30 - digitSum} or more.`
      : digitSum > 40
        ? `Your digit sum is ${digitSum}. Remove at least ${digitSum - 40}.`
        : `Your digit sum is ${digitSum}, which is in the 30–40 range.`,
    14: "Add one face emoji, such as 😀.",
    15: "Adjust the total length to a prime number.",
    16: "Choose a planet and chess piece with matching letter counts.",
    17: digitCount < specialCharacterCount
      ? "You have more special characters than digits."
      : `Add at least ${digitCount - specialCharacterCount + 1} special character${digitCount - specialCharacterCount === 0 ? "" : "s"}.`,
    19: "Use today's day number within the year, written as three digits. For example, day 7 is 007.",
    20: "Add an exactly five-digit number that reads the same backward and forward and is prime, such as 10301.",
    21: "Find two valid English words sharing at least three consecutive letters in the same positions. Neither word can be completely inside the other.",
    22: "Include the accepted chemical symbol with an uppercase first letter and lowercase second letter.",
    23: "Use a complete phonetic word from the international maritime signal flag alphabet.",
    24: "Include a letter whose International Morse code consists of one element.",
    25: "Include a complete NATO phonetic alphabet codeword.",
    26: "Include a complete English word that is also the name of a Greek letter.",
  };
  const hintFor = (rule) => ruleHints[rule?.id] || "Solve this rule to reveal the next challenge.";
  const ruleChip = (rule) =>
    rule.category === "Chaos" ? "EVENT · CHAOS" : `RULE ${rule.id} · ${rule.category.toUpperCase()}`;
  const ruleText = (rule) => (rule.getText ? rule.getText(password, liveData) : rule.text);

  const [showSolved, setShowSolved] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const eventLog = useEventLog({
    password,
    solvedRules,
    chaosPhases: { fire: fire.phase, water: water.phase, lightning: lightning.phase, ice: ice.phase },
  });
  const visibleEvents = showAllEvents ? eventLog : eventLog.slice(0, 6);

  // Colour-coded character tiles (one per Unicode code point, emoji included)
  const characters = toTiles(password);

  const isChaosRule = currentRule?.category === "Chaos";
  const ruleCounter = hasBroken
    ? `Fix ${brokenRules.length === 1 ? "1 broken rule" : `${brokenRules.length} broken rules`} to continue`
    : !currentRule
      ? "All rules solved"
      : isChaosRule
        ? "Chaos event"
        : `Rule ${currentRule.id} of ${coreRules.length}`;

  const liveDataWarnings = [
    liveData.exchangeRateStatus === "unavailable" && {
      key: "rate",
      text: "The current USD → INR exchange rate could not be loaded.",
      retry: retryLiveData,
    },
    liveData.signalFlagStatus === "error" && {
      key: "flags",
      text: "The international signal flag vocabulary could not be loaded.",
      retry: retrySignalFlagSource,
    },
    liveData.morseCodeStatus === "error" && {
      key: "morse",
      text: "The International Morse code alphabet could not be loaded.",
      retry: retryMorseCodeSource,
    },
    liveData.natoAlphabetStatus === "error" && {
      key: "nato",
      text: "The NATO phonetic alphabet could not be loaded.",
      retry: retryNatoAlphabetSource,
    },
    liveData.greekEnglishWordsStatus === "error" && {
      key: "greek",
      text: "Greek letter names could not be verified against the English dictionary.",
      retry: retryGreekEnglishWordSources,
    },
  ].filter(Boolean);

  // Fire destroyed the password: full-screen scene and a retry, nothing else
  if (fire.phase === "failed") {
    return (
      <div className="pw-game">
        <div className="app-container fire-game-over">
          <h1 className="title">Password Destroyed</h1>
          <FireEffect {...fire} password={password} />
          <button className="fire-retry" type="button" onClick={fire.retry}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pw-game">
      <div className="app-container">
        <header className="pw-topbar">
          <h1 className="pw-brand">Password Game</h1>
          <span className="pw-counter">{ruleCounter}</span>
        </header>

        <main className="pw-column">
          {water.phase === "failed" ? (
            <div className="pw-water-failed">
              <WaterEffect {...water} password={password} onDrainChange={water.updateDrainCommand} />
              <button className="fire-retry water-retry" type="button" onClick={water.retry}>
                Try again
              </button>
            </div>
          ) : (
            <section className="pw-field" aria-label="Your password">
              <div className="pw-field-head">
                <label className="pw-label" htmlFor="pw-password">Your password</label>
                <span className="pw-muted">
                  {passwordCharacterCount} {passwordCharacterCount === 1 ? "character" : "characters"}
                </span>
              </div>
              <div className={`fire-field-wrap stylized ${fire.phase === "active" ? "is-burning" : ""}`}>
                <input
                  id="pw-password"
                  className={`password-input ${fire.phase === "active" ? "password-burning" : ""}`}
                  type="text"
                  value={password}
                  onBeforeInput={capturePasswordEdit}
                  onChange={(e) => updatePassword(e.target.value)}
                  placeholder="Type your password..."
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <FireEffect {...fire} />
              <WaterEffect {...water} password={password} onDrainChange={water.updateDrainCommand} />
              <LightningEffect {...lightning} password={password} />
              <IceEffect {...ice} password={password} />

              {characters.length > 0 ? (
                <div
                  className={`pw-tiles ${characters.length > 24 ? "pw-tiles-compact" : ""}`}
                  aria-hidden="true"
                >
                  {characters.map(({ character, kind }, index) => (
                    <span key={index} className={`pw-tile pw-tile-${kind}`}>
                      {kind === "space" ? "␣" : character}
                      <small>{TILE_LABEL[kind]}</small>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="pw-tiles-empty">Your characters will appear here as you type.</p>
              )}
              <ul className="pw-legend" aria-label="Character counts">
                <li><i className="pw-dot pw-dot-vowel" aria-hidden="true" />Vowels {vowelCount}</li>
                <li><i className="pw-dot pw-dot-consonant" aria-hidden="true" />Consonants {consonantCount}</li>
                <li><i className="pw-dot pw-dot-digit" aria-hidden="true" />Digits {digitCount}</li>
                <li><i className="pw-dot pw-dot-symbol" aria-hidden="true" />Symbols {specialCharacterCount}</li>
              </ul>
            </section>
          )}

          <section aria-label="Progress">
            <div className="pw-segments" aria-hidden="true">
              {segments.map(({ id, state }) => (
                <span key={id} className={`pw-segment pw-segment-${state}`} />
              ))}
            </div>
            <div className="pw-segments-foot">
              <span>
                {completedCoreRules} / {coreRules.length} core rules solved
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
          </section>

          {hasBroken && (
            <section className="pw-broken" aria-labelledby="pw-broken-title">
              <h2 id="pw-broken-title" className="pw-broken-title">
                {brokenRules.length === 1 ? "A solved rule broke" : `${brokenRules.length} solved rules broke`}. Fix
                {brokenRules.length === 1 ? " it" : " them"} to continue.
              </h2>
              {brokenRules.map(({ rule }) => (
                <article key={rule.id} className="pw-broken-card" aria-label={`Broken: ${ruleText(rule)}`}>
                  <div className="pw-chips">
                    <span className="pw-chip pw-chip-rule">{ruleChip(rule)}</span>
                    <span className="pw-chip pw-chip-bad">Broken by your last edit</span>
                  </div>
                  <p className="pw-broken-text">{ruleText(rule)}</p>
                  {showHelper && <p className="pw-broken-hint">{hintFor(rule)}</p>}
                </article>
              ))}
            </section>
          )}

          {currentRule ? (
            <section
              className={`pw-current ${isChaosRule ? "pw-current-chaos" : ""} ${currentSolved ? "pw-current-waiting" : ""}`}
              aria-labelledby="pw-current-rule"
            >
              <div className="pw-current-head">
                <div className="pw-chips">
                  {hasBroken && <span className="pw-chip pw-chip-plain">CURRENT RULE</span>}
                  <span className="pw-chip pw-chip-rule">{ruleChip(currentRule)}</span>
                  {currentSolved ? (
                    <span className="pw-chip pw-chip-ok">Solved</span>
                  ) : (
                    <span className="pw-chip pw-chip-bad">Not met yet</span>
                  )}
                </div>
                <button
                  className="pw-link-button"
                  type="button"
                  aria-expanded={showHelper}
                  onClick={() => setShowHelper((shown) => !shown)}
                >
                  {showHelper ? "Hide hints" : "Show hints"}
                </button>
              </div>
              <h2 id="pw-current-rule" className="pw-current-text">{ruleText(currentRule)}</h2>
              {currentSolved && (
                <p className="pw-waiting-note" role="status">
                  Done. The next rule unlocks once the broken {brokenRules.length === 1 ? "rule" : "rules"} above
                  {brokenRules.length === 1 ? " is" : " are"} fixed.
                </p>
              )}
              {showHelper && (
                <>
                  {!currentSolved && (
                    <div className="pw-hint" aria-live="polite">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
                      </svg>
                      <p>{hintFor(currentRule)}</p>
                    </div>
                  )}
                  <div className="pw-stats">
                    <div className="pw-stat">
                      <small>Vowels</small>
                      <strong className="pw-text-vowel">{vowelCount}</strong>
                      <span className="pw-meter"><span className="pw-meter-vowel" style={{ width: `${statPercent(vowelCount, letterCount)}%` }} /></span>
                    </div>
                    <div className="pw-stat">
                      <small>Consonants</small>
                      <strong className="pw-text-consonant">{consonantCount}</strong>
                      <span className="pw-meter"><span className="pw-meter-consonant" style={{ width: `${statPercent(consonantCount, letterCount)}%` }} /></span>
                    </div>
                    <div className="pw-stat">
                      <small>Special characters</small>
                      <strong className="pw-text-symbol">{specialCharacterCount}</strong>
                      <span className="pw-meter"><span className="pw-meter-symbol" style={{ width: `${statPercent(specialCharacterCount, passwordCharacterCount)}%` }} /></span>
                    </div>
                    <div className="pw-stat">
                      <small>Digits</small>
                      <strong className="pw-text-digit">{digitCount}</strong>
                      <span className="pw-meter"><span className="pw-meter-digit" style={{ width: `${statPercent(digitCount, passwordCharacterCount)}%` }} /></span>
                    </div>
                    <div className="pw-stat pw-stat-total">
                      <small>Total characters</small>
                      <strong>{passwordCharacterCount}</strong>
                      <span className="pw-meter"><span className="pw-meter-total" style={{ width: `${Math.min(passwordCharacterCount, 100)}%` }} /></span>
                    </div>
                  </div>
                </>
              )}
            </section>
          ) : hasBroken ? (
            <section className="pw-current pw-current-waiting" aria-labelledby="pw-almost">
              <span className="pw-chip pw-chip-ok">Almost there</span>
              <h2 id="pw-almost" className="pw-current-text">Every other rule is solved. Fix the broken rule above to finish.</h2>
            </section>
          ) : (
            <section className="pw-current pw-current-won" aria-labelledby="pw-won">
              <span className="pw-chip pw-chip-ok">Complete</span>
              <h2 id="pw-won" className="pw-current-text">Every rule is satisfied. Your password survived.</h2>
            </section>
          )}

          {liveDataWarnings.map(({ key, text, retry }) => (
            <div key={key} className="live-data-warning" role="status">
              <span>{text}</span>
              <button type="button" onClick={retry}>Retry</button>
            </div>
          ))}

          <section className="pw-log" aria-labelledby="pw-log-title">
            <div className="pw-solved-head">
              <h3 id="pw-log-title" className="pw-label">Event log</h3>
              {eventLog.length > 6 && (
                <button
                  className="pw-link-button"
                  type="button"
                  aria-expanded={showAllEvents}
                  aria-controls="pw-log-list"
                  onClick={() => setShowAllEvents((shown) => !shown)}
                >
                  {showAllEvents ? "Show latest" : `Show all (${eventLog.length})`}
                </button>
              )}
            </div>
            {eventLog.length === 0 ? (
              <p className="pw-muted pw-log-empty">Solved rules, broken rules and chaos events will show up here.</p>
            ) : (
              <ol id="pw-log-list" className="pw-log-list" aria-live="polite">
                {visibleEvents.map((entry) => (
                  <li key={entry.id} className={`pw-log-item pw-log-${entry.kind}${entry.chaos ? ` pw-log-${entry.chaos}` : ""}`}>
                    <span className="pw-log-time">{entry.time}</span>
                    <span className="pw-log-icon" aria-hidden="true">
                      {entry.kind === "solved" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      )}
                      {entry.kind === "broken" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      )}
                      {entry.kind === "chaos" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
                      )}
                    </span>
                    <span>{entry.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {solvedRules.length > 0 && (
            <section aria-labelledby="pw-solved-title">
              <div className="pw-solved-head">
                <h3 id="pw-solved-title" className="pw-label">Solved ({solvedRules.length})</h3>
                <button
                  className="pw-link-button"
                  type="button"
                  aria-expanded={showSolved}
                  aria-controls="pw-solved-list"
                  onClick={() => setShowSolved((shown) => !shown)}
                >
                  {showSolved ? "Collapse" : "Show"}
                </button>
              </div>
              {showSolved && (
                <ul id="pw-solved-list" className="pw-solved">
                  {solvedRules.map(({ rule }) => (
                    <li key={rule.id}>
                      <svg className="pw-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="pw-solved-id">{rule.category === "Chaos" ? "Event" : `#${rule.id}`}</span>
                      <span>{rule.getText ? rule.getText(password, liveData) : rule.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
