"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Trophy,
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
  Zap,
  Plus,
  Dices,
  Sparkles,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Avatar } from "@/shared/ui";
import { RandomMatchmakingCard } from "@/features/rock-paper-scissors";
import type { Profile } from "@/core/supabase/database";

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

export interface HomeFriendItem {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface OwedDareItem {
  id: string;
  title: string;
  category: string;
  description?: string | null;
}

export interface GameSectionClientProps {
  user: { id: string; email?: string | null } | null;
  profile: Profile | null;
  recentMatches?: RecentMatchItem[];
  pendingChallengesCount?: number;
  pendingRequestsCount?: number;
  friends?: HomeFriendItem[];
  owedDares?: OwedDareItem[];
}

interface HomeStory {
  id: string;
  creator?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface GameRowProps {
  href: string;
  emoji: string;
  tile: string;
  title: string;
  tagline: string;
  tag: string;
  cta: string;
}

/** One game in the "Select a Game" card: emoji tile, copy and a play pill. */
function GameRow({ href, emoji, tile, title, tagline, tag, cta }: GameRowProps) {
  return (
    <article className="flex items-center gap-3 rounded-[22px] border-2 border-[#EADBC8] bg-[#FFFFFF] p-3 transition-colors hover:border-[#1E1B24] focus-within:ring-2 focus-within:ring-[#FF5A3C]">
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-3xl",
          tile,
        )}
        aria-hidden="true"
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h3 className="font-display text-base font-bold leading-tight text-[#1E1B24]">{title}</h3>
          <span className="rounded-full bg-[#F5EADC] px-2 py-0.5 text-[11px] font-bold text-[#6E6878]">
            {tag}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-snug text-[#6E6878]">{tagline}</p>
      </div>
      <Link
        href={href}
        className={cn("evo-btn evo-btn-primary evo-btn-sm shrink-0 text-center", FOCUS)}
        aria-label={cta}
      >
        <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        <span className="hidden sm:inline">Play</span>
      </Link>
    </article>
  );
}

export function GameSectionClient({
  user,
  profile,
  recentMatches = [],
  pendingChallengesCount = 0,
  pendingRequestsCount = 0,
  friends = [],
  owedDares = [],
}: GameSectionClientProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [stories, setStories] = useState<HomeStory[]>([]);

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "Player";
  const evoId = profile?.evoora_id ?? null;

  // Calculate quick stats from recent matches
  const totalMatches = recentMatches.length;
  const wins = user
    ? recentMatches.filter((m) => m.winner_id === user.id).length
    : 0;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  // Current win streak: consecutive wins starting from the most recent match
  let winStreak = 0;
  if (user) {
    for (const m of recentMatches) {
      if (m.winner_id === user.id) winStreak += 1;
      else break;
    }
  }

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

  // Load active stories for the stories row (falls back to just "+ Your dare")
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    async function loadStories() {
      try {
        const res = await fetch("/api/challenges/stories");
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json.ok && Array.isArray(json.stories)) {
          const seen = new Set<string>();
          const unique: HomeStory[] = [];
          for (const s of json.stories as HomeStory[]) {
            const key = s.creator?.id ?? s.id;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(s);
          }
          setStories(unique.slice(0, 12));
        }
      } catch {
        // Fallback: only the "+ Your dare" ring is shown
      }
    }
    void loadStories();
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

  // ── Signed-out fallback ─────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[860px] px-4 py-6 text-[#1E1B24] sm:px-7">
        <header className="b-card b-card-sun space-y-4 p-6 text-center sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#E9A912] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-bold text-[#1E1B24]">
            <Zap className="h-3.5 w-3.5 text-[#FF5A3C]" />
            Gaming Arena — Play. Connect. Evolve.
          </span>
          <h1 className="font-display mx-auto max-w-2xl text-3xl font-bold leading-tight text-[#1E1B24] sm:text-5xl">
            Choose Your Game & Challenge Rivals
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-[#1E1B24] sm:text-base">
            Real-time social multiplayer games. Win the duel, dare your opponent, and share 24-hour disappearing video stories.
          </p>
          <div className="pt-2">
            <Link href="/login?next=/games" className={cn("evo-btn evo-btn-primary evo-btn-lg", FOCUS)}>
              Sign In to Play
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Guests can start these right away, so don't hide them behind sign-in */}
        <section aria-labelledby="guest-games-title" className="b-card mt-6 space-y-3">
          <div>
            <h2 id="guest-games-title" className="font-display text-xl font-bold text-[#1E1B24]">
              Play now, no account needed
            </h2>
            <p className="mt-0.5 text-sm text-[#6E6878]">These run in your browser. Sign in later to play friends.</p>
          </div>
          <GameRow href="/play/tic-tac-toe" emoji="⭕" tile="bg-[#FFE4DD]" title="Tic Tac Toe" tagline="Three in a row. Beat the computer or a friend." tag="vs computer" cta="Play Tic Tac Toe" />
          <GameRow href="/play/memory-match" emoji="🧠" tile="bg-[#E3FAF3]" title="Memory Match" tagline="Flip cards and find every pair." tag="Solo or 2 players" cta="Play Memory Match" />
          <GameRow href="/play/hand-cricket/solo" emoji="🏏" tile="bg-[#FFF3D1]" title="Hand Cricket" tagline="Throw 1 to 6 against the computer." tag="vs computer" cta="Play Hand Cricket against the computer" />
          <GameRow href="/play/ludo/bots" emoji="🎲" tile="bg-[#E3FAF3]" title="Ludo" tagline="Roll, capture and race home against bots." tag="vs bots" cta="Play Ludo against bots" />
          <GameRow href="/play/password-game" emoji="🔐" tile="bg-[#EEEBFF]" title="Password Game" tagline="Survive 26 ever-harder rules. Solo." tag="Solo" cta="Play Password Game" />
        </section>

        <section aria-labelledby="friend-games-title" className="b-card mt-4 space-y-2">
          <h2 id="friend-games-title" className="font-display text-xl font-bold text-[#1E1B24]">
            Sign in to play friends
          </h2>
          <p className="text-sm text-[#6E6878]">
            Rock Paper Scissors, Chess, Draw &amp; Guess, and online Hand Cricket and Ludo. The winner dares the loser.
          </p>
        </section>
      </div>
    );
  }

  const hasPending = pendingChallengesCount > 0 || pendingRequestsCount > 0;
  const topOwed = owedDares[0];

  return (
    <div className="mx-auto grid w-full max-w-[1020px] items-start gap-7 px-4 py-6 text-[#1E1B24] sm:px-7 lg:grid-cols-[minmax(0,640px)_300px] lg:justify-center">
      {/* ═════════════ MAIN COLUMN ═════════════ */}
      <div className="min-w-0 space-y-5">
        {/* ── 1. Stories row ─────────────────────────────────────────────── */}
        <section aria-label="Stories" className="-mx-4 sm:mx-0">
          <ul className="flex gap-3 overflow-x-auto px-4 pb-2 sm:px-0">
            <li className="w-[72px] shrink-0">
              <Link
                href="/chat"
                className={cn("flex min-h-[44px] flex-col items-center gap-1.5 rounded-2xl", FOCUS)}
                aria-label="Post a new dare story"
              >
                <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-dashed border-[#FF5A3C] bg-[#FFFFFF] text-[#FF5A3C]">
                  <Plus className="h-7 w-7" aria-hidden="true" />
                </span>
                <span className="w-full truncate text-center text-xs font-bold text-[#1E1B24]">
                  Your dare
                </span>
              </Link>
            </li>
            {stories.map((s) => {
              const name = s.creator?.display_name ?? "Friend";
              return (
                <li key={s.id} className="w-[72px] shrink-0">
                  <Link
                    href="/chat?tab=stories"
                    className={cn("flex min-h-[44px] flex-col items-center gap-1.5 rounded-2xl", FOCUS)}
                    aria-label={`Watch ${name}'s story`}
                  >
                    <span className="b-story-ring">
                      <span className="block rounded-full border-2 border-[#FFF6EC] bg-[#FFF6EC]">
                        <Avatar src={s.creator?.avatar_url} name={name} className="!h-[62px] !w-[62px]" />
                      </span>
                    </span>
                    <span className="w-full truncate text-center text-xs font-bold text-[#1E1B24]">
                      {name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── 2. Compose card: What are we playing tonight? ──────────────── */}
        <section className="b-card space-y-4" aria-labelledby="playing-tonight-heading">
          <div className="flex items-center gap-3">
            <Avatar src={profile?.avatar_url} name={displayName} size="lg" className="border-2 border-[#EADBC8]" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#6E6878]">
                Welcome back, {displayName}
              </p>
              <h1
                id="playing-tonight-heading"
                className="font-display text-[19px] font-bold leading-tight text-[#1E1B24]"
              >
                What are we playing tonight?
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/play/rps" className={cn("b-chip min-h-[44px] text-[#1E1B24]", FOCUS)}>
              <span aria-hidden="true">✊</span> RPS
            </Link>
            <Link href="/play/chess" className={cn("b-chip min-h-[44px] text-[#1E1B24]", FOCUS)}>
              <span aria-hidden="true">♟️</span> Chess
            </Link>
            <Link href="/play/hand-cricket" className={cn("b-chip min-h-[44px] text-[#1E1B24]", FOCUS)}>
              <span aria-hidden="true">🏏</span> Hand Cricket
              <span className="rounded-full bg-[#FF5A3C] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">new</span>
            </Link>
            <Link href="/play/draw-guess" className={cn("b-chip min-h-[44px] text-[#1E1B24]", FOCUS)}>
              <span aria-hidden="true">🎨</span> Draw & Guess
              <span className="rounded-full bg-[#FF5A3C] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">new</span>
            </Link>
            <Link href="/play/ludo" className={cn("b-chip min-h-[44px] text-[#1E1B24]", FOCUS)}>
              <span aria-hidden="true">🎲</span> Ludo
              <span className="rounded-full bg-[#FF5A3C] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">new</span>
            </Link>
            <Link href="/play/tic-tac-toe" className={cn("b-chip min-h-[44px] text-[#1E1B24]", FOCUS)}>
              <span aria-hidden="true">⭕</span> Tic Tac Toe
              <span className="rounded-full bg-[#FF5A3C] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">new</span>
            </Link>
            <Link href="/play/memory-match" className={cn("b-chip min-h-[44px] text-[#1E1B24]", FOCUS)}>
              <span aria-hidden="true">🧠</span> Memory Match
              <span className="rounded-full bg-[#FF5A3C] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">new</span>
            </Link>
            <Link href="/play/password-game" className={cn("b-chip min-h-[44px] text-[#1E1B24]", FOCUS)}>
              <span aria-hidden="true">🔐</span> Password Game
              <span className="rounded-full bg-[#FF5A3C] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">new</span>
            </Link>
            <button
              type="button"
              disabled
              className="b-chip min-h-[44px] cursor-not-allowed text-[#6E6878] opacity-70"
            >
              <span aria-hidden="true">🎭</span> Mystery Dare Duel
              <span className="rounded-full bg-[#EADBC8] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#6E6878]">soon</span>
            </button>
          </div>

          <a
            href="#arena-quick-play"
            className={cn("evo-btn evo-btn-primary evo-btn-lg w-full sm:w-auto", FOCUS)}
          >
            <Zap className="h-4 w-4" aria-hidden="true" />
            Quick RPS match
          </a>
        </section>

        {/* ── 3. Feed ────────────────────────────────────────────────────── */}
        {/* HOT: dares the user owes */}
        {pendingChallengesCount > 0 && (
          <article className="b-card b-card-hot space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#FF5A3C]">
                <Trophy className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Dares are waiting</p>
                <p className="text-xs text-white">Finish them before they expire</p>
              </div>
            </div>
            <p className="font-display text-xl font-bold leading-snug text-white">
              {topOwed
                ? `${topOwed.category}: ${topOwed.title}`
                : "You owe someone a dare. Time to deliver."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/chat?tab=stories"
                className={cn(
                  "inline-flex min-h-[44px] items-center justify-between gap-2.5 rounded-full bg-white px-5 py-2 text-sm font-bold text-[#C9381F]",
                  FOCUS,
                )}
                aria-label={`${pendingChallengesCount} pending dare challenges waiting`}
              >
                <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{pendingChallengesCount} Dare{pendingChallengesCount > 1 ? "s" : ""} Waiting</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
              </Link>
              <Link
                href="/challenges"
                className={cn(
                  "inline-flex min-h-[44px] items-center rounded-full border-2 border-white bg-[#C9381F] px-5 py-2 text-sm font-bold text-white",
                  FOCUS,
                )}
              >
                See all dares
              </Link>
            </div>
          </article>
        )}

        {/* LILAC: friend requests */}
        {pendingRequestsCount > 0 && (
          <article className="b-card b-card-lilac flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#8C7BFF]">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1E1B24]">Someone wants to be friends</p>
              <p className="text-xs text-[#6E6878]">Say yes and start a rivalry</p>
            </div>
            <Link
              href="/friends"
              className={cn("evo-btn evo-btn-primary evo-btn-sm shrink-0", FOCUS)}
              aria-label={`${pendingRequestsCount} friend requests waiting`}
            >
              {pendingRequestsCount} Friend Request{pendingRequestsCount > 1 ? "s" : ""}
            </Link>
          </article>
        )}

        {/* Select a game */}
        <section aria-labelledby="game-selection-heading" className="b-card space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2
                id="game-selection-heading"
                className="font-display text-xl font-bold leading-tight text-[#1E1B24]"
              >
                Select a Game
              </h2>
              <p className="mt-0.5 text-xs text-[#6E6878]">
                Real-time 2-player synchronous multiplayer with post-match dare stakes.
              </p>
            </div>
            <span className="hidden shrink-0 rounded-full border-2 border-[#EADBC8] bg-[#FFE4DD] px-3 py-1 text-xs font-bold text-[#C9381F] sm:inline-block">
              Synchronous 1v1
            </span>
          </div>

          <div className="space-y-2.5">
            <GameRow
              href="/play/rps"
              emoji="✊"
              tile="bg-[#FFE4DD]"
              title="Rock, Paper, Scissors"
              tagline="First to 5. 10-second blitz rounds with dare stakes."
              tag="Live"
              cta="Play Rock, Paper, Scissors"
            />
            <GameRow
              href="/play/chess"
              emoji="♟️"
              tile="bg-[#EEEBFF]"
              title="Speed Chess"
              tagline="5m + 3s FIDE blitz with server-checked moves."
              tag="Live"
              cta="Play Speed Chess"
            />
            <GameRow
              href="/play/hand-cricket"
              emoji="🏏"
              tile="bg-[#FFF1CC]"
              title="Hand Cricket"
              tagline="Throw 1 to 6 against the shot clock. 2 overs a side."
              tag="New"
              cta="Play Hand Cricket"
            />
            <GameRow
              href="/play/ludo"
              emoji="🎲"
              tile="bg-[#E3FAF3]"
              title="Ludo"
              tagline="Roll a 6, capture rivals, race home. 2–4 players."
              tag="New"
              cta="Play Ludo"
            />
            <GameRow
              href="/play/draw-guess"
              emoji="🎨"
              tile="bg-[#FFF3D1]"
              title="Draw & Guess"
              tagline="Sketch the secret word; your friend guesses it. 2 players."
              tag="New"
              cta="Play Draw & Guess"
            />
            <GameRow
              href="/play/tic-tac-toe"
              emoji="⭕"
              tile="bg-[#FFE4DD]"
              title="Tic Tac Toe"
              tagline="Three in a row. Beat the computer or a friend."
              tag="New"
              cta="Play Tic Tac Toe"
            />
            <GameRow
              href="/play/memory-match"
              emoji="🧠"
              tile="bg-[#E3FAF3]"
              title="Memory Match"
              tagline="Flip cards and find every pair. Solo or 2 players."
              tag="New"
              cta="Play Memory Match"
            />
            <GameRow
              href="/play/password-game"
              emoji="🔐"
              tile="bg-[#EEEBFF]"
              title="Password Game"
              tagline="Survive 26 ever-harder rules and chaos events. Solo."
              tag="New"
              cta="Play Password Game"
            />

            {/* Mystery Dare Duel (upcoming) */}
            <article className="flex items-center gap-3 rounded-[22px] border-2 border-dashed border-[#EADBC8] bg-[#FFF6EC] p-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#FDECEC] text-[#E5484D]"
                aria-hidden="true"
              >
                <Flame className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <h3 className="font-display text-base font-bold leading-tight text-[#1E1B24]">
                    Mystery Dare Duel
                  </h3>
                  <span className="rounded-full bg-[#EADBC8] px-2 py-0.5 text-[11px] font-bold text-[#6E6878]">
                    Upcoming
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-[#6E6878]">
                  Party mini-games where the loser records an instant dare. In development.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="evo-btn evo-btn-ghost evo-btn-sm shrink-0 cursor-not-allowed text-[#6E6878]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#E5484D]" aria-hidden="true" />
                Coming Soon
              </button>
            </article>
          </div>
        </section>

        {/* Quick play (matchmaking) */}
        <section aria-labelledby="arena-modes-heading">
          <h2 id="arena-modes-heading" className="sr-only">
            Multiplayer Arena Modes
          </h2>
          <div
            id="arena-quick-play"
            className="b-card b-card-mint scroll-mt-6 space-y-4 p-4 sm:p-7 lg:p-8"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white text-[#0E8F72]">
                <Zap className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl font-bold leading-tight text-[#1E1B24]">
                    RPS Instant Matchmaking
                  </h3>
                  <span className="rounded-full bg-[#FFFFFF] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0E8F72]">
                    Live Queue
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-[#6E6878] sm:text-sm">
                  Quick Play 1v1 duel against active online players
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[#6E6878]">
              Join the 10-second blitz queue to be matched immediately with an online opponent for a best-of-5 Rock, Paper, Scissors duel. Winner earns the right to assign a challenge dare!
            </p>

            {/* Embedded Functional Matchmaking Controller */}
            <RandomMatchmakingCard />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#B7EEDD] pt-3 text-xs font-medium text-[#6E6878]">
              <span className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#0E8F72]" aria-hidden="true" />
                Server-adjudicated turn timers
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#0E8F72]" aria-hidden="true" />
                10s move clock
              </span>
            </div>
          </div>
        </section>

        {/* Play with friends (lilac) */}
        <section className="b-card b-card-lilac space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white text-[#5B49D6]">
              <Users className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold leading-tight text-[#1E1B24]">
                Play With Friends
              </h3>
              <p className="text-xs leading-snug text-[#6E6878] sm:text-sm">
                Direct challenges, friend lobbies & invites
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-[#6E6878]">
            Challenge friends directly to synchronous duels in your game of choice, or share your personal invite link so new rivals can join your arena.
          </p>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#6E6878]">
              Direct Friend Challenges
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="/play/rps" className={cn("evo-btn evo-btn-primary", FOCUS)}>
                <span aria-hidden="true">✊</span>
                Challenge in RPS
              </Link>
              <Link
                href="/play/chess"
                className={cn(
                  "evo-btn border-2 border-[#EADBC8] bg-[#FFFFFF] text-[#1E1B24] hover:border-[#1E1B24]",
                  FOCUS,
                )}
              >
                <span aria-hidden="true">♟️</span>
                Challenge in Chess
              </Link>
              <Link
                href="/play/hand-cricket"
                className={cn(
                  "evo-btn border-2 border-[#EADBC8] bg-[#FFFFFF] text-[#1E1B24] hover:border-[#1E1B24]",
                  FOCUS,
                )}
              >
                <span aria-hidden="true">🏏</span>
                Challenge in Hand Cricket
              </Link>
              <Link
                href="/play/ludo"
                className={cn(
                  "evo-btn border-2 border-[#EADBC8] bg-[#FFFFFF] text-[#1E1B24] hover:border-[#1E1B24]",
                  FOCUS,
                )}
              >
                <Dices className="h-4 w-4 text-[#E5484D]" aria-hidden="true" />
                Challenge in Ludo
              </Link>
            </div>

            <Link href="/friends" className={cn("evo-btn evo-btn-ghost w-full", FOCUS)}>
              <Users className="h-4 w-4 text-[#FF5A3C]" aria-hidden="true" />
              Find & Add Friends
            </Link>
          </div>

          {/* Personal Invite Link Container */}
          {inviteUrl && (
            <div className="space-y-2.5 rounded-[18px] border-2 border-[#D7D0FF] bg-[#FFFFFF] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#1E1B24]">Your Personal Invite Link</p>
                <span className="text-[11px] font-semibold text-[#6E6878]">Instant Friend Connect</span>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="min-h-[44px] flex-1 select-all truncate rounded-full border-2 border-[#EADBC8] bg-[#FFF6EC] px-4 py-2 font-mono text-xs text-[#1E1B24] focus:outline-none focus:ring-2 focus:ring-[#FF5A3C]"
                  aria-label="Your personal invite URL"
                />
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className={cn(
                    "evo-btn evo-btn-primary evo-btn-sm w-full sm:w-auto shrink-0 min-h-[44px] min-w-[44px] cursor-pointer justify-center",
                    FOCUS,
                  )}
                  title="Copy personal invite link"
                >
                  {copiedInvite ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied!</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Link</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#D7D0FF] pt-3 text-xs font-medium text-[#6E6878]">
            <span className="inline-flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#5B49D6]" aria-hidden="true" />
              Private friend matches & dares
            </span>
            <Link
              href="/how-to-play"
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1 rounded-full px-2 font-bold text-[#C9381F] hover:underline",
                FOCUS,
              )}
            >
              <span>How dares work</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Recent matches as feed posts */}
        <section aria-labelledby="recent-matches-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2
                id="recent-matches-heading"
                className="font-display text-xl font-bold leading-tight text-[#1E1B24]"
              >
                Recent Matches
              </h2>
              <p className="mt-0.5 text-xs text-[#6E6878]">
                Your latest arena duels, head-to-head scores, and match outcomes.
              </p>
            </div>
            {recentMatches.length > 0 && (
              <Link
                href="/history"
                className={cn(
                  "inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-sm font-bold text-[#C9381F] hover:bg-[#FFE4DD]",
                  FOCUS,
                )}
              >
                <span>Full History</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>

          {recentMatches.length > 0 ? (
            <div className="space-y-3">
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
                  <article key={m.id} className="b-card space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={oppAvatar} name={oppName} size="md" className="border-2 border-[#EADBC8]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#1E1B24]">vs {oppName}</p>
                        <p className="text-xs text-[#6E6878]">
                          {isWinner ? "You won this duel" : isDraw ? "A fair draw" : "They took this one"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[#6E6878]">
                        {timeAgo(m.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-[#FFF6EC] px-4 py-3">
                      <p className="font-display text-2xl font-bold text-[#1E1B24]">
                        <span className="sr-only">Score: </span>
                        {userScore} — {oppScore}
                      </p>
                      <span
                        className={cn(
                          "inline-block rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wider",
                          isWinner
                            ? "border-[#B7EEDD] bg-[#E3FAF3] text-[#0E8F72]"
                            : isDraw
                            ? "border-[#EADBC8] bg-[#F5EADC] text-[#6E6878]"
                            : "border-[#F5B9BB] bg-[#FDECEC] text-[#C9383D]",
                        )}
                      >
                        {isWinner ? "VICTORY" : isDraw ? "DRAW" : "DEFEAT"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Encouraging Empty State */
            <div className="b-card p-8 text-center sm:p-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#FFE4DD] text-[#FF5A3C]">
                <Trophy className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="font-display mb-2 text-xl font-bold text-[#1E1B24]">
                No Matches Played Yet
              </h3>
              <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[#6E6878]">
                Your arena battle record and scorecards will be cataloged here. Play an instant match or invite a friend to start your winning streak!
              </p>
              <Link href="/play/rps" className={cn("evo-btn evo-btn-primary", FOCUS)}>
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Start Your First Duel
              </Link>
            </div>
          )}
        </section>

        {/* ── Platform rules ─────────────────────────────────────────────── */}
        <section aria-labelledby="arena-rules-heading">
          <div className="b-card overflow-hidden p-0">
            {/* Mobile Collapsible Header */}
            <button
              type="button"
              onClick={() => setRulesExpanded((prev) => !prev)}
              className="md:hidden flex min-h-[44px] w-full items-center justify-between p-5 text-left text-sm font-bold text-[#1E1B24] transition-colors hover:bg-[#FFF6EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
              aria-expanded={rulesExpanded}
              aria-controls="arena-rules-content"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFE4DD] text-[#FF5A3C]">
                  <Shield className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <span className="block text-base font-bold text-[#1E1B24]">Platform Rules & Guarantees</span>
                  <span className="text-xs font-normal text-[#6E6878]">Synchronous blitz, dare stakes & FIDE rules</span>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-[#FF5A3C] transition-transform duration-200",
                  rulesExpanded && "rotate-180"
                )}
              />
            </button>

            {/* Rules Content */}
            <div
              id="arena-rules-content"
              className={cn(
                "p-5 sm:p-6",
                rulesExpanded ? "block border-t border-[#EADBC8] md:border-t-0" : "hidden md:block"
              )}
            >
              <h2 id="arena-rules-heading" className="sr-only">
                EVOAIQU Arena Features and Rules
              </h2>
              <ol className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFC23D] font-display text-sm font-bold text-[#1E1B24]">1</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E1B24]">Synchronous 10s Blitz</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#6E6878]">
                      Rapid turn-based decision rounds with real-time countdown clocks and instant scoring.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFC23D] font-display text-sm font-bold text-[#1E1B24]">2</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E1B24]">Winner Dares Loser</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#6E6878]">
                      Victors assign an AI or custom dare; the opponent has 24 hours to post their disappearing video story.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFC23D] font-display text-sm font-bold text-[#1E1B24]">3</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E1B24]">Fair Play & FIDE Rules</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#6E6878]">
                      Server-authoritative move validation, FIDE chess adjudication, and strict privacy controls.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </section>
      </div>

      {/* ═════════════ RIGHT RAIL ═════════════ */}
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6" aria-label="Your arena at a glance">
        {/* Streak card */}
        <div className="b-card b-card-sun space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1E1B24]">
            <Flame className="h-4 w-4" aria-hidden="true" />
            Win streak
          </p>
          <p className="font-display text-6xl font-bold leading-none text-[#1E1B24]">{winStreak}</p>
          <p className="text-xs font-semibold text-[#1E1B24]">
            {winStreak > 0 ? "Keep it rolling!" : "Win your next duel to start one."}
          </p>
          <div className="flex items-center justify-around gap-2 rounded-[18px] bg-white px-3 py-2.5 sm:gap-6 sm:px-5 sm:py-3">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6878]">Matches</p>
              <p className="font-display text-xl font-bold leading-none text-[#1E1B24]">{totalMatches}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6878]">Wins</p>
              <p className="font-display text-xl font-bold leading-none text-[#C9381F]">{wins}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6878]">Win Rate</p>
              <p className="font-display text-xl font-bold leading-none text-[#5B49D6]">{winRate}%</p>
            </div>
          </div>
        </div>

        {/* Matchmaking indicator */}
        <a
          href="#arena-quick-play"
          className={cn("b-card b-card-mint flex items-center gap-3", FOCUS)}
        >
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#14C49A] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#14C49A]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-[#1E1B24]">Matchmaking</span>
            <span className="block text-xs text-[#6E6878]">Jump to the live RPS queue</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#6E6878]" aria-hidden="true" />
        </a>

        {/* Friends */}
        <div className="b-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#1E1B24]">Your friends</h2>
            <Link
              href="/friends"
              className={cn("inline-flex min-h-[44px] items-center rounded-full px-2 text-xs font-bold text-[#C9381F] hover:underline", FOCUS)}
            >
              See all
            </Link>
          </div>
          {friends.length > 0 ? (
            <ul className="space-y-2">
              {friends.slice(0, 5).map((f) => (
                <li key={f.friend_id} className="flex items-center gap-2.5">
                  <Avatar src={f.avatar_url} name={f.display_name} size="md" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#1E1B24]">
                    {f.display_name}
                  </span>
                  <Link
                    href="/friends"
                    className={cn("evo-btn evo-btn-primary evo-btn-sm shrink-0", FOCUS)}
                    aria-label={`Play with ${f.display_name}`}
                  >
                    Play
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs leading-relaxed text-[#6E6878]">
              No friends yet. Invite someone and start your first rivalry.
            </p>
          )}
        </div>

        {/* Requests / dares summary */}
        {hasPending && (
          <div className="b-card space-y-2">
            <h2 className="font-display text-lg font-bold text-[#1E1B24]">Needs you</h2>
            {pendingRequestsCount > 0 && (
              <Link
                href="/friends"
                className={cn("flex min-h-[44px] items-center justify-between gap-2 rounded-[18px] bg-[#EEEBFF] px-3.5 py-2 text-sm font-bold text-[#1E1B24]", FOCUS)}
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#5B49D6]" aria-hidden="true" />
                  {pendingRequestsCount} request{pendingRequestsCount > 1 ? "s" : ""}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#6E6878]" aria-hidden="true" />
              </Link>
            )}
            {pendingChallengesCount > 0 && (
              <Link
                href="/challenges"
                className={cn("flex min-h-[44px] items-center justify-between gap-2 rounded-[18px] bg-[#FFE4DD] px-3.5 py-2 text-sm font-bold text-[#1E1B24]", FOCUS)}
              >
                <span className="inline-flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#C9381F]" aria-hidden="true" />
                  {pendingChallengesCount} dare{pendingChallengesCount > 1 ? "s" : ""}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#6E6878]" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {/* EVO-ID */}
        {evoId && (
          <div className="b-card space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#6E6878]">Your EVO-ID</p>
            <div className="flex items-center gap-2 rounded-full bg-[#FFF6EC] py-0.5 pl-4 pr-1">
              <span className="min-w-0 flex-1 truncate font-mono text-sm font-bold text-[#1E1B24]">{evoId}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="min-w-[44px] min-h-[44px] inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full p-2 text-[#6E6878] transition-colors hover:bg-[#FFE4DD] hover:text-[#C9381F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-1"
                title="Copy Evoora ID"
                aria-label={`Copy Evoora ID ${evoId}`}
              >
                {copiedId ? (
                  <Check className="h-4 w-4 text-[#0E8F72]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            {copiedId && (
              <span className="animate-fade-in text-[11px] font-bold text-[#0E8F72]">Copied!</span>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
