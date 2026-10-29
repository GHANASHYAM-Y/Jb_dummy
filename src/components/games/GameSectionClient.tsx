"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Sword,
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
import { cn } from "@/lib/utils";
import { Button, Avatar } from "@/components/ui";
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
    <div className="py-4 sm:py-8 lg:py-10">
      <div className="evo-container max-w-6xl space-y-6 sm:space-y-8 lg:space-y-10">

        {/* ── 1. Top Section: Hero / Profile Banner ──────────────────────────── */}
        {user ? (
          <header className="rounded-3xl border border-[#E2E8E2] bg-white p-4 sm:p-7 lg:p-8 shadow-xs relative overflow-hidden transition-all">
            {/* Header Eyebrow */}
            <div className="flex items-center justify-between pb-3 sm:pb-5 mb-4 sm:mb-6 border-b border-[#E2E8E2]/80 gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#167D78] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#167D78]">
                  EVOAIQU Gaming Arena
                </span>
              </div>
              <span className="text-xs font-semibold text-[#52605C] hidden sm:inline-flex items-center gap-1.5">
                <span>Play. Connect. Evolve.</span>
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-8">
              {/* Left Column: Player Identity */}
              <div className="flex items-start gap-3.5 sm:gap-5 min-w-0">
                <div className="relative shrink-0 mt-0.5 sm:mt-0">
                  <Avatar
                    src={profile?.avatar_url}
                    name={displayName}
                    size="lg"
                    className="ring-4 ring-[#DDF2EB] shadow-xs"
                  />
                  <span
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#167D78] ring-2 ring-white"
                    title="Online in Arena"
                  />
                </div>

                <div className="min-w-0 space-y-1.5 sm:space-y-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#52605C]">
                      Welcome back
                    </p>
                    <h1 className="font-display font-black text-lg sm:text-2xl lg:text-3xl text-[#203331] tracking-tight leading-tight truncate mt-0.5">
                      {displayName}
                    </h1>
                  </div>

                  {/* Badges Row: Online Arena & Evoora ID */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-xs font-bold text-[#167D78] shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#167D78]" />
                      Online Arena
                    </span>

                    {evoId && (
                      <div className="inline-flex items-center gap-1.5 pl-3 pr-1 py-0.5 rounded-full bg-[#F7F8F4] border border-[#E2E8E2] text-xs max-w-full">
                        <span className="text-[#52605C] font-semibold shrink-0">ID:</span>
                        <span className="font-mono font-bold text-[#167D78] truncate">{evoId}</span>
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2 rounded-full text-[#52605C] hover:text-[#167D78] hover:bg-[#DDF2EB]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-1 transition-colors cursor-pointer shrink-0"
                          title="Copy Evoora ID"
                          aria-label={`Copy Evoora ID ${evoId}`}
                        >
                          {copiedId ? (
                            <Check className="h-3.5 w-3.5 text-[#167D78]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {copiedId && (
                          <span className="text-[11px] font-bold text-[#167D78] pr-2 animate-fade-in shrink-0">
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
                        className="inline-flex items-center justify-between gap-2.5 min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.3)] text-[#B8432E] text-xs font-bold hover:bg-[#FCE6DE]/90 hover:border-[#D95F49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D95F49] focus-visible:ring-offset-2 transition-all shadow-xs"
                        aria-label={`${pendingChallengesCount} pending dare challenges waiting`}
                      >
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 shrink-0 text-[#B8432E]" />
                          <span>{pendingChallengesCount} Dare{pendingChallengesCount > 1 ? "s" : ""} Waiting</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                      </Link>
                    )}

                    {pendingRequestsCount > 0 && (
                      <Link
                        href="/friends"
                        className="inline-flex items-center justify-between gap-2.5 min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.3)] text-[#167D78] text-xs font-bold hover:bg-[#DDF2EB]/90 hover:border-[#167D78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2 transition-all shadow-xs"
                        aria-label={`${pendingRequestsCount} friend requests waiting`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 shrink-0 text-[#167D78]" />
                          <span>{pendingRequestsCount} Friend Request{pendingRequestsCount > 1 ? "s" : ""}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                      </Link>
                    )}
                  </div>
                )}

                {/* Match Performance Stat Box */}
                <div className="flex items-center justify-around sm:justify-center gap-2 sm:gap-6 px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-[#F7F8F4] border border-[#E2E8E2]">
                  <div className="text-center min-w-[48px] sm:min-w-[56px]">
                    <p className="text-[10px] sm:text-[11px] text-[#52605C] font-bold uppercase tracking-wider mb-0.5">
                      Matches
                    </p>
                    <p className="text-base sm:text-xl font-display font-black text-[#203331] leading-none">
                      {totalMatches}
                    </p>
                  </div>
                  <div className="w-px h-6 sm:h-7 bg-[#E2E8E2]" />
                  <div className="text-center min-w-[48px] sm:min-w-[56px]">
                    <p className="text-[10px] sm:text-[11px] text-[#52605C] font-bold uppercase tracking-wider mb-0.5">
                      Wins
                    </p>
                    <p className="text-base sm:text-xl font-display font-black text-[#167D78] leading-none">
                      {wins}
                    </p>
                  </div>
                  <div className="w-px h-6 sm:h-7 bg-[#E2E8E2]" />
                  <div className="text-center min-w-[48px] sm:min-w-[56px]">
                    <p className="text-[10px] sm:text-[11px] text-[#52605C] font-bold uppercase tracking-wider mb-0.5">
                      Win Rate
                    </p>
                    <p className="text-base sm:text-xl font-display font-black text-[#203331] leading-none">
                      {winRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>
        ) : (
          <header className="rounded-3xl border border-[#E2E8E2] bg-white p-5 sm:p-12 text-center shadow-xs space-y-3 sm:space-y-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-xs font-bold text-[#167D78]">
              <Zap className="h-3.5 w-3.5" />
              Gaming Arena — Play. Connect. Evolve.
            </span>
            <h1 className="font-display font-black text-xl sm:text-4xl lg:text-5xl text-[#203331] tracking-tight leading-tight max-w-2xl mx-auto">
              Choose Your Game & Challenge Rivals
            </h1>
            <p className="text-[#52605C] text-xs sm:text-base leading-relaxed max-w-xl mx-auto">
              Real-time social multiplayer games. Win the duel, dare your opponent, and share 24-hour disappearing video stories.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link href="/auth/login">
                <Button
                  variant="primary"
                  size="lg"
                  className="font-bold px-7 min-h-[44px] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                >
                  Sign In to Play
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </header>
        )}

        {/* ── 2. Game Selection Grid ─────────────────────────────────────────── */}
        <section aria-labelledby="game-selection-heading" className="space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 sm:gap-2 pb-0.5 sm:pb-1">
            <div>
              <h2
                id="game-selection-heading"
                className="font-display font-black text-xl sm:text-2xl text-[#203331] tracking-tight leading-tight"
              >
                Select a Game
              </h2>
              <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed mt-0.5">
                Real-time 2-player synchronous multiplayer with post-match dare stakes.
              </p>
            </div>
            <span className="text-xs font-bold text-[#167D78] bg-[#DDF2EB] px-3 py-1 rounded-full border border-[rgba(22,125,120,0.2)] shrink-0 self-start sm:self-auto">
              Synchronous 1v1
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-7 items-stretch">
            {/* Game Card 1: Rock, Paper, Scissors */}
            <article className="rounded-3xl border border-[#E2E8E2] bg-white p-5 sm:p-7 shadow-xs hover:border-[#167D78] hover:shadow-card focus-within:ring-2 focus-within:ring-[#167D78] focus-within:border-[#167D78] transition-all flex flex-col justify-between group h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-3.5 sm:mb-5">
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78] group-hover:scale-105 transition-transform shadow-xs">
                    <Gamepad2 className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-xs font-bold text-[#167D78]">
                    <Zap className="h-3.5 w-3.5" />
                    Live
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-lg sm:text-xl text-[#203331] mb-1.5 sm:mb-2 tracking-tight leading-snug">
                  Rock, Paper, Scissors
                </h3>
                <p className="text-[#52605C] text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                  First-to-5 synchronous duel. Fast 10-second blitz move rounds with real-time feedback and post-match dare assignments.
                </p>

                {/* Feature Tags with ample breathing room */}
                <div className="mt-auto pt-2 sm:pt-3 mb-4 sm:mb-6 flex flex-wrap gap-1.5 sm:gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#DDF2EB] text-[#167D78] text-xs font-mono font-bold border border-[rgba(22,125,120,0.2)]">
                    First to 5
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EEF1ED] text-[#52605C] text-xs font-semibold">
                    10s Blitz Timer
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#FCE6DE] text-[#B8432E] text-xs font-bold border border-[rgba(217,95,73,0.2)]">
                    Dare Stakes
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3.5 sm:pt-4 border-t border-[#E2E8E2]/80 mt-auto">
                <Link href="/play/rps" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold justify-center min-h-[44px] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Play Rock, Paper, Scissors
                  </Button>
                </Link>
              </div>
            </article>

            {/* Game Card 2: Speed Chess */}
            <article className="rounded-3xl border border-[#E2E8E2] bg-white p-5 sm:p-7 shadow-xs hover:border-[#167D78] hover:shadow-card focus-within:ring-2 focus-within:ring-[#167D78] focus-within:border-[#167D78] transition-all flex flex-col justify-between group h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-3.5 sm:mb-5">
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78] group-hover:scale-105 transition-transform shadow-xs">
                    <Sword className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-xs font-bold text-[#167D78]">
                    <Zap className="h-3.5 w-3.5" />
                    Live
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-lg sm:text-xl text-[#203331] mb-1.5 sm:mb-2 tracking-tight leading-snug">
                  Speed Chess
                </h3>
                <p className="text-[#52605C] text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                  FIDE Speed Chess with server-authoritative move validation, timed blitz clocks, checkmate detection, and post-game video dares.
                </p>

                {/* Feature Tags with ample breathing room */}
                <div className="mt-auto pt-2 sm:pt-3 mb-4 sm:mb-6 flex flex-wrap gap-1.5 sm:gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#DDF2EB] text-[#167D78] text-xs font-mono font-bold border border-[rgba(22,125,120,0.2)]">
                    5m + 3s Blitz
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EEF1ED] text-[#52605C] text-xs font-semibold">
                    FIDE Rules
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#FCE6DE] text-[#B8432E] text-xs font-bold border border-[rgba(217,95,73,0.2)]">
                    Dare Stakes
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3.5 sm:pt-4 border-t border-[#E2E8E2]/80 mt-auto">
                <Link href="/play/chess" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold justify-center min-h-[44px] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Play Speed Chess
                  </Button>
                </Link>
              </div>
            </article>

            {/* Game Card 3: Mystery Dare Duel (Upcoming) */}
            <article className="rounded-3xl border border-[#E2E8E2] bg-white/80 p-5 sm:p-7 shadow-xs flex flex-col justify-between h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-3.5 sm:mb-5">
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.25)] flex items-center justify-center text-[#D95F49] shadow-xs">
                    <Flame className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCE6DE] border border-[rgba(217,95,73,0.25)] text-xs font-bold text-[#D95F49]">
                    Upcoming
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-lg sm:text-xl text-[#203331] mb-1.5 sm:mb-2 tracking-tight leading-snug">
                  Mystery Dare Duel
                </h3>
                <p className="text-[#52605C] text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                  Randomized party mini-games where the loser must immediately record and submit an AI-curated comedy or physical act dare.
                </p>

                {/* Feature Tags with ample breathing room */}
                <div className="mt-auto pt-3 mb-4 sm:mb-6 flex flex-wrap gap-1.5 sm:gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#FCE6DE] text-[#B8432E] text-xs font-bold border border-[rgba(217,95,73,0.2)]">
                    Instant Dare
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EEF1ED] text-[#52605C] text-xs font-semibold">
                    Party Mode
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EEF1ED] text-[#52605C] text-xs font-semibold">
                    In Development
                  </span>
                </div>
              </div>

              {/* Disabled Action Button */}
              <div className="pt-3.5 sm:pt-4 border-t border-[#E2E8E2]/80 mt-auto">
                <Button
                  variant="secondary"
                  size="md"
                  disabled
                  className="w-full justify-center min-h-[44px] text-xs font-semibold bg-[#EEF1ED] text-[#52605C] border-[#E2E8E2] cursor-not-allowed opacity-80"
                >
                  <Sparkles className="h-4 w-4 mr-2 text-[#D95F49]" />
                  Coming Soon
                </Button>
              </div>
            </article>
          </div>
        </section>

        {/* ── 3. Quick Play & Play With Friends (Balanced Side-by-Side) ─────── */}
        <section aria-labelledby="arena-modes-heading" className="space-y-4 sm:space-y-5">
          <div className="pb-0.5 sm:pb-1">
            <h2
              id="arena-modes-heading"
              className="font-display font-black text-xl sm:text-2xl text-[#203331] tracking-tight leading-tight"
            >
              Multiplayer Arena Modes
            </h2>
            <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed mt-0.5">
              Choose how you want to play: pair instantly with an online opponent or invite friends to custom matches.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-7 items-stretch">
            {/* Left: Quick Play Arena (Instant Online Matchmaking) */}
            <div
              id="arena-quick-play"
              className="rounded-3xl border border-[#E2E8E2] bg-white p-4 sm:p-7 lg:p-8 shadow-xs relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top accent teal stripe */}
              <div className="w-full h-1.5 bg-[#167D78] absolute top-0 left-0" />

              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78] shrink-0 shadow-xs">
                    <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-black text-lg sm:text-xl text-[#203331] tracking-tight truncate">
                        RPS Instant Matchmaking
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#DDF2EB] text-[#167D78] border border-[rgba(22,125,120,0.2)]">
                        Live Queue
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#52605C] leading-snug mt-0.5">
                      Quick Play 1v1 duel against active online players
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed">
                  Join the 10-second blitz queue to be matched immediately with an online opponent for a best-of-5 Rock, Paper, Scissors duel. Winner earns the right to assign a challenge dare!
                </p>

                {/* Embedded Functional Matchmaking Controller */}
                <div className="pt-0.5 sm:pt-1">
                  <RandomMatchmakingCard />
                </div>
              </div>

              {/* Safeguards footer note */}
              <div className="pt-4 sm:pt-5 mt-5 sm:mt-6 border-t border-[#E2E8E2]/80 flex items-center justify-between text-xs text-[#52605C] flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Shield className="h-3.5 w-3.5 text-[#167D78]" />
                  <span>Server-adjudicated turn timers</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5 text-[#167D78]" />
                  <span>10s move clock</span>
                </span>
              </div>
            </div>

            {/* Right: Play With Friends Hub */}
            <div className="rounded-3xl border border-[#E2E8E2] bg-white p-4 sm:p-7 lg:p-8 shadow-xs relative overflow-hidden flex flex-col justify-between">
              {/* Top accent coral stripe */}
              <div className="w-full h-1.5 bg-[#D95F49] absolute top-0 left-0" />

              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.25)] flex items-center justify-center text-[#D95F49] shrink-0 shadow-xs">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg sm:text-xl text-[#203331] tracking-tight">
                      Play With Friends
                    </h3>
                    <p className="text-xs sm:text-sm text-[#52605C] leading-snug">
                      Direct challenges, friend lobbies & invites
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed">
                  Challenge friends directly to synchronous duels in your game of choice, or share your personal invite link so new rivals can join your arena.
                </p>

                {/* Direct Game Challenges (Clear, game-specific actions) */}
                <div className="space-y-2.5 sm:space-y-3 pt-0.5 sm:pt-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#52605C]">
                    Direct Friend Challenges
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Link href="/play/rps" className="w-full group">
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full font-bold justify-center min-h-[44px] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                      >
                        <Gamepad2 className="h-4 w-4 mr-2" />
                        Challenge in RPS
                      </Button>
                    </Link>

                    <Link href="/play/chess" className="w-full group">
                      <Button
                        variant="secondary"
                        size="md"
                        className="w-full font-bold justify-center min-h-[44px] bg-[#EEF1ED] text-[#203331] border border-[#E2E8E2] hover:bg-[#DDF2EB] hover:text-[#167D78] hover:border-[rgba(22,125,120,0.3)] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2 transition-colors"
                      >
                        <Sword className="h-4 w-4 mr-2 text-[#167D78]" />
                        Challenge in Chess
                      </Button>
                    </Link>
                  </div>

                  <Link href="/friends" className="block w-full">
                    <Button
                      variant="ghost"
                      size="md"
                      className="w-full justify-center min-h-[44px] font-bold text-[#52605C] hover:text-[#203331] border border-[#E2E8E2] hover:bg-[#EEF1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                    >
                      <Users className="h-4 w-4 mr-2 text-[#52605C]" />
                      Find & Add Friends
                    </Button>
                  </Link>
                </div>

                {/* Personal Invite Link Container */}
                {inviteUrl && (
                  <div className="pt-2 sm:pt-3">
                    <div className="rounded-2xl bg-[#F7F8F4] border border-[#E2E8E2] p-3.5 sm:p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#203331]">Your Personal Invite Link</p>
                        <span className="text-[11px] font-medium text-[#167D78]">Instant Friend Connect</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteUrl}
                          className="min-h-[44px] flex-1 text-xs font-mono px-3.5 py-2 rounded-xl bg-white border border-[#E2E8E2] text-[#203331] select-all truncate focus:outline-none focus:ring-2 focus:ring-[#167D78]"
                          aria-label="Your personal invite URL"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyInvite}
                          className="w-full sm:w-auto shrink-0 min-h-[44px] min-w-[44px] px-4 text-xs font-bold justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                          title="Copy personal invite link"
                        >
                          {copiedInvite ? (
                            <span className="inline-flex items-center gap-1.5 text-[#167D78]">
                              <Check className="h-3.5 w-3.5" />
                              <span>Copied!</span>
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
              <div className="pt-4 sm:pt-5 mt-5 sm:mt-6 border-t border-[#E2E8E2]/80 flex items-center justify-between text-xs text-[#52605C] flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Shield className="h-3.5 w-3.5 text-[#167D78]" />
                  <span>Private friend matches & dares</span>
                </span>
                <Link
                  href="/how-to-play"
                  className="inline-flex items-center gap-1 font-semibold text-[#167D78] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] rounded-md px-1"
                >
                  <span>How dares work</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Recent Matches & Arena History ──────────────────────────────── */}
        <section aria-labelledby="recent-matches-heading" className="space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between pb-0.5 sm:pb-1">
            <div>
              <h2
                id="recent-matches-heading"
                className="font-display font-black text-xl sm:text-2xl text-[#203331] tracking-tight leading-tight"
              >
                Recent Matches
              </h2>
              <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed mt-0.5">
                Your latest arena duels, head-to-head scores, and match outcomes.
              </p>
            </div>
            {recentMatches.length > 0 && (
              <Link
                href="/history"
                className="text-xs sm:text-sm font-bold text-[#167D78] hover:text-[#12635F] hover:underline inline-flex items-center min-h-[44px] gap-1 px-3 py-2 rounded-xl hover:bg-[#DDF2EB]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2 transition-colors"
              >
                <span>Full History</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {recentMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
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
                    className="rounded-2xl border border-[#E2E8E2] bg-white p-3.5 sm:p-5 shadow-xs hover:border-[#167D78]/50 hover:shadow-card focus-within:ring-2 focus-within:ring-[#167D78] transition-all flex items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                      <Avatar src={oppAvatar} name={oppName} size="md" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-[#203331] truncate">
                          vs {oppName}
                        </p>
                        <p className="text-xs font-mono font-bold text-[#52605C] mt-0.5">
                          Score: {userScore} — {oppScore}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          "px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block",
                          isWinner
                            ? "bg-[#DDF2EB] text-[#167D78] border border-[rgba(22,125,120,0.25)]"
                            : isDraw
                            ? "bg-[#EEF1ED] text-[#52605C] border border-[#E2E8E2]"
                            : "bg-[#FCE6DE] text-[#B8432E] border border-[rgba(217,95,73,0.25)]",
                        )}
                      >
                        {isWinner ? "VICTORY" : isDraw ? "DRAW" : "DEFEAT"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Encouraging Empty State: Eliminates the blank void */
            <div className="rounded-3xl border border-[#E2E8E2] bg-white p-6 sm:p-10 text-center shadow-xs">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78] mx-auto mb-3.5 sm:mb-4 shadow-xs">
                <Trophy className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="font-display font-black text-lg sm:text-xl text-[#203331] mb-1.5 sm:mb-2 tracking-tight">
                No Matches Played Yet
              </h3>
              <p className="text-xs sm:text-sm text-[#52605C] leading-relaxed max-w-md mx-auto mb-5 sm:mb-6">
                Your arena battle record and scorecards will be cataloged here. Play an instant match or invite a friend to start your winning streak!
              </p>
              <Link href="/play/rps">
                <Button
                  variant="primary"
                  size="md"
                  className="font-bold px-6 min-h-[44px] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
                >
                  <Play className="h-4 w-4 mr-2 fill-current" />
                  Start Your First Duel
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* ── 5. Platform Rules & Arena Feature Guarantee (Anchor Footer) ───── */}
        <section aria-labelledby="arena-rules-heading" className="pt-1 sm:pt-2">
          <div className="rounded-3xl border border-[#E2E8E2] bg-[#F7F8F4] overflow-hidden transition-all">
            {/* Mobile Collapsible Header */}
            <button
              type="button"
              onClick={() => setRulesExpanded((prev) => !prev)}
              className="md:hidden w-full flex items-center justify-between p-4 text-left font-bold text-sm text-[#203331] hover:bg-[#EEF1ED] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78]"
              aria-expanded={rulesExpanded}
              aria-controls="arena-rules-content"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#DDF2EB] text-[#167D78] flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[#203331] block">Platform Rules & Guarantees</span>
                  <span className="text-[11px] text-[#52605C] font-normal">Synchronous blitz, dare stakes & FIDE rules</span>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-[#52605C] shrink-0 transition-transform duration-200",
                  rulesExpanded && "rotate-180"
                )}
              />
            </button>

            {/* Rules Content: Always rendered on desktop (md:block), collapsible on mobile */}
            <div
              id="arena-rules-content"
              className={cn(
                "p-5 sm:p-6 lg:p-8",
                rulesExpanded ? "block border-t border-[#E2E8E2] md:border-t-0" : "hidden md:block"
              )}
            >
              <h2 id="arena-rules-heading" className="sr-only">
                EVOAIQU Arena Features and Rules
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#DDF2EB] text-[#167D78] flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#203331]">Synchronous 10s Blitz</h3>
                    <p className="text-xs text-[#52605C] leading-relaxed mt-1">
                      Rapid turn-based decision rounds with real-time countdown clocks and instant scoring.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FCE6DE] text-[#D95F49] flex items-center justify-center shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#203331]">Winner Dares Loser</h3>
                    <p className="text-xs text-[#52605C] leading-relaxed mt-1">
                      Victors assign an AI or custom dare; the opponent has 24 hours to post their disappearing video story.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#DDF2EB] text-[#167D78] flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#203331]">Fair Play & FIDE Rules</h3>
                    <p className="text-xs text-[#52605C] leading-relaxed mt-1">
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
