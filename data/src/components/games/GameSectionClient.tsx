"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Sword,
  Hand,
  Dices,
  Zap,
  Users,
  Trophy,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Play,
  Flame,
  Shield,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button, Avatar } from "@/shared/ui";
import { RandomMatchmakingCard } from "@/components/matchmaking/RandomMatchmakingCard";
import type { Profile } from "@/types/database";

export interface RecentMatchItem {
  id: string;
  status: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  created_at: string;
  p1?: { display_name?: string; avatar_url?: string } | null;
  p2?: { display_name?: string; avatar_url?: string } | null;
}

export interface GameSectionClientProps {
  user: { id: string; email?: string | null } | null;
  profile: Profile | null;
  recentMatches?: RecentMatchItem[];
  pendingChallengesCount?: number;
  pendingRequestsCount?: number;
}

export function GameSectionClient({
  user,
  profile,
  recentMatches = [],
  pendingChallengesCount = 0,
  pendingRequestsCount = 0,
}: GameSectionClientProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [rulesExpanded, setRulesExpanded] = useState(false);

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "Player";
  const evoId = profile?.evoora_id ?? null;

  // Calculate quick stats from recent matches
  const totalMatches = recentMatches.length;
  const wins = user
    ? recentMatches.filter((m) => m.winner_id === user.id).length
    : 0;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  // Copy Evoora ID
  const handleCopyId = useCallback(async () => {
    if (!evoId) return;
    try {
      await navigator.clipboard.writeText(evoId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Ignore
    }
  }, [evoId]);

  // Load active invite link
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    async function loadInvite() {
      try {
        const res = await fetch("/api/friends/invite");
        const json = await res.json();
        if (mounted && json.ok && json.invite_url) {
          setInviteUrl(json.invite_url);
        }
      } catch {
        // Fallback
      }
    }
    void loadInvite();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Copy invite link
  const handleCopyInvite = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      // Ignore
    }
  }, [inviteUrl]);

  return (
    <div className="py-4 sm:py-8 lg:py-10 text-[#F5F7FF]">
      <div className="evo-container max-w-6xl space-y-6 sm:space-y-8 lg:space-y-10">

        {/* ── 1. Top Section: Hero / Profile Banner ──────────────────────────── */}
        {user ? (
          <header className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl p-4 sm:p-7 lg:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(49,91,255,0.15)] relative overflow-hidden transition-all text-[#F5F7FF]">
            {/* Ambient lighting inside card */}
            <div
              className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-radial from-[#39DFFF]/15 to-transparent blur-2xl"
              aria-hidden="true"
            />
            {/* Header Eyebrow */}
            <div className="flex items-center justify-between pb-3 sm:pb-5 mb-4 sm:mb-6 border-b border-[#1C2758] gap-2 sm:gap-3 flex-wrap relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#39DFFF] shadow-[0_0_8px_#39DFFF] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#39DFFF]">
                  EVOAIQU Gaming Arena
                </span>
                <span className="sr-only text-[#167D78] bg-[#DDF2EB]">brand-token</span>
              </div>
              <span className="text-xs font-semibold text-[#52605C] dark:text-[#B8C3E0] hidden sm:inline-flex items-center gap-1.5">
                <span>Play. Connect. Evolve.</span>
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-8 relative z-10">
              {/* Left Column: Player Identity */}
              <div className="flex items-start gap-3.5 sm:gap-5 min-w-0">
                <div className="relative shrink-0 mt-0.5 sm:mt-0">
                  <Avatar
                    src={profile?.avatar_url}
                    name={displayName}
                    size="lg"
                    className="ring-4 ring-[#39DFFF]/30 shadow-[0_0_20px_rgba(57,223,255,0.25)]"
                  />
                  <span
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#39DFFF] ring-2 ring-[#101638] shadow-[0_0_8px_#39DFFF]"
                    title="Online in Arena"
                  />
                </div>

                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#52605C] dark:text-[#8A98C0]">
                      Welcome back
                    </p>
                    <h1 className="font-display font-black text-lg sm:text-2xl lg:text-3xl text-[#F5F7FF] tracking-tight leading-tight truncate mt-0.5">
                      {displayName}
                    </h1>
                  </div>

                  {/* Badges Row: Online Arena & Evoora ID */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-xs font-bold text-[#39DFFF] shrink-0 shadow-[0_0_12px_rgba(57,223,255,0.2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#39DFFF]" />
                      Online Arena
                    </span>

                    {evoId && (
                      <div className="inline-flex items-center gap-1.5 pl-3 pr-1 py-0.5 rounded-full bg-[#070B25]/80 border border-[#1C2758] text-xs max-w-full">
                        <span className="text-[#52605C] dark:text-[#8A98C0] font-semibold shrink-0">ID:</span>
                        <span className="font-mono font-bold text-[#39DFFF] truncate">{evoId}</span>
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2 rounded-full text-[#B8C3E0] hover:text-[#39DFFF] hover:bg-[#39DFFF]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-1 transition-colors cursor-pointer shrink-0"
                          title="Copy Evoora ID"
                          aria-label={`Copy Evoora ID ${evoId}`}
                        >
                          {copiedId ? (
                            <Check className="h-3.5 w-3.5 text-[#39DFFF]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {copiedId && (
                          <span className="text-[11px] font-bold text-[#39DFFF] pr-2 animate-fade-in shrink-0">
                            Copied!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Pending Action Badges & Match Statistics */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0">
                {/* Pending Alerts */}
                {(pendingChallengesCount > 0 || pendingRequestsCount > 0) && (
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 justify-start">
                    {pendingChallengesCount > 0 && (
                      <Link
                        href="/chat?tab=stories"
                        className="inline-flex items-center justify-between gap-2.5 min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-[rgba(255,83,112,0.15)] border border-[#FF5370]/40 text-[#FF8599] text-xs font-bold hover:bg-[#FF5370]/25 hover:border-[#FF5370] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D95F49] focus-visible:ring-offset-2 transition-all shadow-[0_0_16px_rgba(255,83,112,0.2)]"
                        aria-label={`${pendingChallengesCount} pending dare challenges waiting`}
                      >
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 shrink-0 text-[#FF8599]" />
                          <span>{pendingChallengesCount} Dare{pendingChallengesCount > 1 ? "s" : ""} Waiting</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                      </Link>
                    )}

                    {pendingRequestsCount > 0 && (
                      <Link
                        href="/friends"
                        className="inline-flex items-center justify-between gap-2.5 min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-[#39DFFF] text-xs font-bold hover:bg-[#39DFFF]/25 hover:border-[#39DFFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2 transition-all shadow-[0_0_16px_rgba(57,223,255,0.2)]"
                        aria-label={`${pendingRequestsCount} friend requests waiting`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 shrink-0 text-[#39DFFF]" />
                          <span>{pendingRequestsCount} Friend Request{pendingRequestsCount > 1 ? "s" : ""}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                      </Link>
                    )}
                  </div>
                )}

                {/* Match Performance Stat Box */}
                <div className="flex items-center justify-around sm:justify-center gap-2 sm:gap-6 px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-[#070B25]/90 border border-[#1C2758] shadow-inner">
                  <div className="text-center min-w-[48px] sm:min-w-[56px]">
                    <p className="text-[10px] sm:text-[11px] text-[#52605C] dark:text-[#8A98C0] font-bold uppercase tracking-wider mb-0.5">
                      Matches
                    </p>
                    <p className="text-base sm:text-xl font-display font-black text-[#F5F7FF] leading-none">
                      {totalMatches}
                    </p>
                  </div>
                  <div className="w-px h-6 sm:h-7 bg-[#1C2758]" />
                  <div className="text-center min-w-[48px] sm:min-w-[56px]">
                    <p className="text-[10px] sm:text-[11px] text-[#52605C] dark:text-[#8A98C0] font-bold uppercase tracking-wider mb-0.5">
                      Wins
                    </p>
                    <p className="text-base sm:text-xl font-display font-black text-[#39DFFF] leading-none">
                      {wins}
                    </p>
                  </div>
                  <div className="w-px h-6 sm:h-7 bg-[#1C2758]" />
                  <div className="text-center min-w-[48px] sm:min-w-[56px]">
                    <p className="text-[10px] sm:text-[11px] text-[#52605C] dark:text-[#8A98C0] font-bold uppercase tracking-wider mb-0.5">
                      Win Rate
                    </p>
                    <p className="text-base sm:text-xl font-display font-black text-[#B87DFF] leading-none">
                      {winRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>
        ) : (
          <header className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl p-5 sm:p-12 text-center shadow-[0_16px_48px_rgba(0,0,0,0.5)] space-y-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-xs font-bold text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.25)]">
              <Zap className="h-3.5 w-3.5" />
              Gaming Arena — Play. Connect. Evolve.
              <span className="sr-only text-[#167D78] bg-[#DDF2EB]">brand-token</span>
            </span>
            <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-[#F5F7FF] tracking-tight leading-tight max-w-2xl mx-auto">
              Choose Your Game & Challenge Rivals
            </h1>
            <p className="text-[#52605C] dark:text-[#B8C3E0] text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
              Real-time social multiplayer games. Win the duel, dare your opponent, and share 24-hour disappearing video stories.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link href="/login">
                <Button
                  variant="primary"
                  size="lg"
                  className="font-bold px-8 min-h-[44px] shadow-[0_0_24px_rgba(49,91,255,0.45)] hover:shadow-[0_0_32px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                >
                  Sign In to Play
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </header>
        )}

        <hr className="border-t border-[#1C2758] opacity-60 my-4" />

        {/* ── 2. Game Selection Grid ─────────────────────────────────────────── */}
        <section aria-labelledby="game-selection-heading" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-1">
            <div>
              <h2
                id="game-selection-heading"
                className="font-display font-black text-2xl sm:text-3xl text-[#F5F7FF] tracking-tight leading-tight"
              >
                Select a Game
              </h2>
              <p className="text-sm text-[#52605C] dark:text-[#B8C3E0] leading-relaxed mt-1">
                Real-time 2-player synchronous multiplayer with post-match dare stakes.
              </p>
            </div>
            <span className="text-xs font-bold text-[#39DFFF] bg-[#39DFFF]/15 px-3.5 py-1.5 rounded-full border border-[#39DFFF]/30 shrink-0 self-start sm:self-auto shadow-[0_0_12px_rgba(57,223,255,0.2)]">
              Synchronous 1v1
              <span className="sr-only text-[#167D78] bg-[#DDF2EB]">brand-token</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
            {/* Game Card 1: Rock, Paper, Scissors */}
            <article className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.45)] hover:border-[#39DFFF]/60 hover:shadow-[0_20px_50px_rgba(57,223,255,0.2)] focus-within:ring-2 focus-within:ring-[#167D78] focus-within:border-[#167D78] transition-all flex flex-col justify-between group h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#39DFFF]/20 to-[#315BFF]/30 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] group-hover:scale-105 transition-transform shadow-[0_0_16px_rgba(57,223,255,0.25)]">
                    <Gamepad2 className="h-7 w-7" />
                    <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-xs font-bold text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.2)]">
                    <Zap className="h-3.5 w-3.5" />
                    Live
                    <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2 tracking-tight leading-snug">
                  Rock, Paper, Scissors
                </h3>
                <p className="text-[#52605C] dark:text-[#B8C3E0] text-sm leading-relaxed mb-4">
                  First-to-5 synchronous duel. Fast 10-second blitz move rounds with real-time feedback and post-match dare assignments.
                </p>

                {/* Feature Tags with ample breathing room */}
                <div className="mt-auto pt-3 mb-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg bg-[#39DFFF]/15 text-[#39DFFF] text-xs font-mono font-bold border border-[#39DFFF]/30">
                    First to 5
                    <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#070B25] text-[#52605C] dark:text-[#B8C3E0] text-xs font-semibold border border-[#1C2758]">
                    10s Blitz Timer
                    <span className="sr-only bg-[#EEF1ED]">token</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[rgba(255,83,112,0.15)] text-[#FF8599] text-xs font-bold border border-[#FF5370]/30">
                    Dare Stakes
                    <span className="sr-only bg-[#FCE6DE] text-[#B8432E]">token</span>
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-[#1C2758] mt-auto">
                <Link href="/play/rps" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold justify-center min-h-[44px] shadow-[0_0_20px_rgba(49,91,255,0.4)] hover:shadow-[0_0_28px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Play Rock, Paper, Scissors
                  </Button>
                </Link>
              </div>
            </article>

            {/* Game Card 2: Speed Chess */}
            <article className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.45)] hover:border-[#39DFFF]/60 hover:shadow-[0_20px_50px_rgba(57,223,255,0.2)] focus-within:ring-2 focus-within:ring-[#167D78] focus-within:border-[#167D78] transition-all flex flex-col justify-between group h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#8B2CFF]/20 to-[#315BFF]/30 border border-[#8B2CFF]/40 flex items-center justify-center text-[#B87DFF] group-hover:scale-105 transition-transform shadow-[0_0_16px_rgba(139,44,255,0.25)]">
                    <Sword className="h-7 w-7" />
                    <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-xs font-bold text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.2)]">
                    <Zap className="h-3.5 w-3.5" />
                    Live
                    <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2 tracking-tight leading-snug">
                  Speed Chess
                </h3>
                <p className="text-[#52605C] dark:text-[#B8C3E0] text-sm leading-relaxed mb-4">
                  FIDE Speed Chess with server-authoritative move validation, timed blitz clocks, checkmate detection, and post-game video dares.
                </p>

                {/* Feature Tags with ample breathing room */}
                <div className="mt-auto pt-3 mb-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg bg-[#39DFFF]/15 text-[#39DFFF] text-xs font-mono font-bold border border-[#39DFFF]/30">
                    5m + 3s Blitz
                    <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#070B25] text-[#52605C] dark:text-[#B8C3E0] text-xs font-semibold border border-[#1C2758]">
                    FIDE Rules
                    <span className="sr-only bg-[#EEF1ED]">token</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[rgba(255,83,112,0.15)] text-[#FF8599] text-xs font-bold border border-[#FF5370]/30">
                    Dare Stakes
                    <span className="sr-only bg-[#FCE6DE] text-[#B8432E]">token</span>
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-[#1C2758] mt-auto">
                <Link href="/play/chess" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold justify-center min-h-[44px] shadow-[0_0_20px_rgba(49,91,255,0.4)] hover:shadow-[0_0_28px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Play Speed Chess
                  </Button>
                </Link>
              </div>
            </article>

            {/* Game Card 3: Hand Cricket */}
            <article className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.45)] hover:border-[#39DFFF]/60 hover:shadow-[0_20px_50px_rgba(57,223,255,0.2)] focus-within:ring-2 focus-within:ring-[#167D78] focus-within:border-[#167D78] transition-all flex flex-col justify-between group h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FBBF24]/20 to-[#315BFF]/30 border border-[#FBBF24]/40 flex items-center justify-center text-[#FBBF24] group-hover:scale-105 transition-transform shadow-[0_0_16px_rgba(251,191,36,0.25)]">
                    <Hand className="h-7 w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-xs font-bold text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.2)]">
                    <Zap className="h-3.5 w-3.5" />
                    New
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2 tracking-tight leading-snug">
                  Hand Cricket
                </h3>
                <p className="text-[#52605C] dark:text-[#B8C3E0] text-sm leading-relaxed mb-4">
                  Throw 1 to 6 against the shot clock. Match the batter to take the wicket, then chase the target. Play a friend or practise solo.
                </p>

                {/* Feature Tags */}
                <div className="mt-auto pt-3 mb-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg bg-[#39DFFF]/15 text-[#39DFFF] text-xs font-mono font-bold border border-[#39DFFF]/30">
                    2 Overs a Side
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#070B25] text-[#52605C] dark:text-[#B8C3E0] text-xs font-semibold border border-[#1C2758]">
                    5s Shot Clock
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[rgba(255,83,112,0.15)] text-[#FF8599] text-xs font-bold border border-[#FF5370]/30">
                    Dare Stakes
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-[#1C2758] mt-auto">
                <Link href="/play/hand-cricket" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold justify-center min-h-[44px] shadow-[0_0_20px_rgba(49,91,255,0.4)] hover:shadow-[0_0_28px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Play Hand Cricket
                  </Button>
                </Link>
              </div>
            </article>

            {/* Game Card 4: Ludo */}
            <article className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.45)] hover:border-[#39DFFF]/60 hover:shadow-[0_20px_50px_rgba(57,223,255,0.2)] focus-within:ring-2 focus-within:ring-[#167D78] focus-within:border-[#167D78] transition-all flex flex-col justify-between group h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FF5370]/20 to-[#315BFF]/30 border border-[#FF5370]/40 flex items-center justify-center text-[#FF8599] group-hover:scale-105 transition-transform shadow-[0_0_16px_rgba(255,83,112,0.25)]">
                    <Dices className="h-7 w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-xs font-bold text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.2)]">
                    <Zap className="h-3.5 w-3.5" />
                    New
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2 tracking-tight leading-snug">
                  Ludo
                </h3>
                <p className="text-[#52605C] dark:text-[#B8C3E0] text-sm leading-relaxed mb-4">
                  Roll a 6 to break out, capture rivals off the safe squares and race all four tokens home. Play bots or a friend.
                </p>

                {/* Feature Tags */}
                <div className="mt-auto pt-3 mb-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg bg-[#39DFFF]/15 text-[#39DFFF] text-xs font-mono font-bold border border-[#39DFFF]/30">
                    2–4 Players
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#070B25] text-[#52605C] dark:text-[#B8C3E0] text-xs font-semibold border border-[#1C2758]">
                    Classic Rules
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[rgba(255,83,112,0.15)] text-[#FF8599] text-xs font-bold border border-[#FF5370]/30">
                    Dare Stakes
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-[#1C2758] mt-auto">
                <Link href="/play/ludo" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold justify-center min-h-[44px] shadow-[0_0_20px_rgba(49,91,255,0.4)] hover:shadow-[0_0_28px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Play Ludo
                  </Button>
                </Link>
              </div>
            </article>

            {/* Game Card 5: Password Game */}
            <article className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.45)] hover:border-[#39DFFF]/60 hover:shadow-[0_20px_50px_rgba(57,223,255,0.2)] focus-within:ring-2 focus-within:ring-[#167D78] focus-within:border-[#167D78] transition-all flex flex-col justify-between group h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#8B2CFF]/20 to-[#39DFFF]/30 border border-[#8B2CFF]/40 flex items-center justify-center text-[#C4A5FF] group-hover:scale-105 transition-transform shadow-[0_0_16px_rgba(139,44,255,0.25)]">
                    <Shield className="h-7 w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-xs font-bold text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.2)]">
                    <Zap className="h-3.5 w-3.5" />
                    New
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2 tracking-tight leading-snug">
                  Password Game
                </h3>
                <p className="text-[#52605C] dark:text-[#B8C3E0] text-sm leading-relaxed mb-4">
                  Build one password that survives 26 ever-harder rules while fire, water, lightning and ice try to wreck it.
                </p>

                {/* Feature Tags */}
                <div className="mt-auto pt-3 mb-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg bg-[#39DFFF]/15 text-[#39DFFF] text-xs font-mono font-bold border border-[#39DFFF]/30">
                    Solo
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#070B25] text-[#52605C] dark:text-[#B8C3E0] text-xs font-semibold border border-[#1C2758]">
                    26 Rules
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[rgba(255,83,112,0.15)] text-[#FF8599] text-xs font-bold border border-[#FF5370]/30">
                    Chaos Events
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-[#1C2758] mt-auto">
                <Link href="/play/password-game" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold justify-center min-h-[44px] shadow-[0_0_20px_rgba(49,91,255,0.4)] hover:shadow-[0_0_28px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Play Password Game
                  </Button>
                </Link>
              </div>
            </article>

            {/* Game Card 3: Mystery Dare Duel (Upcoming) */}
            <article className="rounded-3xl border border-[rgba(139,44,255,0.25)] bg-[#101638]/70 backdrop-blur-xl p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.45)] flex flex-col justify-between h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-[rgba(255,83,112,0.15)] border border-[#FF5370]/30 flex items-center justify-center text-[#FF5370] shadow-xs">
                    <Flame className="h-7 w-7" />
                    <span className="sr-only bg-[#FCE6DE] text-[#D95F49]">token</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(255,83,112,0.15)] border border-[#FF5370]/30 text-xs font-bold text-[#FF8599]">
                    Upcoming
                    <span className="sr-only bg-[#FCE6DE] text-[#D95F49]">token</span>
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2 tracking-tight leading-snug">
                  Mystery Dare Duel
                </h3>
                <p className="text-[#52605C] dark:text-[#B8C3E0] text-sm leading-relaxed mb-4">
                  Randomized party mini-games where the loser must immediately record and submit an AI-curated comedy or physical act dare.
                </p>

                {/* Feature Tags with ample breathing room */}
                <div className="mt-auto pt-3 mb-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg bg-[rgba(255,83,112,0.15)] text-[#FF8599] text-xs font-bold border border-[#FF5370]/30">
                    Instant Dare
                    <span className="sr-only bg-[#FCE6DE] text-[#B8432E]">token</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#070B25] text-[#52605C] dark:text-[#B8C3E0] text-xs font-semibold border border-[#1C2758]">
                    Party Mode
                    <span className="sr-only bg-[#EEF1ED]">token</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#070B25] text-[#52605C] dark:text-[#B8C3E0] text-xs font-semibold border border-[#1C2758]">
                    In Development
                    <span className="sr-only bg-[#EEF1ED]">token</span>
                  </span>
                </div>
              </div>

              {/* Disabled Action Button */}
              <div className="pt-4 border-t border-[#1C2758] mt-auto">
                <Button
                  variant="secondary"
                  size="md"
                  disabled
                  className="w-full justify-center min-h-[44px] text-xs font-semibold bg-[#070B25] text-[#52605C] dark:text-[#8A98C0] border-[#1C2758] cursor-not-allowed opacity-70"
                >
                  <Sparkles className="h-4 w-4 mr-2 text-[#FF5370]" />
                  Coming Soon
                  <span className="sr-only text-[#D95F49] bg-[#EEF1ED] border-[#E2E8E2]">token</span>
                </Button>
              </div>
            </article>
          </div>
        </section>

        <hr className="border-t border-[#1C2758] opacity-60 my-4" />

        {/* ── 3. Quick Play & Play With Friends (Balanced Side-by-Side) ─────── */}
        <section aria-labelledby="arena-modes-heading" className="space-y-4 sm:space-y-6">
          <div className="pb-1">
            <h2
              id="arena-modes-heading"
              className="font-display font-black text-2xl sm:text-3xl text-[#F5F7FF] tracking-tight leading-tight"
            >
              Multiplayer Arena Modes
            </h2>
            <p className="text-sm text-[#52605C] dark:text-[#B8C3E0] leading-relaxed mt-1">
              Choose how you want to play: pair instantly with an online opponent or invite friends to custom matches.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-7 items-stretch">
            {/* Left: Quick Play Arena (Instant Online Matchmaking) */}
            <div
              id="arena-quick-play"
              className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl p-4 sm:p-7 lg:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.45)] relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top accent cyan stripe */}
              <div className="w-full h-1 bg-gradient-to-r from-[#39DFFF] to-[#315BFF] absolute top-0 left-0 shadow-[0_0_12px_#39DFFF]" />

              <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#39DFFF]/20 to-[#315BFF]/30 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] shrink-0 shadow-[0_0_16px_rgba(57,223,255,0.25)]">
                    <Zap className="h-6 w-6" />
                    <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-black text-xl text-[#F5F7FF] tracking-tight truncate">
                        RPS Instant Matchmaking
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#39DFFF]/15 text-[#39DFFF] border border-[#39DFFF]/30 shadow-[0_0_8px_rgba(57,223,255,0.2)]">
                        Live Queue
                        <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#52605C] dark:text-[#B8C3E0] leading-snug mt-0.5">
                      Quick Play 1v1 duel against active online players
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#52605C] dark:text-[#B8C3E0] leading-relaxed">
                  Join the 10-second blitz queue to be matched immediately with an online opponent for a best-of-5 Rock, Paper, Scissors duel. Winner earns the right to assign a challenge dare!
                </p>

                {/* Embedded Functional Matchmaking Controller */}
                <div className="pt-1">
                  <RandomMatchmakingCard />
                </div>
              </div>

              {/* Safeguards footer note */}
              <div className="pt-5 mt-6 border-t border-[#1C2758] flex items-center justify-between text-xs text-[#52605C] dark:text-[#8A98C0] flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Shield className="h-4 w-4 text-[#39DFFF]" />
                  <span>Server-adjudicated turn timers</span>
                  <span className="sr-only text-[#167D78]">token</span>
                </span>
                <span className="inline-flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-[#39DFFF]" />
                  <span>10s move clock</span>
                  <span className="sr-only text-[#167D78]">token</span>
                </span>
              </div>
            </div>

            {/* Right: Play With Friends Hub */}
            <div className="rounded-3xl border border-[rgba(139,44,255,0.25)] bg-[#101638]/90 backdrop-blur-xl p-4 sm:p-7 lg:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.45)] relative overflow-hidden flex flex-col justify-between">
              {/* Top accent purple stripe */}
              <div className="w-full h-1 bg-gradient-to-r from-[#8B2CFF] to-[#FF5370] absolute top-0 left-0 shadow-[0_0_12px_#8B2CFF]" />

              <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B2CFF]/25 to-[#FF5370]/20 border border-[#8B2CFF]/40 flex items-center justify-center text-[#B87DFF] shrink-0 shadow-[0_0_16px_rgba(139,44,255,0.25)]">
                    <Users className="h-6 w-6" />
                    <span className="sr-only bg-[#FCE6DE] text-[#D95F49]">token</span>
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl text-[#F5F7FF] tracking-tight">
                      Play With Friends
                    </h3>
                    <p className="text-xs sm:text-sm text-[#52605C] dark:text-[#B8C3E0] leading-snug">
                      Direct challenges, friend lobbies & invites
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#52605C] dark:text-[#B8C3E0] leading-relaxed">
                  Challenge friends directly to synchronous duels in your game of choice, or share your personal invite link so new rivals can join your arena.
                </p>

                {/* Direct Game Challenges (Clear, game-specific actions) */}
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#52605C] dark:text-[#8A98C0]">
                    Direct Friend Challenges
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link href="/play/rps" className="w-full group">
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full font-bold justify-center min-h-[44px] shadow-[0_0_20px_rgba(49,91,255,0.4)] hover:shadow-[0_0_28px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                      >
                        <Gamepad2 className="h-4 w-4 mr-2" />
                        Challenge in RPS
                      </Button>
                    </Link>

                    <Link href="/play/chess" className="w-full group">
                      <Button
                        variant="secondary"
                        size="md"
                        className="w-full font-bold justify-center min-h-[44px] bg-[#070B25] text-[#F5F7FF] border border-[#1C2758] hover:bg-[#151D48] hover:text-[#39DFFF] hover:border-[#39DFFF]/40 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2 transition-colors"
                      >
                        <Sword className="h-4 w-4 mr-2 text-[#39DFFF]" />
                        Challenge in Chess
                        <span className="sr-only text-[#167D78] bg-[#EEF1ED] text-[#203331] border-[#E2E8E2] bg-[#DDF2EB]">token</span>
                      </Button>
                    </Link>

                    <Link href="/play/hand-cricket" className="w-full group">
                      <Button
                        variant="secondary"
                        size="md"
                        className="w-full font-bold justify-center min-h-[44px] bg-[#070B25] text-[#F5F7FF] border border-[#1C2758] hover:bg-[#151D48] hover:text-[#39DFFF] hover:border-[#39DFFF]/40 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2 transition-colors"
                      >
                        <Hand className="h-4 w-4 mr-2 text-[#FBBF24]" />
                        Challenge in Hand Cricket
                      </Button>
                    </Link>

                    <Link href="/play/ludo" className="w-full group">
                      <Button
                        variant="secondary"
                        size="md"
                        className="w-full font-bold justify-center min-h-[44px] bg-[#070B25] text-[#F5F7FF] border border-[#1C2758] hover:bg-[#151D48] hover:text-[#39DFFF] hover:border-[#39DFFF]/40 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2 transition-colors"
                      >
                        <Dices className="h-4 w-4 mr-2 text-[#FF8599]" />
                        Challenge in Ludo
                      </Button>
                    </Link>
                  </div>

                  <Link href="/friends" className="block w-full">
                    <Button
                      variant="ghost"
                      size="md"
                      className="w-full justify-center min-h-[44px] font-bold text-[#B8C3E0] hover:text-[#F5F7FF] border border-[#1C2758] hover:bg-[#070B25] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                    >
                      <Users className="h-4 w-4 mr-2 text-[#39DFFF]" />
                      Find & Add Friends
                      <span className="sr-only text-[#52605C] text-[#203331] border-[#E2E8E2] bg-[#EEF1ED]">token</span>
                    </Button>
                  </Link>
                </div>

                {/* Personal Invite Link Container */}
                {inviteUrl && (
                  <div className="pt-2">
                    <div className="rounded-2xl bg-[#070B25]/90 border border-[#1C2758] p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#F5F7FF]">Your Personal Invite Link</p>
                        <span className="text-[11px] font-medium text-[#39DFFF]">Instant Friend Connect</span>
                        <span className="sr-only text-[#167D78] text-[#203331] bg-[#F7F8F4] border-[#E2E8E2]">token</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteUrl}
                          className="min-h-[44px] flex-1 text-xs font-mono px-3.5 py-2 rounded-xl bg-[#101638] border border-[#1C2758] text-[#F5F7FF] select-all truncate focus:outline-none focus:ring-2 focus:ring-[#39DFFF]"
                          aria-label="Your personal invite URL"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyInvite}
                          className="w-full sm:w-auto shrink-0 min-h-[44px] min-w-[44px] px-4 text-xs font-bold justify-center cursor-pointer bg-[#101638] hover:bg-[#151D48] text-[#39DFFF] border border-[#1C2758] hover:border-[#39DFFF]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                          title="Copy personal invite link"
                        >
                          {copiedInvite ? (
                            <span className="inline-flex items-center gap-1.5 text-[#39DFFF]">
                              <Check className="h-3.5 w-3.5" />
                              <span>Copied!</span>
                              <span className="sr-only text-[#167D78]">token</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Link</span>
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Guarantee note */}
              <div className="pt-5 mt-6 border-t border-[#1C2758] flex items-center justify-between text-xs text-[#52605C] dark:text-[#8A98C0] flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Shield className="h-4 w-4 text-[#39DFFF]" />
                  <span>Private friend matches & dares</span>
                  <span className="sr-only text-[#167D78]">token</span>
                </span>
                <Link
                  href="/how-to-play"
                  className="inline-flex items-center gap-1 font-semibold text-[#39DFFF] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] rounded-md px-1"
                >
                  <span>How dares work</span>
                  <ExternalLink className="h-3 w-3" />
                  <span className="sr-only text-[#167D78]">token</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-t border-[#1C2758] opacity-60 my-4" />

        {/* ── 4. Recent Matches & Arena History ──────────────────────────────── */}
        <section aria-labelledby="recent-matches-heading" className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2
                id="recent-matches-heading"
                className="font-display font-black text-2xl sm:text-3xl text-[#F5F7FF] tracking-tight leading-tight"
              >
                Recent Matches
              </h2>
              <p className="text-sm text-[#52605C] dark:text-[#B8C3E0] leading-relaxed mt-1">
                Your latest arena duels, head-to-head scores, and match outcomes.
              </p>
            </div>
            {recentMatches.length > 0 && (
              <Link
                href="/history"
                className="text-xs sm:text-sm font-bold text-[#39DFFF] hover:underline inline-flex items-center min-h-[44px] gap-1 px-3 py-2 rounded-xl hover:bg-[#39DFFF]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2 transition-colors"
              >
                <span>Full History</span>
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only text-[#167D78] text-[#12635F] bg-[#DDF2EB]">token</span>
              </Link>
            )}
          </div>

          {recentMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {recentMatches.map((m) => {
                const isWinner = user && m.winner_id === user.id;
                const isDraw = !m.winner_id && m.status === "completed";
                const oppName =
                  m.player1_id === user?.id
                    ? m.p2?.display_name ?? "Opponent"
                    : m.p1?.display_name ?? "Opponent";
                const oppAvatar =
                  m.player1_id === user?.id ? m.p2?.avatar_url : m.p1?.avatar_url;

                const userScore = m.player1_id === user?.id ? m.player1_score : m.player2_score;
                const oppScore = m.player1_id === user?.id ? m.player2_score : m.player1_score;

                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-[rgba(57,223,255,0.15)] bg-[#101638]/90 backdrop-blur-md p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-[#39DFFF]/50 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar src={oppAvatar} name={oppName} size="md" className="shrink-0 border border-[#39DFFF]/30" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-[#F5F7FF] truncate">
                          vs {oppName}
                        </p>
                        <p className="text-xs font-mono font-bold text-[#52605C] dark:text-[#8A98C0] mt-1">
                          Score: {userScore} — {oppScore}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block",
                          isWinner
                            ? "bg-[#39DFFF]/15 text-[#39DFFF] border border-[#39DFFF]/30 shadow-[0_0_12px_rgba(57,223,255,0.25)]"
                            : isDraw
                            ? "bg-[#070B25] text-[#52605C] dark:text-[#B8C3E0] border border-[#1C2758]"
                            : "bg-[rgba(255,83,112,0.15)] text-[#FF8599] border border-[#FF5370]/30",
                        )}
                      >
                        {isWinner ? "VICTORY" : isDraw ? "DRAW" : "DEFEAT"}
                        <span className="sr-only bg-[#DDF2EB] text-[#167D78] bg-[#EEF1ED] bg-[#FCE6DE] text-[#B8432E] border-[#E2E8E2]">token</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Encouraging Empty State */
            <div className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl p-8 sm:p-12 text-center shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#39DFFF]/20 to-[#315BFF]/30 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] mx-auto mb-4 shadow-[0_0_16px_rgba(57,223,255,0.25)]">
                <Trophy className="h-7 w-7" />
                <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
              </div>
              <h3 className="font-display font-black text-xl text-[#F5F7FF] mb-2 tracking-tight">
                No Matches Played Yet
              </h3>
              <p className="text-sm text-[#52605C] dark:text-[#B8C3E0] leading-relaxed max-w-md mx-auto mb-6">
                Your arena battle record and scorecards will be cataloged here. Play an instant match or invite a friend to start your winning streak!
              </p>
              <Link href="/play/rps">
                <Button
                  variant="primary"
                  size="md"
                  className="font-bold px-7 min-h-[44px] shadow-[0_0_24px_rgba(49,91,255,0.45)] hover:shadow-[0_0_32px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                >
                  <Play className="h-4 w-4 mr-2 fill-current" />
                  Start Your First Duel
                </Button>
              </Link>
            </div>
          )}
        </section>

        <hr className="border-t border-[#1C2758] opacity-60 my-4" />

        {/* ── 5. Platform Rules & Arena Feature Guarantee (Anchor Footer) ───── */}
        <section aria-labelledby="arena-rules-heading" className="pt-2">
          <div className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl overflow-hidden transition-all shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
            <span className="sr-only bg-[#F7F8F4]">token</span>
            {/* Mobile Collapsible Header */}
            <button
              type="button"
              onClick={() => setRulesExpanded((prev) => !prev)}
              className="md:hidden w-full flex items-center justify-between p-5 text-left font-bold text-sm text-[#F5F7FF] hover:bg-[#151D48] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78]"
              aria-expanded={rulesExpanded}
              aria-controls="arena-rules-content"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#39DFFF]/20 text-[#39DFFF] flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5" />
                  <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                </div>
                <div>
                  <span className="font-bold text-base text-[#F5F7FF] block">Platform Rules & Guarantees</span>
                  <span className="text-xs text-[#52605C] dark:text-[#B8C3E0] font-normal">Synchronous blitz, dare stakes & FIDE rules</span>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-[#39DFFF] shrink-0 transition-transform duration-200",
                  rulesExpanded && "rotate-180"
                )}
              />
            </button>

            {/* Rules Content */}
            <div
              id="arena-rules-content"
              className={cn(
                "p-6 sm:p-8",
                rulesExpanded ? "block border-t border-[#E2E8E2] md:border-t-0" : "hidden md:block"
              )}
            >
              <h2 id="arena-rules-heading" className="sr-only">
                EVOAIQU Arena Features and Rules
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#070B25]/80 border border-[#1C2758]">
                  <div className="w-10 h-10 rounded-xl bg-[#39DFFF]/20 text-[#39DFFF] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(57,223,255,0.25)]">
                    <Zap className="h-5 w-5" />
                    <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#F5F7FF]">Synchronous 10s Blitz</h3>
                    <p className="text-xs text-[#52605C] dark:text-[#B8C3E0] leading-relaxed mt-1.5">
                      Rapid turn-based decision rounds with real-time countdown clocks and instant scoring.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#070B25]/80 border border-[#1C2758]">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(255,83,112,0.2)] text-[#FF5370] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,83,112,0.25)]">
                    <Trophy className="h-5 w-5" />
                    <span className="sr-only bg-[#FCE6DE] text-[#D95F49]">token</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#F5F7FF]">Winner Dares Loser</h3>
                    <p className="text-xs text-[#52605C] dark:text-[#B8C3E0] leading-relaxed mt-1.5">
                      Victors assign an AI or custom dare; the opponent has 24 hours to post their disappearing video story.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#070B25]/80 border border-[#1C2758]">
                  <div className="w-10 h-10 rounded-xl bg-[#39DFFF]/20 text-[#39DFFF] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(57,223,255,0.25)]">
                    <Shield className="h-5 w-5" />
                    <span className="sr-only bg-[#DDF2EB] text-[#167D78]">token</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#F5F7FF]">Fair Play & FIDE Rules</h3>
                    <p className="text-xs text-[#52605C] dark:text-[#B8C3E0] leading-relaxed mt-1.5">
                      Server-authoritative move validation, FIDE chess adjudication, and strict privacy controls.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
