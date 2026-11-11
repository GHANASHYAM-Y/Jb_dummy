"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Shield, Lock, CheckCircle2 } from "lucide-react";
import { HandGraphic } from "@/features/rock-paper-scissors/components/HandGraphic";
import { rpsAudio } from "@/features/rock-paper-scissors/sound/RpsAudio";
import {
  type RpsMove,
  type RoundMove,
  type Round,
  RPS_MOVES,
  MOVE_LABEL_EN,
  MOVE_LABEL_TA,
  roundOutcomeLabel,
} from "@/features/rock-paper-scissors/engine/rps";
import { Button, Spinner } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";

interface ArenaDuelStageProps {
  myMoveThisRound: RpsMove | null;
  submitting: boolean;
  locale: string;
  myPerspective: 1 | 2;
  myName: string;
  oppName: string;
  latestResolvedRound: Round | null;
  pendingMove: RpsMove | null;
  opponentHasSubmitted?: boolean;
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
  opponentHasSubmitted = false,
  onSelectMove,
  onSubmitMove,
  onClashActiveChange,
}: ArenaDuelStageProps) {
  // ── Synchronized Clash Reveal Animation State ──
  // null = regular battle stage / choosing state
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
      <div className="relative overflow-hidden rounded-3xl bg-[#070B25] border border-[#315BFF]/40 p-6 sm:p-8 text-center shadow-[0_16px_50px_rgba(7,11,37,0.9)]">
        {/* Dynamic Spotlights & Radial Ambience */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-500 pointer-events-none",
            isReveal && outcome === "win" && "bg-radial from-[#39DFFF]/20 via-[#315BFF]/10 to-transparent opacity-100",
            isReveal && outcome === "loss" && "bg-radial from-[#FF4B72]/20 via-[#8B2CFF]/10 to-transparent opacity-100",
            isReveal && outcome === "draw" && "bg-radial from-[#9BA8D7]/15 via-transparent to-transparent opacity-100",
            !isReveal && "bg-radial from-[#315BFF]/15 via-transparent to-transparent opacity-80"
          )}
        />

        {/* Holographic Arena Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#101638_1px,transparent_1px),linear-gradient(to_bottom,#101638_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-[19rem] sm:min-h-[22rem]">
          {/* Phase 1: 3-2-1 Countdown Badge */}
          {!isReveal ? (
            <div className="mb-6">
              <span className="inline-block text-6xl sm:text-7xl font-black font-display text-transparent bg-clip-text bg-gradient-to-b from-[#39DFFF] to-[#315BFF] drop-shadow-[0_0_24px_rgba(57,223,255,0.7)] tracking-widest animate-rps-pop select-none">
                {clashStep}
              </span>
              <p className="text-xs font-bold text-[#9BA8D7] uppercase tracking-widest mt-2">
                Rock... Paper... Scissors...
              </p>
            </div>
          ) : (
            /* Phase 2: Result Banner */
            <div className="mb-6 animate-rps-pop">
              <span
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-sm sm:text-base font-black uppercase tracking-wider backdrop-blur-md shadow-lg",
                  outcome === "win" && "bg-[#39DFFF]/20 text-[#39DFFF] border border-[#39DFFF]/50 shadow-[0_0_20px_rgba(57,223,255,0.4)]",
                  outcome === "loss" && "bg-[#FF4B72]/20 text-[#FF4B72] border border-[#FF4B72]/50 shadow-[0_0_20px_rgba(255,75,114,0.4)]",
                  outcome === "draw" && "bg-[#101638] text-[#9BA8D7] border border-[#315BFF]/30"
                )}
              >
                {outcome === "win" && <Sparkles className="w-4 h-4 animate-spin" />}
                {outcome === "win"
                  ? "You Won Round! (+1 Point)"
                  : outcome === "loss"
                  ? `${oppName} Won Round (+1 Point)`
                  : "Round Draw! (0 Points - Replaying)"}
              </span>
            </div>
          )}

          {/* Clash Duel Hands Showcase */}
          <div className="w-full flex items-center justify-around sm:justify-center sm:gap-20 py-4">
            {/* Player 1 (You) Platform */}
            <div className="flex flex-col items-center gap-2.5">
              <div
                className={cn(
                  "w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                  !isReveal
                    ? "bg-[#101638]/90 border border-[#315BFF]/40 animate-rps-fist-left shadow-[0_0_20px_rgba(49,91,255,0.2)]"
                    : outcome === "win"
                    ? "bg-[#101638] border-2 border-[#39DFFF] shadow-[0_0_30px_rgba(57,223,255,0.5)] scale-110"
                    : "bg-[#101638]/60 border border-[#315BFF]/20 opacity-70"
                )}
              >
                {/* Platform Base Glow */}
                <div className="absolute -bottom-2 w-3/4 h-2 bg-[#39DFFF]/30 blur-sm rounded-full pointer-events-none" />
                <HandGraphic
                  move={!isReveal ? "rock" : myMove}
                  size="xl"
                  glow={isReveal && outcome === "win"}
                />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#F5F7FF]">{myName}</span>
              {isReveal && (
                <span className="text-xs font-bold text-[#39DFFF] uppercase tracking-wider">
                  {labelMap[myMove]}
                </span>
              )}
            </div>

            {/* Shockwave Energy Collision Point */}
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
              {isReveal ? (
                <>
                  <div className="absolute w-16 h-16 rounded-full border-2 border-[#39DFFF] animate-rps-shockwave pointer-events-none" />
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] flex items-center justify-center shadow-[0_0_20px_rgba(139,44,255,0.6)]">
                    <span className="text-sm font-black font-display text-white uppercase select-none">
                      VS
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#101638] border border-[#315BFF]/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#9BA8D7] font-mono">VS</span>
                </div>
              )}
            </div>

            {/* Player 2 (Opponent) Platform */}
            <div className="flex flex-col items-center gap-2.5">
              <div
                className={cn(
                  "w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                  !isReveal
                    ? "bg-[#101638]/90 border border-[#8B2CFF]/40 animate-rps-fist-right shadow-[0_0_20px_rgba(139,44,255,0.2)]"
                    : outcome === "loss"
                    ? "bg-[#101638] border-2 border-[#FF4B72] shadow-[0_0_30px_rgba(255,75,114,0.5)] scale-110"
                    : "bg-[#101638]/60 border border-[#8B2CFF]/20 opacity-70"
                )}
              >
                <div className="absolute -bottom-2 w-3/4 h-2 bg-[#8B2CFF]/30 blur-sm rounded-full pointer-events-none" />
                <HandGraphic
                  move={!isReveal ? "rock" : oppMove}
                  size="xl"
                  flip
                  glow={isReveal && outcome === "loss"}
                />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#F5F7FF]">{oppName}</span>
              {isReveal && (
                <span className="text-xs font-bold text-[#FF4B72] uppercase tracking-wider">
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
    <div className="space-y-6">
      {/* ── Central Battle Arena (The Visual Centerpiece) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#070B25] border border-[#315BFF]/30 p-5 sm:p-7 shadow-[0_16px_48px_rgba(7,11,37,0.85)]">
        {/* Ambient Spotlights */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#315BFF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#8B2CFF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Center Energy Dividing Line */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-[#39DFFF]/30 to-transparent pointer-events-none hidden sm:block" />

        <div className="relative z-10 grid grid-cols-2 gap-4 sm:gap-12 items-center">
          {/* Left: Your Platform */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-bold text-[#39DFFF] uppercase tracking-widest mb-2">
              {myName} (You)
            </span>
            <div
              className={cn(
                "w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-300 relative",
                hasSubmitted
                  ? "bg-[#101638] border-2 border-[#39DFFF] shadow-[0_0_24px_rgba(57,223,255,0.35)]"
                  : pendingMove
                  ? "bg-[#101638] border-2 border-[#315BFF] shadow-[0_0_16px_rgba(49,91,255,0.25)]"
                  : "bg-[#101638]/70 border border-[#315BFF]/20 border-dashed"
              )}
            >
              {hasSubmitted ? (
                <>
                  <HandGraphic move={myMoveThisRound!} size="lg" glow />
                  <span className="text-[11px] font-bold text-[#39DFFF] mt-1 uppercase">
                    {labelMap[myMoveThisRound!]}
                  </span>
                </>
              ) : pendingMove ? (
                <>
                  <HandGraphic move={pendingMove} size="lg" glow />
                  <span className="text-[10px] font-semibold text-[#9BA8D7] mt-1">
                    {labelMap[pendingMove]}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-[#9BA8D7]/60">
                  <div className="w-10 h-10 rounded-xl bg-[#182352]/40 flex items-center justify-center mb-1">
                    <span className="text-xl">?</span>
                  </div>
                  <span className="text-[10px] font-medium">Ready</span>
                </div>
              )}
            </div>

            {/* Status under your platform */}
            <div className="mt-2.5">
              {hasSubmitted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#39DFFF]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Locked In
                </span>
              ) : (
                <span className="text-[11px] font-medium text-[#9BA8D7]">
                  {pendingMove ? "Click card or Enter" : "Pick a move below"}
                </span>
              )}
            </div>
          </div>

          {/* Right: Opponent Platform (Move Privacy Strictly Preserved!) */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-bold text-[#8B2CFF] uppercase tracking-widest mb-2">
              {oppName}
            </span>
            <div
              className={cn(
                "w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-300 relative",
                opponentHasSubmitted
                  ? "bg-[#101638] border-2 border-[#8B2CFF] shadow-[0_0_24px_rgba(139,44,255,0.35)]"
                  : "bg-[#101638]/70 border border-[#8B2CFF]/20 border-dashed"
              )}
            >
              {opponentHasSubmitted ? (
                <div className="flex flex-col items-center justify-center text-[#8B2CFF]">
                  <div className="w-12 h-12 rounded-2xl bg-[#8B2CFF]/20 border border-[#8B2CFF]/50 flex items-center justify-center shadow-[0_0_16px_rgba(139,44,255,0.3)] mb-1">
                    <Lock className="w-6 h-6 text-[#F5F7FF]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F5F7FF]">
                    LOCKED
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-[#9BA8D7]/60">
                  <div className="w-10 h-10 rounded-xl bg-[#182352]/40 flex items-center justify-center mb-1">
                    <Shield className="w-5 h-5 text-[#9BA8D7]/50" />
                  </div>
                  <span className="text-[10px] font-medium">Choosing...</span>
                </div>
              )}
            </div>

            {/* Status under opponent platform */}
            <div className="mt-2.5">
              {opponentHasSubmitted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8B2CFF]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Move Committed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9BA8D7]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B2CFF] animate-ping" />
                  Thinking...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Hand-Selection Panel: 3 Large Physical-Feel Game Cards ── */}
      {hasSubmitted ? (
        /* Waiting Banner when you have already committed your move */
        <div className="flex flex-col items-center justify-center gap-3 py-5 px-4 rounded-2xl bg-[#101638]/80 border border-[#315BFF]/30 text-center animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#39DFFF] animate-pulse" />
            <p className="font-bold text-[#F5F7FF] text-sm sm:text-base">
              You chose <span className="text-[#39DFFF]">{labelMap[myMoveThisRound!]}</span> — Move is securely locked!
            </p>
          </div>
          <p className="text-xs text-[#9BA8D7]">
            {opponentHasSubmitted
              ? "Both moves submitted! Resolving round..."
              : `Waiting for ${oppName} to commit their move...`}
          </p>
          <Spinner size="md" className="text-[#39DFFF] mt-0.5" />
        </div>
      ) : (
        /* 3 Interactive Move Selection Cards */
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
                    "group relative flex flex-col items-center justify-between p-3 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39DFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B25]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isSelected
                      ? "border-[#39DFFF] bg-gradient-to-b from-[#182352] to-[#101638] shadow-[0_0_24px_rgba(57,223,255,0.4)] scale-[1.03]"
                      : "border-[#315BFF]/30 bg-[#101638] hover:border-[#39DFFF]/70 hover:bg-[#151D4D] hover:-translate-y-1 shadow-[0_4px_16px_rgba(7,11,37,0.5)] active:scale-[0.98]"
                  )}
                >
                  {/* Keyboard shortcut keycap pill */}
                  <span className="absolute top-2 right-2 text-[10px] font-mono font-bold text-[#39DFFF] bg-[#070B25] border border-[#315BFF]/40 px-1.5 py-0.5 rounded shadow-xs">
                    {idx + 1}
                  </span>

                  {/* Hand Illustration */}
                  <div className="flex items-center justify-center py-2 group-hover:scale-105 transition-transform duration-200">
                    <HandGraphic move={move} size="lg" glow={isSelected} />
                  </div>

                  {/* Label & Status */}
                  <div className="text-center mt-2 w-full">
                    <span className="block font-display font-bold text-xs sm:text-base text-[#F5F7FF] tracking-wide uppercase">
                      {labelMap[move]}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] sm:text-[11px] block mt-1 font-semibold",
                        isSelected ? "text-[#39DFFF]" : "text-[#9BA8D7] group-hover:text-[#F5F7FF]"
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

          {/* Large Primary Lock In Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full text-base font-bold h-12 !bg-gradient-to-r !from-[#315BFF] !via-[#5244E8] !to-[#8B2CFF] hover:!from-[#2546DB] hover:!to-[#761EDB] !text-white border border-[#39DFFF]/40 shadow-[0_4px_20px_rgba(49,91,255,0.4)] disabled:!bg-[#182352] disabled:!opacity-45 transition-all cursor-pointer"
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

          {/* Accessible helper hints */}
          <p className="text-center text-[11px] text-[#9BA8D7]">
            Single-tap any hand to play &middot; Keyboard: <kbd className="font-mono font-bold bg-[#101638] text-[#39DFFF] border border-[#315BFF]/40 px-1.5 py-0.5 rounded">1</kbd>, <kbd className="font-mono font-bold bg-[#101638] text-[#39DFFF] border border-[#315BFF]/40 px-1.5 py-0.5 rounded">2</kbd>, <kbd className="font-mono font-bold bg-[#101638] text-[#39DFFF] border border-[#315BFF]/40 px-1.5 py-0.5 rounded">3</kbd> to choose &middot; <kbd className="font-mono font-bold bg-[#101638] text-[#39DFFF] border border-[#315BFF]/40 px-1.5 py-0.5 rounded">Enter</kbd> to lock in
          </p>
        </div>
      )}
    </div>
  );
}
