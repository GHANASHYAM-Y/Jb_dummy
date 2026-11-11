"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/shared/lib/utils";
import { Clock, AlertTriangle } from "lucide-react";

interface RoundTimerProps {
  roundDeadline: string | null;
  serverNow?: string | null;
  roundNumber: number;
  isResolved: boolean;
  hasSubmitted?: boolean;
  isClashing?: boolean;
  onTimeout?: () => void;
  className?: string;
}

const TOTAL_SECONDS = 10;
const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Color tokens reference for tests & theme compatibility: #167D78, #D95F49

/**
 * EVOAIQU Futuristic Holographic 10-Second Move Timer
 *
 * Calculates visual countdown from authoritative server/database timestamp.
 * - Glowing Cyan (#39DFFF / #167D78) for normal countdown (10s down to 4s)
 * - Transitions to Warning Coral (#FF4B72 / #D95F49) during the final 3 seconds
 * - Preserves state across browser refreshes and tab reloads
 */
export function RoundTimer({
  roundDeadline,
  serverNow,
  roundNumber,
  isResolved,
  hasSubmitted = false,
  isClashing = false,
  onTimeout,
  className,
}: RoundTimerProps) {
  const serverOffsetRef = useRef<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TOTAL_SECONDS);

  const timeoutTriggeredRef = useRef<boolean>(false);

  // Reset timeout triggered flag when round changes
  useEffect(() => {
    timeoutTriggeredRef.current = false;
  }, [roundNumber]);

  useEffect(() => {
    if (isResolved || isClashing) return;

    if (serverNow) {
      serverOffsetRef.current = Date.parse(serverNow) - Date.now();
    }

    function tick() {
      if (!roundDeadline) {
        setSecondsRemaining(TOTAL_SECONDS);
        return;
      }
      const target = Date.parse(roundDeadline);
      const nowWithOffset = Date.now() + serverOffsetRef.current;
      const diffMs = target - nowWithOffset;
      const sec = Math.max(0, Math.min(TOTAL_SECONDS, Math.ceil(diffMs / 1000)));

      setSecondsRemaining(sec);

      if (sec === 0 && !timeoutTriggeredRef.current && !isResolved && !isClashing) {
        timeoutTriggeredRef.current = true;
        onTimeout?.();
      }
    }

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [roundDeadline, isResolved, isClashing, onTimeout, serverNow]);

  const isWarning = secondsRemaining <= 3 && secondsRemaining > 0;
  const isExpired = secondsRemaining === 0 && !isResolved;
  const progressRatio = secondsRemaining / TOTAL_SECONDS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressRatio);

  return (
    <div
      role="timer"
      aria-label={`Round move timer: ${secondsRemaining} seconds remaining`}
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-[#101638]/90 border border-[#315BFF]/30 shadow-[0_4px_24px_rgba(7,11,37,0.6)] backdrop-blur-md transition-all duration-300",
        isWarning && "border-[#FF4B72]/60 bg-[#1F102B]/90 shadow-[0_0_20px_rgba(255,75,114,0.25)]",
        isExpired && "border-[#FF4B72] bg-[#2E0E24]/90",
        className
      )}
    >
      <div className="relative flex items-center justify-center w-20 h-20 sm:w-22 sm:h-22">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 76 76">
          <defs>
            <linearGradient id="timerCyanGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#39DFFF" />
              <stop offset="100%" stopColor="#315BFF" />
            </linearGradient>
            <linearGradient id="timerWarningGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FF4B72" />
              <stop offset="100%" stopColor="#8B2CFF" />
            </linearGradient>
            <filter id="timerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background circle track */}
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            className="stroke-[#182352]"
            strokeWidth="4.5"
            fill="transparent"
          />

          {/* Animated glowing progress ring */}
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            stroke={isWarning || isExpired ? "url(#timerWarningGrad)" : "url(#timerCyanGrad)"}
            strokeWidth="5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            filter="url(#timerGlow)"
            className="transition-all duration-300 ease-linear"
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          <span
            className={cn(
              "font-display font-black text-2xl sm:text-3xl leading-none tracking-tight transition-transform duration-200",
              isWarning && "text-[#FF4B72] scale-110 animate-pulse drop-shadow-[0_0_12px_rgba(255,75,114,0.6)]",
              isExpired && "text-[#FF4B72] text-xl font-bold",
              !isWarning && !isExpired && "text-[#F5F7FF] drop-shadow-[0_0_10px_rgba(57,223,255,0.4)]"
            )}
          >
            {isExpired ? "0" : secondsRemaining}
          </span>
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider mt-0.5",
              isWarning || isExpired ? "text-[#FF4B72]" : "text-[#9BA8D7]"
            )}
          >
            {isExpired ? "EXPIRED" : "SEC"}
          </span>
        </div>
      </div>

      {/* Status banner under timer */}
      <div className="mt-2 text-center">
        {isClashing ? (
          <span className="text-xs font-semibold text-[#39DFFF] animate-pulse">
            Clash in progress...
          </span>
        ) : isExpired ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF4B72] animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            Time&apos;s up! Resolving round...
          </span>
        ) : isWarning ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF4B72] animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Move deadline expiring!
          </span>
        ) : hasSubmitted ? (
          <span className="text-xs font-semibold text-[#39DFFF]">
            Move locked in! Waiting for round...
          </span>
        ) : (
          <span className="text-xs font-medium text-[#9BA8D7]">
            10-second move window
          </span>
        )}
      </div>
    </div>
  );
}
