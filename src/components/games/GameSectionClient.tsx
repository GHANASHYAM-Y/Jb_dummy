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
    <div className="py-6 sm:py-8 lg:py-10">
      <div className="evo-container max-w-6xl space-y-8 sm:space-y-10">

        {/* ── 1. Top Section: Hero / Profile Banner ──────────────────────────── */}
        {user ? (
          <header className="rounded-3xl border border-[#E2E8E2] bg-white p-5 sm:p-7 lg:p-8 shadow-xs relative overflow-hidden transition-all">
            {/* Header Eyebrow */}
            <div className="flex items-center justify-between pb-4 sm:pb-5 mb-5 sm:mb-6 border-b border-[#E2E8E2]/80 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#167D78] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#167D78]">
                  EVOAIQU Gaming Arena
                </span>
              </div>
              <span className="text-xs font-semibold text-[#8E9B97] hidden sm:inline-flex items-center gap-1.5">
                <span>Play. Connect. Evolve.</span>
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
              {/* Left Column: Player Identity */}
              <div className="flex items-start gap-4 sm:gap-5 min-w-0">
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

                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#65736F]">
                      Welcome back
                    </p>
                    <h1 className="font-display font-black text-xl sm:text-2xl lg:text-3xl text-[#203331] tracking-tight leading-tight truncate mt-0.5">
                      {displayName}
                    </h1>
                  </div>

                  {/* Badges Row: Online Arena & Evoora ID */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-xs font-bold text-[#167D78] shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#167D78]" />
                      Online Arena
                    </span>

                    {evoId && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F8F4] border border-[#E2E8E2] text-xs">
                        <span className="text-[#65736F] font-medium">ID:</span>
                        <span className="font-mono font-bold text-[#167D78]">{evoId}</span>
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="ml-0.5 p-0.5 text-[#8E9B97] hover:text-[#167D78] transition-colors cursor-pointer"
                          title="Copy Evoora ID"
                          aria-label={`Copy Evoora ID ${evoId}`}
                        >
                          {copiedId ? (
                            <Check className="h-3 w-3 text-[#167D78]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        {copiedId && (
                          <span className="text-[10px] font-bold text-[#167D78] animate-fade-in">
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
                  <div className="flex flex-wrap sm:flex-col gap-2 justify-start">
                    {pendingChallengesCount > 0 && (
                      <Link
                        href="/chat?tab=stories"
                        className="inline-flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.3)] text-[#D95F49] text-xs font-bold hover:bg-[#FCE6DE]/80 hover:border-[#D95F49] transition-all shadow-xs"
                        aria-label={`${pendingChallengesCount} pending dare challenges waiting`}
                      >
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 shrink-0 text-[#D95F49]" />
                          <span>{pendingChallengesCount} Dare{pendingChallengesCount > 1 ? "s" : ""} Waiting</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                      </Link>
                    )}

                    {pendingRequestsCount > 0 && (
                      <Link
                        href="/friends"
                        className="inline-flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.3)] text-[#167D78] text-xs font-bold hover:bg-[#DDF2EB]/80 hover:border-[#167D78] transition-all shadow-xs"
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
                <div className="flex items-center justify-around sm:justify-center gap-3 sm:gap-6 px-4 sm:px-5 py-3 rounded-2xl bg-[#F7F8F4] border border-[#E2E8E2]">
                  <div className="text-center min-w-[50px] sm:min-w-[56px]">
                    <p className="text-[10px] sm:text-[11px] text-[#65736F] font-bold uppercase tracking-wider mb-0.5">
                      Matches
                    </p>
                    <p className="text-lg sm:text-xl font-display font-black text-[#203331] leading-none">
                      {totalMatches}
                    </p>
                  </div>
                  <div className="w-px h-7 bg-[#E2E8E2]" />
                  <div className="text-center min-w-[50px] sm:min-w-[56px]">
                    <p className="text-[10px] sm:text-[11px] text-[#65736F] font-bold uppercase tracking-wider mb-0.5">
                      Wins
                    </p>
                    <p className="text-lg sm:text-xl font-display font-black text-[#167D78] leading-none">
                      {wins}
                    </p>
                  </div>
                  <div className="w-px h-7 bg-[#E2E8E2]" />
                  <div className="text-center min-w-[50px] sm:min-w-[56px]">
                    <p className="text-[10px] sm:text-[11px] text-[#65736F] font-bold uppercase tracking-wider mb-0.5">
                      Win Rate
                    </p>
                    <p className="text-lg sm:text-xl font-display font-black text-[#203331] leading-none">
                      {winRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>
        ) : (
          <header className="rounded-3xl border border-[#E2E8E2] bg-white p-7 sm:p-12 text-center shadow-xs space-y-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-xs font-bold text-[#167D78]">
              <Zap className="h-3.5 w-3.5" />
              Gaming Arena — Play. Connect. Evolve.
            </span>
            <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-[#203331] tracking-tight leading-tight max-w-2xl mx-auto">
              Choose Your Game & Challenge Rivals
            </h1>
            <p className="text-[#65736F] text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
              Real-time social multiplayer games. Win the duel, dare your opponent, and share 24-hour disappearing video stories.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link href="/auth/login">
                <Button variant="primary" size="lg" className="font-bold px-7 shadow-xs">
                  Sign In to Play
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </header>
        )}

        {/* ── 2. Game Selection Grid ─────────────────────────────────────────── */}
        <section aria-labelledby="game-selection-heading" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-1">
            <div>
              <h2
                id="game-selection-heading"
                className="font-display font-black text-xl sm:text-2xl text-[#203331] tracking-tight leading-tight"
              >
                Select a Game
              </h2>
              <p className="text-sm text-[#65736F] leading-relaxed mt-0.5">
                Real-time 2-player synchronous multiplayer with post-match dare stakes.
              </p>
            </div>
            <span className="text-xs font-bold text-[#167D78] bg-[#DDF2EB] px-3 py-1 rounded-full border border-[rgba(22,125,120,0.2)] shrink-0 self-start sm:self-auto">
              Synchronous 1v1
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
            {/* Game Card 1: Rock, Paper, Scissors */}
            <article className="rounded-3xl border border-[#E2E8E2] bg-white p-6 sm:p-7 shadow-xs hover:border-[#167D78] hover:shadow-card transition-all flex flex-col justify-between group h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78] group-hover:scale-105 transition-transform shadow-xs">
                    <Gamepad2 className="h-7 w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-xs font-bold text-[#167D78]">
                    <Zap className="h-3.5 w-3.5" />
                    Live
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-xl text-[#203331] mb-2 tracking-tight leading-snug">
                  Rock, Paper, Scissors
                </h3>
                <p className="text-[#65736F] text-sm leading-relaxed mb-4">
                  First-to-5 synchronous duel. Fast 10-second blitz move rounds with real-time feedback and post-match dare assignments.
                </p>

                {/* Feature Tags with ample breathing room */}
                <div className="mt-auto pt-3 mb-6 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#DDF2EB] text-[#167D78] text-xs font-mono font-bold border border-[rgba(22,125,120,0.2)]">
                    First to 5
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EEF1ED] text-[#65736F] text-xs font-semibold">
                    10s Blitz Timer
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#FCE6DE] text-[#D95F49] text-xs font-bold border border-[rgba(217,95,73,0.2)]">
                    Dare Stakes
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-[#E2E8E2]/80 mt-auto">
                <Link href="/play/rps" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold justify-center min-h-[44px] shadow-xs"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Play RPS Duel
                  </Button>
                </Link>
              </div>
            </article>

            {/* Game Card 2: Speed Chess */}
            <article className="rounded-3xl border border-[#E2E8E2] bg-white p-6 sm:p-7 shadow-xs hover:border-[#167D78] hover:shadow-card transition-all flex flex-col justify-between group h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78] group-hover:scale-105 transition-transform shadow-xs">
                    <Sword className="h-7 w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-xs font-bold text-[#167D78]">
                    <Zap className="h-3.5 w-3.5" />
                    Live
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-xl text-[#203331] mb-2 tracking-tight leading-snug">
                  Speed Chess
                </h3>
                <p className="text-[#65736F] text-sm leading-relaxed mb-4">
                  FIDE Speed Chess with server-authoritative move validation, timed blitz clocks, checkmate detection, and post-game video dares.
                </p>

                {/* Feature Tags with ample breathing room */}
                <div className="mt-auto pt-3 mb-6 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#DDF2EB] text-[#167D78] text-xs font-mono font-bold border border-[rgba(22,125,120,0.2)]">
                    5m + 3s Blitz
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EEF1ED] text-[#65736F] text-xs font-semibold">
                    FIDE Rules
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#FCE6DE] text-[#D95F49] text-xs font-bold border border-[rgba(217,95,73,0.2)]">
                    Dare Stakes
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-[#E2E8E2]/80 mt-auto">
                <Link href="/play/chess" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold justify-center min-h-[44px] shadow-xs"
                  >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Play Speed Chess
                  </Button>
                </Link>
              </div>
            </article>

            {/* Game Card 3: Mystery Dare Duel (Upcoming) */}
            <article className="rounded-3xl border border-[#E2E8E2] bg-white/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between h-full">
              <div className="flex flex-col flex-grow">
                {/* Header Icon + Availability Badge */}
                <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.25)] flex items-center justify-center text-[#D95F49] shadow-xs">
                    <Flame className="h-7 w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCE6DE] border border-[rgba(217,95,73,0.25)] text-xs font-bold text-[#D95F49]">
                    Upcoming
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display font-black text-xl text-[#203331] mb-2 tracking-tight leading-snug">
                  Mystery Dare Duel
                </h3>
                <p className="text-[#65736F] text-sm leading-relaxed mb-4">
                  Randomized party mini-games where the loser must immediately record and submit an AI-curated comedy or physical act dare.
                </p>

                {/* Feature Tags with ample breathing room */}
                <div className="mt-auto pt-3 mb-6 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#FCE6DE] text-[#D95F49] text-xs font-bold border border-[rgba(217,95,73,0.2)]">
                    Instant Dare
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EEF1ED] text-[#8E9B97] text-xs font-semibold">
                    Party Mode
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EEF1ED] text-[#8E9B97] text-xs font-semibold">
                    In Development
                  </span>
                </div>
              </div>

              {/* Disabled Action Button */}
              <div className="pt-4 border-t border-[#E2E8E2]/80 mt-auto">
                <Button
                  variant="secondary"
                  size="md"
                  disabled
                  className="w-full justify-center min-h-[44px] text-xs font-semibold bg-[#EEF1ED] text-[#8E9B97] border-[#E2E8E2] cursor-not-allowed"
                >
                  <Sparkles className="h-4 w-4 mr-2 text-[#D95F49]" />
                  Coming Soon
                </Button>
              </div>
            </article>
          </div>
        </section>

        {/* ── 3. Quick Play & Play With Friends (Balanced Side-by-Side) ─────── */}
        <section aria-labelledby="arena-modes-heading" className="space-y-5">
          <div className="pb-1">
            <h2
              id="arena-modes-heading"
              className="font-display font-black text-xl sm:text-2xl text-[#203331] tracking-tight leading-tight"
            >
              Multiplayer Arena Modes
            </h2>
            <p className="text-sm text-[#65736F] leading-relaxed mt-0.5">
              Choose how you want to play: pair instantly with an online opponent or invite friends to custom matches.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-stretch">
            {/* Left: Quick Play Arena (Instant Online Matchmaking) */}
            <div className="rounded-3xl border border-[#E2E8E2] bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col justify-between">
              {/* Top accent teal stripe */}
              <div className="w-full h-1.5 bg-[#167D78] absolute top-0 left-0" />

              <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78] shrink-0 shadow-xs">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg sm:text-xl text-[#203331] tracking-tight">
                      Instant Matchmaking
                    </h3>
                    <p className="text-xs sm:text-sm text-[#65736F] leading-snug">
                      Quick Play duel against active online players
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#65736F] leading-relaxed">
                  Join the queue to be matched immediately with another player for a best-of-5 Rock, Paper, Scissors showdown. Winner earns the right to assign a challenge dare!
                </p>

                {/* Embedded Functional Matchmaking Controller */}
                <div className="pt-1">
                  <RandomMatchmakingCard />
                </div>
              </div>

              {/* Safeguards footer note */}
              <div className="pt-5 mt-6 border-t border-[#E2E8E2]/80 flex items-center justify-between text-xs text-[#8E9B97] flex-wrap gap-2">
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
            <div className="rounded-3xl border border-[#E2E8E2] bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col justify-between">
              {/* Top accent coral stripe */}
              <div className="w-full h-1.5 bg-[#D95F49] absolute top-0 left-0" />

              <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.25)] flex items-center justify-center text-[#D95F49] shrink-0 shadow-xs">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg sm:text-xl text-[#203331] tracking-tight">
                      Play With Friends
                    </h3>
                    <p className="text-xs sm:text-sm text-[#65736F] leading-snug">
                      Direct challenges, friend lobbies & invites
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#65736F] leading-relaxed">
                  Challenge anyone directly from your friends list, or share your personal invite link so new rivals can join your arena with a single click.
                </p>

                {/* Primary & Secondary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Link href="/play/rps" className="w-full">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full font-bold justify-center min-h-[44px] shadow-xs"
                    >
                      <Gamepad2 className="h-4 w-4 mr-2" />
                      Challenge a Friend
                    </Button>
                  </Link>

                  <Link href="/friends" className="w-full">
                    <Button
                      variant="ghost"
                      size="md"
                      className="w-full justify-center min-h-[44px] font-bold text-[#65736F] hover:text-[#203331] border border-[#E2E8E2] hover:bg-[#EEF1ED]"
                    >
                      <Users className="h-4 w-4 mr-2 text-[#8E9B97]" />
                      Find & Add Friends
                    </Button>
                  </Link>
                </div>

                {/* Personal Invite Link Container */}
                {inviteUrl && (
                  <div className="pt-3">
                    <div className="rounded-2xl bg-[#F7F8F4] border border-[#E2E8E2] p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#203331]">Your Personal Invite Link</p>
                        <span className="text-[11px] font-medium text-[#167D78]">Instant Friend Connect</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteUrl}
                          className="flex-1 text-xs font-mono px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8E2] text-[#203331] select-all truncate focus:outline-none focus:ring-1 focus:ring-[#167D78]"
                          aria-label="Your personal invite URL"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyInvite}
                          className="shrink-0 min-h-[38px] px-3.5 text-xs font-bold justify-center cursor-pointer"
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
              <div className="pt-5 mt-6 border-t border-[#E2E8E2]/80 flex items-center justify-between text-xs text-[#8E9B97] flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Shield className="h-3.5 w-3.5 text-[#167D78]" />
                  <span>Private friend matches & dares</span>
                </span>
                <Link
                  href="/how-to-play"
                  className="inline-flex items-center gap-1 font-semibold text-[#167D78] hover:underline"
                >
                  <span>How dares work</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Recent Matches & Arena History ──────────────────────────────── */}
        <section aria-labelledby="recent-matches-heading" className="space-y-5">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2
                id="recent-matches-heading"
                className="font-display font-black text-xl sm:text-2xl text-[#203331] tracking-tight leading-tight"
              >
                Recent Matches
              </h2>
              <p className="text-sm text-[#65736F] leading-relaxed mt-0.5">
                Your latest arena duels, head-to-head scores, and match outcomes.
              </p>
            </div>
            {recentMatches.length > 0 && (
              <Link
                href="/history"
                className="text-xs sm:text-sm font-bold text-[#167D78] hover:text-[#12635F] hover:underline inline-flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-[#DDF2EB]/50 transition-colors"
              >
                <span>Full History</span>
                <ChevronRight className="h-4 w-4" />
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
                    className="rounded-2xl border border-[#E2E8E2] bg-white p-5 shadow-xs hover:border-[#167D78]/50 hover:shadow-card transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar src={oppAvatar} name={oppName} size="md" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-[#203331] truncate">
                          vs {oppName}
                        </p>
                        <p className="text-xs font-mono font-bold text-[#65736F] mt-0.5">
                          Score: {userScore} — {oppScore}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block",
                          isWinner
                            ? "bg-[#DDF2EB] text-[#167D78] border border-[rgba(22,125,120,0.25)]"
                            : isDraw
                            ? "bg-[#EEF1ED] text-[#65736F] border border-[#E2E8E2]"
                            : "bg-[#FCE6DE] text-[#D95F49] border border-[rgba(217,95,73,0.25)]",
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
            <div className="rounded-3xl border border-[#E2E8E2] bg-white p-8 sm:p-10 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78] mx-auto mb-4 shadow-xs">
                <Trophy className="h-7 w-7" />
              </div>
              <h3 className="font-display font-black text-xl text-[#203331] mb-2 tracking-tight">
                No Matches Played Yet
              </h3>
              <p className="text-sm text-[#65736F] leading-relaxed max-w-md mx-auto mb-6">
                Your arena battle record and scorecards will be cataloged here. Play an instant match or invite a friend to start your winning streak!
              </p>
              <Link href="/play/rps">
                <Button variant="primary" size="md" className="font-bold px-6 shadow-xs">
                  <Play className="h-4 w-4 mr-2 fill-current" />
                  Start Your First Duel
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* ── 5. Platform Rules & Arena Feature Guarantee (Anchor Footer) ───── */}
        <section aria-labelledby="arena-rules-heading" className="pt-2">
          <div className="rounded-3xl border border-[#E2E8E2] bg-[#F7F8F4] p-6 sm:p-8">
            <h2 id="arena-rules-heading" className="sr-only">
              EVOAIQU Arena Features and Rules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#DDF2EB] text-[#167D78] flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#203331]">Synchronous 10s Blitz</h3>
                  <p className="text-xs text-[#65736F] leading-relaxed mt-1">
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
                  <p className="text-xs text-[#65736F] leading-relaxed mt-1">
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
                  <p className="text-xs text-[#65736F] leading-relaxed mt-1">
                    Server-authoritative move validation, FIDE chess adjudication, and strict privacy controls.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
