"use client";

import React, { useState } from "react";
import { Sparkles, Zap, Shield, Swords, Trophy, Activity } from "lucide-react";
import { HandGraphic } from "@/components/rps/HandGraphic";
import { cn } from "@/lib/utils";

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
      className="relative w-full max-w-[540px] mx-auto select-none"
      role="img"
      aria-label="Futuristic holographic Rock-Paper-Scissors battle arena illustration"
    >
      {/* ── Outer Ambient Glow Spotlights ── */}
      <div className="absolute -top-12 -left-12 w-64 h-64 bg-[#315BFF]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-[#8B2CFF]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#39DFFF]/15 rounded-full blur-[70px] pointer-events-none" />

      {/* ── Main Arena Shell Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#070B25]/90 border border-[#315BFF]/40 p-5 sm:p-7 shadow-[0_20px_60px_rgba(7,11,37,0.95)] backdrop-blur-xl">
        
        {/* Holographic Hexagonal & Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#101638_1px,transparent_1px),linear-gradient(to_bottom,#101638_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_65%_65%_at_50%_50%,#000_65%,transparent_100%)] opacity-50 pointer-events-none" />

        {/* ── Floating HUD Header Bar ── */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-[#315BFF]/25 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39DFFF] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#39DFFF]" />
            </span>
            <span className="font-mono font-bold text-[#39DFFF] tracking-wider uppercase text-[11px]">
              LIVE ARENA • 10S BLITZ
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#101638] border border-[#315BFF]/30">
            <Trophy className="w-3 h-3 text-[#39DFFF]" />
            <span className="font-mono font-bold text-[#F5F7FF] text-[10px] tracking-wide">
              FIRST TO 5 WINS
            </span>
          </div>
        </div>

        {/* ── Central Holographic Arena Stage ── */}
        <div className="relative z-10 my-4 min-h-[300px] sm:min-h-[330px] flex flex-col items-center justify-center">

          {/* Perspective Rotating Holographic Radar Rings */}
          <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-[#315BFF]/30 border-dashed animate-cyber-radar pointer-events-none" />
          <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-[#39DFFF]/40 pointer-events-none" />
          <div className="absolute w-28 h-28 rounded-full bg-gradient-to-br from-[#315BFF]/20 via-[#8B2CFF]/15 to-transparent blur-md pointer-events-none" />

          {/* Glowing Platform Base */}
          <div className="absolute bottom-2 w-52 sm:w-64 h-10 bg-gradient-to-r from-[#315BFF]/30 via-[#39DFFF]/40 to-[#8B2CFF]/30 blur-md rounded-full pointer-events-none" />

          {/* Central VS Energy Core */}
          <div className="relative z-10 flex items-center justify-center mb-4">
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] flex items-center justify-center shadow-[0_0_24px_rgba(49,91,255,0.7)] border border-[#39DFFF]/50">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-full border border-[#39DFFF]/40 animate-ping opacity-30 pointer-events-none" />
          </div>

          {/* ── Three Floating Cyber Hand Podiums ── */}
          <div className="relative w-full flex items-center justify-around sm:justify-center sm:gap-8 pt-2">
            
            {/* 1. ROCK PODIUM */}
            <button
              type="button"
              onClick={() => setActiveMove("rock")}
              onMouseEnter={() => setActiveMove("rock")}
              className={cn(
                "group relative flex flex-col items-center transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#39DFFF] rounded-2xl p-2",
                activeMove === "rock" ? "scale-105" : "opacity-80 hover:opacity-100"
              )}
              aria-label="Preview Cybernetic Rock move"
            >
              <div
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                  activeMove === "rock"
                    ? "bg-[#101638] border-2 border-[#39DFFF] shadow-[0_0_30px_rgba(57,223,255,0.45)] ring-2 ring-[#39DFFF]/20 animate-cyber-float"
                    : "bg-[#101638]/70 border border-[#315BFF]/30 hover:border-[#315BFF]"
                )}
              >
                <div className="absolute -bottom-2 w-3/4 h-2 bg-[#39DFFF]/30 blur-xs rounded-full" />
                <HandGraphic move="rock" size="lg" glow={activeMove === "rock"} />
              </div>
              <div className="mt-2 text-center">
                <span className="block text-[11px] font-black uppercase tracking-wider text-[#F5F7FF] font-display">
                  ROCK
                </span>
                <span className="text-[9px] font-mono font-bold text-[#39DFFF]">
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
                "group relative flex flex-col items-center transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#315BFF] rounded-2xl p-2",
                activeMove === "paper" ? "scale-105" : "opacity-80 hover:opacity-100"
              )}
              aria-label="Preview Cybernetic Paper move"
            >
              <div
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                  activeMove === "paper"
                    ? "bg-[#101638] border-2 border-[#315BFF] shadow-[0_0_30px_rgba(49,91,255,0.5)] ring-2 ring-[#315BFF]/20 animate-cyber-float-delayed"
                    : "bg-[#101638]/70 border border-[#315BFF]/30 hover:border-[#315BFF]"
                )}
              >
                <div className="absolute -bottom-2 w-3/4 h-2 bg-[#315BFF]/30 blur-xs rounded-full" />
                <HandGraphic move="paper" size="lg" glow={activeMove === "paper"} />
              </div>
              <div className="mt-2 text-center">
                <span className="block text-[11px] font-black uppercase tracking-wider text-[#F5F7FF] font-display">
                  PAPER
                </span>
                <span className="text-[9px] font-mono font-bold text-[#315BFF]">
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
                "group relative flex flex-col items-center transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B2CFF] rounded-2xl p-2",
                activeMove === "scissors" ? "scale-105" : "opacity-80 hover:opacity-100"
              )}
              aria-label="Preview Cybernetic Scissors move"
            >
              <div
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                  activeMove === "scissors"
                    ? "bg-[#101638] border-2 border-[#8B2CFF] shadow-[0_0_30px_rgba(139,44,255,0.5)] ring-2 ring-[#8B2CFF]/20 animate-cyber-float"
                    : "bg-[#101638]/70 border border-[#315BFF]/30 hover:border-[#8B2CFF]"
                )}
              >
                <div className="absolute -bottom-2 w-3/4 h-2 bg-[#8B2CFF]/30 blur-xs rounded-full" />
                <HandGraphic move="scissors" size="lg" glow={activeMove === "scissors"} />
              </div>
              <div className="mt-2 text-center">
                <span className="block text-[11px] font-black uppercase tracking-wider text-[#F5F7FF] font-display">
                  SCISSORS
                </span>
                <span className="text-[9px] font-mono font-bold text-[#8B2CFF]">
                  KEY: 3
                </span>
              </div>
            </button>

          </div>

        </div>

        {/* ── Holographic Bottom Status Bar ── */}
        <div className="relative z-10 pt-3 border-t border-[#315BFF]/20 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-[#101638]/90 border border-[#315BFF]/25">
            <span className="text-[9px] uppercase tracking-wider text-[#9BA8D7] block font-mono">
              LATENCY
            </span>
            <span className="text-[11px] font-bold text-[#39DFFF] font-mono flex items-center justify-center gap-1">
              <Activity className="w-2.5 h-2.5" /> &lt;20ms
            </span>
          </div>

          <div className="p-2 rounded-xl bg-[#101638]/90 border border-[#315BFF]/25">
            <span className="text-[9px] uppercase tracking-wider text-[#9BA8D7] block font-mono">
              RULES
            </span>
            <span className="text-[11px] font-bold text-[#F5F7FF] font-mono">
              FIRST TO 5
            </span>
          </div>

          <div className="p-2 rounded-xl bg-[#101638]/90 border border-[#315BFF]/25">
            <span className="text-[9px] uppercase tracking-wider text-[#9BA8D7] block font-mono">
              MATCHMAKING
            </span>
            <span className="text-[11px] font-bold text-[#39DFFF] font-mono flex items-center justify-center gap-1">
              <Zap className="w-2.5 h-2.5" /> INSTANT
            </span>
          </div>
        </div>

      </div>

      {/* Floating Holographic Badge 1 (Top Left) */}
      <div className="hidden sm:flex absolute -top-4 -left-4 items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0D1336]/95 border border-[#315BFF]/50 shadow-[0_8px_24px_rgba(7,11,37,0.8)] backdrop-blur-md animate-cyber-float pointer-events-none">
        <Sparkles className="w-3.5 h-3.5 text-[#39DFFF]" />
        <span className="text-[11px] font-bold font-mono text-[#F5F7FF]">
          HOLOGRAPHIC ARENA
        </span>
      </div>

      {/* Floating Holographic Badge 2 (Bottom Right) */}
      <div className="hidden sm:flex absolute -bottom-3 -right-3 items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0D1336]/95 border border-[#8B2CFF]/50 shadow-[0_8px_24px_rgba(7,11,37,0.8)] backdrop-blur-md animate-cyber-float-delayed pointer-events-none">
        <Shield className="w-3.5 h-3.5 text-[#8B2CFF]" />
        <span className="text-[11px] font-bold font-mono text-[#F5F7FF]">
          SERVER AUTHORITATIVE
        </span>
      </div>
    </div>
  );
}
