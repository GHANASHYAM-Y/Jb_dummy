"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy, XCircle, Minus, AlertCircle, ArrowLeft,
  RefreshCw, Wifi, WifiOff, Sparkles, Volume2, VolumeX,
  Clock, Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Alert, Avatar, Spinner, Badge } from "@/components/ui";
import {
  roundOutcomeLabel,
  type RpsMove,
  type RoundMove,
  type Round,
  WINS_REQUIRED,
  MOVE_LABEL_EN,
  MOVE_LABEL_TA,
} from "@/lib/rps";
import { cn } from "@/lib/utils";
import type { Challenge } from "@/types/database";
import { ChallengeSelectionModal } from "@/components/challenges/ChallengeSelectionModal";
import { MatchChallengeCard } from "@/components/challenges/MatchChallengeCard";
import { HandGraphic } from "@/components/rps/HandGraphic";
import { RoundTimer } from "@/components/rps/RoundTimer";
import { ArenaDuelStage } from "@/components/rps/ArenaDuelStage";
import { rpsAudio } from "@/components/rps/RpsAudio";
import { RpsConfetti } from "@/components/rps/RpsConfetti";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlayerInfo {
  id: string;
  display_name: string;
  evoora_id: string;
  avatar_url: string | null;
}

interface MatchState {
  ok: boolean;
  match: {
    id: string;
    phase: string;
    game_type: string;
    player1_id: string;
    player2_id: string;
    player1_wins: number;
    player2_wins: number;
    current_round: number;
    target_wins?: number;
    winner_id: string | null;
    is_draw: boolean;
    round_deadline?: string | null;
    started_at: string;
    completed_at: string | null;
  };
  rounds: Round[];
  my_move_this_round: RpsMove | null;
  opponent_has_submitted?: boolean;
  server_now?: string;
}

interface RpsMatchBoardProps {
  matchId: string;
  userId: string;
  player1: PlayerInfo;
  player2: PlayerInfo;
}

// ── RoundHistoryRow ────────────────────────────────────────────────────────────

function RoundHistoryRow({
  round,
  myPerspective,
}: {
  round: Round;
  myPerspective: 1 | 2;
}) {
  const { t, locale } = useI18n();
  const outcome = roundOutcomeLabel(round.result, myPerspective);
  const myMove: RoundMove = myPerspective === 1 ? round.player1_move : round.player2_move;
  const oppMove: RoundMove = myPerspective === 1 ? round.player2_move : round.player1_move;

  const isTimeout = myMove === "timeout" || oppMove === "timeout";
  const labelMap = locale === "ta" ? MOVE_LABEL_TA : MOVE_LABEL_EN;

  return (
    <div className="flex items-center justify-between py-2.5 px-3 sm:px-4 rounded-xl bg-white border border-[#E2E8E2] shadow-xs">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#8E9B97] font-semibold min-w-16">
          {t("rps.round")} {round.round_number}
        </span>
        {isTimeout && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FCE6DE] text-[#D95F49] uppercase">
            <Clock className="w-2.5 h-2.5" /> Timeout
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-sm font-semibold text-[#203331]">
        <div className="flex items-center gap-1.5" title={labelMap[myMove]}>
          <HandGraphic move={myMove} size="sm" />
          <span className="text-xs hidden sm:inline">{labelMap[myMove]}</span>
        </div>
        <span className="text-[#8E9B97] text-xs font-bold">vs</span>
        <div className="flex items-center gap-1.5" title={labelMap[oppMove]}>
          <HandGraphic move={oppMove} size="sm" flip />
          <span className="text-xs hidden sm:inline">{labelMap[oppMove]}</span>
        </div>
      </div>

      <span
        className={cn(
          "text-xs font-bold uppercase tracking-wider min-w-14 text-right",
          outcome === "win" && "text-[#167D78]",
          outcome === "loss" && "text-[#D95F49]",
          outcome === "draw" && "text-[#65736F]"
        )}
      >
        {t(`rps.${outcome}`)}
      </span>
    </div>
  );
}

// ── RpsMatchBoard Main Component ──────────────────────────────────────────────

export function RpsMatchBoard({
  matchId,
  userId,
  player1,
  player2,
}: RpsMatchBoardProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [state, setState] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    "not_found" | "forbidden" | "unauthenticated" | "network" | "server_error" | null
  >(null);

  const [submitting, setSubmitting] = useState(false);
  const [pendingMove, setPendingMove] = useState<RpsMove | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMuted, setIsMuted] = useState(rpsAudio.getMuted());

  const [matchChallenge, setMatchChallenge] = useState<Challenge | null>(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [playAgainLoading, setPlayAgainLoading] = useState(false);
  const [playAgainError, setPlayAgainError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const victoryCelebratedRef = useRef(false);

  const myPerspective: 1 | 2 = state?.match.player1_id === userId ? 1 : 2;
  const me = myPerspective === 1 ? player1 : player2;
  const opp = myPerspective === 1 ? player2 : player1;

  const handlePlayAgain = useCallback(async () => {
    setPlayAgainLoading(true);
    setPlayAgainError(null);
    try {
      const res = await fetch("/api/matchmaking/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_type: "rps" }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "already_in_match" && data.match_id) {
          router.push(`/play/rps/${data.match_id}`);
          return;
        }
        if (data.code === "rate_limited") {
          setPlayAgainError(t("matchmaking.rate_limited") || "Please wait a moment before searching for a new match.");
          return;
        }
        setPlayAgainError(data.error || "Failed to start matchmaking.");
        return;
      }

      if (data.code === "matched" && data.match_id) {
        router.push(`/play/rps/${data.match_id}`);
        return;
      }

      // If placed in searching queue or no opponent yet, navigate to lobby where RandomMatchmakingCard takes over
      if (data.code === "searching" || data.queue_id) {
        router.push("/play/rps");
        return;
      }

      router.push("/play/rps");
    } catch (err) {
      console.error("[rps/play-again] Failed to join matchmaking:", err);
      setPlayAgainError("Network error. Please try again or return to lobby.");
    } finally {
      setPlayAgainLoading(false);
    }
  }, [router, t]);

  // Listen to audio mute state changes
  useEffect(() => {
    return rpsAudio.subscribe((m) => setIsMuted(m));
  }, []);

  // ── Fetch challenge when match completes ────────────────────────────────────
  const fetchChallenge = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenges/match?match_id=${encodeURIComponent(matchId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.challenge) {
        setMatchChallenge(data.challenge);
      } else if (data.ok && data.challenge === null) {
        setMatchChallenge(null);
      }
    } catch {
      // Quiet fallback
    }
  }, [matchId]);

  useEffect(() => {
    let active = true;
    if (!state?.match || state.match.phase !== "completed" || state.match.is_draw) {
      return;
    }

    fetch(`/api/challenges/match?match_id=${encodeURIComponent(matchId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.ok) return;
        if (data.challenge) {
          setMatchChallenge(data.challenge);
        } else if (data.challenge === null) {
          setMatchChallenge(null);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [state?.match, matchId]);

  // ── Polling / fetch state ──────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/rps/state?match_id=${encodeURIComponent(matchId)}`);
      if (!res.ok) {
        let errData: { error?: string; code?: string } = {};
        try {
          errData = await res.json();
        } catch {
          // not json
        }
        const code = errData.code || errData.error;
        if (res.status === 404 || code === "not_found") {
          setErrorType("not_found");
          setError(t("rps.not_found"));
        } else if (res.status === 403 || code === "forbidden") {
          setErrorType("forbidden");
          setError(t("rps.forbidden"));
        } else if (res.status === 401 || code === "unauthenticated") {
          setErrorType("unauthenticated");
          setError("Your session has expired. Please log in again.");
        } else {
          setErrorType("server_error");
          setError(t("rps.load_error"));
        }
        return;
      }
      const data: MatchState = await res.json();
      setState(data);
      setError(null);
      setErrorType(null);
    } catch {
      setErrorType("network");
      setError(t("rps.network_error"));
    } finally {
      setLoading(false);
    }
  }, [matchId, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchState();
  }, [fetchState, refreshKey]);

  // ── Realtime subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`rps-match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        () => {
          void fetchState();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_rounds",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void fetchState();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_moves",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void fetchState();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenges",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void fetchChallenge();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnected(false);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, supabase, fetchState, fetchChallenge]);

  // ── Polling fallback ────────────────────────────────────────────────────────
  useEffect(() => {
    if (state?.match.phase !== "completed") {
      const interval = connected ? 3500 : 2000;
      pollRef.current = setInterval(() => {
        void fetchState();
      }, interval);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }

    if (state?.match.phase === "completed" && !state.match.is_draw) {
      const isUnresolved =
        !matchChallenge ||
        matchChallenge.status === "pending" ||
        matchChallenge.status === "accepted";

      if (isUnresolved) {
        const interval = connected ? 4000 : 2500;
        const challengePoll = setInterval(() => {
          void fetchChallenge();
        }, interval);

        return () => {
          clearInterval(challengePoll);
        };
      }
    }
  }, [connected, state?.match.phase, state?.match.is_draw, matchChallenge, fetchState, fetchChallenge]);

  // ── Submit move ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!pendingMove || submitting) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch("/api/rps/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, move: pendingMove }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitMsg(data.error ?? data.message ?? t("common.error"));
      } else {
        void fetchState();
      }
    } catch {
      setSubmitMsg(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }, [pendingMove, submitting, matchId, t, fetchState]);

  // ── Timeout expiration resolution ───────────────────────────────────────────
  const handleTimeout = useCallback(async () => {
    try {
      await fetch("/api/rps/timeout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
      });
      void fetchState();
    } catch {
      // Quiet retry on next poll
    }
  }, [matchId, fetchState]);

  // ── Victory Celebration trigger ──
  useEffect(() => {
    if (state?.match && state.match.phase === "completed" && !victoryCelebratedRef.current) {
      victoryCelebratedRef.current = true;
      if (state.match.winner_id === userId) {
        rpsAudio.playMatchVictory();
      }
    }
  }, [state?.match, userId]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size="lg" className="text-[#167D78]" />
        <p className="text-sm font-medium text-[#65736F]">{t("rps.loading")}</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !state) {
    const errorTitle =
      errorType === "not_found"
        ? t("rps.not_found")
        : errorType === "forbidden"
        ? t("rps.forbidden")
        : errorType === "network"
        ? "Connection Issue"
        : "Failed to Load Game";

    return (
      <div className="evo-card p-8 bg-white border border-[#E2E8E2] text-center shadow-card space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.25)] flex items-center justify-center text-[#D95F49] mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-[#203331] mb-1.5">
            {errorTitle}
          </h2>
          <p className="text-[#65736F] text-sm leading-relaxed">
            {error ?? t("rps.load_error")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setLoading(true);
              setError(null);
              setErrorType(null);
              void fetchState();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            {t("common.retry") || "Retry"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.push("/play/rps")}
          >
            {t("rps.back_to_lobby") || "Back to RPS Lobby"}
          </Button>
        </div>
      </div>
    );
  }

  const { match, rounds, my_move_this_round, opponent_has_submitted, server_now } = state;
  const isCompleted = match.phase === "completed";
  const myWins = myPerspective === 1 ? match.player1_wins : match.player2_wins;
  const oppWins = myPerspective === 1 ? match.player2_wins : match.player1_wins;
  const amWinner = match.winner_id === userId;
  const isMatchDraw = match.is_draw;
  const hasSubmitted = my_move_this_round !== null;
  const targetWins = match.target_wins || WINS_REQUIRED; // 5

  const latestResolvedRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* ── Confetti for match victory ── */}
      <RpsConfetti active={isCompleted && amWinner} />

      {/* ── Match Format Header Bar ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/play/rps"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#65736F] hover:text-[#203331] bg-white border border-[#E2E8E2] px-2.5 py-1.5 rounded-xl shadow-xs hover:border-[#167D78] transition-colors"
            aria-label="Exit match to RPS lobby"
            id="exit-match-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Exit Arena
          </Link>
          <span className="px-3 py-1 rounded-full bg-[#167D78] text-white text-xs font-black font-mono tracking-wider uppercase shadow-xs">
            FIRST TO 5
          </span>
          <span className="text-xs text-[#65736F] font-semibold hidden sm:inline">
            Round {match.current_round}
          </span>
        </div>

        {/* Action Controls: Sound Mute & Connection Status */}
        <div className="flex items-center gap-2">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              const newMuted = rpsAudio.toggleMute();
              setIsMuted(newMuted);
            }}
            className="p-1.5 rounded-xl border border-[#E2E8E2] text-[#65736F] hover:text-[#203331] hover:border-[#167D78] bg-white shadow-xs transition-colors cursor-pointer select-none"
            aria-label={isMuted ? "Unmute game sound effects" : "Mute game sound effects"}
            title={isMuted ? "Sound: Muted (Click to Unmute)" : "Sound: On (Click to Mute)"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#8E9B97]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#167D78]" />
            )}
          </button>

          {/* Realtime Status Pill */}
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold shrink-0 bg-white border border-[#E2E8E2] px-2.5 py-1 rounded-xl shadow-xs",
              connected ? "text-[#167D78]" : "text-[#D95F49]"
            )}
          >
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("rps.connected")}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("rps.polling_fallback")}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── Score Arena Header: Player vs Player with 5 Win Pips ── */}
      <div className="evo-card p-5 sm:p-6 bg-white border border-[#E2E8E2] shadow-card">
        <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">
          {/* Player 1 (You) */}
          <div className="flex flex-col items-center gap-1.5">
            <Avatar
              src={me.avatar_url}
              name={me.display_name}
              size="lg"
              className="ring-2 ring-[#DDF2EB]"
            />
            <p className="font-bold text-[#203331] text-sm text-center truncate max-w-[6.5rem]">
              {me.display_name}
            </p>
            <p className="text-[#167D78] text-xs font-bold">{t("rps.you")}</p>
          </div>

          {/* Center Score & First-to-5 Progress */}
          <div className="text-center flex flex-col items-center">
            <div className="text-4xl sm:text-5xl font-black font-display text-[#203331] tracking-tight">
              {myWins} <span className="text-[#8E9B97] font-normal">:</span> {oppWins}
            </div>
            <p className="text-xs text-[#65736F] mt-1 font-bold">
              {isCompleted
                ? amWinner
                  ? t("rps.you_won")
                  : isMatchDraw
                  ? t("rps.draw")
                  : t("rps.you_lost")
                : `${t("rps.round")} ${match.current_round}`}
            </p>

            {/* 5-Win Progress Pips */}
            <div className="flex items-center gap-1.5 mt-2.5">
              {/* My 5 win pips */}
              <div className="flex gap-1" role="group" aria-label={`Your wins: ${myWins} of 5`}>
                {Array.from({ length: targetWins }).map((_, i) => (
                  <div
                    key={`my-win-${i}`}
                    className={cn(
                      "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300",
                      i < myWins
                        ? "bg-[#167D78] ring-2 ring-[#DDF2EB] scale-110"
                        : "bg-[#EEF1ED] border border-[#E2E8E2]"
                    )}
                    title={`Your win ${i + 1} of ${targetWins}`}
                  />
                ))}
              </div>

              <span className="text-[10px] text-[#8E9B97] font-bold px-1 select-none">VS</span>

              {/* Opponent 5 win pips */}
              <div className="flex gap-1" role="group" aria-label={`Opponent wins: ${oppWins} of 5`}>
                {Array.from({ length: targetWins }).map((_, i) => (
                  <div
                    key={`opp-win-${i}`}
                    className={cn(
                      "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300",
                      i < oppWins
                        ? "bg-[#D95F49] ring-2 ring-[#FCE6DE] scale-110"
                        : "bg-[#EEF1ED] border border-[#E2E8E2]"
                    )}
                    title={`Opponent win ${i + 1} of ${targetWins}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Player 2 (Opponent) */}
          <div className="flex flex-col items-center gap-1.5">
            <Avatar
              src={opp.avatar_url}
              name={opp.display_name}
              size="lg"
              className="ring-2 ring-[#FCE6DE]"
            />
            <p className="font-bold text-[#203331] text-sm text-center truncate max-w-[6.5rem]">
              {opp.display_name}
            </p>
            <p className="text-[#8E9B97] text-xs font-semibold">{t("rps.opponent")}</p>
          </div>
        </div>
      </div>

      {/* ── Active Round: 10s Timer & Move Picker / Clash Stage ── */}
      {!isCompleted && (
        <div className="evo-card p-5 sm:p-6 space-y-5 bg-white border border-[#E2E8E2] shadow-card">
          {/* Header Row: Opponent submission status */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8E2] pb-3.5">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base sm:text-lg text-[#203331]">
                {hasSubmitted ? "Move Submitted" : t("rps.choose_move")}
              </span>
            </div>

            {/* Opponent Status Indicator (Secrecy preserved) */}
            <div>
              {opponent_has_submitted ? (
                <Badge variant="teal">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {t("rps.opp_locked_in") || "Opponent locked in move"}
                </Badge>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#65736F] font-semibold bg-[#EEF1ED] px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#167D78] animate-ping" />
                  {t("rps.opp_thinking") || "Opponent is choosing..."}
                </span>
              )}
            </div>
          </div>

          {/* Authoritative 10-Second Move Timer */}
          <RoundTimer
            roundDeadline={match.round_deadline ?? null}
            serverNow={server_now}
            roundNumber={match.current_round}
            isResolved={hasSubmitted && (opponent_has_submitted ?? false)}
            hasSubmitted={hasSubmitted}
            onTimeout={handleTimeout}
          />

          {submitMsg && (
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
              {submitMsg}
            </Alert>
          )}

          {/* Arena Duel Stage with 3-2-1 Clash Animation */}
          <ArenaDuelStage
            myMoveThisRound={my_move_this_round}
            submitting={submitting}
            locale={locale}
            myPerspective={myPerspective}
            myName={me.display_name}
            oppName={opp.display_name}
            latestResolvedRound={latestResolvedRound}
            pendingMove={pendingMove}
            onSelectMove={(move) => setPendingMove(move)}
            onSubmitMove={handleSubmit}
          />
        </div>
      )}

      {/* ── Match Completed Banner & Actions ── */}
      {isCompleted && (
        <div className="space-y-4 animate-fade-in">
          <div
            className={cn(
              "evo-card p-6 sm:p-8 text-center shadow-card",
              amWinner
                ? "border-2 border-[rgba(22,125,120,0.4)] bg-[#DDF2EB]/40 ring-4 ring-[#DDF2EB]/60"
                : isMatchDraw
                ? "border-[#E2E8E2] bg-[#EEF1ED]"
                : "border-2 border-[rgba(217,95,73,0.4)] bg-[#FCE6DE]/40"
            )}
          >
            {amWinner ? (
              <>
                <Trophy className="h-14 w-14 text-[#167D78] mx-auto mb-2 animate-bounce" />
                <h3 className="font-display font-black text-2xl sm:text-3xl text-[#203331]">
                  {t("rps.you_won")}
                </h3>
                <p className="text-sm font-bold text-[#167D78] mt-1">
                  First to reach 5 round wins! Final score: {myWins} – {oppWins}
                </p>
              </>
            ) : isMatchDraw ? (
              <>
                <Minus className="h-12 w-12 text-[#65736F] mx-auto mb-2" />
                <h3 className="font-display font-bold text-2xl text-[#203331]">
                  {t("rps.draw")}
                </h3>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 text-[#D95F49] mx-auto mb-2" />
                <h3 className="font-display font-bold text-2xl text-[#203331]">
                  {t("rps.you_lost")}
                </h3>
                <p className="text-sm font-semibold text-[#D95F49] mt-1">
                  {opp.display_name} reached 5 wins first. Final score: {myWins} – {oppWins}
                </p>
              </>
            )}

            {playAgainError && (
              <div className="w-full max-w-md mx-auto mt-4 text-left">
                <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
                  {playAgainError}
                </Alert>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Button
                variant="primary"
                size="md"
                onClick={handlePlayAgain}
                loading={playAgainLoading}
                disabled={playAgainLoading}
                id="rps-play-again-btn"
              >
                <RefreshCw className={cn("h-4 w-4 mr-1.5", playAgainLoading && "animate-spin")} />
                {playAgainLoading ? "Finding Match..." : (t("rps.rematch") || "Play Again")}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => router.push("/play/rps")}
                id="rps-back-lobby-btn"
              >
                Back to Lobby
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => router.push("/history")}
                id="rps-view-history-btn"
              >
                {t("rps.view_history") || "Match History"}
              </Button>
            </div>
          </div>

          {/* ── Dare challenge section for completed non-draw matches ── */}
          {!isMatchDraw && (
            <div>
              {matchChallenge ? (
                <MatchChallengeCard
                  challenge={matchChallenge}
                  userId={userId}
                  opponentName={opp.display_name}
                  onStatusChange={(updated) => setMatchChallenge(updated)}
                />
              ) : amWinner ? (
                <div className="evo-card p-6 border-2 border-[rgba(217,95,73,0.4)] bg-[#FCE6DE]/40 text-center space-y-3 shadow-sm">
                  <div className="flex items-center justify-center gap-2 text-[#D95F49] font-bold text-base">
                    <Sparkles className="h-5 w-5" />
                    <span>{t("challenges.assign_dare")}</span>
                  </div>
                  <p className="text-xs text-[#65736F] max-w-sm mx-auto">
                    {t("challenges.assign_dare_desc")}
                  </p>
                  <Button
                    variant="coral"
                    size="sm"
                    onClick={() => setIsChallengeModalOpen(true)}
                    id="open-assign-challenge-modal-btn"
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    {t("challenges.assign_dare")}
                  </Button>
                </div>
              ) : (
                <div className="evo-card p-4 text-center text-xs text-[#65736F] bg-white border border-[#E2E8E2]">
                  Waiting for {opp.display_name} to assign a dare challenge...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Round History List ── */}
      {rounds.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#65736F] uppercase tracking-wider">
              {t("rps.round_history")} ({rounds.length})
            </h3>
            <span className="text-[11px] text-[#8E9B97] font-semibold">
              Draws award 0 pts & continue
            </span>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {rounds
              .slice()
              .reverse()
              .map((round) => (
                <RoundHistoryRow
                  key={round.round_number}
                  round={round}
                  myPerspective={myPerspective}
                />
              ))}
          </div>
        </div>
      )}

      {/* ── Manual Refresh Retry Button ── */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="text-[#8E9B97] hover:text-[#203331] gap-2 text-xs"
          aria-label={t("common.retry")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("common.retry")}
        </Button>
      </div>

      {/* ── Challenge Assignment Modal ── */}
      <ChallengeSelectionModal
        matchId={matchId}
        opponentName={opp.display_name}
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        onSuccess={(c) => {
          setMatchChallenge(c);
          setIsChallengeModalOpen(false);
        }}
      />
    </div>
  );
}
