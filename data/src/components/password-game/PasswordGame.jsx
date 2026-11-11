"use client";

import { rules } from "./data/rules";
import { useEffect, useMemo, useState } from "react";
import FireEffect from "./ChaosEffects/FireEffect";
import { useFireEvent } from "./ChaosEffects/useFireEvent";
import WaterEffect from "./ChaosEffects/WaterEffect";
import { useWaterEvent } from "./ChaosEffects/useWaterEvent";
import LightningEffect from "./ChaosEffects/LightningEffect";
import { useLightningEvent } from "./ChaosEffects/useLightningEvent";
import IceEffect from "./ChaosEffects/IceEffect";
import { useIceEvent } from "./ChaosEffects/useIceEvent";
import { getRuleProgress } from "./utils/ruleProgress";
import "./password-game.css";

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
    currentRule,
    passedRuleIds,
  } = useMemo(
    () => getRuleProgress(rules, password, liveData),
    [password, liveData],
  );

  useEffect(() => {
    if (currentRule?.id !== 21 || liveData.wordCollisionStatus !== "idle") {
      return undefined;
    }

    let active = true;
    import("./data/wordCollision")
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
  }, [currentRule?.id, liveData.wordCollisionStatus]);

  useEffect(() => {
    if (currentRule?.id !== 23 || liveData.signalFlagStatus !== "idle") {
      return undefined;
    }

    const controller = new AbortController();
    import("./data/signalFlags")
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
  }, [currentRule?.id, liveData.signalFlagStatus]);

  useEffect(() => {
    if (currentRule?.id !== 24 || liveData.morseCodeStatus !== "idle") {
      return undefined;
    }

    const controller = new AbortController();
    import("./data/morseCode")
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
  }, [currentRule?.id, liveData.morseCodeStatus]);

  useEffect(() => {
    if (currentRule?.id !== 25 || liveData.natoAlphabetStatus !== "idle") {
      return undefined;
    }

    const controller = new AbortController();
    import("./data/natoPhonetic")
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
  }, [currentRule?.id, liveData.natoAlphabetStatus]);

  useEffect(() => {
    if (currentRule?.id !== 26 || liveData.greekEnglishWordsStatus !== "idle") {
      return undefined;
    }

    const controller = new AbortController();
    import("./data/greekEnglishWords")
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
  }, [currentRule?.id, liveData.greekEnglishWordsStatus]);

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
  const activeHint = {
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
  }[currentRule?.id] || "Solve this rule to reveal the next challenge.";

  // Keep the active challenge first, then show the completed path beneath it.
  // Future failed rules remain hidden until they become the lowest unsolved one.
  const currentRuleIndex = evaluatedRules.findIndex(
    ({ rule }) => rule.id === currentRule?.id,
  );
  const displayedRules = currentRule
    ? [
        evaluatedRules[currentRuleIndex],
        ...evaluatedRules
          .slice(0, currentRuleIndex)
          .filter(({ passed }) => passed)
          .reverse(),
      ]
    : evaluatedRules.filter(({ passed }) => passed).reverse();

  return (
    <div className="pw-game">
      <div className={`app-container ${fire.phase === "failed" ? "fire-game-over" : ""}`}>
      <h1 className="title">
        {fire.phase === "failed" ? "Password Destroyed" : "Password Game"}
      </h1>

      {fire.phase === "failed" ? (
        <>
          <FireEffect {...fire} password={password} />
          <button className="fire-retry" type="button" onClick={fire.retry}>
            Try again
          </button>
        </>
      ) : water.phase === "failed" ? (
        <>
          <WaterEffect {...water} password={password} onDrainChange={water.updateDrainCommand} />
          <button className="fire-retry water-retry" type="button" onClick={water.retry}>
            Try again
          </button>
        </>
      ) : (
        <>
          <div className={`fire-field-wrap stylized ${fire.phase === "active" ? "is-burning" : ""}`}>
            <input
              className={`password-input ${fire.phase === "active" ? "password-burning" : ""}`}
              type="text"
              value={password}
              onBeforeInput={capturePasswordEdit}
              onChange={(e) => updatePassword(e.target.value)}
              placeholder="Type your password..."
            />
          </div>
          <FireEffect {...fire} />
          <WaterEffect {...water} password={password} onDrainChange={water.updateDrainCommand} />
          <LightningEffect {...lightning} password={password} />
          <IceEffect {...ice} password={password} />
        </>
      )}

      {showHelper ? (
      <aside className="password-helper" aria-live="polite" aria-label="Password analysis">
        <div className="helper-topline">
          <div className="helper-heading">
            <span className="helper-heading-icon" aria-hidden="true">✦</span>
            <div>
              <strong>Password analysis</strong>
              <span>Live character breakdown</span>
            </div>
          </div>
          <div className="helper-actions">
            <span className="helper-live">Live counts</span>
            <button className="helper-toggle" type="button" onClick={() => setShowHelper(false)}>Hide helper</button>
          </div>
        </div>

        <div className="password-stats">
          <article className="password-stat vowels">
            <div><span>Vowels</span><i aria-hidden="true">◉</i></div>
            <b>{vowelCount}</b>
            <span className="stat-meter"><span style={{ width: `${statPercent(vowelCount, letterCount)}%` }} /></span>
          </article>
          <article className="password-stat consonants">
            <div><span>Consonants</span><i aria-hidden="true">▤</i></div>
            <b>{consonantCount}</b>
            <span className="stat-meter"><span style={{ width: `${statPercent(consonantCount, letterCount)}%` }} /></span>
          </article>
          <article className="password-stat special">
            <div><span>Special chars</span><i aria-hidden="true">✳</i></div>
            <b>{specialCharacterCount}</b>
            <span className="stat-meter"><span style={{ width: `${statPercent(specialCharacterCount, passwordCharacterCount)}%` }} /></span>
          </article>
        </div>

        <div className="helper-hint">
          <span aria-hidden="true">✦</span>
          <div><strong>Next move</strong><p>{activeHint}</p></div>
        </div>

        <div className="helper-footer">
          <div><span>Password length</span><b>{passwordCharacterCount} <small>characters</small></b></div>
          <span className="length-meter"><span style={{ width: `${Math.min(passwordCharacterCount, 100)}%` }} /></span>
        </div>
      </aside>
      ) : (
        <button className="helper-show" type="button" onClick={() => setShowHelper(true)}>
          ✦ View password helper
        </button>
      )}

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <p className="progress-text">
        {completedCoreRules} / {coreRules.length} Core Rules
        Completed (
        {Math.round(progress)}%)
      </p>

      {liveData.exchangeRateStatus === "unavailable" ? (
        <div className="live-data-warning" role="status">
          <span>The current USD → INR exchange rate could not be loaded.</span>
          <button type="button" onClick={retryLiveData}>
            Retry
          </button>
        </div>
      ) : null}
      {liveData.signalFlagStatus === "error" ? (
        <div className="live-data-warning" role="status">
          <span>The international signal flag vocabulary could not be loaded.</span>
          <button type="button" onClick={retrySignalFlagSource}>
            Retry
          </button>
        </div>
      ) : null}
      {liveData.morseCodeStatus === "error" ? (
        <div className="live-data-warning" role="status">
          <span>The International Morse code alphabet could not be loaded.</span>
          <button type="button" onClick={retryMorseCodeSource}>
            Retry
          </button>
        </div>
      ) : null}
      {liveData.natoAlphabetStatus === "error" ? (
        <div className="live-data-warning" role="status">
          <span>The NATO phonetic alphabet could not be loaded.</span>
          <button type="button" onClick={retryNatoAlphabetSource}>
            Retry
          </button>
        </div>
      ) : null}
      {liveData.greekEnglishWordsStatus === "error" ? (
        <div className="live-data-warning" role="status">
          <span>Greek letter names could not be verified against the English dictionary.</span>
          <button type="button" onClick={retryGreekEnglishWordSources}>
            Retry
          </button>
        </div>
      ) : null}

      {displayedRules
        .map(({ rule, passed }) => {

          const isCurrent =
            currentRule &&
            currentRule.id ===
              rule.id;

          return (
            <div
              key={rule.id}
              className={`
                rule-card
                ${
                  passed
                    ? "rule-passed"
                    : "rule-failed"
                }
                ${
                  isCurrent
                    ? "current-rule"
                    : ""
                }
                ${rule.category.toLowerCase()}
              `}
            >
              <div className="rule-category">
                <span className="rule-id">
                  {rule.category === "Chaos" ? "Event" : `#${rule.id}`}
                </span>

                {rule.category}
              </div>

              <div className="rule-text">
                {passed ? "✅" : "❌"}{" "}
                {rule.getText
                  ? rule.getText(password, liveData)
                  : rule.text}
              </div>

              {isCurrent && (
                <div className="current-label">
                  ⭐ Current Rule
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
