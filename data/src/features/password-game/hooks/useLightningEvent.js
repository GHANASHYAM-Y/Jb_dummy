import { useEffect, useRef, useState } from "react";
import { reconcileTargetPosition } from "../utils/fireUtils";

const REACTION_WINDOW = 2000;
const NEXT_STRIKE_DELAY = 3000;

function chooseTarget(password) {
  const length = Array.from(password).length;
  return length === 0 ? null : Math.floor(Math.random() * length);
}

export function useLightningEvent({ password, rule30Complete, progressLevel, blocked, onPasswordChange }) {
  const armedRef = useRef(false);
  const passwordRef = useRef(password);
  const editRef = useRef(null);
  const [lightning, setLightning] = useState({
    phase: "idle",
    triggerLevel: null,
    targetIndex: null,
    remainingMs: REACTION_WINDOW,
    strikeCount: 0,
  });

  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  useEffect(() => {
    if (!rule30Complete || armedRef.current) return;

    armedRef.current = true;
    setLightning((currentLightning) => ({
      ...currentLightning,
      phase: "armed",
      triggerLevel: progressLevel + 2 + Math.floor(Math.random() * 3),
    }));
  }, [progressLevel, rule30Complete]);

  useEffect(() => {
    if (
      lightning.phase !== "armed" ||
      progressLevel < lightning.triggerLevel ||
      blocked
    ) {
      return undefined;
    }

    const targetTimer = window.setTimeout(() => {
      setLightning((currentLightning) => ({
        ...currentLightning,
        phase: "targeting",
        targetIndex: chooseTarget(passwordRef.current),
        remainingMs: REACTION_WINDOW,
      }));
    }, 0);

    return () => window.clearTimeout(targetTimer);
  }, [blocked, lightning.phase, lightning.triggerLevel, progressLevel]);

  useEffect(() => {
    if (lightning.phase !== "targeting" || lightning.targetIndex === null) return undefined;

    const deadline = Date.now() + REACTION_WINDOW;
    const countdown = window.setInterval(() => {
      setLightning((currentLightning) => ({
        ...currentLightning,
        remainingMs: Math.max(0, deadline - Date.now()),
      }));
    }, 100);

    const strikeTimer = window.setTimeout(() => {
      const characters = Array.from(passwordRef.current);
      const destroyedIndexes = new Set(
        [lightning.targetIndex - 1, lightning.targetIndex, lightning.targetIndex + 1]
          .filter((index) => index >= 0 && index < characters.length),
      );
      const nextPassword = characters
        .filter((_, index) => !destroyedIndexes.has(index))
        .join("");

      passwordRef.current = nextPassword;
      onPasswordChange(nextPassword);
      setLightning((currentLightning) => ({
        ...currentLightning,
        phase: nextPassword.length === 0 ? "ended" : "waiting",
        targetIndex: null,
        remainingMs: 0,
        strikeCount: currentLightning.strikeCount + 1,
      }));
    }, REACTION_WINDOW);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(strikeTimer);
    };
  }, [lightning.phase, lightning.targetIndex, onPasswordChange]);

  useEffect(() => {
    if (lightning.phase !== "waiting") return undefined;

    const nextTimer = window.setTimeout(() => {
      setLightning((currentLightning) => ({
        ...currentLightning,
        phase: "targeting",
        targetIndex: chooseTarget(passwordRef.current),
        remainingMs: REACTION_WINDOW,
      }));
    }, NEXT_STRIKE_DELAY);

    return () => window.clearTimeout(nextTimer);
  }, [lightning.phase]);

  const reconcilePassword = (nextValue) => {
    const previousValue = passwordRef.current;
    passwordRef.current = nextValue;

    setLightning((currentLightning) => {
      if (currentLightning.phase !== "targeting") return currentLightning;

      const target = reconcileTargetPosition(
        previousValue,
        nextValue,
        currentLightning.targetIndex,
        editRef.current,
      );
      editRef.current = null;

      return target === null
        ? { ...currentLightning, phase: "cleared", targetIndex: null }
        : { ...currentLightning, targetIndex: target };
    });
  };

  const captureEdit = (event) => {
    const nativeEvent = event.nativeEvent;
    editRef.current = {
      value: passwordRef.current,
      selectionStart: event.currentTarget.selectionStart,
      selectionEnd: event.currentTarget.selectionEnd,
      inputType: nativeEvent.inputType,
    };
  };

  const retry = () => {
    armedRef.current = false;
    passwordRef.current = "";
    setLightning({ phase: "idle", triggerLevel: null, targetIndex: null, remainingMs: REACTION_WINDOW, strikeCount: 0 });
    onPasswordChange("");
  };

  return { ...lightning, reconcilePassword, captureEdit, retry };
}
