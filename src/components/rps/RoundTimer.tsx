"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle } from "lucide-react";

interface RoundTimerProps {
  roundDeadline: string | null;
  serverNow?: string | null;
  roundNumber: number;
  isResolved: boolean;
  hasSubmitted?: boolean;
  onTimeout?: () => void;
  className?: string;
}

const TOTAL_SECONDS = 10;
const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * EVOAIQU Authoritative 10-Second Move Timer
 *
 * Calculates visual countdown from authoritative server/database timestamp.
 * - Primary EVOAIQU Teal (#167D78) for normal countdown (10s down to 4s)
 * - Transitions to Warning Coral (#D95F49) during the final 3 seconds
 * - Preserves state across browser refreshes and tab reloads
 */
export function RoundTimer({
  roundDeadline,
  serverNow,
  roundNumber,
  isResolved,
  hasSubmitted = false,
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
    if (isResolved) return;

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

      if (sec === 0 && !timeoutTriggeredRef.current && !isResolved) {
        timeoutTriggeredRef.current = true;
        onTimeout?.();
      }
    }

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [roundDeadline, isResolved, onTimeout, serverNow]);

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
        "flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white border border-[#E2E8E2] shadow-xs transition-colors",
        isWarning && "border-[#D95F49]/40 bg-[#FFF6F4]",
        isExpired && "border-[#D95F49] bg-[#FCE6DE]/40",
        className
      )}
    >
      <div className="relative flex items-center justify-center w-20 h-20 sm:w-22 sm:h-22">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 76 76">
          {/* Background circle */}
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            className="stroke-[#EEF1ED]"
            strokeWidth="5"
            fill="transparent"
          />
          {/* Animated progress ring */}
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            className={cn(
              "transition-all duration-300 ease-linear",
              isWarning || isExpired ? "stroke-[#D95F49]" : "stroke-[#167D78]"
            )}
            strokeWidth="5.5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={cn(
              "font-display font-black text-2xl sm:text-3xl leading-none tracking-tight transition-transform",
              isWarning && "text-[#D95F49] scale-110 animate-pulse",
              isExpired && "text-[#D95F49] text-xl font-bold",
              !isWarning && !isExpired && "text-[#203331]"
            )}
          >
            {isExpired ? "0" : secondsRemaining}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#65736F] mt-0.5">
            {isExpired ? "EXPIRED" : "SEC"}
          </span>
        </div>
      </div>

      {/* Status banner under timer */}
      <div className="mt-2 text-center">
        {isExpired ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D95F49] animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            Time&apos;s up! Resolving round...
          </span>
        ) : isWarning ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D95F49]">
            <Clock className="w-3.5 h-3.5" />
            Move deadline expiring!
          </span>
        ) : hasSubmitted ? (
          <span className="text-xs font-semibold text-[#167D78]">
            Move locked in! Waiting for round...
          </span>
        ) : (
          <span className="text-xs font-medium text-[#65736F]">
            10-second move window
          </span>
        )}
      </div>
    </div>
  );
}
