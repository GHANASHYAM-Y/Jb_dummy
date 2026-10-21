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
import { useI18n } from "@/contexts/I18nContext";
import { Button, Alert, Badge, Spinner, Avatar } from "@/components/ui";
import {
  CHALLENGE_CATALOG,
  CATEGORY_META,
} from "@/lib/challenges";
import type {
  Challenge,
  ChallengeCategory,
  ChallengeStatus,
} from "@/types/database";
import { cn } from "@/lib/utils";
import { VideoRecorderModal } from "@/components/challenges/VideoRecorderModal";
import { WinnerReviewModal } from "@/components/challenges/WinnerReviewModal";

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
    switch (status) {
      case "submitted":
        return (
          <Badge variant="teal" className="flex items-center gap-1 bg-[#DDF2EB] text-[#167D78] animate-pulse">
            <Video className="h-3 w-3" />
            Story Submitted
          </Badge>
        );
      case "retry_requested":
        return (
          <Badge variant="coral" className="flex items-center gap-1">
            <RotateCcw className="h-3 w-3" />
            Retry Requested
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="teal" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("challenges.accepted")}
          </Badge>
        );
      case "declined":
      case "skipped":
        return (
          <Badge variant="coral" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {t("challenges.declined")}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="teal" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("challenges.completed")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="muted" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {t("challenges.cancelled")}
          </Badge>
        );
      case "pending":
      default:
        if (role === "recipient") {
          return (
            <Badge variant="coral" className="flex items-center gap-1 bg-[#FCE6DE] text-[#D95F49] border border-[#D95F49]/20">
              <Clock className="h-3 w-3" />
              {t("challenges.invitation_received")}
            </Badge>
          );
        }
        return (
          <Badge variant="muted" className="flex items-center gap-1 text-[#65736F] bg-[#EEF1ED]">
            <Clock className="h-3 w-3" />
            {t("challenges.awaiting_response")}
          </Badge>
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

  return (
    <div className="space-y-6">
      {/* ── Top Tabs & Refresh ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8E2] pb-4">
        <div className="flex items-center gap-1 bg-[#EEF1ED] p-1 rounded-xl border border-[#E2E8E2]" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "received"}
            onClick={() => setActiveTab("received")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-2",
              activeTab === "received"
                ? "bg-white text-[#167D78] shadow-xs border border-[#E2E8E2]"
                : "text-[#65736F] hover:text-[#203331] hover:bg-white/50"
            )}
          >
            <span>{t("challenges.tab_received")}</span>
            {receivedChallenges.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-[#DDF2EB] text-[#167D78] font-bold">
                {receivedChallenges.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sent"}
            onClick={() => setActiveTab("sent")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-2",
              activeTab === "sent"
                ? "bg-white text-[#167D78] shadow-xs border border-[#E2E8E2]"
                : "text-[#65736F] hover:text-[#203331] hover:bg-white/50"
            )}
          >
            <span>{t("challenges.tab_sent")}</span>
            {sentChallenges.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-[#DDF2EB] text-[#167D78] font-bold">
                {sentChallenges.length}
              </span>
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
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-2",
              activeTab === "stories"
                ? "bg-white text-[#167D78] shadow-xs border border-[#E2E8E2]"
                : "text-[#65736F] hover:text-[#203331] hover:bg-white/50"
            )}
          >
            <Video className="h-4 w-4" />
            <span>Stories (24h)</span>
            {stories.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-[#FCE6DE] text-[#D95F49] font-bold">
                {stories.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "catalog"}
            onClick={() => setActiveTab("catalog")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-2",
              activeTab === "catalog"
                ? "bg-white text-[#167D78] shadow-xs border border-[#E2E8E2]"
                : "text-[#65736F] hover:text-[#203331] hover:bg-white/50"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>{t("challenges.tab_catalog")}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              void fetchChallenges();
              void fetchStories();
            }}
            disabled={refreshing || loading}
            className="text-xs text-[#65736F] hover:text-[#203331]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-spin")} />
            {t("challenges.refresh")}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
          {error}
        </Alert>
      )}

      {/* ── Main Tab Contents ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-[#167D78]" />
        </div>
      ) : activeTab === "received" ? (
        /* ── Received Tab ── */
        <div className="space-y-4">
          {receivedChallenges.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[#65736F] font-semibold text-xs mr-1">Status:</span>
              {["all", "pending", "accepted", "submitted", "completed"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all",
                    statusFilter === st
                      ? "bg-[#167D78] text-white shadow-xs"
                      : "bg-[#EEF1ED] text-[#65736F] hover:text-[#203331]"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
          {filteredReceived.length === 0 ? (
            <div className="evo-card p-12 text-center space-y-4 bg-white border border-[#E2E8E2] shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-[#DDF2EB] text-[#167D78] flex items-center justify-center mx-auto">
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-[#203331] text-lg">
                  {t("challenges.empty_received")}
                </h3>
                <p className="text-sm text-[#65736F] max-w-md mx-auto mt-1">
                  {t("challenges.empty_received_desc")}
                </p>
              </div>
              <Link href="/play/rps" className="inline-block mt-2">
                <Button variant="primary" size="sm">
                  {t("challenges.play_now")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
            {filteredReceived.map((challenge) => {
              const meta = CATEGORY_META[challenge.category];
              const isActing = actingChallengeId === challenge.id;
              return (
                <div
                  key={challenge.id}
                  className="evo-card p-6 border-[#E2E8E2] bg-white hover:border-[#167D78] shadow-card transition-all space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" role="img" aria-label={meta?.name}>
                        {meta?.emoji ?? "🎯"}
                      </span>
                      <div>
                        <h4 className="font-bold text-[#203331] text-base">
                          {challenge.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="muted" className="text-xs uppercase">
                            {meta?.name ?? challenge.category}
                          </Badge>
                          <span className="text-xs text-[#8E9B97]">
                            {new Date(challenge.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {challenge.visibility === "private" ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-[#167D78] bg-[#DDF2EB] px-2.5 py-0.5 rounded-full font-medium"
                          title={t("challenges.visibility_private_desc")}
                        >
                          <Shield className="h-3 w-3" />
                          {t("challenges.visibility_private")}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-[#D95F49] bg-[#FCE6DE] px-2.5 py-0.5 rounded-full font-medium"
                          title={t("challenges.visibility_public_desc")}
                        >
                          <Sparkles className="h-3 w-3" />
                          {t("challenges.visibility_public")}
                        </span>
                      )}
                      {getStatusBadge(challenge.status, "recipient")}
                    </div>
                  </div>

                  <p className="text-sm text-[#65736F] leading-relaxed">
                    {challenge.description}
                  </p>

                  {challenge.instructions && (
                    <div className="p-3.5 rounded-xl bg-[#F7F8F4] border border-[#E2E8E2]">
                      <p className="text-xs font-semibold text-[#167D78] mb-1 flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {t("challenges.instructions")}:
                      </p>
                      <p className="text-xs text-[#65736F] leading-normal font-medium">
                        {challenge.instructions}
                      </p>
                    </div>
                  )}

                  {/* Actions for Pending */}
                  {challenge.status === "pending" && (
                    <div className="pt-3 border-t border-[#E2E8E2] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="primary"
                          size="sm"
                          loading={isActing}
                          disabled={isActing}
                          onClick={() => handleResponse(challenge.id, "accept")}
                          id="accept-challenge-btn"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          {t("challenges.accept")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={isActing}
                          disabled={isActing}
                          onClick={() => handleResponse(challenge.id, "decline")}
                          className="text-[#65736F] hover:text-[#D95F49] hover:bg-[#FCE6DE]"
                          id="decline-challenge-btn"
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          {t("challenges.decline")}
                        </Button>
                      </div>
                      <Link
                        href={`/play/rps/${challenge.match_id}`}
                        className="text-xs text-[#167D78] hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>View Match</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {/* Actions for Accepted or Retry Requested -> Video Record */}
                  {(challenge.status === "accepted" || challenge.status === "retry_requested") && (
                    <div className="pt-3 border-t border-[#E2E8E2] flex flex-wrap items-center justify-between gap-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setRecordModalChallenge(challenge)}
                        className="bg-[#167D78] hover:bg-[#12635F]"
                        id="record-video-btn"
                      >
                        <Camera className="h-4 w-4 mr-1.5" />
                        {challenge.status === "retry_requested" ? "Record New Attempt" : "Record Video & Post Story"}
                      </Button>
                      <Link
                        href={`/play/rps/${challenge.match_id}`}
                        className="text-xs text-[#167D78] hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>View Match</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {/* Status indicator when Submitted */}
                  {challenge.status === "submitted" && (
                    <div className="pt-3 border-t border-[#E2E8E2] flex items-center justify-between text-xs text-[#167D78] font-medium">
                      <span className="flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-[#167D78]" />
                        Video active on your 24h Story. Awaiting winner review.
                      </span>
                      <Link
                        href={`/play/rps/${challenge.match_id}`}
                        className="text-xs text-[#167D78] hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>View Match</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      ) : activeTab === "sent" ? (
        /* ── Sent Tab ── */
        <div className="space-y-4">
          {sentChallenges.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[#65736F] font-semibold text-xs mr-1">Status:</span>
              {["all", "pending", "accepted", "submitted", "completed"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all",
                    statusFilter === st
                      ? "bg-[#167D78] text-white shadow-xs"
                      : "bg-[#EEF1ED] text-[#65736F] hover:text-[#203331]"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
          {filteredSent.length === 0 ? (
            <div className="evo-card p-12 text-center space-y-4 bg-white border border-[#E2E8E2] shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-[#FCE6DE] text-[#D95F49] flex items-center justify-center mx-auto">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-[#203331] text-lg">
                  {t("challenges.empty_sent")}
                </h3>
                <p className="text-sm text-[#65736F] max-w-md mx-auto mt-1">
                  {t("challenges.empty_sent_desc")}
                </p>
              </div>
              <Link href="/play/rps" className="inline-block mt-2">
                <Button variant="coral" size="sm">
                  {t("challenges.play_now")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
            {filteredSent.map((challenge) => {
              const meta = CATEGORY_META[challenge.category];
              return (
                <div
                  key={challenge.id}
                  className="evo-card p-6 border-[#E2E8E2] bg-white hover:border-[#167D78] shadow-card transition-all space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" role="img" aria-label={meta?.name}>
                        {meta?.emoji ?? "🎯"}
                      </span>
                      <div>
                        <h4 className="font-bold text-[#203331] text-base">
                          {challenge.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="muted" className="text-xs uppercase">
                            {meta?.name ?? challenge.category}
                          </Badge>
                          <span className="text-xs text-[#8E9B97]">
                            {new Date(challenge.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {challenge.visibility === "private" ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-[#167D78] bg-[#DDF2EB] px-2.5 py-0.5 rounded-full font-medium"
                          title={t("challenges.visibility_private_desc")}
                        >
                          <Shield className="h-3 w-3" />
                          {t("challenges.visibility_private")}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-[#D95F49] bg-[#FCE6DE] px-2.5 py-0.5 rounded-full font-medium"
                          title={t("challenges.visibility_public_desc")}
                        >
                          <Sparkles className="h-3 w-3" />
                          {t("challenges.visibility_public")}
                        </span>
                      )}
                      {getStatusBadge(challenge.status, "sender")}
                    </div>
                  </div>

                  <p className="text-sm text-[#65736F] leading-relaxed">
                    {challenge.description}
                  </p>

                  {/* Winner Action when Submitted */}
                  {challenge.status === "submitted" && (
                    <div className="pt-3 border-t border-[#E2E8E2] flex flex-wrap items-center justify-between gap-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setReviewModalChallenge(challenge)}
                        className="bg-[#167D78] hover:bg-[#12635F]"
                        id="review-submitted-challenge-btn"
                      >
                        <Eye className="h-4 w-4 mr-1.5" /> Review Video (1-Time View)
                      </Button>
                      <Link
                        href={`/play/rps/${challenge.match_id}`}
                        className="text-xs text-[#167D78] hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>View Match</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {challenge.status !== "submitted" && (
                    <div className="pt-2 border-t border-[#E2E8E2] flex items-center justify-between text-xs text-[#8E9B97]">
                      <span>
                        Recipient status:{" "}
                        <strong className="text-[#203331] capitalize">
                          {challenge.status}
                        </strong>
                      </span>
                      <Link
                        href={`/play/rps/${challenge.match_id}`}
                        className="text-[#167D78] hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>View Match</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      ) : activeTab === "stories" ? (
        /* ── Stories Feed Tab (24h Retention) ── */
        stories.length === 0 ? (
          <div className="evo-card p-12 text-center space-y-4 bg-white border border-[#E2E8E2] shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-[#DDF2EB] text-[#167D78] flex items-center justify-center mx-auto">
              <Video className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-[#203331] text-lg">No Active Stories</h3>
              <p className="text-sm text-[#65736F] max-w-md mx-auto mt-1">
                Completed challenges and public dare videos appear here for 24 hours before expiring.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {stories.map((story) => {
              const hoursLeft = Math.max(
                0,
                Math.round((new Date(story.expires_at).getTime() - renderTimestamp) / (1000 * 60 * 60))
              );

              return (
                <div
                  key={story.id}
                  className="evo-card p-5 border-[#E2E8E2] bg-white shadow-card space-y-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Author & Visibility */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={story.creator?.avatar_url}
                          name={story.creator?.display_name || "Player"}
                          size="sm"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#203331]">
                            {story.creator?.display_name || "Player"}
                          </p>
                          <p className="text-[10px] text-[#8E9B97] font-mono">
                            {story.creator?.evoora_id}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {story.visibility === "public" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FCE6DE] text-[#D95F49]">
                            <Globe className="w-3 h-3" /> Public Story
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DDF2EB] text-[#167D78]">
                            <Lock className="w-3 h-3" /> Friends Only
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#65736F] bg-[#EEF1ED] px-2 py-0.5 rounded-full font-mono">
                          <Clock className="w-3 h-3 text-[#D95F49]" /> {hoursLeft}h left
                        </span>
                      </div>
                    </div>

                    {/* Challenge title */}
                    <h4 className="font-bold text-sm text-[#203331] mb-1">
                      {story.challenge?.title || "Challenge Dare"}
                    </h4>
                    <p className="text-xs text-[#65736F] line-clamp-2 mb-3">
                      {story.challenge?.description}
                    </p>

                    {/* Video Player or Simulated Frame */}
                    <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-[#E2E8E2]">
                      {story.media_url ? (
                        <video
                          src={story.media_url}
                          controls
                          playsInline
                          controlsList="nodownload nofullscreen"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 text-white">
                          <Video className="w-8 h-8 text-[#167D78] mx-auto mb-1" />
                          <p className="text-xs font-semibold">Story Video</p>
                          <p className="text-[10px] text-white/70">
                            Expires automatically in {hoursLeft} hours.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2E8E2] flex items-center justify-between text-[11px] text-[#8E9B97]">
                    <span>24h Ephemeral Story</span>
                    <Link
                      href={`/play/rps/${story.match_id}`}
                      className="text-[#167D78] hover:underline"
                    >
                      View Match
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── Catalog Tab ── */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCatalogCategory("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  catalogCategory === "all"
                    ? "bg-[#167D78] text-white border-[#167D78] shadow-xs"
                    : "bg-white text-[#65736F] border-[#E2E8E2] hover:text-[#203331] hover:bg-[#F7F8F4]"
                )}
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
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                      catalogCategory === cat
                        ? "bg-[#167D78] text-white border-[#167D78] shadow-xs"
                        : "bg-white text-[#65736F] border-[#E2E8E2] hover:text-[#203331] hover:bg-[#F7F8F4]"
                    )}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8E9B97]" />
              <input
                type="text"
                placeholder={t("challenges.search_placeholder")}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E8E2] bg-white text-[#203331] placeholder-[#8E9B97] focus:outline-none focus:border-[#167D78]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map((item) => {
              const meta = CATEGORY_META[item.category];
              return (
                <div
                  key={item.id}
                  className="evo-card p-5 border-[#E2E8E2] bg-white hover:border-[#167D78] shadow-card transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-3xl" role="img" aria-label={meta.name}>
                        {item.emoji}
                      </span>
                      <Badge variant="muted" className="text-xs uppercase">
                        {meta.name}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-[#203331] text-sm leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#65736F] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E2E8E2] flex items-center justify-between text-xs text-[#8E9B97]">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" /> {item.durationSecs}s
                    </span>
                    <span className="text-[#167D78] font-medium">Approved Dare</span>
                  </div>
                </div>
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
