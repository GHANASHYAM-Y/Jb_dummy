"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Clock,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Shield,
  Play,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Alert, Spinner } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import { MatchmakingFloatingIndicator } from "./MatchmakingFloatingIndicator";

type MatchmakingUIState =
  | "idle"
  | "joining"
  | "searching"
  | "cancelling"
  | "matched"
  | "expired"
  | "in_active_match"
  | "error";

interface RandomMatchmakingCardProps {
  className?: string;
  onMatched?: (matchId: string) => void;
  showFloatingIndicator?: boolean;
}

export function RandomMatchmakingCard({
  className,
  onMatched,
  showFloatingIndicator = true,
}: RandomMatchmakingCardProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [state, setState] = useState<MatchmakingUIState>("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers and navigation timeout on unmount
  const stopTimers = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
    pollIntervalRef.current = null;
    timerIntervalRef.current = null;
    navigationTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopTimers();
    };
  }, [stopTimers]);

  // Navigate to match
  const handleGoToMatch = useCallback(
    (id: string) => {
      stopTimers();
      if (onMatched) {
        onMatched(id);
      } else {
        router.push(`/play/rps/${id}`);
      }
    },
    [router, onMatched, stopTimers]
  );

  // Safely schedule navigation timeout with ref cleanup
  const scheduleGoToMatch = useCallback(
    (id: string, delayMs: number) => {
      if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          handleGoToMatch(id);
        }
      }, delayMs);
    },
    [handleGoToMatch]
  );

  // Poll status while searching (single interval guaranteed via stopTimers)
  const startPolling = useCallback(
    (initialSecs = 0) => {
      stopTimers();

      // Elapsed timer
      setElapsedSecs(initialSecs);
      timerIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        setElapsedSecs((s) => s + 1);
      }, 1000);

      // Status poll
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/matchmaking/status?game_type=rps");
          // Discard response if timers were stopped or unmounted while in-flight
          if (!pollIntervalRef.current || !isMountedRef.current) return;
          if (!res.ok) return;
          const data = await res.json();
          if (!pollIntervalRef.current || !isMountedRef.current) return;

          if (data.status === "matched" && data.match_id) {
            stopTimers();
            setMatchId(data.match_id);
            setState("matched");
            scheduleGoToMatch(data.match_id, 1200);
          } else if (data.status === "expired") {
            stopTimers();
            setState("expired");
          } else if (data.status === "in_active_match" && data.match_id) {
            stopTimers();
            setMatchId(data.match_id);
            setState("in_active_match");
          }
        } catch {
          // Quietly retry on transient network hiccup
        }
      }, 2000);
    },
    [stopTimers, scheduleGoToMatch]
  );

  // Check initial state on mount (refresh recovery)
  useEffect(() => {
    let ignore = false;
    async function checkExistingStatus() {
      try {
        const res = await fetch("/api/matchmaking/status?game_type=rps");
        if (!res.ok || ignore || !isMountedRef.current) return;
        const data = await res.json();
        if (ignore || !isMountedRef.current) return;

        if (data.status === "searching") {
          setState("searching");
          const initialSecs = data.created_at
            ? Math.max(0, Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000))
            : 0;
          startPolling(initialSecs);
        } else if (data.status === "matched" && data.match_id) {
          setMatchId(data.match_id);
          setState("matched");
          scheduleGoToMatch(data.match_id, 800);
        } else if (data.status === "in_active_match" && data.match_id) {
          setMatchId(data.match_id);
          setState("in_active_match");
        }
      } catch {
        // Fail quiet on initial mount
      }
    }

    void checkExistingStatus();
    return () => {
      ignore = true;
    };
  }, [startPolling, scheduleGoToMatch]);

  // Reconcile status with authoritative endpoint when cancellation fails ambiguously
  const reconcileStatusAfterFailedCancel = useCallback(async () => {
    try {
      const res = await fetch("/api/matchmaking/status?game_type=rps");
      if (!isMountedRef.current) return;
      if (!res.ok) {
        setErrorMsg("Cancellation failed. You are still in queue, please retry.");
        setState("searching");
        startPolling(elapsedSecs);
        return;
      }

      const data = await res.json();
      if (!isMountedRef.current) return;

      if (data.status === "matched" && data.match_id) {
        stopTimers();
        setMatchId(data.match_id);
        setState("matched");
        scheduleGoToMatch(data.match_id, 1000);
      } else if (data.status === "searching") {
        setErrorMsg("Cancellation was unsuccessful. You are still in queue.");
        setState("searching");
        const initialSecs = data.created_at
          ? Math.max(0, Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000))
          : elapsedSecs;
        startPolling(initialSecs);
      } else if (data.status === "in_active_match" && data.match_id) {
        stopTimers();
        setMatchId(data.match_id);
        setState("in_active_match");
      } else if (data.status === "expired") {
        stopTimers();
        setState("expired");
      } else {
        stopTimers();
        setState("idle");
      }
    } catch {
      if (!isMountedRef.current) return;
      setErrorMsg("Cancellation network error. You may still be in queue, please retry.");
      setState("searching");
      startPolling(elapsedSecs);
    }
  }, [elapsedSecs, startPolling, stopTimers, scheduleGoToMatch]);

  // Join queue (guards against duplicate concurrent clicks)
  const handleJoin = async () => {
    if (state === "joining" || state === "searching") return;
    setErrorMsg(null);
    setState("joining");

    try {
      const res = await fetch("/api/matchmaking/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_type: "rps" }),
      });

      const data = await res.json();
      if (!isMountedRef.current) return;

      if (!res.ok) {
        if (data.code === "already_in_match" && data.match_id) {
          setMatchId(data.match_id);
          setState("in_active_match");
          return;
        }
        if (data.code === "rate_limited") {
          setErrorMsg(t("matchmaking.rate_limited"));
          setState("idle");
          return;
        }
        setErrorMsg(data.error ?? t("matchmaking.load_error"));
        setState("idle");
        return;
      }

      if (data.code === "matched" && data.match_id) {
        setMatchId(data.match_id);
        setState("matched");
        scheduleGoToMatch(data.match_id, 1200);
      } else {
        setState("searching");
        startPolling();
      }
    } catch {
      if (!isMountedRef.current) return;
      setErrorMsg(t("matchmaking.load_error"));
      setState("idle");
    }
  };

  // Cancel search (reconciles on failure, guards against duplicate cancel clicks)
  const handleCancel = async () => {
    if (state === "cancelling" || state === "idle") return;
    setState("cancelling");
    stopTimers();

    try {
      const res = await fetch("/api/matchmaking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_type: "rps" }),
      });

      if (!res.ok) {
        await reconcileStatusAfterFailedCancel();
        return;
      }

      const data = await res.json();
      if (!isMountedRef.current) return;

      if (data.code === "matched" && data.match_id) {
        setMatchId(data.match_id);
        setState("matched");
        scheduleGoToMatch(data.match_id, 1000);
        return;
      }

      if (data.ok === false) {
        await reconcileStatusAfterFailedCancel();
        return;
      }

      setState("idle");
    } catch {
      await reconcileStatusAfterFailedCancel();
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-4 sm:p-6 border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] relative overflow-hidden transition-all text-[#F5F7FF]",
        state === "searching" && "border-[#39DFFF] shadow-[0_0_30px_rgba(57,223,255,0.25)]",
        state === "matched" && "border-[#39DFFF] bg-[rgba(57,223,255,0.1)] shadow-[0_0_30px_rgba(57,223,255,0.3)]",
        className
      )}
    >
      {errorMsg && (
        <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />} className="mb-4">
          {errorMsg}
        </Alert>
      )}

      {/* ── Idle State ── */}
      {state === "idle" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.3)]">
                <Zap className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-[#F5F7FF] text-base">
                {t("matchmaking.play_random")}
              </h3>
            </div>
            <p className="text-xs text-[#B8C3E0] max-w-sm">
              {t("matchmaking.play_random_desc")}
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleJoin}
            id="play-random-btn"
            className="w-full sm:w-auto min-h-[44px] font-bold shadow-[0_0_20px_rgba(49,91,255,0.4)] hover:shadow-[0_0_28px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
          >
            <Play className="h-4 w-4 mr-2 fill-current" />
            {t("matchmaking.play_random")}
          </Button>
        </div>
      )}

      {/* ── Joining State ── */}
      {state === "joining" && (
        <div className="flex items-center justify-center gap-3 py-4">
          <Spinner size="md" className="text-[#39DFFF]" />
          <span className="text-sm font-semibold text-[#F5F7FF]">Connecting to matchmaking...</span>
        </div>
      )}

      {/* ── Searching State (Radar Animation + Timer + Cancel) ── */}
      {state === "searching" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39DFFF] opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#39DFFF] shadow-[0_0_12px_#39DFFF]" />
              </div>
              <div>
                <h4 className="font-bold text-[#F5F7FF] text-sm">
                  {t("matchmaking.searching")}
                </h4>
                <p className="text-xs text-[#52605C] dark:text-[#B8C3E0]">
                  {t("matchmaking.searching_desc")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#070B25] border border-[rgba(57,223,255,0.3)] text-xs font-mono font-semibold text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.2)]">
              <Clock className="h-3.5 w-3.5 text-[#39DFFF]" />
              <span>{formatTime(elapsedSecs)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#1C2758]">
            <div className="flex items-center gap-2 text-xs text-[#52605C] dark:text-[#B8C3E0] font-medium">
              <Shield className="h-3.5 w-3.5 text-[#39DFFF]" />
              <span>{t("matchmaking.queue_info")}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              id="cancel-matchmaking-btn"
              className="min-h-[44px] min-w-[44px] px-3.5 inline-flex items-center justify-center font-bold text-[#FF5370] hover:text-white hover:bg-[#FF5370]/20 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D95F49] focus-visible:ring-offset-2 border border-[#FF5370]/30"
            >
              <X className="h-4 w-4 mr-1 text-[#52605C] dark:text-[#FF5370]" />
              {t("matchmaking.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* ── Cancelling State ── */}
      {state === "cancelling" && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-[#52605C] dark:text-[#B8C3E0]">
          <Spinner size="sm" className="text-[#39DFFF]" />
          <span>{t("matchmaking.cancelling")}</span>
        </div>
      )}

      {/* ── Matched State ── */}
      {state === "matched" && (
        <div className="flex items-center justify-between gap-4 py-2 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#39DFFF]/20 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] shadow-[0_0_16px_rgba(57,223,255,0.4)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#F5F7FF] text-sm">
                {t("matchmaking.matched")}
              </h4>
              <p className="text-xs text-[#39DFFF] font-semibold">Starting round 1...</p>
            </div>
          </div>

          {matchId && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleGoToMatch(matchId)}
              className="min-h-[44px] px-4 font-bold shadow-[0_0_20px_rgba(49,91,255,0.4)] hover:shadow-[0_0_28px_rgba(57,223,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
            >
              Enter Game
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
        </div>
      )}

      {/* ── Expired State ── */}
      {state === "expired" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 animate-fade-in">
          <div className="space-y-0.5">
            <h4 className="font-semibold text-[#F5F7FF] text-sm">
              {t("matchmaking.expired")}
            </h4>
            <p className="text-xs text-[#52605C] dark:text-[#B8C3E0]">
              No matching opponents were available in the queue during the 2-minute search.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState("idle")}
              className="min-h-[44px] px-4 font-bold text-[#B8C3E0] hover:text-[#F5F7FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleJoin}
              className="min-h-[44px] px-4 font-bold shadow-[0_0_20px_rgba(49,91,255,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {t("matchmaking.retry")}
            </Button>
          </div>
        </div>
      )}

      {/* ── Already in Active Match State ── */}
      {state === "in_active_match" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#39DFFF]/20 text-[#39DFFF]">
                <Shield className="h-4 w-4" />
              </span>
              <h4 className="font-bold text-[#F5F7FF] text-sm sm:text-base">
                {t("matchmaking.in_active_match")}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-[#52605C] dark:text-[#B8C3E0] max-w-sm">
              You cannot queue for a new game while your current match is unfinished.
            </p>
          </div>

          {matchId && (
            <Button
              variant="primary"
              size="md"
              onClick={() => handleGoToMatch(matchId)}
              className="w-full sm:w-auto min-h-[44px] font-bold shrink-0 shadow-[0_0_20px_rgba(49,91,255,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2"
            >
              {t("matchmaking.resume_match")}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
        </div>
      )}

      {/* ── Persistent Floating Matchmaking Status Indicator (Active Queue) ── */}
      {showFloatingIndicator && (state === "searching" || state === "cancelling") && (
        <MatchmakingFloatingIndicator
          state={state}
          elapsedSecs={elapsedSecs}
          onCancel={handleCancel}
          onScrollToQueue={() => {
            const el = document.getElementById("arena-quick-play");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      )}
    </div>
  );
}
