"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Lock,
  Play,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  X,
  Eye,
  Clock,
  Info,
} from "lucide-react";
import { Button, Alert, Spinner } from "@/shared/ui";

interface WinnerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  challengeTitle: string;
  loserName: string;
  loserEvoId: string;
  viewerEvoId?: string;
  onDecision: (result: { status: "completed" | "retry_requested" }) => void;
}

export function WinnerReviewModal({
  isOpen,
  onClose,
  challengeId,
  challengeTitle,
  loserName,
  loserEvoId,
  viewerEvoId = "EVO-REVIEWER",
  onDecision,
}: WinnerReviewModalProps) {
  // Session states: "idle" | "starting" | "active" | "consumed" | "expired" | "error"
  const [sessionState, setSessionState] = useState<
    "idle" | "starting" | "active" | "consumed" | "expired" | "error"
  >("idle");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Focus loss & tab switch deterrent warning
  const [focusWarning, setFocusWarning] = useState<boolean>(false);

  // Review decisions
  const [retryNote, setRetryNote] = useState<string>("");
  const [showRetryInput, setShowRetryInput] = useState<boolean>(false);
  const [deciding, setDeciding] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackAckedRef = useRef<boolean>(false);

  // ── 1. Start One-Time Session ───────────────────────────────────────────────
  const handleStartSession = async () => {
    setSessionState("starting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/challenges/submission/view-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          challenge_id: challengeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "already_viewed") {
          setSessionState("consumed");
          setErrorMsg("You have already used your one-time viewing session for this submission.");
        } else if (data.code === "session_expired") {
          setSessionState("expired");
          setErrorMsg("Your viewing window for this submission has expired.");
        } else {
          setSessionState("error");
          setErrorMsg(data.error || "Unable to start viewing session.");
        }
        return;
      }

      setSubmissionId(data.submission_id);
      setSessionToken(data.session_token);
      setMediaUrl(data.media_url);
      setSessionState("active");
    } catch {
      setSessionState("error");
      setErrorMsg("Network error occurred while requesting viewing session. Please check your connection.");
    }
  };

  // ── 2. Acknowledge Playback Start ──────────────────────────────────────────
  const handlePlaybackPlay = useCallback(async () => {
    if (!submissionId || !sessionToken || playbackAckedRef.current) return;
    playbackAckedRef.current = true;

    try {
      await fetch("/api/challenges/submission/view-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ack_playback",
          submission_id: submissionId,
          session_token: sessionToken,
        }),
      });
    } catch {
      // Quiet retry
    }
  }, [submissionId, sessionToken]);

  // ── 3. Consume Session on Video End ────────────────────────────────────────
  const handleVideoEnded = useCallback(async () => {
    if (!submissionId || !sessionToken) return;

    try {
      await fetch("/api/challenges/submission/view-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "finish",
          submission_id: submissionId,
          session_token: sessionToken,
        }),
      });
      setSessionState("consumed");
    } catch {
      setSessionState("consumed");
    }
  }, [submissionId, sessionToken]);

  // ── 4. Screen-Recording & Visibility Deterrent Listeners ────────────────────
  useEffect(() => {
    if (sessionState !== "active") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setFocusWarning(true);
        videoRef.current?.pause();
      }
    };

    const handleWindowBlur = () => {
      setFocusWarning(true);
      videoRef.current?.pause();
    };

    const handleWindowFocus = () => {
      setTimeout(() => setFocusWarning(false), 3000);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [sessionState]);

  // ── 5. Winner Approval / Retry Decision ─────────────────────────────────────
  const handleDecision = async (action: "approve" | "request_retry") => {
    setDeciding(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/challenges/submission/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          action,
          retry_note: action === "request_retry" ? retryNote : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit decision.");
      }

      onDecision({
        status: action === "approve" ? "completed" : "retry_requested",
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting decision.";
      setErrorMsg(msg);
    } finally {
      setDeciding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-review-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B24]/60 animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-[32px] border-2 border-[#EADBC8] shadow-[0_6px_0_#EADBC8] p-6 sm:p-7 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-10 h-10 rounded-full bg-[#8C7BFF] border-2 border-[#6F5EE0] flex items-center justify-center text-white">
                <Eye className="w-4 h-4" />
              </span>
              <h2 id="winner-review-title" className="font-display font-bold text-xl text-[#1E1B24]">
                Review Challenge Video
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#6E6878]">
              Submitted by <strong>{loserName}</strong> ({loserEvoId}) for: <em>{challengeTitle}</em>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-11 h-11 rounded-full bg-[#F5EADC] flex items-center justify-center hover:bg-[#EADBC8] text-[#1E1B24] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <Alert variant="error" className="mb-4">
            {errorMsg}
          </Alert>
        )}

        {/* Focus Loss / Tab Switching Deterrent Alert */}
        {focusWarning && (
          <div className="flex items-center gap-2 p-3 rounded-[18px] bg-[#FFC23D] border-2 border-[#E9A912] text-sm text-[#1E1B24] mb-4 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Playback paused:</strong> Window focus was lost. Please keep focus on this window during your one-time viewing session.
            </span>
          </div>
        )}

        {/* ── Viewport Area ── */}
        <div
          onContextMenu={(e) => e.preventDefault()}
          className="relative rounded-[22px] overflow-hidden bg-[#0F0D14] aspect-4/3 flex flex-col items-center justify-center border-2 border-[#EADBC8] mb-4 select-none"
        >
          {sessionState === "idle" && (
            <div className="p-6 text-center text-white flex flex-col items-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mb-3">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display font-bold text-lg mb-1">One-Time Viewing Session</h3>
              <p className="text-xs text-white/80 leading-relaxed mb-4">
                You are granted exactly <strong>one viewing session</strong> for this submission. Once started, replaying is restricted to protect participant privacy.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={handleStartSession}
                className="min-h-[44px]"
              >
                <Play className="w-4 h-4 mr-1.5" /> Start One-Time View
              </Button>
            </div>
          )}

          {sessionState === "starting" && (
            <div className="p-6 text-center text-white flex flex-col items-center">
              <Spinner size="lg" className="text-white mb-2" />
              <p className="text-xs text-white/80">Securing one-time viewing token...</p>
            </div>
          )}

          {sessionState === "active" && (
            <>
              {mediaUrl ? (
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  controlsList="nodownload nofullscreen noplaybackrate"
                  disablePictureInPicture
                  onPlay={handlePlaybackPlay}
                  onEnded={handleVideoEnded}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-6 text-center text-white flex flex-col items-center">
                  <Play className="w-10 h-10 text-white/60 mb-2" />
                  <p className="text-xs text-white/80">Simulated video stream active for review session.</p>
                  <Button variant="secondary" size="md" onClick={handleVideoEnded} className="mt-3 min-h-[44px]">
                    Finish Viewing
                  </Button>
                </div>
              )}

              {/* Watermark Overlay for Confidential Review */}
              <div className="absolute top-2 left-2 pointer-events-none opacity-40 text-[9px] font-mono text-white tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded">
                REVIEW • {viewerEvoId} • CONFIDENTIAL
              </div>
            </>
          )}

          {sessionState === "consumed" && (
            <div className="p-6 text-center text-white flex flex-col items-center max-w-sm">
              <CheckCircle2 className="w-12 h-12 text-[#14C49A] mb-2" />
              <h3 className="font-display font-bold text-base mb-1">Viewing Session Completed</h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Your one-time authorized viewing session has concluded. You can now approve this challenge or request a retry below.
              </p>
            </div>
          )}

          {sessionState === "expired" && (
            <div className="p-6 text-center text-white flex flex-col items-center max-w-sm">
              <Clock className="w-12 h-12 text-[#FFC23D] mb-2" />
              <h3 className="font-display font-bold text-base mb-1">Session Expired</h3>
              <p className="text-xs text-white/80 leading-relaxed">
                The playback window has expired. You can still approve the dare or request a retry below.
              </p>
            </div>
          )}
        </div>

        {/* ── Privacy Notice & Screenshot Limitations Notice ── */}
        <div className="flex items-start gap-2 p-3 rounded-[18px] bg-[#EEEBFF] border-2 border-[#D7D0FF] text-xs text-[#1E1B24] mb-5">
          <Info className="w-4 h-4 text-[#5B49D6] shrink-0 mt-0.5" />
          <span>
            <strong>Confidentiality Policy:</strong> This video is temporary and expires in 24 hours. Redistribution without consent is forbidden. Note: Standard web technologies cannot reliably prevent all external camera or operating system recording methods.
          </span>
        </div>

        {/* ── Winner Decision Area ── */}
        {showRetryInput ? (
          <div className="border-t-2 border-[#EADBC8] pt-4 mb-4 animate-fade-in">
            <label className="block font-display text-base font-bold text-[#1E1B24] mb-1.5">
              Reason / Feedback for Retry (Optional):
            </label>
            <textarea
              value={retryNote}
              onChange={(e) => setRetryNote(e.target.value)}
              placeholder="e.g., 'Do 5 more seconds of robot dance with sound effects!'"
              className="w-full text-sm text-[#1E1B24] placeholder:text-[#6E6878] p-4 rounded-[18px] border-2 border-[#EADBC8] focus:outline-none focus:border-[#FF5A3C] focus-visible:ring-2 focus-visible:ring-[#FF5A3C] min-h-[84px] mb-3"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => setShowRetryInput(false)} className="min-h-[44px]">
                Back
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDecision("request_retry")}
                disabled={deciding}
                className="min-h-[44px]"
              >
                {deciding ? <Spinner size="sm" /> : "Confirm Retry Request"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t-2 border-[#EADBC8] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-[#6E6878]">
              Ready to submit your decision?
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowRetryInput(true)}
                disabled={deciding}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 min-h-[44px] px-5 rounded-full border-2 border-[#EADBC8] bg-white hover:bg-[#F5EADC] text-sm font-bold text-[#1E1B24] transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#FF5A3C]" /> Request Retry
              </button>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleDecision("approve")}
                disabled={deciding}
                className="flex-1 sm:flex-none min-h-[44px]"
              >
                {deciding ? (
                  <Spinner size="sm" className="text-white" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Challenge
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
