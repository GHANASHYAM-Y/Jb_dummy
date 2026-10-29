"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { HandGraphic } from "@/components/rps/HandGraphic";
import { rpsAudio } from "@/components/rps/RpsAudio";
import {
  type RpsMove,
  type RoundMove,
  type Round,
  RPS_MOVES,
  MOVE_LABEL_EN,
  MOVE_LABEL_TA,
  roundOutcomeLabel,
} from "@/lib/rps";
import { Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ArenaDuelStageProps {
  myMoveThisRound: RpsMove | null;
  submitting: boolean;
  locale: string;
  myPerspective: 1 | 2;
  myName: string;
  oppName: string;
  latestResolvedRound: Round | null;
  pendingMove: RpsMove | null;
  onSelectMove: (move: RpsMove) => void;
  onSubmitMove: (move?: RpsMove) => void;
  onClashActiveChange?: (active: boolean) => void;
}

export function ArenaDuelStage({
  myMoveThisRound,
  submitting,
  locale,
  myPerspective,
  myName,
  oppName,
  latestResolvedRound,
  pendingMove,
  onSelectMove,
  onSubmitMove,
  onClashActiveChange,
}: ArenaDuelStageProps) {
  // ── Synchronized Clash Reveal Animation State ──
  // null = regular idle/picking state
  // "3" | "2" | "1" = countdown rhythm
  // "reveal" = impact collision & move reveal
  const [clashStep, setClashStep] = useState<"3" | "2" | "1" | "reveal" | null>(null);
  const [clashingRound, setClashingRound] = useState<Round | null>(null);
  const lastAnimatedRoundNumRef = useRef<number>(0);

  // Notify parent of clash animation status for timer/poll coordination
  useEffect(() => {
    onClashActiveChange?.(clashStep !== null);
  }, [clashStep, onClashActiveChange]);

  const labelMap = locale === "ta" ? MOVE_LABEL_TA : MOVE_LABEL_EN;
  const hasSubmitted = myMoveThisRound !== null;

  // ── Keyboard Shortcuts (1=Rock, 2=Paper, 3=Scissors, Enter=Submit) ──
  useEffect(() => {
    if (hasSubmitted || submitting || clashStep !== null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "1" || e.key.toLowerCase() === "r") {
        e.preventDefault();
        rpsAudio.playMoveLockIn();
        onSelectMove("rock");
        onSubmitMove("rock");
      } else if (e.key === "2" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        rpsAudio.playMoveLockIn();
        onSelectMove("paper");
        onSubmitMove("paper");
      } else if (e.key === "3" || e.key.toLowerCase() === "s") {
        e.preventDefault();
        rpsAudio.playMoveLockIn();
        onSelectMove("scissors");
        onSubmitMove("scissors");
      } else if (e.key === "Enter" && pendingMove && !submitting) {
        e.preventDefault();
        rpsAudio.playMoveLockIn();
        onSubmitMove(pendingMove);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSubmitted, submitting, clashStep, pendingMove, onSelectMove, onSubmitMove]);

  // ── Trigger Synchronized Clash Animation when new round resolves ──
  useEffect(() => {
    if (!latestResolvedRound) return;
    if (latestResolvedRound.round_number <= lastAnimatedRoundNumRef.current) return;

    // First page mount with existing history should not re-play clash animation
    if (lastAnimatedRoundNumRef.current === 0) {
      lastAnimatedRoundNumRef.current = latestResolvedRound.round_number;
      return;
    }

    lastAnimatedRoundNumRef.current = latestResolvedRound.round_number;

    // Detect double-timeout draw: neither player submitted a move
    const isDoubleTimeoutDraw =
      (latestResolvedRound.player1_move === "timeout" || latestResolvedRound.player1_move === null) &&
      (latestResolvedRound.player2_move === "timeout" || latestResolvedRound.player2_move === null) &&
      latestResolvedRound.result === "draw";

    // Double-timeout draw: skip lengthy 3.2s clash animation to keep next round promptly interactive
    if (isDoubleTimeoutDraw) {
      return;
    }

    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Use asynchronous timeout to schedule animation and prevent React cascading render warning
    const initTimer = setTimeout(() => {
      setClashingRound(latestResolvedRound);

      if (isReducedMotion) {
        setClashStep("reveal");
        rpsAudio.playClashImpact();
        const outcome = roundOutcomeLabel(latestResolvedRound.result, myPerspective);
        if (outcome === "win") rpsAudio.playRoundWin();
        else if (outcome === "loss") rpsAudio.playRoundLoss();
        else rpsAudio.playRoundDraw();

        setTimeout(() => {
          setClashStep(null);
          setClashingRound(null);
        }, 1800);
        return;
      }

      // Full 3-2-1 Clash sequence
      setClashStep("3");
      rpsAudio.playClashCount(3);
    }, 10);

    const step2Timer = setTimeout(() => {
      if (!isReducedMotion) {
        setClashStep("2");
        rpsAudio.playClashCount(2);
      }
    }, 450);

    const step1Timer = setTimeout(() => {
      if (!isReducedMotion) {
        setClashStep("1");
        rpsAudio.playClashCount(1);
      }
    }, 900);

    const revealTimer = setTimeout(() => {
      if (!isReducedMotion) {
        setClashStep("reveal");
        rpsAudio.playClashImpact();

        const outcome = roundOutcomeLabel(latestResolvedRound.result, myPerspective);
        if (outcome === "win") rpsAudio.playRoundWin();
        else if (outcome === "loss") rpsAudio.playRoundLoss();
        else rpsAudio.playRoundDraw();
      }
    }, 1350);

    const finishTimer = setTimeout(() => {
      if (!isReducedMotion) {
        setClashStep(null);
        setClashingRound(null);
      }
    }, 3200);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(step2Timer);
      clearTimeout(step1Timer);
      clearTimeout(revealTimer);
      clearTimeout(finishTimer);
    };
  }, [latestResolvedRound, myPerspective]);

  // ── Render Clash Showcase during active synchronized reveal ──
  if (clashStep !== null && clashingRound) {
    const isReveal = clashStep === "reveal";
    const myMove: RoundMove = myPerspective === 1 ? clashingRound.player1_move : clashingRound.player2_move;
    const oppMove: RoundMove = myPerspective === 1 ? clashingRound.player2_move : clashingRound.player1_move;
    const outcome = roundOutcomeLabel(clashingRound.result, myPerspective);

    return (
      <div className="evo-card p-6 sm:p-8 bg-white border border-[#E2E8E2] shadow-elevated text-center relative overflow-hidden">
        {/* Animated Background Glow */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-500 pointer-events-none",
            isReveal && outcome === "win" && "bg-radial from-[#167D78]/15 via-transparent to-transparent opacity-100",
            isReveal && outcome === "loss" && "bg-radial from-[#D95F49]/15 via-transparent to-transparent opacity-100",
            isReveal && outcome === "draw" && "bg-radial from-[#EEF1ED]/80 via-transparent to-transparent opacity-100"
          )}
        />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-[18rem]">
          {/* Phase 1: 3-2-1 Countdown Badge */}
          {!isReveal ? (
            <div className="mb-4">
              <span className="inline-block text-5xl sm:text-6xl font-black font-display text-[#167D78] tracking-widest animate-rps-pop select-none">
                {clashStep}
              </span>
              <p className="text-xs font-bold text-[#65736F] uppercase tracking-wider mt-1">
                Rock... Paper... Scissors...
              </p>
            </div>
          ) : (
            /* Phase 2: Result Banner */
            <div className="mb-4 animate-rps-pop">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs",
                  outcome === "win" && "bg-[#DDF2EB] text-[#167D78] ring-2 ring-[#167D78]/30",
                  outcome === "loss" && "bg-[#FCE6DE] text-[#D95F49] ring-2 ring-[#D95F49]/30",
                  outcome === "draw" && "bg-[#EEF1ED] text-[#65736F]"
                )}
              >
                {outcome === "win" && <Sparkles className="w-4 h-4" />}
                {outcome === "win"
                  ? "You Won Round! (+1 Point)"
                  : outcome === "loss"
                  ? `${oppName} Won Round (+1 Point)`
                  : "Round Draw! (0 Points - Replaying)"}
              </span>
            </div>
          )}

          {/* Clash Duel Hands Showcase */}
          <div className="w-full flex items-center justify-around sm:justify-center sm:gap-16 py-4">
            {/* Player 1 (You) */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center transition-all duration-300",
                  !isReveal
                    ? "bg-[#F7F8F4] border border-[#E2E8E2] animate-rps-fist-left"
                    : outcome === "win"
                    ? "bg-[#DDF2EB] border-2 border-[#167D78] shadow-md scale-105"
                    : "bg-[#F7F8F4] border border-[#E2E8E2] opacity-80"
                )}
              >
                <HandGraphic
                  move={!isReveal ? "rock" : myMove}
                  size="xl"
                  glow={isReveal && outcome === "win"}
                />
              </div>
              <span className="text-xs font-bold text-[#203331]">{myName}</span>
              {isReveal && (
                <span className="text-[11px] font-semibold text-[#167D78]">
                  {labelMap[myMove]}
                </span>
              )}
            </div>

            {/* Shockwave Collision Point */}
            <div className="relative flex items-center justify-center w-12 h-12">
              {isReveal ? (
                <>
                  <div className="absolute w-12 h-12 rounded-full border-2 border-[#167D78] animate-rps-shockwave pointer-events-none" />
                  <span className="text-sm font-black font-display text-[#167D78] uppercase select-none">
                    VS
                  </span>
                </>
              ) : (
                <span className="text-sm font-bold text-[#8E9B97] font-mono">VS</span>
              )}
            </div>

            {/* Player 2 (Opponent) */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center transition-all duration-300",
                  !isReveal
                    ? "bg-[#F7F8F4] border border-[#E2E8E2] animate-rps-fist-right"
                    : outcome === "loss"
                    ? "bg-[#FCE6DE] border-2 border-[#D95F49] shadow-md scale-105"
                    : "bg-[#F7F8F4] border border-[#E2E8E2] opacity-80"
                )}
              >
                <HandGraphic
                  move={!isReveal ? "rock" : oppMove}
                  size="xl"
                  flip
                  glow={isReveal && outcome === "loss"}
                />
              </div>
              <span className="text-xs font-bold text-[#203331]">{oppName}</span>
              {isReveal && (
                <span className="text-[11px] font-semibold text-[#D95F49]">
                  {labelMap[oppMove]}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Regular Arena Stage (Choosing Move or Waiting) ──
  return (
    <div className="space-y-4">
      {/* Move Selection Area */}
      {hasSubmitted ? (
        /* Waiting State (Opponent has not submitted yet) */
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center bg-[#F7F8F4] rounded-2xl border border-[#E2E8E2] animate-fade-in">
          <div className="p-4 rounded-2xl bg-white shadow-xs border-2 border-[#167D78] ring-4 ring-[#DDF2EB]">
            <HandGraphic move={myMoveThisRound!} size="lg" glow />
          </div>
          <div>
            <p className="font-bold text-[#203331] text-base">
              You chose {labelMap[myMoveThisRound!]}
            </p>
            <p className="text-xs text-[#65736F] mt-0.5">
              Move is securely locked in. Waiting for {oppName} to commit...
            </p>
          </div>
          <Spinner size="md" className="text-[#167D78] mt-1" />
        </div>
      ) : (
        /* Interactive Choice Buttons */
        <div className="space-y-4">
          <div
            role="group"
            aria-label="Choose Rock, Paper, or Scissors"
            className="grid grid-cols-3 gap-2.5 sm:gap-4"
          >
            {RPS_MOVES.map((move, idx) => {
              const isSelected = pendingMove === move;
              const isThisSubmitting = submitting && isSelected;
              return (
                <button
                  key={move}
                  type="button"
                  onClick={() => {
                    if (submitting || hasSubmitted) return;
                    rpsAudio.playMoveLockIn();
                    onSelectMove(move);
                    onSubmitMove(move);
                  }}
                  disabled={submitting}
                  aria-pressed={isSelected}
                  aria-label={`${labelMap[move]} move card (Press ${idx + 1})`}
                  className={cn(
                    "group relative flex flex-col items-center justify-between p-3.5 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isSelected
                      ? "border-[#167D78] bg-[#DDF2EB] shadow-md ring-2 ring-[#167D78]/30 scale-[1.02]"
                      : "border-[#E2E8E2] bg-white hover:border-[#167D78] hover:bg-[#F7F8F4] shadow-xs active:scale-[0.98]"
                  )}
                >
                  {/* Keyboard shortcut hint */}
                  <span className="absolute top-2 right-2 text-[10px] font-mono font-bold text-[#8E9B97] bg-[#EEF1ED] px-1.5 py-0.5 rounded">
                    {idx + 1}
                  </span>

                  {/* Hand Illustration */}
                  <div className="flex items-center justify-center py-2 group-hover:scale-105 transition-transform">
                    <HandGraphic move={move} size="lg" glow={isSelected} />
                  </div>

                  {/* Label & Status */}
                  <div className="text-center mt-2 w-full">
                    <span className="block font-display font-bold text-sm sm:text-base text-[#203331]">
                      {labelMap[move]}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] block mt-1 font-semibold",
                        isSelected ? "text-[#167D78]" : "text-[#8E9B97]"
                      )}
                    >
                      {isThisSubmitting
                        ? "Locking in..."
                        : isSelected
                        ? "Selected"
                        : "Tap to lock in"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Big Lock In Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full text-base font-bold shadow-md h-12"
            onClick={() => {
              if (pendingMove && !submitting) {
                rpsAudio.playMoveLockIn();
                onSubmitMove(pendingMove);
              }
            }}
            loading={submitting}
            disabled={!pendingMove || submitting}
            id="submit-move-btn"
          >
            {submitting
              ? "Locking in..."
              : pendingMove
              ? `Lock In ${labelMap[pendingMove]}`
              : "Select a Move"}
          </Button>

          <p className="text-center text-[11px] text-[#8E9B97]">
            Single-tap any hand to play &middot; Keyboard: <kbd className="font-mono font-bold bg-[#EEF1ED] px-1 py-0.5 rounded">1</kbd>, <kbd className="font-mono font-bold bg-[#EEF1ED] px-1 py-0.5 rounded">2</kbd>, <kbd className="font-mono font-bold bg-[#EEF1ED] px-1 py-0.5 rounded">3</kbd> to choose &middot; <kbd className="font-mono font-bold bg-[#EEF1ED] px-1 py-0.5 rounded">Enter</kbd> to lock in
          </p>
        </div>
      )}
    </div>
  );
}
