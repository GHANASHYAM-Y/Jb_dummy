"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Trophy,
  Shield,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Search,
  ExternalLink,
  Camera,
  Eye,
  Video,
  RotateCcw,
  Globe,
  Lock,
} from "lucide-react";
import { useI18n } from "@/core/i18n/I18nContext";
import { Button, Alert, Spinner, Avatar } from "@/shared/ui";
import {
  CHALLENGE_CATALOG,
  CATEGORY_META,
} from "@/features/dare-game/lib/challenges";
import type {
  Challenge,
  ChallengeCategory,
  ChallengeStatus,
} from "@/core/supabase/database";
import { cn } from "@/shared/lib/utils";
import { VideoRecorderModal } from "@/features/dare-game/components/VideoRecorderModal";
import { WinnerReviewModal } from "@/features/dare-game/components/WinnerReviewModal";

interface ChallengesClientProps {
  userId: string;
}

type TabType = "received" | "sent" | "stories" | "catalog";

interface StoryItem {
  id: string;
  challenge_id: string;
  match_id: string;
  loser_id: string;
  winner_id: string;
  storage_path: string;
  media_type: string;
  duration_seconds: number;
  visibility: "private" | "public";
  status: string;
  created_at: string;
  expires_at: string;
  media_url?: string;
  creator?: {
    id: string;
    display_name: string;
    evoora_id: string;
    avatar_url: string | null;
  };
  challenge?: {
    title: string;
    category: string;
    description: string;
  };
}

export function ChallengesClient({ userId }: ChallengesClientProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>("received");
  const [receivedChallenges, setReceivedChallenges] = useState<Challenge[]>([]);
  const [sentChallenges, setSentChallenges] = useState<Challenge[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & render timestamp for pure calculation
  const [renderTimestamp] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");
  const [catalogSearch, setCatalogSearch] = useState<string>("");

  // Action states
  const [actingChallengeId, setActingChallengeId] = useState<string | null>(null);

  // Modals
  const [recordModalChallenge, setRecordModalChallenge] = useState<Challenge | null>(null);
  const [reviewModalChallenge, setReviewModalChallenge] = useState<Challenge | null>(null);

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges?filter=all");
      if (!res.ok) {
        setError(t("challenges.load_error"));
        return;
      }
      const data = await res.json();
      const all: Challenge[] = data.challenges ?? [];

      setError(null);
      // Support both direct UUID references and role string from get_user_challenges
      setReceivedChallenges(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all.filter((c) => c.loser_id === userId || (c as any).role === "loser")
      );
      setSentChallenges(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all.filter((c) => c.winner_id === userId || (c as any).role === "winner")
      );
    } catch {
      setError(t("challenges.load_error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, t]);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges/stories");
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.stories) {
        setStories(data.stories);
      }
    } catch {
      // Quiet fallback
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchChallenges();
      await fetchStories();
    })();
  }, [fetchChallenges, fetchStories]);

  async function handleResponse(challengeId: string, action: "accept" | "decline" | "skip") {
    setActingChallengeId(challengeId);
    setError(null);

    try {
      const res = await fetch("/api/challenges/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update challenge status");
        return;
      }

      const updatedStatus: ChallengeStatus = (data.status ?? (action === "accept" ? "accepted" : "declined")) as ChallengeStatus;
      setReceivedChallenges((prev) =>
        prev.map((c) =>
          c.id === challengeId
            ? (data.challenge ?? { ...c, status: updatedStatus })
            : c
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update challenge";
      setError(msg);
    } finally {
      setActingChallengeId(null);
    }
  }

  function getStatusBadge(status: ChallengeStatus, role: "recipient" | "sender" = "recipient") {
    // White-based pills read on hot (tangerine), lilac and plain cards alike.
    const base =
      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFFFF] border-2 border-[#EADBC8]";
    switch (status) {
      case "submitted":
        return (
          <span className={cn(base, "text-[#5B49D6]")}>
            <Video className="h-3 w-3" />
            Story Submitted
          </span>
        );
      case "retry_requested":
        return (
          <span className={cn(base, "text-[#C9381F]")}>
            <RotateCcw className="h-3 w-3" />
            Retry Requested
          </span>
        );
      case "accepted":
        return (
          <span className={cn(base, "text-[#0B8A6C]")}>
            <CheckCircle2 className="h-3 w-3" />
            {t("challenges.accepted")}
          </span>
        );
      case "declined":
      case "skipped":
        return (
          <span className={cn(base, "text-[#C9381F]")}>
            <XCircle className="h-3 w-3" />
            {t("challenges.declined")}
          </span>
        );
      case "completed":
        return (
          <span className={cn(base, "text-[#0B8A6C]")}>
            <CheckCircle2 className="h-3 w-3" />
            {t("challenges.completed")}
          </span>
        );
      case "cancelled":
        return (
          <span className={cn(base, "text-[#6E6878]")}>
            <XCircle className="h-3 w-3" />
            {t("challenges.cancelled")}
          </span>
        );
      case "pending":
      default:
        if (role === "recipient") {
          return (
            <span className={cn(base, "text-[#C9381F]")}>
              <Clock className="h-3 w-3" />
              {t("challenges.invitation_received")}
            </span>
          );
        }
        return (
          <span className={cn(base, "text-[#6E6878]")}>
            <Clock className="h-3 w-3" />
            {t("challenges.awaiting_response")}
          </span>
        );
    }
  }

  // Filter lists
  const filteredReceived = receivedChallenges.filter((c) => {
    if (statusFilter === "all") return true;
    return c.status === statusFilter;
  });

  const filteredSent = sentChallenges.filter((c) => {
    if (statusFilter === "all") return true;
    return c.status === statusFilter;
  });

  const filteredCatalog = CHALLENGE_CATALOG.filter((item) => {
    const matchesCat =
      catalogCategory === "all" || item.category === catalogCategory;
    const matchesSearch =
      catalogSearch.trim() === "" ||
      item.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]";
  const pillBase =
    "inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 rounded-full text-sm font-bold transition-transform active:translate-y-[2px] disabled:opacity-60 disabled:cursor-not-allowed " +
    focusRing;
  // One chunky action pill per variant of card
  const pillOnHot = cn(pillBase, "bg-[#FFFFFF] text-[#C9381F] shadow-[0_4px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)]");
  const pillGhostOnHot = cn(pillBase, "bg-white/20 text-white border-2 border-white/50 hover:bg-white/30");
  const pillAccent = cn(pillBase, "bg-[#FF5A3C] text-white shadow-[0_4px_0_#C9381F] active:shadow-[0_2px_0_#C9381F]");

  const tabClass = (active: boolean) =>
    cn(
      "min-h-[44px] px-4 rounded-full text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap",
      focusRing,
      active
        ? "bg-[#FFFFFF] text-[#1E1B24] shadow-[0_2px_0_#EADBC8]"
        : "text-[#6E6878] hover:text-[#1E1B24]",
    );

  const countBubble = "px-2 min-w-[22px] h-[22px] inline-flex items-center justify-center rounded-full text-[11px] bg-[#FF5A3C] text-white font-bold";

  const filterChip = (active: boolean) =>
    cn(
      "min-h-[44px] sm:min-h-[36px] px-4 rounded-full text-sm font-bold capitalize transition-colors border-2 whitespace-nowrap",
      focusRing,
      active
        ? "bg-[#1E1B24] text-white border-[#1E1B24]"
        : "bg-[#FFFFFF] text-[#6E6878] border-[#EADBC8] hover:text-[#1E1B24]",
    );

  const emptyCard = (icon: React.ReactNode, title: string, desc: string, cta: React.ReactNode) => (
    <div className="b-card !p-10 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#FFC23D] border-2 border-[#E9A912] text-[#1E1B24] flex items-center justify-center mx-auto -rotate-6">
        {icon}
      </div>
      <div>
        <h3 className="font-display font-bold text-[#1E1B24] text-xl">{title}</h3>
        <p className="text-sm text-[#6E6878] max-w-md mx-auto mt-1">{desc}</p>
      </div>
      {cta}
    </div>
  );

  const visibilityPill = (challenge: Challenge, onHot: boolean) =>
    challenge.visibility === "private" ? (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold border-2",
          onHot ? "bg-white/20 text-white border-white/40" : "bg-[#FFF6EC] text-[#C9381F] border-[#EADBC8]",
        )}
        title={t("challenges.visibility_private_desc")}
      >
        <Shield className="h-3 w-3" />
        {t("challenges.visibility_private")}
      </span>
    ) : (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold border-2",
          onHot ? "bg-white/20 text-white border-white/40" : "bg-[#EEEBFF] text-[#5B49D6] border-[#D7D0FF]",
        )}
        title={t("challenges.visibility_public_desc")}
      >
        <Sparkles className="h-3 w-3" />
        {t("challenges.visibility_public")}
      </span>
    );

  return (
    <div className="space-y-5">
      {/* ── Pill tabs & Refresh ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-1 bg-[#F5EADC] p-1.5 rounded-full overflow-x-auto max-w-full scrollbar-none"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "received"}
            onClick={() => setActiveTab("received")}
            className={tabClass(activeTab === "received")}
          >
            <span>{t("challenges.tab_received")}</span>
            {receivedChallenges.length > 0 && (
              <span className={countBubble}>{receivedChallenges.length}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sent"}
            onClick={() => setActiveTab("sent")}
            className={tabClass(activeTab === "sent")}
          >
            <span>{t("challenges.tab_sent")}</span>
            {sentChallenges.length > 0 && (
              <span className={countBubble}>{sentChallenges.length}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "stories"}
            onClick={() => {
              setActiveTab("stories");
              void fetchStories();
            }}
            className={tabClass(activeTab === "stories")}
          >
            <Video className="h-4 w-4" />
            <span>Stories (24h)</span>
            {stories.length > 0 && (
              <span className={countBubble}>{stories.length}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "catalog"}
            onClick={() => setActiveTab("catalog")}
            className={tabClass(activeTab === "catalog")}
          >
            <Sparkles className="h-4 w-4" />
            <span>{t("challenges.tab_catalog")}</span>
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRefreshing(true);
            void fetchChallenges();
            void fetchStories();
          }}
          disabled={refreshing || loading}
          className="min-h-[44px] text-[#6E6878] hover:text-[#C9381F]"
        >
          <RefreshCw className={cn("h-4 w-4 mr-1.5", refreshing && "animate-spin")} />
          {t("challenges.refresh")}
        </Button>
      </div>

      {error && (
        <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
          {error}
        </Alert>
      )}

      {/* ── Main Tab Contents ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-[#FF5A3C]" />
        </div>
      ) : activeTab === "received" ? (
        /* ── Needs you (received) ── */
        <div className="space-y-4">
          {receivedChallenges.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[#6E6878] font-bold text-sm mr-1">Status:</span>
              {["all", "pending", "accepted", "submitted", "completed"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={filterChip(statusFilter === st)}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
          {filteredReceived.length === 0 ? (
            emptyCard(
              <Trophy className="h-8 w-8" />,
              t("challenges.empty_received"),
              t("challenges.empty_received_desc"),
              <Link href="/play/rps" className="inline-block mt-2">
                <Button variant="primary" size="md" className="font-bold">
                  {t("challenges.play_now")}
                </Button>
              </Link>,
            )
          ) : (
            <div className="space-y-4">
              {filteredReceived.map((challenge) => {
                const meta = CATEGORY_META[challenge.category];
                const isActing = actingChallengeId === challenge.id;
                const owed = ["pending", "accepted", "retry_requested"].includes(challenge.status);
                const review = challenge.status === "submitted";
                const cardTone = owed ? "b-card-hot" : review ? "b-card-lilac" : "";
                const muted = owed ? "text-white/90" : "text-[#6E6878]";
                const linkTone = owed ? "text-white underline" : "text-[#C9381F] hover:underline";
                return (
                  <article
                    key={challenge.id}
                    className={cn("b-card !p-5 sm:!p-6 space-y-4", cardTone)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={cn(
                            "w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-2xl",
                            owed ? "bg-white/20" : "bg-[#FFFFFF] border-2 border-[#EADBC8]",
                          )}
                          role="img"
                          aria-label={meta?.name}
                        >
                          {meta?.emoji ?? "🎯"}
                        </span>
                        <div className="min-w-0">
                          <h4 className={cn("font-display font-bold text-lg sm:text-xl leading-tight", owed ? "text-white" : "text-[#1E1B24]")}>
                            {meta?.name ?? challenge.category}: {challenge.title}
                          </h4>
                          <p className={cn("text-xs font-mono mt-0.5", owed ? "text-white/80" : "text-[#6E6878]")}>
                            {new Date(challenge.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {visibilityPill(challenge, owed)}
                        {getStatusBadge(challenge.status, "recipient")}
                      </div>
                    </div>

                    <p className={cn("text-sm leading-relaxed", muted)}>
                      {challenge.description}
                    </p>

                    {challenge.instructions && (
                      <div
                        className={cn(
                          "p-4 rounded-[18px] border-2",
                          owed ? "bg-white/15 border-white/30" : "bg-[#FFFFFF] border-[#EADBC8]",
                        )}
                      >
                        <p className={cn("text-xs font-bold mb-1 flex items-center gap-1.5", owed ? "text-white" : "text-[#C9381F]")}>
                          <HelpCircle className="h-3.5 w-3.5" />
                          {t("challenges.instructions")}:
                        </p>
                        <p className={cn("text-sm leading-normal font-medium", owed ? "text-white" : "text-[#1E1B24]")}>
                          {challenge.instructions}
                        </p>
                      </div>
                    )}

                    {/* Pending: accept / decline */}
                    {challenge.status === "pending" && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleResponse(challenge.id, "accept")}
                            id="accept-challenge-btn"
                            className={pillOnHot}
                          >
                            {isActing ? <Spinner size="sm" /> : <CheckCircle2 className="h-4 w-4" />}
                            {t("challenges.accept")}
                          </button>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleResponse(challenge.id, "decline")}
                            id="decline-challenge-btn"
                            className={pillGhostOnHot}
                          >
                            <XCircle className="h-4 w-4" />
                            {t("challenges.decline")}
                          </button>
                        </div>
                        <Link
                          href={`/play/rps/${challenge.match_id}`}
                          className={cn("text-sm font-bold inline-flex items-center gap-1 min-h-[44px]", linkTone)}
                        >
                          <span>View Match</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}

                    {/* Accepted / retry: record video */}
                    {(challenge.status === "accepted" || challenge.status === "retry_requested") && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setRecordModalChallenge(challenge)}
                          className={pillOnHot}
                          id="record-video-btn"
                        >
                          <Camera className="h-4 w-4" />
                          {challenge.status === "retry_requested" ? "Record New Attempt" : "Record Video & Post Story"}
                        </button>
                        <Link
                          href={`/play/rps/${challenge.match_id}`}
                          className={cn("text-sm font-bold inline-flex items-center gap-1 min-h-[44px]", linkTone)}
                        >
                          <span>View Match</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}

                    {/* Submitted: waiting on winner */}
                    {challenge.status === "submitted" && (
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#1E1B24] font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-[#5B49D6]" />
                          Video active on your 24h Story. Awaiting winner review.
                        </span>
                        <Link
                          href={`/play/rps/${challenge.match_id}`}
                          className={cn("text-sm font-bold inline-flex items-center gap-1 min-h-[44px]", linkTone)}
                        >
                          <span>View Match</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "sent" ? (
        /* ── Sent ── */
        <div className="space-y-4">
          {sentChallenges.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[#6E6878] font-bold text-sm mr-1">Status:</span>
              {["all", "pending", "accepted", "submitted", "completed"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={filterChip(statusFilter === st)}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
          {filteredSent.length === 0 ? (
            emptyCard(
              <Sparkles className="h-8 w-8" />,
              t("challenges.empty_sent"),
              t("challenges.empty_sent_desc"),
              <Link href="/play/rps" className="inline-block mt-2">
                <Button variant="coral" size="md" className="font-bold">
                  {t("challenges.play_now")}
                </Button>
              </Link>,
            )
          ) : (
            <div className="space-y-4">
              {filteredSent.map((challenge) => {
                const meta = CATEGORY_META[challenge.category];
                const review = challenge.status === "submitted";
                return (
                  <article
                    key={challenge.id}
                    className={cn("b-card !p-5 sm:!p-6 space-y-4", review && "b-card-lilac")}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="w-12 h-12 shrink-0 rounded-full bg-[#FFFFFF] border-2 border-[#EADBC8] flex items-center justify-center text-2xl"
                          role="img"
                          aria-label={meta?.name}
                        >
                          {meta?.emoji ?? "🎯"}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-display font-bold text-lg sm:text-xl leading-tight text-[#1E1B24]">
                            {meta?.name ?? challenge.category}: {challenge.title}
                          </h4>
                          <p className="text-xs font-mono mt-0.5 text-[#6E6878]">
                            {new Date(challenge.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {visibilityPill(challenge, false)}
                        {getStatusBadge(challenge.status, "sender")}
                      </div>
                    </div>

                    <p className="text-sm text-[#6E6878] leading-relaxed">
                      {challenge.description}
                    </p>

                    {/* Winner action when submitted */}
                    {review && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setReviewModalChallenge(challenge)}
                          className={pillAccent}
                          id="review-submitted-challenge-btn"
                        >
                          <Eye className="h-4 w-4" /> Review Video (1-Time View)
                        </button>
                        <Link
                          href={`/play/rps/${challenge.match_id}`}
                          className="text-sm font-bold text-[#C9381F] hover:underline inline-flex items-center gap-1 min-h-[44px]"
                        >
                          <span>View Match</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}

                    {!review && (
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#6E6878]">
                        <span>
                          Recipient status:{" "}
                          <strong className="text-[#1E1B24] capitalize">
                            {challenge.status}
                          </strong>
                        </span>
                        <Link
                          href={`/play/rps/${challenge.match_id}`}
                          className="text-sm font-bold text-[#C9381F] hover:underline inline-flex items-center gap-1 min-h-[44px]"
                        >
                          <span>View Match</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "stories" ? (
        /* ── Stories Feed Tab (24h Retention) ── */
        stories.length === 0 ? (
          emptyCard(
            <Video className="h-8 w-8" />,
            "No Active Stories",
            "Completed challenges and public dare videos appear here for 24 hours before expiring.",
            null,
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {stories.map((story) => {
              const hoursLeft = Math.max(
                0,
                Math.round((new Date(story.expires_at).getTime() - renderTimestamp) / (1000 * 60 * 60))
              );

              return (
                <article key={story.id} className="b-card !p-5 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="b-story-ring shrink-0">
                          <span className="block rounded-full border-2 border-[#FFFFFF] overflow-hidden">
                            <Avatar
                              src={story.creator?.avatar_url}
                              name={story.creator?.display_name || "Player"}
                              size="sm"
                            />
                          </span>
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1E1B24] truncate">
                            {story.creator?.display_name || "Player"}
                          </p>
                          <p className="text-[11px] text-[#6E6878] font-mono truncate">
                            {story.creator?.evoora_id}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {story.visibility === "public" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#EEEBFF] text-[#5B49D6] border-2 border-[#D7D0FF]">
                            <Globe className="w-3 h-3" /> Public Story
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FFF6EC] text-[#C9381F] border-2 border-[#EADBC8]">
                            <Lock className="w-3 h-3" /> Friends Only
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#1E1B24] bg-[#FFC23D] px-3 py-1 rounded-full font-bold">
                          <Clock className="w-3 h-3" /> {hoursLeft}h left
                        </span>
                      </div>
                    </div>

                    <h4 className="font-display font-bold text-base text-[#1E1B24] mb-1">
                      {story.challenge?.title || "Challenge Dare"}
                    </h4>
                    <p className="text-sm text-[#6E6878] line-clamp-2 mb-3">
                      {story.challenge?.description}
                    </p>

                    <div className="rounded-[22px] overflow-hidden bg-[#0F0D14] aspect-video flex items-center justify-center">
                      {story.media_url ? (
                        <video
                          src={story.media_url}
                          controls
                          playsInline
                          controlsList="nodownload nofullscreen"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Video className="w-8 h-8 text-[#FFC23D] mx-auto mb-1" />
                          <p className="text-sm font-bold text-white">Story Video</p>
                          <p className="text-xs text-white/70">
                            Expires automatically in {hoursLeft} hours.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#6E6878]">
                    <span>24h Ephemeral Story</span>
                    <Link
                      href={`/play/rps/${story.match_id}`}
                      className="text-[#C9381F] font-bold hover:underline inline-flex items-center min-h-[44px]"
                    >
                      View Match
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        /* ── Catalog Tab ── */
        <div className="space-y-5">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6878]" />
              <input
                type="text"
                placeholder={t("challenges.search_placeholder")}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full min-h-[48px] pl-11 pr-4 text-sm rounded-full border-2 border-[#EADBC8] bg-[#FFFFFF] text-[#1E1B24] placeholder:text-[#6E6878] focus:outline-none focus:border-[#FF5A3C] focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setCatalogCategory("all")}
                className={filterChip(catalogCategory === "all")}
              >
                {t("challenges.all_categories")}
              </button>
              {(Object.keys(CATEGORY_META) as ChallengeCategory[]).map((cat) => {
                const meta = CATEGORY_META[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogCategory(cat)}
                    className={cn(filterChip(catalogCategory === cat), "inline-flex items-center gap-1.5 normal-case")}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map((item) => {
              const meta = CATEGORY_META[item.category];
              return (
                <article
                  key={item.id}
                  className="b-card !p-5 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="w-14 h-14 rounded-[18px] bg-[#F5EADC] flex items-center justify-center text-3xl"
                        role="img"
                        aria-label={meta.name}
                      >
                        {item.emoji}
                      </span>
                      <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold bg-[#FFF6EC] border-2 border-[#EADBC8] text-[#C9381F]">
                        {meta.name}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-[#1E1B24] text-base leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-sm text-[#6E6878] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-mono text-[#6E6878]">
                      <Clock className="h-3 w-3" /> {item.durationSecs}s
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#E3FAF3] text-[#0B8A6C] font-bold">Approved Dare</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {recordModalChallenge && (
        <VideoRecorderModal
          isOpen={Boolean(recordModalChallenge)}
          onClose={() => setRecordModalChallenge(null)}
          challengeId={recordModalChallenge.id}
          challengeTitle={recordModalChallenge.title}
          challengeInstructions={recordModalChallenge.instructions}
          onSuccess={() => {
            void fetchChallenges();
            void fetchStories();
          }}
        />
      )}

      {reviewModalChallenge && (
        <WinnerReviewModal
          isOpen={Boolean(reviewModalChallenge)}
          onClose={() => setReviewModalChallenge(null)}
          challengeId={reviewModalChallenge.id}
          challengeTitle={reviewModalChallenge.title}
          loserName="Opponent"
          loserEvoId="EVO-PARTICIPANT"
          onDecision={() => {
            void fetchChallenges();
            void fetchStories();
          }}
        />
      )}
    </div>
  );
}
