"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Gamepad2, Users, History, ChevronRight,
  Copy, Check, Clock, Zap,
  Share2, MessageCircle, Trophy, ArrowRight,
} from "lucide-react";
import { useI18n } from "@/core/i18n/I18nContext";
import { cn } from "@/shared/lib/utils";
import { Avatar } from "@/shared/ui";
import type { Profile } from "@/core/supabase/database";

interface RecentMatchItem {
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

interface DashboardClientProps {
  user: { id: string; email: string | null };
  profile: Profile | null;
  recentMatches?: RecentMatchItem[];
  pendingChallengesCount?: number;
  pendingRequestsCount?: number;
}

export function DashboardClient({
  user,
  profile,
  recentMatches = [],
  pendingChallengesCount = 0,
  pendingRequestsCount = 0,
}: DashboardClientProps) {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Player";
  const evoId = profile?.evoora_id ?? null;

  // Copy Evoora ID
  const handleCopyId = useCallback(async () => {
    if (!evoId) return;
    try {
      await navigator.clipboard.writeText(evoId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Fallback
    }
  }, [evoId]);

  // Load active invite link
  useEffect(() => {
    let mounted = true;
    async function loadInvite() {
      setLoadingInvite(true);
      try {
        const res = await fetch("/api/friends/invite");
        const json = await res.json();
        if (mounted && json.ok && json.invite_url) {
          setInviteUrl(json.invite_url);
        }
      } catch {
        // Fallback
      } finally {
        if (mounted) setLoadingInvite(false);
      }
    }
    loadInvite();
    return () => {
      mounted = false;
    };
  }, []);

  // Copy invite link
  const handleCopyInvite = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      setInviteFeedback(t("friends.copy_success"));
      setTimeout(() => {
        setCopiedInvite(false);
        setInviteFeedback(null);
      }, 2500);
    } catch {
      setInviteFeedback(t("friends.copy_error"));
    }
  }, [inviteUrl, t]);

  // Native share with fallback
  const handleNativeShare = useCallback(async () => {
    if (!inviteUrl) return;
    const shareData = {
      title: "Connect with me on EVOAIQU",
      text: t("friends.share_text"),
      url: inviteUrl,
    };
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          await handleCopyInvite();
        }
      }
    } else {
      await handleCopyInvite();
    }
  }, [inviteUrl, handleCopyInvite, t]);

  const whatsappHref = inviteUrl
    ? `https://wa.me/?text=${encodeURIComponent(`${t("friends.share_text")}\n${inviteUrl}`)}`
    : "#";

  const statBubbles = [
    { label: "Dares waiting", value: pendingChallengesCount, bg: "bg-[#FFE4DD]", fg: "text-[#C9381F]" },
    { label: "Friend requests", value: pendingRequestsCount, bg: "bg-[#EEEBFF]", fg: "text-[#4B3FC4]" },
    { label: "Recent matches", value: recentMatches.length, bg: "bg-[#E3FAF3]", fg: "text-[#0B7D63]" },
  ];

  const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]";

  return (
    <main className="flex-1 px-4 sm:px-7 py-6 bg-[#FFF6EC]">
      <div className="mx-auto max-w-[968px] grid gap-7 lg:grid-cols-[minmax(0,640px)_300px] lg:justify-center">

        {/* ── Main feed column ── */}
        <div className="space-y-5 min-w-0">

          {/* Player header card */}
          <div className="b-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <Avatar
                src={profile?.avatar_url}
                name={displayName}
                size="lg"
                className="border-4 !border-[#FFF6EC] ring-2 ring-[#EADBC8]"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-semibold text-2xl text-[#1E1B24] truncate">
                    {displayName}
                  </h1>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E3FAF3] border-2 border-[#B7EEDD] text-[11px] font-bold text-[#0B7D63]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#14C49A] animate-pulse" />
                    Online
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-[#6E6878]">
                    {t("dashboard.your_id")}:
                  </span>
                  {evoId ? (
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-full bg-[#F5EADC] border-2 border-[#EADBC8] text-[#C9381F] tracking-wider">
                        {evoId}
                      </span>
                      <button
                        onClick={handleCopyId}
                        className={cn("inline-flex items-center justify-center w-11 h-11 -my-2 rounded-full hover:bg-[#F5EADC] text-[#6E6878] hover:text-[#1E1B24] transition-colors", focusRing)}
                        title="Copy EVOAIQU ID"
                        aria-label="Copy EVOAIQU ID"
                      >
                        {copiedId ? (
                          <Check className="h-4 w-4 text-[#0B7D63]" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8E8798]">ID Generating...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {pendingChallengesCount > 0 && (
                <Link
                  href="/challenges"
                  className={cn("flex items-center gap-1.5 px-4 min-h-[44px] rounded-full bg-[#FF5A3C] text-white text-xs font-bold shadow-[0_3px_0_#C9381F]", focusRing)}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  <span>{pendingChallengesCount} Dare{pendingChallengesCount > 1 ? "s" : ""} Pending</span>
                </Link>
              )}
              {pendingRequestsCount > 0 && (
                <Link
                  href="/friends"
                  className={cn("flex items-center gap-1.5 px-4 min-h-[44px] rounded-full bg-[#EEEBFF] border-2 border-[#D7D0FF] text-[#4B3FC4] text-xs font-bold", focusRing)}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{pendingRequestsCount} Friend Request{pendingRequestsCount > 1 ? "s" : ""}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Stat bubbles */}
          <div className="grid grid-cols-3 gap-3">
            {statBubbles.map((s) => (
              <div key={s.label} className={cn("rounded-[22px] p-4 text-center", s.bg)}>
                <p className={cn("font-display font-semibold text-3xl", s.fg)}>{s.value}</p>
                <p className="text-xs font-semibold text-[#6E6878] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* RPS hero post */}
          <div className="b-card b-card-hot !rounded-[32px] !p-6 relative overflow-hidden">
            <span aria-hidden className="absolute -right-4 -top-4 text-[96px] leading-none rotate-12 select-none">✌️</span>
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 text-white text-xs font-bold">
                  <Zap className="h-3 w-3" /> LIVE MULTIPLAYER
                </span>
                <span className="text-xs text-white font-medium">First to 5</span>
              </div>
              <h2 className="font-display font-semibold text-[28px] leading-tight text-white mb-1 flex items-center gap-2">
                <Gamepad2 className="h-7 w-7" aria-hidden /> Rock, Paper, Scissors
              </h2>
              <p className="text-white text-sm leading-relaxed max-w-md">
                Fast-paced rounds with real-time moves. Beat your opponent to claim bragging rights and assign a dare!
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <Link
                  href="/play/rps"
                  className={cn("inline-flex items-center gap-1 px-6 min-h-[48px] rounded-full bg-white text-[#C9381F] text-sm font-bold shadow-[0_4px_0_#FFC9BC]", focusRing)}
                >
                  Play Now
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/matchmaking"
                  className={cn("inline-flex items-center px-6 min-h-[48px] rounded-full bg-white/25 text-white text-sm font-bold", focusRing)}
                >
                  Random Match
                </Link>
              </div>
            </div>
          </div>

          {/* Recent matches */}
          <div className="b-card !p-4 sm:!p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#FF5A3C]" />
                <h3 className="font-display font-semibold text-lg text-[#1E1B24]">
                  {t("dashboard.recent")}
                </h3>
              </div>
              <Link
                href="/history"
                className={cn("text-sm text-[#C9381F] hover:underline flex items-center gap-1 font-bold min-h-[44px] px-2 rounded-full", focusRing)}
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentMatches.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {recentMatches.map((match) => {
                  const isWinner = match.winner_id === user.id;
                  const isDraw = match.status === "completed" && !match.winner_id;
                  const opponent =
                    match.player1_id === user.id ? match.p2 : match.p1;
                  const oppName = opponent?.display_name ?? "Opponent";
                  const myScore =
                    match.player1_id === user.id
                      ? match.player1_score
                      : match.player2_score;
                  const oppScore =
                    match.player1_id === user.id
                      ? match.player2_score
                      : match.player1_score;

                  return (
                    <li key={match.id}>
                      <Link
                        href={`/play/rps/${match.id}`}
                        className={cn("flex items-center gap-3.5 min-h-[64px] p-3 rounded-[22px] bg-white border-2 border-[#EADBC8] hover:-translate-y-0.5 transition-transform", focusRing)}
                      >
                        <span
                          className={cn(
                            "w-11 h-11 rounded-[14px] flex items-center justify-center font-display font-semibold text-lg shrink-0 border-2",
                            isWinner
                              ? "bg-[#E3FAF3] border-[#B7EEDD] text-[#0B7D63]"
                              : isDraw
                              ? "bg-[#FFF1CC] border-[#FFE29A] text-[#8A5F00]"
                              : "bg-[#F5EADC] border-[#EADBC8] text-[#6E6878]",
                          )}
                          aria-hidden
                        >
                          {isWinner ? "W" : isDraw ? "D" : "L"}
                        </span>
                        <Avatar src={opponent?.avatar_url} name={oppName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-[#1E1B24] block truncate">
                            vs {oppName}
                          </span>
                          <span className="text-xs text-[#6E6878]">
                            {isWinner ? "Won" : isDraw ? "Draw" : "Lost"} · Rock, Paper, Scissors
                          </span>
                        </div>
                        <span className="font-display font-semibold text-xl text-[#1E1B24] shrink-0">
                          {myScore}–{oppScore}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FFE4DD] flex items-center justify-center mb-3">
                  <Gamepad2 className="h-6 w-6 text-[#C9381F]" />
                </div>
                <h4 className="font-display font-semibold text-base text-[#1E1B24] mb-1">
                  No matches played yet
                </h4>
                <p className="text-xs text-[#6E6878] max-w-xs mb-4">
                  {t("dashboard.empty_matches")}
                </p>
                <Link href="/play/rps" className="evo-btn evo-btn-primary">
                  Play your first match
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Right rail ── */}
        <aside className="space-y-5 min-w-0" aria-label="Shortcuts and invites">

          {/* Streak-style card */}
          <div className="b-card b-card-sun !p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1E1B24]">Dares waiting</p>
            <p className="font-display font-semibold text-[56px] leading-none text-[#1E1B24] mt-1">
              {pendingChallengesCount}
            </p>
            <p className="text-sm text-[#1E1B24] mt-1">
              {pendingChallengesCount > 0
                ? "Do not leave your friends hanging!"
                : "All caught up. Start a new dare!"}
            </p>
          </div>

          {/* Invite card */}
          <div className="b-card b-card-lilac !p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#4B3FC4]">
                <Share2 className="h-4 w-4" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#1E1B24]">
                {t("friends.invite_title")}
              </h3>
            </div>
            <p className="text-xs text-[#6E6878] mb-3 leading-relaxed">
              {t("friends.invite_desc")}
            </p>

            <div className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-white border-2 border-[#D7D0FF] mb-3">
              <span className="text-xs font-mono text-[#4B3FC4] truncate flex-1 select-all font-medium">
                {loadingInvite ? "Generating link..." : inviteUrl ?? "Link unavailable"}
              </span>
              <button
                onClick={handleCopyInvite}
                disabled={!inviteUrl || loadingInvite}
                className={cn("px-3.5 min-h-[44px] rounded-full bg-[#1E1B24] text-white text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50", focusRing)}
                aria-label="Copy invitation link"
              >
                {copiedInvite ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedInvite ? t("common.copied") : t("friends.copy_link")}</span>
              </button>
            </div>

            {inviteFeedback && (
              <p className="text-xs text-[#4B3FC4] mb-2 font-semibold" role="status">
                {inviteFeedback}
              </p>
            )}

            <div className="flex items-center gap-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full text-xs font-bold bg-[#14C49A] text-[#0A3D32] shadow-[0_3px_0_#0B7D63]",
                  focusRing,
                  !inviteUrl && "pointer-events-none opacity-50",
                )}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{t("friends.share_whatsapp")}</span>
              </a>

              <button
                onClick={handleNativeShare}
                disabled={!inviteUrl || loadingInvite}
                className={cn("flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full bg-white border-2 border-[#D7D0FF] text-[#1E1B24] text-xs font-bold disabled:opacity-50", focusRing)}
              >
                <Share2 className="h-3.5 w-3.5 text-[#4B3FC4]" />
                <span>{t("friends.native_share")}</span>
              </button>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="b-card !p-3 flex flex-col gap-2">
            {[
              { href: "/challenges", Icon: Trophy, title: "Challenges & Dares", sub: pendingChallengesCount > 0 ? `${pendingChallengesCount} pending dare awaiting action` : "View catalog and completed dares", bg: "bg-[#FFE4DD]", fg: "text-[#C9381F]" },
              { href: "/history", Icon: History, title: "Match History", sub: "View previous match scores and outcomes", bg: "bg-[#E3FAF3]", fg: "text-[#0B7D63]" },
              { href: "/friends", Icon: Users, title: "Friends List", sub: pendingRequestsCount > 0 ? `${pendingRequestsCount} new request waiting` : "Manage friends and invitations", bg: "bg-[#EEEBFF]", fg: "text-[#4B3FC4]" },
            ].map(({ href, Icon, title, sub, bg, fg }) => (
              <Link
                key={href}
                href={href}
                className={cn("flex items-center gap-3 min-h-[56px] p-2.5 rounded-[20px] hover:bg-[#FFF6EC] transition-colors", focusRing)}
              >
                <span className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", bg, fg)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-[#1E1B24]">{title}</span>
                  <span className="block text-xs text-[#6E6878]">{sub}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#8E8798]" />
              </Link>
            ))}
          </div>
        </aside>

      </div>
    </main>
  );
}
