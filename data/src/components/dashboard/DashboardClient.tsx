"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Gamepad2, Users, History, ChevronRight,
  Copy, Check, Clock, Zap,
  Share2, MessageCircle, Trophy, ArrowRight,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { Button, Avatar } from "@/components/ui";
import type { Profile } from "@/types/database";

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

  return (
    <main className="flex-1 py-6 sm:py-8 bg-[#F7F8F4]">
      <div className="evo-container">

        {/* ── 1. Compact Player Banner ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[#E2E8E2] bg-white p-4 sm:p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            {/* Player Info */}
            <div className="flex items-center gap-3.5">
              <Avatar
                src={profile?.avatar_url}
                name={displayName}
                size="md"
                className="ring-2 ring-[#DDF2EB]"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-bold text-xl sm:text-2xl text-[#203331]">
                    {displayName}
                  </h1>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.22)] text-[11px] font-semibold text-[#167D78]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#167D78] animate-pulse" />
                    Online
                  </span>
                </div>

                {/* Evoora ID */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#65736F]">
                    {t("dashboard.your_id")}:
                  </span>
                  {evoId ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#EEF1ED] border border-[#E2E8E2] text-[#167D78] tracking-wider">
                        {evoId}
                      </span>
                      <button
                        onClick={handleCopyId}
                        className="p-1 rounded hover:bg-[#EEF1ED] text-[#65736F] hover:text-[#203331] transition-colors"
                        title="Copy EVOAIQU ID"
                        aria-label="Copy EVOAIQU ID"
                      >
                        {copiedId ? (
                          <Check className="h-3.5 w-3.5 text-[#167D78]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8E9B97]">ID Generating...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {pendingChallengesCount > 0 && (
                <Link
                  href="/challenges"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.3)] text-[#D95F49] text-xs font-semibold hover:bg-[#FCE6DE]/80 transition-colors"
                >
                  <Trophy className="h-3.5 w-3.5 text-[#D95F49]" />
                  <span>{pendingChallengesCount} Dare{pendingChallengesCount > 1 ? "s" : ""} Pending</span>
                </Link>
              )}
              {pendingRequestsCount > 0 && (
                <Link
                  href="/friends"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.3)] text-[#167D78] text-xs font-semibold hover:bg-[#DDF2EB]/80 transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{pendingRequestsCount} Friend Request{pendingRequestsCount > 1 ? "s" : ""}</span>
                </Link>
              )}
            </div>

          </div>
        </div>

        {/* ── 2. Primary Action Grid: RPS Hero + Primary Invite Link ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">

          {/* Left: RPS Game Feature Card (Prominent "Play Now") */}
          <div className="lg:col-span-7 rounded-2xl border border-[#E2E8E2] bg-white p-6 flex flex-col justify-between shadow-card relative overflow-hidden group hover:border-[#167D78] transition-all">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-[#167D78] text-xs font-bold font-mono">
                  <Zap className="h-3 w-3" /> LIVE MULTIPLAYER
                </span>
                <span className="text-xs text-[#8E9B97] font-medium">First to 5</span>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-13 h-13 rounded-2xl bg-[#DDF2EB] flex items-center justify-center text-[#167D78] shrink-0">
                  <Gamepad2 className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-2xl text-[#203331] mb-1">
                    Rock, Paper, Scissors
                  </h2>
                  <p className="text-[#65736F] text-sm leading-relaxed">
                    Fast-paced rounds with real-time moves. Beat your opponent to claim bragging rights and assign a dare!
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 flex flex-wrap items-center gap-3 pt-4 border-t border-[#E2E8E2] mt-2">
              <Link href="/play/rps">
                <Button variant="primary" size="md" className="font-bold px-6 shadow-sm">
                  Play Now
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/matchmaking">
                <Button variant="secondary" size="md" className="font-semibold">
                  Random Match
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Primary Invite Friends Card (Direct link with Copy & Share) */}
          <div className="lg:col-span-5 rounded-2xl border border-[#E2E8E2] bg-white p-6 flex flex-col justify-between shadow-card">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#DDF2EB] flex items-center justify-center text-[#167D78]">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#203331]">
                    {t("friends.invite_title")}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#167D78] font-bold bg-[#DDF2EB] px-2 py-0.5 rounded-full">
                  INSTANT LINK
                </span>
              </div>

              <p className="text-xs text-[#65736F] mb-4 leading-relaxed">
                {t("friends.invite_desc")}
              </p>

              {/* Link Box */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F7F8F4] border border-[#E2E8E2] mb-3">
                <span className="text-xs font-mono text-[#167D78] truncate flex-1 select-all px-1 font-medium">
                  {loadingInvite ? "Generating link..." : inviteUrl ?? "Link unavailable"}
                </span>
                <button
                  onClick={handleCopyInvite}
                  disabled={!inviteUrl || loadingInvite}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8E2] hover:bg-[#EEF1ED] text-[#203331] text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50 shadow-xs"
                  aria-label="Copy invitation link"
                >
                  {copiedInvite ? (
                    <Check className="h-3.5 w-3.5 text-[#167D78]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-[#65736F]" />
                  )}
                  <span>{copiedInvite ? t("common.copied") : t("friends.copy_link")}</span>
                </button>
              </div>

              {inviteFeedback && (
                <p className="text-xs text-[#167D78] mb-2 font-medium">
                  {inviteFeedback}
                </p>
              )}
            </div>

            {/* Sharing Options */}
            <div className="flex items-center gap-2 pt-3 border-t border-[#E2E8E2]">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-colors",
                  "bg-[#E8F8EE] border border-[rgba(37,211,102,0.3)] text-[#1B8340] hover:bg-[#d6f4df]",
                  !inviteUrl && "pointer-events-none opacity-50",
                )}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{t("friends.share_whatsapp")}</span>
              </a>

              <button
                onClick={handleNativeShare}
                disabled={!inviteUrl || loadingInvite}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#E2E8E2] text-[#203331] text-xs font-semibold hover:bg-[#F7F8F4] transition-colors disabled:opacity-50 shadow-xs"
              >
                <Share2 className="h-3.5 w-3.5 text-[#167D78]" />
                <span>{t("friends.native_share")}</span>
              </button>
            </div>
          </div>

        </div>

        {/* ── 3. Quick Summaries & Recent Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">

          {/* Left Column: Navigation Shortcuts with Real Counts */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">

            {/* Challenges Hub */}
            <Link
              href="/challenges"
              className="p-4 rounded-xl border border-[#E2E8E2] bg-white hover:border-[#CBD4CB] hover:shadow-subtle transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.25)] flex items-center justify-center text-[#D95F49]">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#203331] text-sm">Challenges & Dares</h4>
                  <p className="text-xs text-[#65736F] mt-0.5">
                    {pendingChallengesCount > 0
                      ? `${pendingChallengesCount} pending dare awaiting action`
                      : "View catalog and completed dares"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8E9B97] group-hover:text-[#203331] transition-colors" />
            </Link>

            {/* Match History */}
            <Link
              href="/history"
              className="p-4 rounded-xl border border-[#E2E8E2] bg-white hover:border-[#CBD4CB] hover:shadow-subtle transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78]">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#203331] text-sm">Match History</h4>
                  <p className="text-xs text-[#65736F] mt-0.5">
                    View previous match scores and outcomes
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8E9B97] group-hover:text-[#203331] transition-colors" />
            </Link>

            {/* Friends Hub */}
            <Link
              href="/friends"
              className="p-4 rounded-xl border border-[#E2E8E2] bg-white hover:border-[#CBD4CB] hover:shadow-subtle transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF1ED] border border-[#E2E8E2] flex items-center justify-center text-[#65736F]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#203331] text-sm">Friends List</h4>
                  <p className="text-xs text-[#65736F] mt-0.5">
                    {pendingRequestsCount > 0
                      ? `${pendingRequestsCount} new request waiting`
                      : "Manage friends and invitations"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8E9B97] group-hover:text-[#203331] transition-colors" />
            </Link>

          </div>

          {/* Right Column: Real Recent Matches Activity (or Compact Empty State) */}
          <div className="lg:col-span-7 rounded-2xl border border-[#E2E8E2] bg-white p-5 flex flex-col justify-between shadow-card">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8E2]">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#167D78]" />
                  <h3 className="font-display font-bold text-base text-[#203331]">
                    {t("dashboard.recent")}
                  </h3>
                </div>
                <Link
                  href="/history"
                  className="text-xs text-[#167D78] hover:underline transition-colors flex items-center gap-1 font-semibold"
                >
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {recentMatches.length > 0 ? (
                <div className="flex flex-col gap-2.5">
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
                      <Link
                        key={match.id}
                        href={`/play/rps/${match.id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8F4] hover:bg-white border border-[#E2E8E2] hover:border-[#CBD4CB] hover:shadow-subtle transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar src={opponent?.avatar_url} name={oppName} size="sm" />
                          <div>
                            <span className="text-sm font-semibold text-[#203331] block">
                              vs {oppName}
                            </span>
                            <span className="text-xs text-[#8E9B97]">
                              Rock, Paper, Scissors
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-display font-bold text-sm text-[#203331]">
                            {myScore} - {oppScore}
                          </span>
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-xs font-bold",
                              isWinner
                                ? "bg-[#DDF2EB] text-[#167D78] border border-[rgba(22,125,120,0.25)]"
                                : isDraw
                                ? "bg-[#EEF1ED] text-[#65736F] border border-[#E2E8E2]"
                                : "bg-[#FCE6DE] text-[#D95F49] border border-[rgba(217,95,73,0.25)]",
                            )}
                          >
                            {isWinner ? "Won" : isDraw ? "Draw" : "Lost"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                /* Compact Honest Empty State */
                <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.2)] flex items-center justify-center mb-3">
                    <Gamepad2 className="h-6 w-6 text-[#167D78]" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#203331] mb-1">
                    No matches played yet
                  </h4>
                  <p className="text-xs text-[#65736F] max-w-xs mb-4">
                    {t("dashboard.empty_matches")}
                  </p>
                  <Link href="/play/rps">
                    <Button variant="secondary" size="sm" className="font-medium text-xs">
                      Play your first match
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
