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
import { useI18n } from "@/core/i18n/I18nContext";
import { Alert, Spinner } from "@/shared/ui";
import { CATEGORY_META } from "@/features/dare-game/lib/challenges";
import type { Challenge, ChallengeStatus } from "@/core/supabase/database";
import { VideoRecorderModal } from "@/features/dare-game/components/VideoRecorderModal";
import { WinnerReviewModal } from "@/features/dare-game/components/WinnerReviewModal";

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

  // ── Contextual Status Badge (white pill: legible on hot, lilac and plain cards) ──
  const pillBase =
    "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFFFF] border-2 border-[#EADBC8]";
  function getStatusBadge() {
    if (isCompleted) {
      return (
        <span className={`${pillBase} text-[#0B8A6C]`}>
          <CheckCircle2 className="h-3 w-3" />
          {t("challenges.completed")}
        </span>
      );
    }

    if (isSubmitted) {
      return (
        <span className={`${pillBase} text-[#5B49D6]`}>
          <Video className="h-3 w-3" />
          Story Submitted
        </span>
      );
    }

    if (isRetryRequested) {
      return (
        <span className={`${pillBase} text-[#C9381F]`}>
          <RotateCcw className="h-3 w-3" />
          Retry Requested
        </span>
      );
    }

    if (isAccepted) {
      return (
        <span className={`${pillBase} text-[#0B8A6C]`}>
          <CheckCircle2 className="h-3 w-3" />
          {t("challenges.accepted")}
        </span>
      );
    }

    if (isDeclined) {
      return (
        <span className={`${pillBase} text-[#C9381F]`}>
          <XCircle className="h-3 w-3" />
          {t("challenges.declined")}
        </span>
      );
    }

    if (isCancelled) {
      return (
        <span className={`${pillBase} text-[#6E6878]`}>
          <Ban className="h-3 w-3" />
          {t("challenges.cancelled")}
        </span>
      );
    }

    // Pending status: Contextual for sender vs recipient
    if (isLoser) {
      return (
        <span className={`${pillBase} text-[#C9381F]`}>
          <Clock className="h-3 w-3" />
          {t("challenges.invitation_received")}
        </span>
      );
    }

    // Sender or neutral
    return (
      <span className={`${pillBase} text-[#6E6878]`}>
        <Clock className="h-3 w-3" />
        {t("challenges.awaiting_response")}
      </span>
    );
  }

  // B card tone: hot when the dare is owed by the viewer, lilac when a video is
  // awaiting review/submitted, plain otherwise.
  const owed = isLoser && (isPending || isAccepted || isRetryRequested);
  const reviewTone = isSubmitted;
  const cardTone = owed ? "b-card-hot" : reviewTone ? "b-card-lilac" : "";
  const muted = owed ? "text-white/90" : "text-[#6E6878]";
  const strong = owed ? "text-white" : "text-[#1E1B24]";
  const divider = owed ? "border-white/30" : "border-[#EADBC8]";
  const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1B24]";
  const pillBtn =
    "inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 rounded-full text-sm font-bold transition-transform active:translate-y-[2px] disabled:opacity-60 disabled:cursor-not-allowed " +
    focusRing;
  const pillOnHot = `${pillBtn} bg-[#FFFFFF] text-[#C9381F] shadow-[0_4px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)]`;
  const pillGhostOnHot = `${pillBtn} bg-white/20 text-white border-2 border-white/50 hover:bg-white/30`;
  const pillAccent = `${pillBtn} bg-[#FF5A3C] text-white shadow-[0_4px_0_#C9381F] active:shadow-[0_2px_0_#C9381F]`;

  return (
    <div className={`b-card !p-5 sm:!p-6 space-y-4 ${cardTone}`}>
      {/* Header: Fredoka "emoji Category: text" line */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-2xl ${
              owed ? "bg-white/20" : "bg-[#FFFFFF] border-2 border-[#EADBC8]"
            }`}
            role="img"
            aria-label={catMeta?.name}
          >
            {catMeta?.emoji ?? "🎯"}
          </span>
          <div className="min-w-0">
            <h3 className={`font-display font-bold text-lg sm:text-xl leading-tight ${strong}`}>
              {catMeta?.name ?? challenge.category}: {challenge.title}
            </h3>
            <p className={`text-xs font-mono mt-0.5 ${owed ? "text-white/80" : "text-[#6E6878]"}`}>
              {new Date(challenge.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {challenge.visibility === "private" ? (
            <span
              className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold border-2 ${
                owed ? "bg-white/20 text-white border-white/40" : "bg-[#FFF6EC] text-[#C9381F] border-[#EADBC8]"
              }`}
              title="Private Story — only visible to winner and accepted friends"
            >
              <Shield className="h-3 w-3" />
              Private Story
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold border-2 ${
                owed ? "bg-white/20 text-white border-white/40" : "bg-[#EEEBFF] text-[#5B49D6] border-[#D7D0FF]"
              }`}
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
      <p className={`text-sm leading-relaxed ${muted}`}>
        {challenge.description}
      </p>

      {/* Instructions */}
      {challenge.instructions && (
        <div
          className={`p-4 rounded-[18px] border-2 ${
            owed ? "bg-white/15 border-white/30" : "bg-[#FFFFFF] border-[#EADBC8]"
          }`}
        >
          <p className={`text-xs font-bold mb-1 flex items-center gap-1.5 ${owed ? "text-white" : "text-[#C9381F]"}`}>
            <HelpCircle className="h-3.5 w-3.5" />
            {t("challenges.instructions")}:
          </p>
          <p className={`text-sm leading-normal font-medium ${strong}`}>
            {challenge.instructions}
          </p>
        </div>
      )}

      {/* Role notice */}
      <div className={`text-xs flex items-center justify-between pt-1 ${muted}`}>
        <span>
          {isWinner
            ? `${t("challenges.role_winner")} ${opponentName}`
            : `${t("challenges.role_loser")} ${opponentName}`}
        </span>
        <span className="text-[11px] font-mono">
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
        <div className={`pt-3 border-t-2 space-y-2.5 ${divider}`}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleResponse("accept")}
              id="accept-challenge-btn"
              className={pillOnHot}
            >
              {loadingAction === "accept" ? <Spinner size="sm" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("challenges.accept")}
            </button>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleResponse("decline")}
              id="decline-challenge-btn"
              className={pillGhostOnHot}
            >
              {loadingAction === "decline" || loadingAction === "skip" ? (
                <Spinner size="sm" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {t("challenges.decline")}
            </button>
          </div>
          <p className="text-xs text-white/90">
            {t("challenges.invitation_received_desc")}
          </p>
        </div>
      )}

      {/* ── RECIPIENT ACTIONS: Accepted or Retry Requested -> Record Video ── */}
      {isLoser && (isAccepted || isRetryRequested) && (
        <div className={`pt-3 border-t-2 space-y-2.5 animate-fade-in ${divider}`}>
          {isRetryRequested && submission?.retry_note && (
            <div className="p-3.5 rounded-[18px] bg-[#FFFFFF] border-2 border-[#EADBC8] text-sm text-[#C9381F] mb-2">
              <strong>Winner Feedback:</strong> {submission.retry_note}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(true)}
              className={pillOnHot}
              id="record-video-story-btn"
            >
              <Camera className="h-4 w-4" />
              {isRetryRequested ? "Record New Attempt" : "Record Video & Post Story"}
            </button>
          </div>
          <p className="text-xs text-white/90 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Videos are published to your 24-hour Story. You alone choose Public or Private visibility.
          </p>
        </div>
      )}

      {/* ── RECIPIENT ACTIONS: Video Submitted (Awaiting Winner Review) ── */}
      {isLoser && isSubmitted && (
        <div className="space-y-3 bg-[#FFFFFF] p-4 rounded-[18px] border-2 border-[#D7D0FF]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8C7BFF] animate-ping" />
              <span className="text-sm font-bold text-[#1E1B24]">
                Video Submitted to Story!
              </span>
            </div>
            <span className="text-xs font-mono text-[#5B49D6]">
              Awaiting Winner Review
            </span>
          </div>

          <p className="text-sm text-[#6E6878]">
            Your video is active in your Story for 24 hours. The winner has been granted one confidential viewing session.
          </p>

          {/* Visibility Controls */}
          {submission && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-[#EADBC8]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#6E6878]">Visibility:</span>
                <span className="text-xs font-bold text-[#C9381F] uppercase">
                  {submission.visibility}
                </span>
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  disabled={loadingAction === "visibility"}
                  className="text-xs font-bold text-[#C9381F] underline min-h-[44px] px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] rounded-full"
                >
                  Change to {submission.visibility === "private" ? "Public" : "Private"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleDeleteStory}
                disabled={loadingAction === "delete"}
                className="flex items-center gap-1 text-xs font-bold text-[#E5484D] hover:underline min-h-[44px] px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] rounded-full"
              >
                <Trash2 className="w-3 h-3" /> Delete Story
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── WINNER ACTIONS: Video Submitted (Review Modal Trigger) ── */}
      {isWinner && isSubmitted && (
        <div className="pt-3 border-t-2 border-[#D7D0FF] space-y-2.5 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[#1E1B24] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#5B49D6]" />
              {opponentName} submitted their challenge video!
            </div>

            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              className={pillAccent}
              id="review-challenge-btn"
            >
              <Eye className="h-4 w-4" /> Review Video (1-Time View)
            </button>
          </div>
          <p className="text-xs text-[#6E6878]">
            You have one confidential viewing session. After reviewing, you can approve or request a retry.
          </p>
        </div>
      )}

      {/* ── SENDER STATUS: Pending ── */}
      {isWinner && isPending && (
        <div className="pt-3 border-t-2 border-[#EADBC8] flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[#6E6878]">
            {t("challenges.awaiting_response_desc").replace("{name}", opponentName)}
          </p>
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={handleCancel}
            id="cancel-challenge-btn"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-[#F5EADC] text-[#1E1B24] text-sm font-bold hover:bg-[#EADBC8] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
          >
            {loadingAction === "cancel" ? <Spinner size="sm" className="mr-1.5" /> : null}
            {t("challenges.cancel_action")}
          </button>
        </div>
      )}

      {/* ── SENDER STATUS: Accepted (Waiting for video) ── */}
      {isWinner && isAccepted && (
        <div className="pt-3 border-t-2 border-[#EADBC8]">
          <p className="text-sm text-[#0B8A6C] font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {opponentName} accepted the dare! Waiting for them to record and post their video.
          </p>
        </div>
      )}

      {/* ── SENDER STATUS: Retry Requested ── */}
      {isWinner && isRetryRequested && (
        <div className="pt-3 border-t-2 border-[#EADBC8]">
          <p className="text-sm text-[#C9381F] font-semibold flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Retry requested. Waiting for {opponentName} to record a new attempt.
          </p>
        </div>
      )}

      {/* ── COMPLETED BANNER ── */}
      {isCompleted && (
        <div className="pt-3 border-t-2 border-[#EADBC8]">
          <div className="p-3.5 rounded-[18px] bg-[#E3FAF3] border-2 border-[#B7EEDD] flex items-center gap-2 text-sm font-semibold text-[#0B6B53]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
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
        <div className="pt-3 border-t-2 border-[#EADBC8]">
          <p className="text-sm text-[#C9381F] font-semibold flex items-center gap-1.5">
            <XCircle className="h-4 w-4" />
            {isWinner
              ? `${opponentName} ${t("challenges.declined_desc").toLowerCase()}`
              : t("challenges.declined_desc")}
          </p>
        </div>
      )}

      {/* ── CANCELLED BANNER ── */}
      {isCancelled && (
        <div className="pt-3 border-t-2 border-[#EADBC8]">
          <p className="text-sm text-[#6E6878] flex items-center gap-1.5">
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
