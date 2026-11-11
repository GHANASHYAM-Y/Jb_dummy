import { useEffect, useRef, useState } from "react";

const WARNING_DELAY = 700;
const SWEEP_INTERVAL = 850;

export function useWaterEvent({ password, rule19Complete, progressLevel, blocked, onPasswordChange }) {
  const armedRef = useRef(false);
  const passwordRef = useRef(password);
  const [water, setWater] = useState({
    phase: "idle",
    triggerLevel: null,
    sweptCount: 0,
    drainCommand: "",
  });

  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  useEffect(() => {
    if (!rule19Complete || armedRef.current) return;

    armedRef.current = true;
    setWater((currentWater) => ({
      ...currentWater,
      phase: "armed",
      triggerLevel: progressLevel + 2 + Math.floor(Math.random() * 3),
    }));
  }, [progressLevel, rule19Complete]);

  useEffect(() => {
    if (water.phase !== "armed" || progressLevel < water.triggerLevel || blocked) {
      return undefined;
    }

    const triggerTimer = window.setTimeout(() => {
      setWater((currentWater) => ({ ...currentWater, phase: "warning" }));
    }, 0);

    return () => window.clearTimeout(triggerTimer);
  }, [blocked, progressLevel, water.phase, water.triggerLevel]);

  useEffect(() => {
    if (water.phase !== "warning") return undefined;

    const warningTimer = window.setTimeout(() => {
      setWater((currentWater) => ({
        ...currentWater,
        phase: currentWater.drainCommand.trim().toUpperCase() === "DRAIN"
          ? "draining"
          : "active",
      }));
    }, WARNING_DELAY);

    return () => window.clearTimeout(warningTimer);
  }, [water.phase]);

  useEffect(() => {
    if (water.phase !== "active") return undefined;

    const sweepTimer = window.setInterval(() => {
      setWater((currentWater) => {
        const passwordLength = Array.from(passwordRef.current).length;
        const sweptCount = Math.min(currentWater.sweptCount + 1, passwordLength);

        return {
          ...currentWater,
          sweptCount,
          phase: passwordLength === 0 || sweptCount >= passwordLength
            ? "failed"
            : "active",
        };
      });
    }, SWEEP_INTERVAL);

    return () => window.clearInterval(sweepTimer);
  }, [water.phase]);

  const updateDrainCommand = (value) => {
    const normalizedValue = value.trim().toUpperCase();
    const isDrainCommand = normalizedValue === "DRAIN";

    setWater((currentWater) => ({
      ...currentWater,
      drainCommand: value,
      phase: isDrainCommand && currentWater.phase === "active"
        ? "draining"
        : currentWater.phase,
    }));
  };

  useEffect(() => {
    if (water.phase !== "draining") return undefined;

    const drainTimer = window.setTimeout(() => {
      setWater((currentWater) => ({
        ...currentWater,
        phase: "cleared",
        sweptCount: 0,
        drainCommand: "",
      }));
    }, 750);

    return () => window.clearTimeout(drainTimer);
  }, [water.phase]);

  const retry = () => {
    armedRef.current = false;
    setWater({ phase: "idle", triggerLevel: null, sweptCount: 0, drainCommand: "" });
    onPasswordChange("");
  };

  return { ...water, updateDrainCommand, retry };
}
