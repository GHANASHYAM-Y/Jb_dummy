"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Trophy, Users, Swords, Shield, ArrowRight,
  Share2, Sparkles, Clock, Flame, Crown, Award, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui";
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
    "Zero Download Required",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#070B25] text-[#F5F7FF] selection:bg-[#39DFFF]/30 selection:text-white relative overflow-x-hidden">
      
      {/* ── Global Background Starfield & Atmosphere ── */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(49,91,255,0.15),transparent_70%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgba(139,44,255,0.08),transparent_70%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#101638_1px,transparent_1px),linear-gradient(to_bottom,#101638_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none z-0" />

      {/* ── TOP NAVIGATION ── */}
      <FuturisticLandingNav user={initialUser} />

      <main className="flex-1 relative z-10">

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1: HERO — THE MAIN ATTRACTION
        ══════════════════════════════════════════════════════════════════════ */}
        <section
          id="hero"
          className="relative pt-6 pb-16 md:pt-14 md:pb-24 lg:pt-20 lg:pb-32 overflow-hidden"
          aria-labelledby="hero-title"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

              {/* ── Left Column: Hero Content & CTAs ── */}
              <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
                
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#101638] border border-[#315BFF]/40 text-[#39DFFF] text-xs font-mono font-bold tracking-wider mb-6 shadow-[0_0_16px_rgba(49,91,255,0.25)]">
                  <Sparkles className="w-3.5 h-3.5 text-[#39DFFF]" />
                  <span>NEXT-GEN MULTIPLAYER ARENA</span>
                </div>

                {/* Main Headline */}
                <h1
                  id="hero-title"
                  className="font-display font-black text-4xl sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem] tracking-tight leading-[1.06] text-[#F5F7FF] mb-6"
                >
                  LET THE{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#39DFFF] via-[#315BFF] to-[#8B2CFF] drop-shadow-[0_0_30px_rgba(57,223,255,0.4)]">
                    GAMES
                  </span>{" "}
                  BEGIN.
                </h1>

                {/* Supporting Headline */}
                <p className="font-display font-bold text-lg sm:text-xl lg:text-2xl text-[#D6DEFF] mb-3 leading-snug max-w-xl">
                  Challenge your friends. Test your instincts. Create unforgettable moments.
                </p>

                {/* Short Description */}
                <p className="text-[#9BA8D7] text-sm sm:text-base max-w-lg mb-8 leading-relaxed">
                  EVOAIQU brings people together through competitive multiplayer games, hilarious dares, and unexpected moments.
                </p>

                {/* Primary & Secondary Call to Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-8">
                  <Link
                    href={initialUser ? "/games" : "/signup"}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="primary"
                      size="xl"
                      className="w-full sm:w-auto !bg-gradient-to-r !from-[#315BFF] !to-[#8B2CFF] !text-white font-black text-sm sm:text-base px-8 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(49,91,255,0.6)] hover:shadow-[0_0_40px_rgba(49,91,255,0.85)] hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      PLAY NOW
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>

                  <a
                    href="#games"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-2xl bg-[#101638] text-[#F5F7FF] border border-[#315BFF]/40 hover:border-[#39DFFF] hover:bg-[#182352] text-sm sm:text-base font-bold transition-all shadow-sm cursor-pointer"
                  >
                    EXPLORE GAMES
                  </a>
                </div>

                {/* Trust / Experience Label */}
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#9BA8D7] tracking-wider uppercase mb-5">
                  <Shield className="w-3.5 h-3.5 text-[#39DFFF]" />
                  <span>PLAY WITH FRIENDS • MAKE EVERY MATCH COUNT</span>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 max-w-lg text-xs font-medium text-[#9BA8D7]">
                  {featurePills.map((pill) => (
                    <span
                      key={pill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#101638]/80 border border-[#315BFF]/25 text-[#D6DEFF]"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#39DFFF]" />
                      {pill}
                    </span>
                  ))}
                </div>

              </div>

              {/* ── Right Column: Futuristic Hero Artwork Centerpiece ── */}
              <div className="lg:col-span-5 w-full flex items-center justify-center pt-4 lg:pt-0">
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
          className="py-16 md:py-24 relative border-t border-[#315BFF]/20 bg-[#070B25]"
          aria-labelledby="games-title"
        >
          {/* Ambient Lighting */}
          <div className="absolute top-1/2 left-0 w-80 h-80 bg-[#315BFF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-[#8B2CFF]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="inline-block px-3.5 py-1 rounded-full bg-[#101638] border border-[#315BFF]/40 text-[#39DFFF] text-xs font-mono font-bold tracking-widest uppercase mb-3">
                CYBER ARENAS
              </span>
              <h2
                id="games-title"
                className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#F5F7FF] tracking-tight mb-3"
              >
                CHOOSE YOUR BATTLE
              </h2>
              <p className="text-[#9BA8D7] text-base sm:text-lg">
                Every match tells a different story.
              </p>
            </div>

            {/* Game Cards Grid (Only functional games showcased!) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              
              {/* ── Game 1: Rock, Paper, Scissors ── */}
              <div className="group relative rounded-3xl bg-[#101638]/90 border border-[#315BFF]/30 p-6 sm:p-7 flex flex-col justify-between hover:border-[#39DFFF] hover:shadow-[0_12px_40px_rgba(49,91,255,0.35)] transition-all duration-300">
                <div>
                  {/* Card Top Banner */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <span className="px-2.5 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/40 text-[#39DFFF] text-[11px] font-black font-mono tracking-wider uppercase">
                      MULTIPLAYER
                    </span>
                    <span className="text-xs font-mono font-bold text-[#9BA8D7] bg-[#070B25] border border-[#315BFF]/25 px-2.5 py-1 rounded-lg">
                      10S ROUNDS
                    </span>
                  </div>

                  {/* Card Icon & Artwork Preview */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(49,91,255,0.4)] border border-[#39DFFF]/30 group-hover:scale-105 transition-transform">
                    <Swords className="w-8 h-8 text-white" />
                  </div>

                  {/* Card Title & Description */}
                  <h3 className="font-display font-black text-xl sm:text-2xl text-[#F5F7FF] mb-2">
                    Rock, Paper, Scissors
                  </h3>
                  <p className="text-[#9BA8D7] text-sm leading-relaxed mb-6">
                    Quick decisions. Clever moves. Friendly rivalries. Lock in your choice within 10 seconds and clash for first to 5 wins.
                  </p>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B25] border border-[#315BFF]/30 text-[11px] font-semibold text-[#D6DEFF]">
                      First to 5 Wins
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B25] border border-[#315BFF]/30 text-[11px] font-semibold text-[#D6DEFF]">
                      Single-Tap Lock-In
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B25] border border-[#315BFF]/30 text-[11px] font-semibold text-[#D6DEFF]">
                      Live Clash FX
                    </span>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-4 border-t border-[#315BFF]/20">
                  <Link href="/play/rps" className="block w-full">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full !bg-gradient-to-r !from-[#315BFF] !to-[#8B2CFF] !text-white font-bold shadow-[0_0_16px_rgba(49,91,255,0.35)]"
                    >
                      PLAY NOW
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* ── Game 2: Speed Chess ── */}
              <div className="group relative rounded-3xl bg-[#101638]/90 border border-[#315BFF]/30 p-6 sm:p-7 flex flex-col justify-between hover:border-[#8B2CFF] hover:shadow-[0_12px_40px_rgba(139,44,255,0.35)] transition-all duration-300">
                <div>
                  {/* Card Top Banner */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <span className="px-2.5 py-1 rounded-full bg-[#8B2CFF]/20 border border-[#8B2CFF]/40 text-[#8B2CFF] text-[11px] font-black font-mono tracking-wider uppercase">
                      STRATEGY
                    </span>
                    <span className="text-xs font-mono font-bold text-[#9BA8D7] bg-[#070B25] border border-[#315BFF]/25 px-2.5 py-1 rounded-lg">
                      1M • 3M • 5M
                    </span>
                  </div>

                  {/* Card Icon & Artwork Preview */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B2CFF] to-[#315BFF] flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(139,44,255,0.4)] border border-[#8B2CFF]/30 group-hover:scale-105 transition-transform">
                    <Crown className="w-8 h-8 text-white" />
                  </div>

                  {/* Card Title & Description */}
                  <h3 className="font-display font-black text-xl sm:text-2xl text-[#F5F7FF] mb-2">
                    Speed Chess
                  </h3>
                  <p className="text-[#9BA8D7] text-sm leading-relaxed mb-6">
                    Challenge your opponent and outthink every move. Fast-paced strategic chess with real-time clocks and blitz time controls.
                  </p>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B25] border border-[#315BFF]/30 text-[11px] font-semibold text-[#D6DEFF]">
                      Live Clocks
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B25] border border-[#315BFF]/30 text-[11px] font-semibold text-[#D6DEFF]">
                      Turn Verification
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B25] border border-[#315BFF]/30 text-[11px] font-semibold text-[#D6DEFF]">
                      Interactive Board
                    </span>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-4 border-t border-[#315BFF]/20">
                  <Link href="/play/chess" className="block w-full">
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full bg-[#182352] text-[#F5F7FF] border-[#315BFF]/40 hover:bg-[#202E68] font-bold"
                    >
                      PLAY CHESS
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* ── Game 3: Dare Challenges & Stories ── */}
              <div className="group relative rounded-3xl bg-[#101638]/90 border border-[#315BFF]/30 p-6 sm:p-7 flex flex-col justify-between hover:border-[#39DFFF] hover:shadow-[0_12px_40px_rgba(57,223,255,0.25)] transition-all duration-300 md:col-span-2 lg:col-span-1">
                <div>
                  {/* Card Top Banner */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <span className="px-2.5 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/40 text-[#39DFFF] text-[11px] font-black font-mono tracking-wider uppercase">
                      SOCIAL DARES
                    </span>
                    <span className="text-xs font-mono font-bold text-[#9BA8D7] bg-[#070B25] border border-[#315BFF]/25 px-2.5 py-1 rounded-lg">
                      24H REELS
                    </span>
                  </div>

                  {/* Card Icon & Artwork Preview */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#315BFF] via-[#39DFFF] to-[#8B2CFF] flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(57,223,255,0.3)] border border-[#39DFFF]/30 group-hover:scale-105 transition-transform">
                    <Flame className="w-8 h-8 text-white" />
                  </div>

                  {/* Card Title & Description */}
                  <h3 className="font-display font-black text-xl sm:text-2xl text-[#F5F7FF] mb-2">
                    Post-Match Dares
                  </h3>
                  <p className="text-[#9BA8D7] text-sm leading-relaxed mb-6">
                    Win the battle, dare your friend! Losers record 24-hour video dares with one-time winner review sessions and laugh-out-loud moments.
                  </p>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B25] border border-[#315BFF]/30 text-[11px] font-semibold text-[#D6DEFF]">
                      Dance & Comedy
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B25] border border-[#315BFF]/30 text-[11px] font-semibold text-[#D6DEFF]">
                      24h Stories
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B25] border border-[#315BFF]/30 text-[11px] font-semibold text-[#D6DEFF]">
                      Safe & Consensual
                    </span>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-4 border-t border-[#315BFF]/20">
                  <Link href="/challenges" className="block w-full">
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full bg-[#182352] text-[#F5F7FF] border-[#315BFF]/40 hover:bg-[#202E68] font-bold"
                    >
                      EXPLORE DARES
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
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
          className="py-16 md:py-24 relative border-t border-[#315BFF]/20 bg-[#070B25]"
          aria-labelledby="how-it-works-title"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="inline-block px-3.5 py-1 rounded-full bg-[#101638] border border-[#315BFF]/40 text-[#39DFFF] text-xs font-mono font-bold tracking-widest uppercase mb-3">
                GAMEPLAY Progression
              </span>
              <h2
                id="how-it-works-title"
                className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#F5F7FF] tracking-tight mb-3"
              >
                THREE STEPS TO GLORY
              </h2>
              <p className="text-[#9BA8D7] text-base sm:text-lg">
                Simple, high-speed multiplayer matchmaking from link to victory.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              
              {/* Step 1 */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#101638]/80 border border-[#315BFF]/30 relative flex flex-col justify-between hover:border-[#39DFFF]/60 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#315BFF] to-[#39DFFF] flex items-center justify-center shadow-[0_0_16px_rgba(57,223,255,0.4)]">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-mono font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#39DFFF] to-[#315BFF]">
                      01
                    </span>
                  </div>
                  <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2.5">
                    Find Your Opponent
                  </h3>
                  <p className="text-[#9BA8D7] text-sm leading-relaxed">
                    Invite a friend with an instant personal invite link or jump into the real-time random matchmaking queue in one click.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#101638]/80 border border-[#315BFF]/30 relative flex flex-col justify-between hover:border-[#315BFF]/80 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center shadow-[0_0_16px_rgba(49,91,255,0.4)]">
                      <Swords className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-mono font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#315BFF] to-[#8B2CFF]">
                      02
                    </span>
                  </div>
                  <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2.5">
                    Enter the Arena
                  </h3>
                  <p className="text-[#9BA8D7] text-sm leading-relaxed">
                    Choose your game and make your move. Race against the strict 10-second server clock and outsmart your rival.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#101638]/80 border border-[#315BFF]/30 relative flex flex-col justify-between hover:border-[#8B2CFF]/80 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B2CFF] to-[#39DFFF] flex items-center justify-center shadow-[0_0_16px_rgba(139,44,255,0.4)]">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-mono font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#8B2CFF] to-[#39DFFF]">
                      03
                    </span>
                  </div>
                  <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2.5">
                    Make It Memorable
                  </h3>
                  <p className="text-[#9BA8D7] text-sm leading-relaxed">
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
          className="py-16 md:py-24 relative border-t border-[#315BFF]/20 bg-[#070B25]"
          aria-labelledby="features-title"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="inline-block px-3.5 py-1 rounded-full bg-[#101638] border border-[#315BFF]/40 text-[#39DFFF] text-xs font-mono font-bold tracking-widest uppercase mb-3">
                ARENA ADVANTAGE
              </span>
              <h2
                id="features-title"
                className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#F5F7FF] tracking-tight mb-3"
              >
                BUILT FOR COMPETITIVE SOCIAL PLAY
              </h2>
              <p className="text-[#9BA8D7] text-base sm:text-lg">
                State-of-the-art architecture ensuring fair play, zero stalling, and maximum fun.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Feature 1 */}
              <div className="p-6 rounded-3xl bg-[#101638]/70 border border-[#315BFF]/25 hover:border-[#39DFFF]/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#39DFFF]/20 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] mb-4">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-[#F5F7FF] mb-1.5">
                  Instant One-Click Invites
                </h3>
                <p className="text-xs text-[#9BA8D7] leading-relaxed">
                  No friend codes or room pins needed. Share a private link on WhatsApp or messaging to enter the match directly.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-3xl bg-[#101638]/70 border border-[#315BFF]/25 hover:border-[#315BFF]/70 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#315BFF]/20 border border-[#315BFF]/40 flex items-center justify-center text-[#315BFF] mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-[#F5F7FF] mb-1.5">
                  Authoritative 10s Timer
                </h3>
                <p className="text-xs text-[#9BA8D7] leading-relaxed">
                  Server-enforced PostgreSQL countdowns eliminate stalling and keep blitz rounds fast, high-energy, and fair.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-3xl bg-[#101638]/70 border border-[#315BFF]/25 hover:border-[#8B2CFF]/70 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#8B2CFF]/20 border border-[#8B2CFF]/40 flex items-center justify-center text-[#8B2CFF] mb-4">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-[#F5F7FF] mb-1.5">
                  Safe & Consensual Dares
                </h3>
                <p className="text-xs text-[#9BA8D7] leading-relaxed">
                  Curated fun dare categories with decline options and optional 24-hour disappearing video playback.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-3xl bg-[#101638]/70 border border-[#315BFF]/25 hover:border-[#39DFFF]/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#39DFFF]/20 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] mb-4">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base text-[#F5F7FF] mb-1.5">
                  Head-to-Head Records
                </h3>
                <p className="text-xs text-[#9BA8D7] leading-relaxed">
                  Track your lifetime wins, match scores, and bragging rights against friends in your personal profile scorecard.
                </p>
              </div>

            </div>

            {/* Instant Invite Demonstration Strip */}
            <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-[#101638] border border-[#315BFF]/40 shadow-xl max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <span className="text-xs font-mono font-bold text-[#39DFFF] uppercase tracking-wider block mb-1">
                  READY TO CHALLENGE SOMEONE?
                </span>
                <h4 className="font-display font-black text-lg sm:text-xl text-[#F5F7FF]">
                  Grab your personal invite link
                </h4>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#070B25] border border-[#315BFF]/30 text-xs font-mono text-[#39DFFF] flex-1 sm:w-60 truncate">
                  https://evoaiqu.app/invite/...
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] text-white text-xs font-bold shrink-0 hover:opacity-90 transition-opacity"
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
          className="py-20 md:py-28 relative border-t border-[#315BFF]/20 bg-[#070B25]"
          aria-labelledby="cta-heading"
        >
          {/* Central Radial Light Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-r from-[#315BFF]/20 via-[#39DFFF]/15 to-[#8B2CFF]/20 blur-[80px] pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
            <div className="p-8 sm:p-14 rounded-3xl bg-[#101638]/90 border border-[#315BFF]/40 shadow-[0_20px_60px_rgba(7,11,37,0.9)] backdrop-blur-xl">
              
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center mx-auto mb-6 shadow-[0_0_24px_rgba(49,91,255,0.5)] border border-[#39DFFF]/40">
                <Swords className="w-7 h-7 text-white" />
              </div>

              <h2
                id="cta-heading"
                className="font-display font-black text-3xl sm:text-5xl text-[#F5F7FF] tracking-tight mb-4"
              >
                YOUR NEXT MATCH STARTS HERE.
              </h2>

              <p className="text-[#9BA8D7] text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
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
                    className="w-full sm:w-auto !bg-gradient-to-r !from-[#315BFF] !to-[#8B2CFF] !text-white font-black text-base px-10 py-4 rounded-2xl shadow-[0_0_35px_rgba(49,91,255,0.6)] hover:shadow-[0_0_50px_rgba(49,91,255,0.85)] hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    JOIN EVOAIQU
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              <p className="mt-6 text-xs font-mono text-[#9BA8D7] tracking-wider uppercase">
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
