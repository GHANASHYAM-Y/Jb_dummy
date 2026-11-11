"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Trophy, Users, Swords, Shield, ArrowRight,
  Share2, Sparkles, Clock, Flame, Crown, Award, CheckCircle2
} from "lucide-react";
import { Button } from "@/shared/ui";
import { FuturisticLandingNav } from "@/components/landing/FuturisticLandingNav";
import { FuturisticHeroArtwork } from "@/components/landing/FuturisticHeroArtwork";
import { FuturisticFooter } from "@/components/landing/FuturisticFooter";

interface LandingPageProps {
  initialUser?: { id: string; email?: string } | null;
}

export function LandingPage({ initialUser }: LandingPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopy = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const featurePills = [
    "Instant Matchmaking",
    "Real-Time 10s Blitz",
    "Consensual & Safe Dares",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#070B25] text-[#F5F7FF] selection:bg-[#39DFFF]/30 selection:text-white relative overflow-x-hidden">
      
      {/* ── Global Background Starfield & Atmosphere ── */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(49,91,255,0.12),transparent_70%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgba(139,44,255,0.07),transparent_70%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#101638_1px,transparent_1px),linear-gradient(to_bottom,#101638_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none z-0" />

      {/* ── TOP NAVIGATION ── */}
      <FuturisticLandingNav user={initialUser} />

      <main className="flex-1 relative z-10">

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1: HERO — SPACIOUS BALANCED TWO-COLUMN ARENA
        ══════════════════════════════════════════════════════════════════════ */}
        <section
          id="hero"
          className="relative pt-8 pb-16 sm:pt-12 sm:pb-24 md:pt-16 md:pb-32 lg:pt-20 lg:pb-36 overflow-hidden"
          aria-labelledby="hero-title"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-16 xl:gap-20 items-center">

              {/* ── Left Column: Hero Content & CTAs ── */}
              <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
                
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 rounded-full bg-[#101638] border border-[#315BFF]/35 text-[#39DFFF] text-[11px] sm:text-xs font-mono font-semibold tracking-[0.16em] uppercase mb-6 shadow-[0_0_16px_rgba(49,91,255,0.2)]">
                  <Sparkles className="w-3.5 h-3.5 text-[#39DFFF]" />
                  <span>NEXT-GEN MULTIPLAYER ARENA</span>
                </div>

                {/* Main Headline */}
                <h1
                  id="hero-title"
                  className="font-display font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5rem] tracking-[-0.03em] leading-[1.1] !text-[#F5F7FF] mb-6 break-words"
                >
                  LET THE{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#39DFFF] via-[#5B7BFF] to-[#8B2CFF] drop-shadow-[0_0_30px_rgba(57,223,255,0.4)]">
                    GAMES
                  </span>{" "}
                  BEGIN.
                </h1>

                {/* Supporting Headline */}
                <p className="font-display font-semibold text-base sm:text-xl lg:text-2xl text-[#D6DEFF] mb-4 leading-snug max-w-xl">
                  Challenge your friends. Test your instincts. Create unforgettable moments.
                </p>

                {/* Description */}
                <p className="text-[#B8C3E0] text-sm sm:text-base lg:text-lg max-w-lg mb-8 leading-relaxed">
                  EVOAIQU brings people together through competitive multiplayer games, hilarious dares, and unexpected moments.
                </p>

                {/* Primary & Secondary Call to Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 w-full sm:w-auto mb-10">
                  <Link
                    href={initialUser ? "/games" : "/signup"}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="primary"
                      size="xl"
                      className="w-full sm:w-auto !bg-gradient-to-r !from-[#315BFF] !to-[#8B2CFF] !text-white font-black text-sm sm:text-base px-8 py-3.5 sm:px-9 sm:py-4 rounded-2xl shadow-[0_0_28px_rgba(49,91,255,0.55)] hover:shadow-[0_0_40px_rgba(49,91,255,0.8)] hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      PLAY NOW
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>

                  <a
                    href="#games"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-[#101638] text-[#F5F7FF] border border-[#315BFF]/40 hover:border-[#39DFFF] hover:bg-[#182352] text-sm sm:text-base font-bold transition-all shadow-sm cursor-pointer"
                  >
                    EXPLORE GAMES
                  </a>
                </div>

                {/* Trust / Experience Label & Benefits Row */}
                <div className="w-full pt-6 border-t border-[#315BFF]/20 flex flex-col items-center lg:items-start">
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono font-bold text-[#B8C3E0] tracking-[0.1em] sm:tracking-[0.12em] uppercase mb-4 text-center lg:text-left">
                    <Shield className="w-3.5 h-3.5 text-[#39DFFF] shrink-0" />
                    <span>PLAY WITH FRIENDS</span>
                    <span className="text-[#39DFFF]">•</span>
                    <span>MAKE EVERY MATCH COUNT</span>
                  </div>

                  {/* Feature Pills */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 max-w-lg">
                    {featurePills.map((pill) => (
                      <span
                        key={pill}
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 rounded-xl bg-[#101638] border border-[#315BFF]/25 text-xs sm:text-sm font-medium text-[#D6DEFF]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#39DFFF] shrink-0" />
                        {pill}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* ── Right Column: Futuristic Hero Artwork Centerpiece ── */}
              <div className="lg:col-span-5 w-full flex items-center justify-center pt-6 lg:pt-0">
                <FuturisticHeroArtwork />
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 2: FEATURED GAMES — CHOOSE YOUR BATTLE
        ══════════════════════════════════════════════════════════════════════ */}
        <section
          id="games"
          className="py-20 sm:py-24 md:py-28 lg:py-32 relative border-t border-[#315BFF]/20 bg-[#070B25] overflow-hidden"
          aria-labelledby="games-title"
        >
          {/* Subtle Ambient Glows */}
          <div className="absolute top-1/2 left-0 w-80 h-80 bg-[#315BFF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-[#8B2CFF]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 relative z-10">
            
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#101638] border border-[#315BFF]/40 text-[#39DFFF] text-xs font-mono font-semibold tracking-[0.2em] uppercase mb-4">
                CYBER ARENAS
              </span>
              <h2
                id="games-title"
                className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl !text-[#F5F7FF] tracking-[-0.02em] leading-tight mb-4"
              >
                CHOOSE YOUR BATTLE
              </h2>
              <p className="text-[#B8C3E0] text-base sm:text-lg leading-relaxed">
                Every match tells a different story. Fast, competitive, and unforgettable.
              </p>
            </div>

            {/* Game Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-8 xl:gap-10 items-stretch">
              
              {/* ── Game 1: Rock, Paper, Scissors ── */}
              <div className="group relative rounded-3xl bg-[#101638] border border-[#315BFF]/30 p-8 sm:p-9 lg:p-10 flex flex-col justify-between hover:border-[#39DFFF]/70 hover:shadow-[0_20px_50px_rgba(7,11,37,0.85)] transition-all duration-300">
                <div>
                  {/* Card Top Banner */}
                  <div className="flex items-center justify-between gap-3 mb-7">
                    <span className="px-3 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/40 text-[#39DFFF] text-xs font-mono font-semibold tracking-wider uppercase">
                      MULTIPLAYER
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#B8C3E0] bg-[#070B25] border border-[#315BFF]/25 px-3 py-1 rounded-xl">
                      10S ROUNDS
                    </span>
                  </div>

                  {/* Card Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(49,91,255,0.35)] border border-[#39DFFF]/30 group-hover:scale-105 transition-transform">
                    <Swords className="w-8 h-8 text-white" />
                  </div>

                  {/* Card Title & Description */}
                  <h3 className="font-display font-bold text-2xl sm:text-[1.65rem] !text-[#F5F7FF] tracking-[-0.01em] mb-3">
                    Rock, Paper, Scissors
                  </h3>
                  <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed mb-6">
                    Quick decisions. Clever moves. Friendly rivalries. Lock in your choice within 10 seconds and clash for first to 5 wins.
                  </p>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-2.5 mb-8">
                    <span className="px-3 py-1.5 rounded-xl bg-[#070B25] border border-[#315BFF]/25 text-xs font-medium text-[#D6DEFF]">
                      First to 5 Wins
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[#070B25] border border-[#315BFF]/25 text-xs font-medium text-[#D6DEFF]">
                      Single-Tap Lock-In
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[#070B25] border border-[#315BFF]/25 text-xs font-medium text-[#D6DEFF]">
                      Live Clash FX
                    </span>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-6 border-t border-[#315BFF]/20 mt-auto">
                  <Link href="/play/rps" className="block w-full">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full !bg-gradient-to-r !from-[#315BFF] !to-[#8B2CFF] !text-white font-bold py-3.5 sm:py-4 px-6 rounded-2xl shadow-[0_0_16px_rgba(49,91,255,0.35)]"
                    >
                      PLAY NOW
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* ── Game 2: Speed Chess ── */}
              <div className="group relative rounded-3xl bg-[#101638] border border-[#315BFF]/30 p-8 sm:p-9 lg:p-10 flex flex-col justify-between hover:border-[#8B2CFF]/70 hover:shadow-[0_20px_50px_rgba(7,11,37,0.85)] transition-all duration-300">
                <div>
                  {/* Card Top Banner */}
                  <div className="flex items-center justify-between gap-3 mb-7">
                    <span className="px-3 py-1 rounded-full bg-[#8B2CFF]/20 border border-[#8B2CFF]/40 text-[#8B2CFF] text-xs font-mono font-semibold tracking-wider uppercase">
                      STRATEGY
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#B8C3E0] bg-[#070B25] border border-[#315BFF]/25 px-3 py-1 rounded-xl">
                      1M • 3M • 5M
                    </span>
                  </div>

                  {/* Card Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B2CFF] to-[#315BFF] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(139,44,255,0.35)] border border-[#8B2CFF]/30 group-hover:scale-105 transition-transform">
                    <Crown className="w-8 h-8 text-white" />
                  </div>

                  {/* Card Title & Description */}
                  <h3 className="font-display font-bold text-2xl sm:text-[1.65rem] !text-[#F5F7FF] tracking-[-0.01em] mb-3">
                    Speed Chess
                  </h3>
                  <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed mb-6">
                    Challenge your opponent and outthink every move. Fast-paced strategic chess with real-time clocks and blitz time controls.
                  </p>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-2.5 mb-8">
                    <span className="px-3 py-1.5 rounded-xl bg-[#070B25] border border-[#315BFF]/25 text-xs font-medium text-[#D6DEFF]">
                      Live Clocks
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[#070B25] border border-[#315BFF]/25 text-xs font-medium text-[#D6DEFF]">
                      Turn Verification
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[#070B25] border border-[#315BFF]/25 text-xs font-medium text-[#D6DEFF]">
                      Interactive Board
                    </span>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-6 border-t border-[#315BFF]/20 mt-auto">
                  <Link href="/play/chess" className="block w-full">
                    <button
                      type="button"
                      className="w-full bg-[#070B25] hover:bg-[#182352] text-[#F5F7FF] border border-[#315BFF]/40 hover:border-[#39DFFF] font-bold py-3.5 sm:py-4 px-6 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm text-sm sm:text-base group/btn"
                    >
                      <span>PLAY CHESS</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* ── Game 3: Dare Challenges & Stories ── */}
              <div className="group relative rounded-3xl bg-[#101638] border border-[#315BFF]/30 p-8 sm:p-9 lg:p-10 flex flex-col justify-between hover:border-[#39DFFF]/70 hover:shadow-[0_20px_50px_rgba(7,11,37,0.85)] transition-all duration-300 md:col-span-2 lg:col-span-1">
                <div>
                  {/* Card Top Banner */}
                  <div className="flex items-center justify-between gap-3 mb-7">
                    <span className="px-3 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/40 text-[#39DFFF] text-xs font-mono font-semibold tracking-wider uppercase">
                      SOCIAL DARES
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#B8C3E0] bg-[#070B25] border border-[#315BFF]/25 px-3 py-1 rounded-xl">
                      24H REELS
                    </span>
                  </div>

                  {/* Card Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#315BFF] via-[#39DFFF] to-[#8B2CFF] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(57,223,255,0.25)] border border-[#39DFFF]/30 group-hover:scale-105 transition-transform">
                    <Flame className="w-8 h-8 text-white" />
                  </div>

                  {/* Card Title & Description */}
                  <h3 className="font-display font-bold text-2xl sm:text-[1.65rem] !text-[#F5F7FF] tracking-[-0.01em] mb-3">
                    Post-Match Dares
                  </h3>
                  <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed mb-6">
                    Win the battle. Dare your friend. Make every match memorable. Losers record 24-hour video dares with one-time winner review sessions.
                  </p>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-2.5 mb-8">
                    <span className="px-3 py-1.5 rounded-xl bg-[#070B25] border border-[#315BFF]/25 text-xs font-medium text-[#D6DEFF]">
                      Dance & Comedy
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[#070B25] border border-[#315BFF]/25 text-xs font-medium text-[#D6DEFF]">
                      24h Stories
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[#070B25] border border-[#315BFF]/25 text-xs font-medium text-[#D6DEFF]">
                      Safe & Consensual
                    </span>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-6 border-t border-[#315BFF]/20 mt-auto">
                  <Link href="/challenges" className="block w-full">
                    <button
                      type="button"
                      className="w-full bg-[#070B25] hover:bg-[#182352] text-[#F5F7FF] border border-[#315BFF]/40 hover:border-[#39DFFF] font-bold py-3.5 sm:py-4 px-6 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm text-sm sm:text-base group/btn"
                    >
                      <span>EXPLORE DARES</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 3: HOW IT WORKS — THREE SIMPLE STEPS
        ══════════════════════════════════════════════════════════════════════ */}
        <section
          id="how-it-works"
          className="py-20 sm:py-24 md:py-28 lg:py-32 relative border-t border-[#315BFF]/20 bg-[#070B25] overflow-hidden"
          aria-labelledby="how-it-works-title"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 relative z-10">
            
            <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#101638] border border-[#315BFF]/40 text-[#39DFFF] text-xs font-mono font-semibold tracking-[0.2em] uppercase mb-4">
                GAMEPLAY PROGRESSION
              </span>
              <h2
                id="how-it-works-title"
                className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl !text-[#F5F7FF] tracking-[-0.02em] leading-tight mb-4"
              >
                THREE STEPS TO GLORY
              </h2>
              <p className="text-[#B8C3E0] text-base sm:text-lg leading-relaxed">
                Simple, high-speed multiplayer matchmaking from personal invite link to sweet victory.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-8 xl:gap-10">
              
              {/* Step 1 */}
              <div className="p-8 sm:p-9 lg:p-10 rounded-3xl bg-[#101638] border border-[#315BFF]/30 relative flex flex-col justify-between hover:border-[#39DFFF]/60 transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#315BFF] to-[#39DFFF] flex items-center justify-center shadow-[0_0_16px_rgba(57,223,255,0.4)]">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <span className="font-mono font-black text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#39DFFF] to-[#315BFF]">
                      01
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl sm:text-2xl !text-[#F5F7FF] mb-3">
                    Find Your Opponent
                  </h3>
                  <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
                    Invite a friend with an instant personal invite link or jump into the real-time random matchmaking queue in one click.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-8 sm:p-9 lg:p-10 rounded-3xl bg-[#101638] border border-[#315BFF]/30 relative flex flex-col justify-between hover:border-[#315BFF]/80 transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center shadow-[0_0_16px_rgba(49,91,255,0.4)]">
                      <Swords className="w-7 h-7 text-white" />
                    </div>
                    <span className="font-mono font-black text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#315BFF] to-[#8B2CFF]">
                      02
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl sm:text-2xl !text-[#F5F7FF] mb-3">
                    Enter the Arena
                  </h3>
                  <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
                    Choose your game and make your move. Race against the strict 10-second server clock and outsmart your rival.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-8 sm:p-9 lg:p-10 rounded-3xl bg-[#101638] border border-[#315BFF]/30 relative flex flex-col justify-between hover:border-[#8B2CFF]/80 transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B2CFF] to-[#39DFFF] flex items-center justify-center shadow-[0_0_16px_rgba(139,44,255,0.4)]">
                      <Trophy className="w-7 h-7 text-white" />
                    </div>
                    <span className="font-mono font-black text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#8B2CFF] to-[#39DFFF]">
                      03
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl sm:text-2xl !text-[#F5F7FF] mb-3">
                    Make It Memorable
                  </h3>
                  <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
                    Celebrate victories, share laughs, and take on fun challenges. Win the match to assign hilarious video dares to your rival.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 4: SOCIAL GAMING CAPABILITIES
        ══════════════════════════════════════════════════════════════════════ */}
        <section
          id="features"
          className="py-20 sm:py-24 md:py-28 lg:py-32 relative border-t border-[#315BFF]/20 bg-[#070B25] overflow-hidden"
          aria-labelledby="features-title"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 relative z-10">
            
            <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#101638] border border-[#315BFF]/40 text-[#39DFFF] text-xs font-mono font-semibold tracking-[0.2em] uppercase mb-4">
                ARENA ADVANTAGE
              </span>
              <h2
                id="features-title"
                className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl !text-[#F5F7FF] tracking-[-0.02em] leading-tight mb-4"
              >
                BUILT FOR COMPETITIVE SOCIAL PLAY
              </h2>
              <p className="text-[#B8C3E0] text-base sm:text-lg leading-relaxed">
                State-of-the-art architecture ensuring fair play, zero stalling, and maximum fun.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              
              {/* Feature 1 */}
              <div className="p-7 sm:p-8 rounded-3xl bg-[#101638] border border-[#315BFF]/25 hover:border-[#39DFFF]/50 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-[#39DFFF]/15 border border-[#39DFFF]/35 flex items-center justify-center text-[#39DFFF] mb-5">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg !text-[#F5F7FF] mb-2">
                  Instant One-Click Invites
                </h3>
                <p className="text-sm text-[#B8C3E0] leading-relaxed">
                  No friend codes or room pins needed. Share a private link on WhatsApp or messaging to enter the match directly.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-7 sm:p-8 rounded-3xl bg-[#101638] border border-[#315BFF]/25 hover:border-[#315BFF]/70 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-[#315BFF]/15 border border-[#315BFF]/35 flex items-center justify-center text-[#315BFF] mb-5">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg !text-[#F5F7FF] mb-2">
                  Authoritative 10s Timer
                </h3>
                <p className="text-sm text-[#B8C3E0] leading-relaxed">
                  Server-enforced PostgreSQL countdowns eliminate stalling and keep blitz rounds fast, high-energy, and fair.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-7 sm:p-8 rounded-3xl bg-[#101638] border border-[#315BFF]/25 hover:border-[#8B2CFF]/70 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-[#8B2CFF]/15 border border-[#8B2CFF]/35 flex items-center justify-center text-[#8B2CFF] mb-5">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg !text-[#F5F7FF] mb-2">
                  Safe & Consensual Dares
                </h3>
                <p className="text-sm text-[#B8C3E0] leading-relaxed">
                  Curated fun dare categories with decline options and optional 24-hour disappearing video playback.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-7 sm:p-8 rounded-3xl bg-[#101638] border border-[#315BFF]/25 hover:border-[#39DFFF]/50 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-[#39DFFF]/15 border border-[#39DFFF]/35 flex items-center justify-center text-[#39DFFF] mb-5">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg !text-[#F5F7FF] mb-2">
                  Head-to-Head Records
                </h3>
                <p className="text-sm text-[#B8C3E0] leading-relaxed">
                  Track your lifetime wins, match scores, and bragging rights against friends in your personal profile scorecard.
                </p>
              </div>

            </div>

            {/* Instant Invite Demonstration Strip */}
            <div className="mt-16 sm:mt-20 p-8 sm:p-10 lg:p-12 rounded-3xl bg-[#101638] border border-[#315BFF]/35 shadow-2xl max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
              <div className="text-center sm:text-left">
                <span className="text-xs font-mono font-bold text-[#39DFFF] uppercase tracking-[0.15em] block mb-1.5">
                  READY TO CHALLENGE SOMEONE?
                </span>
                <h4 className="font-display font-extrabold text-xl sm:text-2xl !text-[#F5F7FF]">
                  Grab your personal invite link
                </h4>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#070B25] border border-[#315BFF]/30 text-xs font-mono text-[#39DFFF] flex-1 sm:w-64 truncate">
                  https://evoaiqu.app/invite/...
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] text-white text-xs font-bold shrink-0 hover:opacity-90 hover:scale-[1.02] transition-all cursor-pointer shadow-md"
                >
                  {copiedLink ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 5: COMMUNITY CALL TO ACTION
        ══════════════════════════════════════════════════════════════════════ */}
        <section
          className="py-24 sm:py-32 lg:py-40 relative border-t border-[#315BFF]/20 bg-[#070B25] overflow-hidden"
          aria-labelledby="cta-heading"
        >
          {/* Central Radial Light Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-gradient-to-r from-[#315BFF]/15 via-[#39DFFF]/10 to-[#8B2CFF]/15 blur-[90px] pointer-events-none" />

          <div className="max-w-4xl mx-auto px-5 sm:px-8 relative z-10 text-center">
            <div className="p-10 sm:p-16 lg:p-20 rounded-3xl bg-[#101638] border border-[#315BFF]/35 shadow-[0_24px_64px_rgba(7,11,37,0.95)] backdrop-blur-xl">
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center mx-auto mb-8 shadow-[0_0_24px_rgba(49,91,255,0.5)] border border-[#39DFFF]/40">
                <Swords className="w-8 h-8 text-white" />
              </div>

              <h2
                id="cta-heading"
                className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl !text-[#F5F7FF] tracking-tight mb-5"
              >
                YOUR NEXT MATCH STARTS HERE.
              </h2>

              <p className="text-[#B8C3E0] text-base sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
                Bring your friends. Pick your game. Let the fun begin.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href={initialUser ? "/games" : "/signup"}
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="primary"
                    size="xl"
                    className="w-full sm:w-auto !bg-gradient-to-r !from-[#315BFF] !to-[#8B2CFF] !text-white font-black text-base px-11 py-4.5 rounded-2xl shadow-[0_0_35px_rgba(49,91,255,0.6)] hover:shadow-[0_0_50px_rgba(49,91,255,0.85)] hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    JOIN EVOAIQU
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              <p className="mt-8 text-xs font-mono text-[#B8C3E0]/75 tracking-[0.15em] uppercase">
                Free to Play • Instant Browser Matchmaking • No Downloads
              </p>

            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <FuturisticFooter />

    </div>
  );
}
