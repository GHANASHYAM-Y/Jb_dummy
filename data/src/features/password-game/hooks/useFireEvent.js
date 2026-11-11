import { useEffect, useRef, useState } from "react";

const FIRE = "🔥";
const INITIAL_DELAY = 650;
const SPREAD_INTERVAL = 1200;

export function useFireEvent({ password, fireTriggered, onPasswordChange }) {
  const passwordRef = useRef(password);
  const hasStartedRef = useRef(false);
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  useEffect(() => {
    if (!fireTriggered || hasStartedRef.current) return undefined;

    const timer = window.setTimeout(() => {
      const characters = Array.from(passwordRef.current);
      if (characters.length === 0) return;

      // Flames live in the real input, so Backspace/Delete can extinguish them.
      characters[Math.floor(characters.length / 2)] = FIRE;
      const nextPassword = characters.join("");
      passwordRef.current = nextPassword;
      hasStartedRef.current = true;
      onPasswordChange(nextPassword);
      setPhase("active");
    }, INITIAL_DELAY);

    return () => window.clearTimeout(timer);
  }, [fireTriggered, onPasswordChange]);

  useEffect(() => {
    if (phase !== "active") return undefined;

    const timer = window.setInterval(() => {
      const characters = Array.from(passwordRef.current);
      const flameIndexes = characters
        .map((character, index) => (character === FIRE ? index : -1))
        .filter((index) => index !== -1);

      if (flameIndexes.length === 0) {
        setPhase("completed");
        return;
      }
      if (flameIndexes.length === characters.length) {
        passwordRef.current = characters.join("");
        setPhase("failed");
        return;
      }

      const first = flameIndexes[0];
      const last = flameIndexes.at(-1);
      // One character per interval leaves time to remove all flames.
      const preferred = flameIndexes.length % 2 === 0 ? last + 1 : first - 1;
      const fallback = preferred === last + 1 ? first - 1 : last + 1;
      const target = characters[preferred] !== undefined ? preferred : fallback;
      if (characters[target] !== undefined) characters[target] = FIRE;

      const nextPassword = characters.join("");

      if (characters.every((character) => character === FIRE)) {
        const nextPassword = characters.join("");
        passwordRef.current = nextPassword;
        onPasswordChange(nextPassword);
        setPhase("failed");
        return;
      }

      passwordRef.current = nextPassword;
      onPasswordChange(nextPassword);
    }, SPREAD_INTERVAL);

    return () => window.clearInterval(timer);
  }, [onPasswordChange, phase]);

  const updatePassword = (nextPassword) => {
    passwordRef.current = nextPassword;
    if (phase === "active" && !nextPassword.includes(FIRE)) setPhase("completed");
    onPasswordChange(nextPassword);
  };

  const retry = () => {
    hasStartedRef.current = false;
    passwordRef.current = "";
    setPhase("idle");
    onPasswordChange("");
  };

  return {
    phase,
    flameCount: Array.from(password).filter((character) => character === FIRE).length,
    updatePassword,
    retry,
  };
}
