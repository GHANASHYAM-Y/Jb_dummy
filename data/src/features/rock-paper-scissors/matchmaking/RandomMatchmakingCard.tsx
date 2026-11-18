"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { useI18n } from "@/core/i18n/I18nContext";
import { Button, Alert, Spinner } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import { MatchmakingFloatingIndicator } from "./MatchmakingFloatingIndicator";
import { LobbyHero, heroCtaClass } from "@/shared/game/LobbyChrome";

const QUEUE_TIPS = [
  "Most players open with Rock. Paper is a sneaky first throw.",
  "You get 10 seconds a round. Pick fast, then lock it in.",
  "First to 5 wins. The loser owes a dare.",
  "Switch it up. Players who repeat a throw get read quickly.",
];

interface RandomMatchmakingHero {
  emoji: string;
  eyebrow?: string;
  title: string;
  tagline: string;
  chips?: string[];
}

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
  /** When set, the idle state renders as the lobby hero card */
  hero?: RandomMatchmakingHero;
}

export function RandomMatchmakingCard({
  className,
  onMatched,
  showFloatingIndicator = true,
  hero,
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

  const queueTip = QUEUE_TIPS[Math.floor(elapsedSecs / 6) % QUEUE_TIPS.length];
  const showHero = state === "idle" && hero;

  const content = (
    <>
      {errorMsg && (
        <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />} className="mb-4">
          {errorMsg}
        </Alert>
      )}

      {/* ── Idle State ── */}
      {state === "idle" && hero && (
        <LobbyHero
          color="tangerine"
          emoji={hero.emoji}
          eyebrow={hero.eyebrow}
          title={hero.title}
          tagline={hero.tagline}
          chips={hero.chips}
        >
          <button
            type="button"
            onClick={handleJoin}
            id="play-random-btn"
            className={heroCtaClass}
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            {t("matchmaking.play_random")}
          </button>
        </LobbyHero>
      )}
      {state === "idle" && !hero && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-[#FFC23D] border-2 border-[#E9A912] text-[#1E1B24] flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </span>
              <h3 className="font-display font-bold text-[#1E1B24] text-lg">
                {t("matchmaking.play_random")}
              </h3>
            </div>
            <p className="text-sm text-[#6E6878] max-w-sm">
              {t("matchmaking.play_random_desc")}
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleJoin}
            id="play-random-btn"
            className="w-full sm:w-auto min-h-[44px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2"
          >
            <Play className="h-4 w-4 mr-2 fill-current" />
            {t("matchmaking.play_random")}
          </Button>
        </div>
      )}

      {/* ── Joining State ── */}
      {state === "joining" && (
        <div className="flex items-center justify-center gap-3 py-4">
          <Spinner size="md" className="text-[#FF5A3C]" />
          <span className="text-sm font-semibold text-[#1E1B24]">Connecting to matchmaking...</span>
        </div>
      )}

      {/* ── Searching State (bouncing avatars + timer + tip + Cancel) ── */}
      {state === "searching" && (
        <div className="flex flex-col items-center text-center gap-4 py-4 animate-fade-in">
          <div className="flex items-end justify-center gap-3" aria-hidden="true">
            <span className="w-16 h-16 rounded-full bg-[#FF5A3C] border-[3px] border-[#C9381F] text-white font-display font-bold text-lg flex items-center justify-center animate-bounce [animation-delay:0ms]">
              You
            </span>
            <span className="w-16 h-16 rounded-full bg-[#FFC23D] border-[3px] border-[#E9A912] text-[#1E1B24] font-display font-bold text-2xl flex items-center justify-center animate-bounce [animation-delay:150ms]">
              ?
            </span>
            <span className="w-16 h-16 rounded-full bg-[#8C7BFF] border-[3px] border-[#6A58DB] text-[#1E1B24] font-display font-bold text-2xl flex items-center justify-center animate-bounce [animation-delay:300ms]">
              ?
            </span>
          </div>

          <div>
            <h4 className="font-display font-bold text-[#1E1B24] text-[32px] leading-tight">
              {t("matchmaking.searching")}
            </h4>
            <p className="mt-1 text-sm text-[#6E6878]">
              {t("matchmaking.searching_desc")}
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FFE4DD] border-2 border-[#FF5A3C] text-base font-mono font-bold text-[#C9381F]">
            <Clock className="h-4 w-4" />
            <span>{formatTime(elapsedSecs)}</span>
          </div>

          <div className="w-full max-w-sm rounded-[22px] bg-[#EEEBFF] border-2 border-[#D7D0FF] p-4 text-sm text-[#1E1B24] text-left">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#6A58DB] mb-1">Tip</p>
            <p className="leading-relaxed">{queueTip}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#6E6878] font-medium">
            <Shield className="h-3.5 w-3.5 text-[#FF5A3C]" />
            <span>{t("matchmaking.queue_info")}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/games"
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-[#F5EADC] border-2 border-[#EADBC8] text-sm font-bold text-[#1E1B24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2"
            >
              Keep browsing
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              id="cancel-matchmaking-btn"
              className="min-h-[44px] min-w-[44px] px-5 inline-flex items-center justify-center font-bold text-[#E5484D] hover:bg-[#E5484D]/10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2 border-2 border-[#E5484D]/40"
            >
              <X className="h-4 w-4 mr-1 text-[#E5484D]" />
              {t("matchmaking.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* ── Cancelling State ── */}
      {state === "cancelling" && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-[#6E6878]">
          <Spinner size="sm" className="text-[#FF5A3C]" />
          <span>{t("matchmaking.cancelling")}</span>
        </div>
      )}

      {/* ── Matched State ── */}
      {state === "matched" && (
        <div className="flex items-center justify-between gap-4 py-2 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#14C49A] border-2 border-[#0E9B79] flex items-center justify-center text-[#1E1B24]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-display font-bold text-[#1E1B24] text-lg">
                {t("matchmaking.matched")}
              </h4>
              <p className="text-xs text-[#C9381F] font-semibold">Starting round 1...</p>
            </div>
          </div>

          {matchId && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleGoToMatch(matchId)}
              className="min-h-[44px] px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2"
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
            <h4 className="font-display font-bold text-[#1E1B24] text-lg">
              {t("matchmaking.expired")}
            </h4>
            <p className="text-sm text-[#6E6878]">
              No matching opponents were available in the queue during the 2-minute search.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState("idle")}
              className="min-h-[44px] px-4 font-bold text-[#6E6878] hover:text-[#1E1B24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleJoin}
              className="min-h-[44px] px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2"
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
              <span className="w-8 h-8 rounded-full bg-[#FFC23D] border-2 border-[#E9A912] text-[#1E1B24] flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </span>
              <h4 className="font-display font-bold text-[#1E1B24] text-base sm:text-lg">
                {t("matchmaking.in_active_match")}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-[#6E6878] max-w-sm">
              You cannot queue for a new game while your current match is unfinished.
            </p>
          </div>

          {matchId && (
            <Button
              variant="primary"
              size="md"
              onClick={() => handleGoToMatch(matchId)}
              className="w-full sm:w-auto min-h-[44px] font-bold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2"
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
    </>
  );

  if (showHero) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div
      className={cn(
        "b-card relative overflow-hidden transition-all text-[#1E1B24] p-4 sm:p-6",
        state === "searching" && "border-[#FF5A3C] shadow-[0_4px_0_#C9381F]",
        state === "matched" && "border-[#B7EEDD] bg-[#E3FAF3] shadow-[0_4px_0_#B7EEDD]",
        className
      )}
    >
      {content}
    </div>
  );
}
