import { useEffect, useRef, useState } from "react";
import { reconcileTargetPosition } from "../utils/fireUtils";

const REACTION_WINDOW = 2000;
const NEXT_TARGET_DELAY = 550;

function chooseTarget(password) {
  const length = Array.from(password).length;
  return length === 0 ? null : Math.floor(Math.random() * length);
}

export function useIceEvent({ password, rule24Complete, progressLevel, blocked, onPasswordChange }) {
  const armedRef = useRef(false);
  const passwordRef = useRef(password);
  const editRef = useRef(null);
  const [ice, setIce] = useState({
    phase: "idle",
    triggerLevel: null,
    targetIndex: null,
    remainingMs: REACTION_WINDOW,
  });

  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  useEffect(() => {
    if (!rule24Complete || armedRef.current) return;

    armedRef.current = true;
    setIce((currentIce) => ({
      ...currentIce,
      phase: "armed",
      triggerLevel: progressLevel + 2 + Math.floor(Math.random() * 3),
    }));
  }, [progressLevel, rule24Complete]);

  useEffect(() => {
    if (ice.phase !== "armed" || progressLevel < ice.triggerLevel || blocked) {
      return undefined;
    }

    const targetTimer = window.setTimeout(() => {
      setIce((currentIce) => ({
        ...currentIce,
        phase: "targeting",
        targetIndex: chooseTarget(passwordRef.current),
        remainingMs: REACTION_WINDOW,
      }));
    }, 0);

    return () => window.clearTimeout(targetTimer);
  }, [blocked, ice.phase, ice.triggerLevel, progressLevel]);

  useEffect(() => {
    if (ice.phase !== "targeting" || ice.targetIndex === null) return undefined;

    const deadline = Date.now() + REACTION_WINDOW;
    const countdown = window.setInterval(() => {
      setIce((currentIce) => ({
        ...currentIce,
        remainingMs: Math.max(0, deadline - Date.now()),
      }));
    }, 100);

    const breakTimer = window.setTimeout(() => {
      const characters = Array.from(passwordRef.current);
      const nextPassword = characters
        .filter((_, index) => index !== ice.targetIndex)
        .join("");

      passwordRef.current = nextPassword;
      onPasswordChange(nextPassword);
      setIce((currentIce) => ({
        ...currentIce,
        phase: nextPassword.length === 0 ? "ended" : "breaking",
        targetIndex: null,
        remainingMs: 0,
      }));
    }, REACTION_WINDOW);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(breakTimer);
    };
  }, [ice.phase, ice.targetIndex, onPasswordChange]);

  useEffect(() => {
    if (ice.phase !== "breaking") return undefined;

    const nextTimer = window.setTimeout(() => {
      setIce((currentIce) => ({
        ...currentIce,
        phase: "targeting",
        targetIndex: chooseTarget(passwordRef.current),
        remainingMs: REACTION_WINDOW,
      }));
    }, NEXT_TARGET_DELAY);

    return () => window.clearTimeout(nextTimer);
  }, [ice.phase]);

  useEffect(() => {
    if (ice.phase !== "shattered") return undefined;

    const clearTimer = window.setTimeout(() => {
      setIce((currentIce) => ({ ...currentIce, phase: "cleared" }));
    }, 350);

    return () => window.clearTimeout(clearTimer);
  }, [ice.phase]);

  const reconcilePassword = (nextValue) => {
    const previousValue = passwordRef.current;
    passwordRef.current = nextValue;

    setIce((currentIce) => {
      if (currentIce.phase !== "targeting") return currentIce;

      const target = reconcileTargetPosition(
        previousValue,
        nextValue,
        currentIce.targetIndex,
        editRef.current,
      );
      editRef.current = null;

      return target === null
        ? { ...currentIce, phase: "shattered", targetIndex: null }
        : { ...currentIce, targetIndex: target };
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

  return { ...ice, reconcilePassword, captureEdit };
}
