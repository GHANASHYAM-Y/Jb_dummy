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
import { Button, Alert, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

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
}

export function RandomMatchmakingCard({ className, onMatched }: RandomMatchmakingCardProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [state, setState] = useState<MatchmakingUIState>("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear timers on unmount
  const stopTimers = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    pollIntervalRef.current = null;
    timerIntervalRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopTimers();
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

  // Poll status while searching
  const startPolling = useCallback(() => {
    stopTimers();

    // Elapsed timer
    setElapsedSecs(0);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSecs((s) => s + 1);
    }, 1000);

    // Status poll
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/matchmaking/status?game_type=rps");
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "matched" && data.match_id) {
          stopTimers();
          setMatchId(data.match_id);
          setState("matched");
          setTimeout(() => {
            handleGoToMatch(data.match_id);
          }, 1200);
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
  }, [stopTimers, handleGoToMatch]);

  // Check initial state on mount (refresh recovery)
  useEffect(() => {
    let ignore = false;
    async function checkExistingStatus() {
      try {
        const res = await fetch("/api/matchmaking/status?game_type=rps");
        if (!res.ok || ignore) return;
        const data = await res.json();

        if (data.status === "searching") {
          setState("searching");
          startPolling();
        } else if (data.status === "matched" && data.match_id) {
          setMatchId(data.match_id);
          setState("matched");
          setTimeout(() => {
            handleGoToMatch(data.match_id);
          }, 800);
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
  }, [startPolling, handleGoToMatch]);

  // Join queue
  const handleJoin = async () => {
    setErrorMsg(null);
    setState("joining");

    try {
      const res = await fetch("/api/matchmaking/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_type: "rps" }),
      });

      const data = await res.json();

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
        setTimeout(() => {
          handleGoToMatch(data.match_id);
        }, 1200);
      } else {
        setState("searching");
        startPolling();
      }
    } catch {
      setErrorMsg(t("matchmaking.load_error"));
      setState("idle");
    }
  };

  // Cancel search
  const handleCancel = async () => {
    setState("cancelling");
    stopTimers();

    try {
      const res = await fetch("/api/matchmaking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_type: "rps" }),
      });

      const data = await res.json();
      if (data.code === "matched" && data.match_id) {
        setMatchId(data.match_id);
        setState("matched");
        setTimeout(() => {
          handleGoToMatch(data.match_id);
        }, 1000);
        return;
      }

      setState("idle");
    } catch {
      setState("idle");
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
        "evo-card p-6 border-[#E2E8E2] bg-white shadow-card relative overflow-hidden transition-all",
        state === "searching" && "border-[#167D78] shadow-md",
        state === "matched" && "border-[#167D78] bg-[#DDF2EB]/30 shadow-md",
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
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#DDF2EB] text-[#167D78]">
                <Zap className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-[#203331] text-base">
                {t("matchmaking.play_random")}
              </h3>
            </div>
            <p className="text-xs text-[#65736F] max-w-sm">
              {t("matchmaking.play_random_desc")}
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleJoin}
            id="play-random-btn"
            className="w-full sm:w-auto"
          >
            <Play className="h-4 w-4 mr-1.5 fill-current" />
            {t("matchmaking.play_random")}
          </Button>
        </div>
      )}

      {/* ── Joining State ── */}
      {state === "joining" && (
        <div className="flex items-center justify-center gap-3 py-4">
          <Spinner size="md" className="text-[#167D78]" />
          <span className="text-sm font-semibold text-[#203331]">Connecting to matchmaking...</span>
        </div>
      )}

      {/* ── Searching State (Radar Animation + Timer + Cancel) ── */}
      {state === "searching" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#167D78] opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#167D78]" />
              </div>
              <div>
                <h4 className="font-bold text-[#203331] text-sm">
                  {t("matchmaking.searching")}
                </h4>
                <p className="text-xs text-[#65736F]">
                  {t("matchmaking.searching_desc")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF1ED] border border-[#E2E8E2] text-xs font-mono font-semibold text-[#65736F]">
              <Clock className="h-3.5 w-3.5 text-[#167D78]" />
              <span>{formatTime(elapsedSecs)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#E2E8E2]">
            <div className="flex items-center gap-1.5 text-[11px] text-[#8E9B97]">
              <Shield className="h-3 w-3 text-[#167D78]" />
              <span>{t("matchmaking.queue_info")}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              id="cancel-matchmaking-btn"
              className="text-[#65736F] hover:text-[#D95F49]"
            >
              <X className="h-4 w-4 mr-1" />
              {t("matchmaking.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* ── Cancelling State ── */}
      {state === "cancelling" && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#65736F]">
          <Spinner size="sm" />
          <span>{t("matchmaking.cancelling")}</span>
        </div>
      )}

      {/* ── Matched State ── */}
      {state === "matched" && (
        <div className="flex items-center justify-between gap-4 py-2 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DDF2EB] flex items-center justify-center text-[#167D78]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#203331] text-sm">
                {t("matchmaking.matched")}
              </h4>
              <p className="text-xs text-[#167D78] font-medium">Starting round 1...</p>
            </div>
          </div>

          {matchId && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleGoToMatch(matchId)}
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
            <h4 className="font-semibold text-[#203331] text-sm">
              {t("matchmaking.expired")}
            </h4>
            <p className="text-xs text-[#65736F]">
              No matching opponents were available in the queue during the 2-minute search.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setState("idle")}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" size="sm" onClick={handleJoin}>
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
              <span className="p-1.5 rounded-lg bg-[#DDF2EB] text-[#167D78]">
                <Shield className="h-4 w-4" />
              </span>
              <h4 className="font-bold text-[#203331] text-sm sm:text-base">
                {t("matchmaking.in_active_match")}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-[#65736F] max-w-sm">
              You cannot queue for a new game while your current match is unfinished.
            </p>
          </div>

          {matchId && (
            <Button
              variant="primary"
              size="md"
              onClick={() => handleGoToMatch(matchId)}
              className="w-full sm:w-auto font-bold shrink-0 shadow-xs"
            >
              {t("matchmaking.resume_match")}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
