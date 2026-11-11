"use client";

import React from "react";
import { Clock, X } from "lucide-react";
import { Button, Spinner } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";

export interface MatchmakingFloatingIndicatorProps {
  state: "searching" | "cancelling";
  elapsedSecs: number;
  onCancel: () => void | Promise<void>;
  onScrollToQueue?: () => void;
  className?: string;
  gameTitle?: string;
}

export function MatchmakingFloatingIndicator({
  state,
  elapsedSecs,
  onCancel,
  onScrollToQueue,
  className,
  gameTitle = "Rock, Paper, Scissors",
}: MatchmakingFloatingIndicatorProps) {
  // Format seconds to mm:ss
  const m = Math.floor(elapsedSecs / 60);
  const s = elapsedSecs % 60;
  const formattedTime = `${m}:${s < 10 ? "0" : ""}${s}`;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Active matchmaking queue"
      id="matchmaking-floating-indicator"
      className={cn(
        // Mobile layout: docked above bottom nav accounting for safe area, centered with safe margins
        // Desktop layout: docked at bottom-6 right-6, width auto, min-width 340px
        "fixed z-40 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto sm:min-w-[340px] sm:max-w-md",
        "bg-white/95 backdrop-blur-md rounded-2xl border border-[rgba(22,125,120,0.3)] shadow-xl",
        "p-3 sm:px-4 sm:py-3 transition-all duration-200 animate-fade-in",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Live radar pulse + Queue details */}
        <button
          type="button"
          onClick={onScrollToQueue}
          className={cn(
            "flex items-center gap-2.5 min-w-0 text-left rounded-lg transition-opacity",
            onScrollToQueue
              ? "cursor-pointer hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78]"
              : "cursor-default"
          )}
          title={onScrollToQueue ? "View matchmaking arena card" : undefined}
          aria-label={onScrollToQueue ? "View matchmaking queue in arena" : undefined}
        >
          {/* Animated radar status dot */}
          <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#167D78] opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#167D78]" />
          </div>

          <div className="min-w-0">
            <span className="font-bold text-xs sm:text-sm text-[#203331] leading-tight block truncate">
              Searching for Opponent...
            </span>
            <p className="text-[11px] text-[#52605C] leading-snug truncate">
              {gameTitle} • 10s Blitz
            </p>
          </div>
        </button>

        {/* Right: Elapsed Clock Badge + Cancel Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-xs font-mono font-bold text-[#167D78]"
            aria-label={`Elapsed queue time: ${formattedTime}`}
          >
            <Clock className="h-3 w-3 text-[#167D78] shrink-0" />
            <span>{formattedTime}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={state === "cancelling"}
            id="floating-cancel-matchmaking-btn"
            aria-label="Cancel matchmaking search"
            className="min-h-[44px] min-w-[44px] px-3 font-bold text-xs text-[#52605C] hover:text-[#D95F49] hover:bg-[#FCE6DE]/60 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D95F49] focus-visible:ring-offset-2 shrink-0"
          >
            {state === "cancelling" ? (
              <span className="inline-flex items-center gap-1 text-[#52605C]">
                <Spinner size="sm" />
                <span className="hidden sm:inline">Cancelling...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <X className="h-4 w-4 text-[#D95F49]" />
                <span>Cancel</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
