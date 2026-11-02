"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  Ban,
  Camera,
  Eye,
  RotateCcw,
  Trash2,
  Video,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Alert, Badge } from "@/components/ui";
import { CATEGORY_META } from "@/lib/challenges";
import type { Challenge, ChallengeStatus } from "@/types/database";
import { VideoRecorderModal } from "@/components/challenges/VideoRecorderModal";
import { WinnerReviewModal } from "@/components/challenges/WinnerReviewModal";

interface MatchChallengeCardProps {
  challenge: Challenge;
  userId: string;
  opponentName: string;
  opponentEvoId?: string;
  onStatusChange?: (updated: Challenge) => void;
}

interface SubmissionData {
  id: string;
  storage_path?: string | null;
  visibility: "private" | "public";
  status: string;
  retry_note?: string | null;
  view_session_status: "unviewed" | "in_progress" | "consumed" | "expired";
  can_view: boolean;
  expires_at: string;
}

export function MatchChallengeCard({
  challenge: initialChallenge,
  userId,
  opponentName,
  opponentEvoId = "EVO-OPPONENT",
  onStatusChange,
}: MatchChallengeCardProps) {
  const { t } = useI18n();

  // Adjust local state when parent props change (React-recommended pattern without effects)
  const [localChallenge, setLocalChallenge] = useState<Challenge>(initialChallenge);
  const [prevPropId, setPrevPropId] = useState(initialChallenge.id);
  const [prevPropStatus, setPrevPropStatus] = useState(initialChallenge.status);

  if (initialChallenge.id !== prevPropId || initialChallenge.status !== prevPropStatus) {
    setPrevPropId(initialChallenge.id);
    setPrevPropStatus(initialChallenge.status);
    setLocalChallenge(initialChallenge);
  }

  const challenge = localChallenge;
  const setChallenge = setLocalChallenge;

  const [submission, setSubmission] = useState<SubmissionData | null>(null);

  const [loadingAction, setLoadingAction] = useState<
    "accept" | "decline" | "skip" | "complete" | "cancel" | "visibility" | "delete" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Perspective calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRole = (challenge as any).role;
  const isWinner = challenge.winner_id === userId || rawRole === "winner";
  const isLoser = challenge.loser_id === userId || rawRole === "loser";

  const isPending = challenge.status === "pending";
  const isAccepted = challenge.status === "accepted";
  const isSubmitted = challenge.status === "submitted";
  const isRetryRequested = challenge.status === "retry_requested";
  const isCompleted = challenge.status === "completed";
  const isDeclined = challenge.status === "declined" || challenge.status === "skipped";
  const isCancelled = challenge.status === "cancelled";

  const catMeta = CATEGORY_META[challenge.category];

  // Load submission info when in submitted or retry state
  const refreshSubmission = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenges/submission?challenge_id=${challenge.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ok && data.has_submission && data.submission) {
        setSubmission(data.submission);
      }
    } catch {
      // Quiet fallback
    }
  }, [challenge.id]);

  useEffect(() => {
    let active = true;
    if (isSubmitted || isRetryRequested || isCompleted) {
      fetch(`/api/challenges/submission?challenge_id=${challenge.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active && data?.ok && data.has_submission && data.submission) {
            setSubmission(data.submission);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [isSubmitted, isRetryRequested, isCompleted, challenge.id]);

  // ── Respond action (Accept / Decline / Skip) ────────────────────────────────
  async function handleResponse(action: "accept" | "decline" | "skip") {
    setLoadingAction(action);
    setError(null);

    try {
      const res = await fetch("/api/challenges/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.id,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update challenge status");
        return;
      }

      const updatedStatus: ChallengeStatus = (data.status ??
        (action === "accept" ? "accepted" : "declined")) as ChallengeStatus;

      const updated: Challenge = data.challenge ?? {
        ...challenge,
        status: updatedStatus,
      };
      setChallenge(updated);
      onStatusChange?.(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update challenge";
      setError(msg);
    } finally {
      setLoadingAction(null);
    }
  }

  // ── Cancel action ───────────────────────────────────────────────────────────
  async function handleCancel() {
    setLoadingAction("cancel");
    setError(null);

    try {
      const res = await fetch("/api/challenges/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to cancel challenge");
        return;
      }

      const updated: Challenge = data.challenge ?? {
        ...challenge,
        status: "cancelled",
      };
      setChallenge(updated);
      onStatusChange?.(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel challenge";
      setError(msg);
    } finally {
      setLoadingAction(null);
    }
  }

  // ── Toggle Story Visibility (Loser only) ───────────────────────────────────
  async function handleToggleVisibility() {
    if (!submission) return;
    const newVisibility = submission.visibility === "private" ? "public" : "private";
    setLoadingAction("visibility");
    setError(null);

    try {
      const res = await fetch(`/api/challenges/submission/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update visibility.");
      }

      setSubmission((prev) => (prev ? { ...prev, visibility: newVisibility } : null));
      setChallenge((prev) => ({ ...prev, visibility: newVisibility }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating visibility.";
      setError(msg);
    } finally {
      setLoadingAction(null);
    }
  }

  // ── Delete Story (Loser only) ───────────────────────────────────────────────
  async function handleDeleteStory() {
    if (!submission) return;
    if (!confirm("Are you sure you want to delete your challenge story?")) return;

    setLoadingAction("delete");
    setError(null);

    try {
      const res = await fetch(`/api/challenges/submission/${submission.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete story.");
      }

      setSubmission(null);
      const updated: Challenge = { ...challenge, status: "accepted" };
      setChallenge(updated);
      onStatusChange?.(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting story.";
      setError(msg);
    } finally {
      setLoadingAction(null);
    }
  }

  // ── Contextual Status Badge ─────────────────────────────────────────────────
  function getStatusBadge() {
    if (isCompleted) {
      return (
        <Badge variant="teal" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t("challenges.completed")}
        </Badge>
      );
    }

    if (isSubmitted) {
      return (
        <Badge variant="teal" className="flex items-center gap-1 bg-[#39DFFF]/15 text-[#39DFFF] border border-[#39DFFF]/30 animate-pulse">
          <Video className="h-3 w-3" />
          Story Submitted
        </Badge>
      );
    }

    if (isRetryRequested) {
      return (
        <Badge variant="coral" className="flex items-center gap-1 bg-[rgba(255,83,112,0.15)] text-[#FF5370] border border-[#FF5370]/30">
          <RotateCcw className="h-3 w-3" />
          Retry Requested
        </Badge>
      );
    }

    if (isAccepted) {
      return (
        <Badge variant="teal" className="flex items-center gap-1 bg-[#39DFFF]/15 text-[#39DFFF] border border-[#39DFFF]/30">
          <CheckCircle2 className="h-3 w-3" />
          {t("challenges.accepted")}
        </Badge>
      );
    }

    if (isDeclined) {
      return (
        <Badge variant="coral" className="flex items-center gap-1 bg-[rgba(255,83,112,0.15)] text-[#FF5370] border border-[#FF5370]/30">
          <XCircle className="h-3 w-3" />
          {t("challenges.declined")}
        </Badge>
      );
    }

    if (isCancelled) {
      return (
        <Badge variant="muted" className="flex items-center gap-1 bg-[#070B25] text-[#8B98B5] border border-[rgba(255,255,255,0.1)]">
          <Ban className="h-3 w-3" />
          {t("challenges.cancelled")}
        </Badge>
      );
    }

    // Pending status: Contextual for sender vs recipient
    if (isLoser) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(255,83,112,0.15)] text-[#FF5370] border border-[#FF5370]/30 animate-pulse">
          <Clock className="h-3 w-3" />
          {t("challenges.invitation_received")}
        </span>
      );
    }

    // Sender or neutral
    return (
      <Badge variant="muted" className="flex items-center gap-1 text-[#8B98B5] bg-[#070B25] border border-[rgba(255,255,255,0.08)]">
        <Clock className="h-3 w-3" />
        {t("challenges.awaiting_response")}
      </Badge>
    );
  }

  return (
    <div className="p-6 sm:p-7 rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" role="img" aria-label={catMeta?.name}>
            {catMeta?.emoji ?? "🎯"}
          </span>
          <span className="font-bold text-[#F5F7FF] text-base sm:text-lg">
            {challenge.title}
          </span>
          <Badge variant="muted" className="text-xs uppercase bg-[#070B25] border border-[rgba(255,255,255,0.1)] text-[#39DFFF]">
            {catMeta?.name ?? challenge.category}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {challenge.visibility === "private" ? (
            <span
              className="inline-flex items-center gap-1 text-xs text-[#39DFFF] bg-[#39DFFF]/15 border border-[#39DFFF]/30 px-2.5 py-0.5 rounded-full font-medium"
              title="Private Story — only visible to winner and accepted friends"
            >
              <Shield className="h-3 w-3" />
              Private Story
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-xs text-[#C084FC] bg-[rgba(139,44,255,0.2)] border border-[#8B2CFF]/40 px-2.5 py-0.5 rounded-full font-medium"
              title="Public Story — visible to everyone"
            >
              <Sparkles className="h-3 w-3" />
              Public Story
            </span>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[#B8C3E0] leading-relaxed">
        {challenge.description}
      </p>

      {/* Instructions */}
      {challenge.instructions && (
        <div className="p-4 rounded-2xl bg-[#070B25] border border-[rgba(255,255,255,0.08)]">
          <p className="text-xs font-semibold text-[#39DFFF] mb-1 flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            {t("challenges.instructions")}:
          </p>
          <p className="text-xs text-[#F5F7FF] leading-normal font-medium">
            {challenge.instructions}
          </p>
        </div>
      )}

      {/* Role notice */}
      <div className="text-xs text-[#8B98B5] flex items-center justify-between pt-1">
        <span>
          {isWinner
            ? `${t("challenges.role_winner")} ${opponentName}`
            : `${t("challenges.role_loser")} ${opponentName}`}
        </span>
        <span className="text-[11px] opacity-75 font-mono">
          {new Date(challenge.created_at).toLocaleDateString()}
        </span>
      </div>

      {error && (
        <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
          {error}
        </Alert>
      )}

      {/* ── RECIPIENT ACTIONS: Invitation Received (Pending) ── */}
      {isLoser && isPending && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              loading={loadingAction === "accept"}
              disabled={loadingAction !== null}
              onClick={() => handleResponse("accept")}
              id="accept-challenge-btn"
              className="font-bold"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {t("challenges.accept")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={loadingAction === "decline" || loadingAction === "skip"}
              disabled={loadingAction !== null}
              onClick={() => handleResponse("decline")}
              className="text-[#B8C3E0] hover:text-[#FF5370] hover:bg-[rgba(255,83,112,0.1)]"
              id="decline-challenge-btn"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              {t("challenges.decline")}
            </Button>
          </div>
          <p className="text-[11px] text-[#8B98B5]">
            {t("challenges.invitation_received_desc")}
          </p>
        </div>
      )}

      {/* ── RECIPIENT ACTIONS: Accepted or Retry Requested -> Record Video ── */}
      {isLoser && (isAccepted || isRetryRequested) && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] space-y-2.5 animate-fade-in">
          {isRetryRequested && submission?.retry_note && (
            <div className="p-3.5 rounded-xl bg-[rgba(255,83,112,0.15)] border border-[rgba(255,83,112,0.3)] text-xs text-[#FF5370] mb-2">
              <strong>Winner Feedback:</strong> {submission.retry_note}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRecordModalOpen(true)}
              className="font-bold"
              id="record-video-story-btn"
            >
              <Camera className="h-4 w-4 mr-1.5" />
              {isRetryRequested ? "Record New Attempt" : "Record Video & Post Story"}
            </Button>
          </div>
          <p className="text-[11px] text-[#39DFFF] font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Videos are published to your 24-hour Story. You alone choose Public or Private visibility.
          </p>
        </div>
      )}

      {/* ── RECIPIENT ACTIONS: Video Submitted (Awaiting Winner Review) ── */}
      {isLoser && isSubmitted && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] space-y-3 bg-[#070B25] p-4 rounded-2xl border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#39DFFF] animate-ping" />
              <span className="text-xs font-bold text-[#F5F7FF]">
                Video Submitted to Story!
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#39DFFF]">
              Awaiting Winner Review
            </span>
          </div>

          <p className="text-xs text-[#B8C3E0]">
            Your video is active in your Story for 24 hours. The winner has been granted one confidential viewing session.
          </p>

          {/* Visibility Controls */}
          {submission && (
            <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#8B98B5]">Visibility:</span>
                <span className="text-[11px] font-bold text-[#39DFFF] uppercase">
                  {submission.visibility}
                </span>
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  disabled={loadingAction === "visibility"}
                  className="text-[11px] text-[#39DFFF] underline hover:text-[#39DFFF]/80 ml-1"
                >
                  Change to {submission.visibility === "private" ? "Public" : "Private"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleDeleteStory}
                disabled={loadingAction === "delete"}
                className="flex items-center gap-1 text-[11px] text-[#FF5370] hover:underline"
              >
                <Trash2 className="w-3 h-3" /> Delete Story
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── WINNER ACTIONS: Video Submitted (Review Modal Trigger) ── */}
      {isWinner && isSubmitted && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] space-y-2.5 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#F5F7FF] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#39DFFF]" />
              {opponentName} submitted their challenge video!
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsReviewModalOpen(true)}
              className="font-bold"
              id="review-challenge-btn"
            >
              <Eye className="h-4 w-4 mr-1.5" /> Review Video (1-Time View)
            </Button>
          </div>
          <p className="text-[11px] text-[#B8C3E0]">
            You have one confidential viewing session. After reviewing, you can approve or request a retry.
          </p>
        </div>
      )}

      {/* ── SENDER STATUS: Pending ── */}
      {isWinner && isPending && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#B8C3E0]">
            {t("challenges.awaiting_response_desc").replace("{name}", opponentName)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            loading={loadingAction === "cancel"}
            disabled={loadingAction !== null}
            onClick={handleCancel}
            className="text-xs text-[#8B98B5] hover:text-[#FF5370]"
            id="cancel-challenge-btn"
          >
            {t("challenges.cancel_action")}
          </Button>
        </div>
      )}

      {/* ── SENDER STATUS: Accepted (Waiting for video) ── */}
      {isWinner && isAccepted && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <p className="text-xs text-[#39DFFF] font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {opponentName} accepted the dare! Waiting for them to record and post their video.
          </p>
        </div>
      )}

      {/* ── SENDER STATUS: Retry Requested ── */}
      {isWinner && isRetryRequested && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <p className="text-xs text-[#FF5370] font-medium flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Retry requested. Waiting for {opponentName} to record a new attempt.
          </p>
        </div>
      )}

      {/* ── COMPLETED BANNER ── */}
      {isCompleted && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <div className="p-3 rounded-2xl bg-[#39DFFF]/15 border border-[#39DFFF]/30 flex items-center gap-2 text-xs font-semibold text-[#39DFFF]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#39DFFF]" />
            <span>
              {isWinner
                ? `Dare verified and approved! You successfully completed this challenge with ${opponentName}.`
                : `Dare approved by ${opponentName}! Your challenge is complete.`}
            </span>
          </div>
        </div>
      )}

      {/* ── DECLINED BANNER ── */}
      {isDeclined && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <p className="text-xs text-[#FF5370] flex items-center gap-1.5">
            <XCircle className="h-4 w-4" />
            {isWinner
              ? `${opponentName} ${t("challenges.declined_desc").toLowerCase()}`
              : t("challenges.declined_desc")}
          </p>
        </div>
      )}

      {/* ── CANCELLED BANNER ── */}
      {isCancelled && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <p className="text-xs text-[#8B98B5] flex items-center gap-1.5">
            <Ban className="h-4 w-4" />
            {t("challenges.cancelled_desc")}
          </p>
        </div>
      )}

      {/* ── Modal Dialogs ── */}
      <VideoRecorderModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        challengeId={challenge.id}
        challengeTitle={challenge.title}
        challengeInstructions={challenge.instructions}
        onSuccess={({ visibility }) => {
          const updated: Challenge = {
            ...challenge,
            status: "submitted",
            visibility: visibility as "private" | "public",
          };
          setChallenge(updated);
          onStatusChange?.(updated);
          void refreshSubmission();
        }}
      />

      <WinnerReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        challengeId={challenge.id}
        challengeTitle={challenge.title}
        loserName={opponentName}
        loserEvoId={opponentEvoId}
        onDecision={({ status }) => {
          const updated: Challenge = {
            ...challenge,
            status: status as ChallengeStatus,
          };
          setChallenge(updated);
          onStatusChange?.(updated);
        }}
      />
    </div>
  );
}
