"use client";

import React, { useState } from "react";
import { Zap, Swords, Trophy, Activity } from "lucide-react";
import { HandGraphic } from "@/components/rps/HandGraphic";
import { cn } from "@/shared/lib/utils";

/**
 * EVOAIQU Futuristic Holographic Hero Arena Artwork
 *
 * A visually dominant gaming centerpiece featuring:
 * - Holographic 3D central arena stage with concentric radar rings and energy floor
 * - Three floating cybernetic champions (Rock, Paper, Scissors) with interactive hover glows
 * - Floating holographic HUD interface elements (match state, latency, First-to-5 pips)
 * - Restrained CSS animations that respect `prefers-reduced-motion`
 */
export function FuturisticHeroArtwork() {
  const [activeMove, setActiveMove] = useState<"rock" | "paper" | "scissors">("rock");

  return (
    <div
      className="relative w-full max-w-[500px] lg:max-w-[540px] mx-auto select-none overflow-hidden rounded-3xl"
      role="img"
      aria-label="Futuristic holographic Rock-Paper-Scissors battle arena illustration"
    >
      {/* ── Subtle Ambient Glow Behind Arena ── */}
      <div className="absolute -top-10 -left-10 w-60 h-60 bg-[#315BFF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-[#8B2CFF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#39DFFF]/10 rounded-full blur-[70px] pointer-events-none" />

      {/* ── Main Holographic Arena Panel ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#101638]/90 border border-[#315BFF]/35 p-5 sm:p-8 lg:p-9 shadow-[0_24px_64px_rgba(7,11,37,0.9)] backdrop-blur-xl">
        
        {/* Subtle Perspective Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b2559_1px,transparent_1px),linear-gradient(to_bottom,#1b2559_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)] opacity-30 pointer-events-none" />

        {/* ── Arena Header Status Bar ── */}
        <div className="relative z-10 flex items-center justify-between pb-4 sm:pb-5 border-b border-[#315BFF]/20">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39DFFF] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#39DFFF]" />
            </span>
            <span className="font-mono font-semibold text-[#39DFFF] tracking-wider uppercase text-[11px] sm:text-xs">
              LIVE ARENA • 10S BLITZ
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-[#070B25] border border-[#315BFF]/30">
            <Trophy className="w-3.5 h-3.5 text-[#39DFFF]" />
            <span className="font-mono font-semibold text-[#F5F7FF] text-[11px] sm:text-xs tracking-wide">
              FIRST TO 5
            </span>
          </div>
        </div>

        {/* ── Central Holographic Battle Stage ── */}
        <div className="relative z-10 my-5 sm:my-8 min-h-[270px] sm:min-h-[320px] flex flex-col items-center justify-center">

          {/* Perspective Concentric Hologram Rings */}
          <div className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-[#315BFF]/25 border-dashed animate-cyber-radar pointer-events-none" />
          <div className="absolute w-40 h-40 sm:w-52 sm:h-52 rounded-full border border-[#39DFFF]/30 pointer-events-none" />
          <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#315BFF]/20 via-[#8B2CFF]/15 to-transparent blur-md pointer-events-none" />

          {/* Glowing Platform Floor Light */}
          <div className="absolute bottom-2 w-48 sm:w-64 h-10 bg-gradient-to-r from-[#315BFF]/25 via-[#39DFFF]/30 to-[#8B2CFF]/25 blur-md rounded-full pointer-events-none" />

          {/* Central Clash Core Indicator */}
          <div className="relative z-10 flex items-center justify-center mb-4 sm:mb-5">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] flex items-center justify-center shadow-[0_0_24px_rgba(49,91,255,0.6)] border border-[#39DFFF]/50">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-full border border-[#39DFFF]/40 animate-ping opacity-25 pointer-events-none" />
          </div>

          {/* ── Three Floating Move Podiums ── */}
          <div className="relative w-full flex items-center justify-between sm:justify-center sm:gap-6 pt-2">
            
            {/* 1. ROCK PODIUM */}
            <button
              type="button"
              onClick={() => setActiveMove("rock")}
              onMouseEnter={() => setActiveMove("rock")}
              className={cn(
                "group relative flex flex-col items-center transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#39DFFF] rounded-2xl p-1.5 sm:p-2",
                activeMove === "rock" ? "scale-105" : "opacity-80 hover:opacity-100"
              )}
              aria-label="Preview Cybernetic Rock move"
            >
              <div
                className={cn(
                  "w-[74px] h-[74px] sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                  activeMove === "rock"
                    ? "bg-[#070B25] border-2 border-[#39DFFF] shadow-[0_0_28px_rgba(57,223,255,0.45)] ring-2 ring-[#39DFFF]/20 animate-cyber-float"
                    : "bg-[#070B25]/80 border border-[#315BFF]/30 hover:border-[#315BFF]"
                )}
              >
                <div className="absolute -bottom-2 w-3/4 h-2 bg-[#39DFFF]/30 blur-xs rounded-full" />
                <HandGraphic move="rock" size="lg" glow={activeMove === "rock"} />
              </div>
              <div className="mt-2 text-center">
                <span className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#F5F7FF] font-display">
                  ROCK
                </span>
                <span className="text-[10px] font-mono font-semibold text-[#39DFFF]">
                  KEY: 1
                </span>
              </div>
            </button>

            {/* 2. PAPER PODIUM */}
            <button
              type="button"
              onClick={() => setActiveMove("paper")}
              onMouseEnter={() => setActiveMove("paper")}
              className={cn(
                "group relative flex flex-col items-center transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#315BFF] rounded-2xl p-1.5 sm:p-2",
                activeMove === "paper" ? "scale-105" : "opacity-80 hover:opacity-100"
              )}
              aria-label="Preview Cybernetic Paper move"
            >
              <div
                className={cn(
                  "w-[74px] h-[74px] sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                  activeMove === "paper"
                    ? "bg-[#070B25] border-2 border-[#315BFF] shadow-[0_0_28px_rgba(49,91,255,0.45)] ring-2 ring-[#315BFF]/20 animate-cyber-float-delayed"
                    : "bg-[#070B25]/80 border border-[#315BFF]/30 hover:border-[#315BFF]"
                )}
              >
                <div className="absolute -bottom-2 w-3/4 h-2 bg-[#315BFF]/30 blur-xs rounded-full" />
                <HandGraphic move="paper" size="lg" glow={activeMove === "paper"} />
              </div>
              <div className="mt-2 text-center">
                <span className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#F5F7FF] font-display">
                  PAPER
                </span>
                <span className="text-[10px] font-mono font-semibold text-[#315BFF]">
                  KEY: 2
                </span>
              </div>
            </button>

            {/* 3. SCISSORS PODIUM */}
            <button
              type="button"
              onClick={() => setActiveMove("scissors")}
              onMouseEnter={() => setActiveMove("scissors")}
              className={cn(
                "group relative flex flex-col items-center transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B2CFF] rounded-2xl p-1.5 sm:p-2",
                activeMove === "scissors" ? "scale-105" : "opacity-80 hover:opacity-100"
              )}
              aria-label="Preview Cybernetic Scissors move"
            >
              <div
                className={cn(
                  "w-[74px] h-[74px] sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                  activeMove === "scissors"
                    ? "bg-[#070B25] border-2 border-[#8B2CFF] shadow-[0_0_28px_rgba(139,44,255,0.45)] ring-2 ring-[#8B2CFF]/20 animate-cyber-float"
                    : "bg-[#070B25]/80 border border-[#315BFF]/30 hover:border-[#8B2CFF]"
                )}
              >
                <div className="absolute -bottom-2 w-3/4 h-2 bg-[#8B2CFF]/30 blur-xs rounded-full" />
                <HandGraphic move="scissors" size="lg" glow={activeMove === "scissors"} />
              </div>
              <div className="mt-2 text-center">
                <span className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#F5F7FF] font-display">
                  SCISSORS
                </span>
                <span className="text-[10px] font-mono font-semibold text-[#8B2CFF]">
                  KEY: 3
                </span>
              </div>
            </button>

          </div>

        </div>

        {/* ── Arena Bottom Status Indicators ── */}
        <div className="relative z-10 pt-4 sm:pt-5 border-t border-[#315BFF]/20 grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#070B25]/80 border border-[#315BFF]/25">
            <span className="text-[10px] uppercase tracking-wider text-[#B8C3E0] block font-mono mb-1">
              LATENCY
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#39DFFF] font-mono flex items-center justify-center gap-1">
              <Activity className="w-3 h-3" /> &lt;20ms
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#070B25]/80 border border-[#315BFF]/25">
            <span className="text-[10px] uppercase tracking-wider text-[#B8C3E0] block font-mono mb-1">
              RULES
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#F5F7FF] font-mono">
              FIRST TO 5
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#070B25]/80 border border-[#315BFF]/25">
            <span className="text-[10px] uppercase tracking-wider text-[#B8C3E0] block font-mono mb-1">
              MATCHMAKING
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#39DFFF] font-mono flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" /> INSTANT
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
