"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy, XCircle, Minus, AlertCircle, ArrowLeft,
  RefreshCw, Wifi, WifiOff, Sparkles, Volume2, VolumeX,
  Clock, HelpCircle, X, Swords,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Alert, Avatar, Spinner } from "@/shared/ui";
import {
  roundOutcomeLabel,
  type RpsMove,
  type RoundMove,
  type Round,
  WINS_REQUIRED,
  MOVE_LABEL_EN,
  MOVE_LABEL_TA,
} from "@/lib/rps";
import { cn } from "@/shared/lib/utils";
import type { Challenge } from "@/types/database";
import { ChallengeSelectionModal } from "@/components/challenges/ChallengeSelectionModal";
import { MatchChallengeCard } from "@/components/challenges/MatchChallengeCard";
import { HandGraphic } from "@/components/rps/HandGraphic";
import { RoundTimer } from "@/components/rps/RoundTimer";
import { ArenaDuelStage } from "@/components/rps/ArenaDuelStage";
import { rpsAudio } from "@/components/rps/RpsAudio";
import { RpsConfetti } from "@/components/rps/RpsConfetti";
import { GameLifecycleBanner } from "@/shared/game/GameLifecycleBanner";
import type { MatchPhase, GameEndReason } from "@/types/database";

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
    phase: MatchPhase;
    end_reason?: GameEndReason | null;
    game_type: string;
    player1_id: string;
    player2_id: string;
    player1_wins: number;
    player2_wins: number;
    current_round: number;
    target_wins?: number;
    winner_id: string | null;
    loser_id?: string | null;
    is_draw: boolean;
    round_deadline?: string | null;
    last_activity_at?: string | null;
    game_started_at?: string | null;
    player1_left_at?: string | null;
    player2_left_at?: string | null;
    player1_disconnected_at?: string | null;
    player2_disconnected_at?: string | null;
    player1_reconnect_deadline?: string | null;
    player2_reconnect_deadline?: string | null;
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

// ── How To Play Modal ─────────────────────────────────────────────────────────

function HowToPlayModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        className="w-full max-w-lg rounded-3xl bg-[#0D1336] border border-[#315BFF]/40 p-6 shadow-[0_20px_60px_rgba(7,11,37,0.9)] text-[#F5F7FF] relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close how to play dialog"
          className="absolute top-5 right-5 p-2 rounded-xl text-[#9BA8D7] hover:text-[#F5F7FF] hover:bg-[#182352] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center shadow-[0_0_16px_rgba(49,91,255,0.4)]">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 id="how-to-play-title" className="font-display font-black text-xl text-[#F5F7FF]">
              How to Play Rock, Paper, Scissors
            </h3>
            <p className="text-xs text-[#9BA8D7]">Evoaiqu Social Multiplayer Arena</p>
          </div>
        </div>

        <div className="space-y-3.5 text-sm text-[#9BA8D7] max-h-[65vh] overflow-y-auto pr-1">
          <div className="p-3.5 rounded-2xl bg-[#101638] border border-[#315BFF]/20">
            <h4 className="font-bold text-[#39DFFF] text-xs uppercase tracking-wider mb-1">
              1. First to 5 Wins
            </h4>
            <p className="text-xs leading-relaxed text-[#D6DEFF]">
              Both players battle round by round. The first player to reach 5 round wins claims match victory!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#101638] border border-[#315BFF]/20">
            <h4 className="font-bold text-[#39DFFF] text-xs uppercase tracking-wider mb-1">
              2. Authoritative 10-Second Timer
            </h4>
            <p className="text-xs leading-relaxed text-[#D6DEFF]">
              Each round has a strict 10-second server deadline. Lock in your move before time runs out to avoid a round timeout.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#101638] border border-[#315BFF]/20">
            <h4 className="font-bold text-[#39DFFF] text-xs uppercase tracking-wider mb-1">
              3. Classic Move Matrix
            </h4>
            <ul className="text-xs space-y-1 text-[#D6DEFF] list-disc list-inside">
              <li><strong className="text-[#39DFFF]">Rock</strong> crushes Scissors</li>
              <li><strong className="text-[#39DFFF]">Scissors</strong> cut Paper</li>
              <li><strong className="text-[#39DFFF]">Paper</strong> covers Rock</li>
              <li>Draws award 0 points to both players and immediately replay.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#101638] border border-[#315BFF]/20">
            <h4 className="font-bold text-[#39DFFF] text-xs uppercase tracking-wider mb-1">
              4. Instant Single-Tap & Keyboard Controls
            </h4>
            <p className="text-xs leading-relaxed text-[#D6DEFF]">
              Tap any hand card once to lock it in instantly, or use keyboard keys:
              Press <kbd className="font-mono font-bold bg-[#070B25] text-[#39DFFF] px-1 py-0.5 rounded border border-[#315BFF]/40">1</kbd> for Rock, <kbd className="font-mono font-bold bg-[#070B25] text-[#39DFFF] px-1 py-0.5 rounded border border-[#315BFF]/40">2</kbd> for Paper, <kbd className="font-mono font-bold bg-[#070B25] text-[#39DFFF] px-1 py-0.5 rounded border border-[#315BFF]/40">3</kbd> for Scissors, and <kbd className="font-mono font-bold bg-[#070B25] text-[#39DFFF] px-1 py-0.5 rounded border border-[#315BFF]/40">Enter</kbd> to submit.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[#315BFF]/20 flex justify-end">
          <Button
            variant="primary"
            size="md"
            onClick={onClose}
            className="!bg-gradient-to-r !from-[#315BFF] !to-[#8B2CFF] !text-white font-bold"
          >
            Got it, Let&apos;s Play!
          </Button>
        </div>
      </div>
    </div>
  );
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
    <div className="flex items-center justify-between py-2.5 px-3.5 sm:px-4 rounded-xl bg-[#101638]/90 border border-[#315BFF]/20 shadow-xs hover:border-[#315BFF]/50 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#9BA8D7] font-semibold min-w-16">
          {t("rps.round")} {round.round_number}
        </span>
        {isTimeout && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF4B72]/20 text-[#FF4B72] border border-[#FF4B72]/30 uppercase">
            <Clock className="w-2.5 h-2.5" /> Timeout
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-sm font-semibold text-[#F5F7FF]">
        <div className="flex items-center gap-1.5" title={labelMap[myMove]}>
          <HandGraphic move={myMove} size="sm" />
          <span className="text-xs hidden sm:inline text-[#D6DEFF]">{labelMap[myMove]}</span>
        </div>
        <span className="text-[#315BFF] text-xs font-bold">vs</span>
        <div className="flex items-center gap-1.5" title={labelMap[oppMove]}>
          <HandGraphic move={oppMove} size="sm" flip />
          <span className="text-xs hidden sm:inline text-[#D6DEFF]">{labelMap[oppMove]}</span>
        </div>
      </div>

      <span
        className={cn(
          "text-xs font-bold uppercase tracking-wider min-w-14 text-right",
          outcome === "win" && "text-[#39DFFF]",
          outcome === "loss" && "text-[#FF4B72]",
          outcome === "draw" && "text-[#9BA8D7]"
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
  const submittingRef = useRef(false);
  const [pendingMove, setPendingMove] = useState<RpsMove | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [isClashActive, setIsClashActive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMuted, setIsMuted] = useState(rpsAudio.getMuted());
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  const lastTimedOutRoundRef = useRef<number | null>(null);
  const isTimingOutRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const [matchChallenge, setMatchChallenge] = useState<Challenge | null>(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [playAgainLoading, setPlayAgainLoading] = useState(false);
  const [playAgainError, setPlayAgainError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const victoryCelebratedRef = useRef(false);

  // Reset pending move and submission errors when round advances
  const currentRound = state?.match.current_round;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingMove(null);
    setSubmitMsg(null);
  }, [currentRound]);

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
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch(`/api/rps/state?match_id=${encodeURIComponent(matchId)}`);
      if (!mountedRef.current) return;
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
      if (!mountedRef.current) return;
      setState(data);
      setError(null);
      setErrorType(null);
    } catch {
      if (mountedRef.current) {
        setErrorType("network");
        setError(t("rps.network_error"));
      }
    } finally {
      isFetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [matchId, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchState();
  }, [fetchState, refreshKey]);

  // ── Voluntary Departure (Leave Game) ───────────────────────────────────────
  const handleLeaveGame = useCallback(async () => {
    try {
      const res = await fetch("/api/games/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchState();
      }
    } catch (err) {
      console.error("[RpsMatchBoard] Leave failed:", err);
    }
  }, [matchId, fetchState]);

  // ── Disconnection & Reconnection Session Restoration ────────────────────────
  useEffect(() => {
    const handleOffline = () => {
      fetch("/api/games/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
        keepalive: true,
      }).catch(() => {});
    };

    const handleOnline = () => {
      fetch("/api/games/reconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
      })
        .then(() => fetchState())
        .catch(() => {});
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Initial reconnect handshake on mount/refresh
    void handleOnline();

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [matchId, fetchState]);

  // ── Realtime subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
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
          if (mountedRef.current) void fetchState();
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
          if (mountedRef.current) void fetchState();
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
          if (mountedRef.current) void fetchState();
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
          if (mountedRef.current) void fetchChallenge();
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === "SUBSCRIBED") {
          setConnected(true);
          setRealtimeConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnected(false);
          setRealtimeConnected(false);
        }
      });

    return () => {
      mountedRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [matchId, supabase, fetchState, fetchChallenge]);

  // ── Polling fallback & low-frequency safety heartbeat ────────────────────────
  useEffect(() => {
    if (state?.match.phase !== "completed") {
      const interval = realtimeConnected ? 12000 : 2500;
      pollRef.current = setInterval(() => {
        if (mountedRef.current) void fetchState();
      }, interval);

      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }

    if (state?.match.phase === "completed" && !state.match.is_draw) {
      const isUnresolved =
        !matchChallenge ||
        matchChallenge.status === "pending" ||
        matchChallenge.status === "accepted";

      if (isUnresolved) {
        const interval = realtimeConnected ? 12000 : 3000;
        const challengePoll = setInterval(() => {
          if (mountedRef.current) void fetchChallenge();
        }, interval);

        return () => {
          clearInterval(challengePoll);
        };
      }
    }
  }, [realtimeConnected, state?.match.phase, state?.match.is_draw, matchChallenge, fetchState, fetchChallenge]);

  // ── Submit move ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (selectedMove?: RpsMove) => {
    const moveToSubmit = selectedMove || pendingMove;
    if (!moveToSubmit || submittingRef.current || state?.my_move_this_round !== null) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitMsg(null);
    if (selectedMove) {
      setPendingMove(selectedMove);
    }
    try {
      const res = await fetch("/api/rps/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, move: moveToSubmit /* move: pendingMove */ }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitMsg(data.error ?? data.message ?? t("common.error"));
      } else {
        await fetchState();
      }
    } catch {
      setSubmitMsg(t("common.error"));
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [pendingMove, state?.my_move_this_round, matchId, t, fetchState]);

  // ── Timeout expiration resolution ───────────────────────────────────────────
  const handleTimeout = useCallback(async () => {
    const roundToTimeout = state?.match.current_round;
    if (!roundToTimeout) return;

    // Do not fire competing timeout if move submission is actively in flight
    if (submittingRef.current) return;

    // Prevent duplicate timeout requests for the same match and round
    if (lastTimedOutRoundRef.current === roundToTimeout || isTimingOutRef.current) {
      return;
    }

    // Do not timeout if match is inactive or already resolved
    if (
      state?.match.phase !== "active" ||
      (state?.my_move_this_round !== null && (state?.opponent_has_submitted ?? false))
    ) {
      return;
    }

    isTimingOutRef.current = true;
    lastTimedOutRoundRef.current = roundToTimeout;

    try {
      const res = await fetch("/api/rps/timeout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        await fetchState();
      } else {
        const errData = await res.json().catch(() => ({}));
        // If server deadline has not arrived yet, clear guard so timer can retry when elapsed
        if (errData.code === "deadline_not_reached") {
          lastTimedOutRoundRef.current = null;
        } else {
          await fetchState();
        }
      }
    } catch {
      // On network failure, clear round guard after short backoff to allow retry if round unchanged
      setTimeout(() => {
        if (mountedRef.current && state?.match.current_round === roundToTimeout) {
          lastTimedOutRoundRef.current = null;
        }
      }, 2000);
    } finally {
      isTimingOutRef.current = false;
    }
  }, [state?.match.current_round, state?.match.phase, state?.my_move_this_round, state?.opponent_has_submitted, matchId, fetchState]);

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
      <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[#070B25] rounded-3xl border border-[#315BFF]/30 p-8 shadow-2xl">
        <Spinner size="lg" className="text-[#39DFFF]" />
        <p className="text-sm font-semibold text-[#9BA8D7] tracking-wide">{t("rps.loading")}</p>
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
      <div className="p-8 bg-[#101638] border border-[#FF4B72]/40 rounded-3xl text-center shadow-2xl space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-[#FF4B72]/20 border border-[#FF4B72]/40 flex items-center justify-center text-[#FF4B72] mx-auto shadow-[0_0_16px_rgba(255,75,114,0.3)]">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-[#F5F7FF] mb-1.5">
            {errorTitle}
          </h2>
          <p className="text-[#9BA8D7] text-sm leading-relaxed">
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
            className="bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] text-white"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            {t("common.retry") || "Retry"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.push("/play/rps")}
            className="bg-[#182352] text-[#F5F7FF] border-[#315BFF]/40 hover:bg-[#202E68]"
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
    <div className="space-y-6 max-w-4xl mx-auto text-[#F5F7FF]">
      {/* ── Confetti for match victory ── */}
      <RpsConfetti active={isCompleted && amWinner} />

      {/* ── How to Play Modal ── */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      {/* ── Section A: Top Navigation Bar ── */}
      <header
        aria-label="Match navigation and controls"
        className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#101638]/90 border border-[#315BFF]/30 backdrop-blur-md shadow-[0_4px_24px_rgba(7,11,37,0.7)]"
      >
        {/* Left: Brand mark & Exit button */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/play/rps"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9BA8D7] hover:text-[#F5F7FF] bg-[#070B25] border border-[#315BFF]/30 hover:border-[#39DFFF] px-3 py-1.5 rounded-xl shadow-xs transition-all"
            aria-label="Exit match to RPS lobby"
            id="exit-match-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#39DFFF]" />
            Exit Arena
          </Link>

          {/* Brand & Room Badge */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="font-display font-black text-sm tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#39DFFF] to-[#8B2CFF]">
              EVOAIQU
            </span>
            <span className="text-[11px] font-mono font-bold text-[#9BA8D7] bg-[#070B25] border border-[#315BFF]/20 px-2 py-0.5 rounded-lg">
              ROOM #{matchId.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] text-white text-[11px] font-black font-mono tracking-wider uppercase shadow-[0_0_12px_rgba(49,91,255,0.4)]">
            FIRST TO 5
          </span>
        </div>

        {/* Right: How to Play, History, Sound & Realtime status */}
        <div className="flex items-center gap-2">
          {/* How to Play button */}
          <button
            type="button"
            onClick={() => setIsHowToPlayOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#315BFF]/30 bg-[#070B25] text-xs font-semibold text-[#9BA8D7] hover:text-[#39DFFF] hover:border-[#39DFFF]/60 transition-colors cursor-pointer select-none"
            aria-label="How to play instructions"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#39DFFF]" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Match history button */}
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#315BFF]/30 bg-[#070B25] text-xs font-semibold text-[#9BA8D7] hover:text-[#F5F7FF] hover:border-[#315BFF] transition-colors"
            aria-label="View match history"
          >
            <Clock className="w-3.5 h-3.5 text-[#8B2CFF]" />
            <span className="hidden md:inline">History</span>
          </Link>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              const newMuted = rpsAudio.toggleMute();
              setIsMuted(newMuted);
            }}
            className="p-1.5 rounded-xl border border-[#315BFF]/30 text-[#9BA8D7] hover:text-[#F5F7FF] hover:border-[#39DFFF] bg-[#070B25] shadow-xs transition-colors cursor-pointer select-none"
            aria-label={isMuted ? "Unmute game sound effects" : "Mute game sound effects"}
            title={isMuted ? "Sound: Muted (Click to Unmute)" : "Sound: On (Click to Mute)"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#FF4B72]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#39DFFF]" />
            )}
          </button>

          {/* Realtime Status Pill */}
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold shrink-0 bg-[#070B25] border px-2.5 py-1 rounded-xl shadow-xs",
              connected
                ? "text-[#39DFFF] border-[#39DFFF]/40"
                : "text-[#FF4B72] border-[#FF4B72]/40"
            )}
          >
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-[#39DFFF]" />
                <span className="hidden sm:inline">{t("rps.connected")}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-[#FF4B72]" />
                <span className="hidden sm:inline">{t("rps.polling_fallback")}</span>
              </>
            )}
          </span>
        </div>
      </header>

      {/* ── Lifecycle & Timeout HUD Banner ── */}
      {state?.match && (
        <GameLifecycleBanner
          matchId={matchId}
          userId={userId}
          phase={state.match.phase}
          endReason={state.match.end_reason}
          winnerId={state.match.winner_id}
          loserId={state.match.loser_id}
          lastActivityAt={state.match.last_activity_at}
          reconnectDeadline={
            myPerspective === 1
              ? state.match.player2_reconnect_deadline
              : state.match.player1_reconnect_deadline
          }
          opponentDisconnected={
            myPerspective === 1
              ? Boolean(state.match.player2_disconnected_at)
              : Boolean(state.match.player1_disconnected_at)
          }
          serverNow={state.server_now}
          onLeaveGame={
            state.match.phase === "active" || state.match.phase === "reconnecting"
              ? handleLeaveGame
              : undefined
          }
        />
      )}

      {/* ── Section B: Player and Match Information (Scoreboard & Versus HUD) ── */}
      <section
        aria-label="Player match scores and round status"
        className="p-5 sm:p-7 rounded-3xl bg-[#101638]/90 border border-[#315BFF]/30 shadow-[0_8px_32px_rgba(7,11,37,0.7)] backdrop-blur-md"
      >
        <div className="grid grid-cols-3 items-center gap-2 sm:gap-6">
          {/* Player 1 (You) */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="relative">
              <Avatar
                src={me.avatar_url}
                name={me.display_name}
                size="lg"
                className="ring-2 ring-[#39DFFF] shadow-[0_0_16px_rgba(57,223,255,0.4)]"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#39DFFF] border-2 border-[#101638]" />
            </div>
            <div>
              <p className="font-bold text-[#F5F7FF] text-sm sm:text-base truncate max-w-[7.5rem]">
                {me.display_name}
              </p>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#39DFFF]/15 text-[#39DFFF] border border-[#39DFFF]/30">
                {t("rps.you")}
              </span>
            </div>

            {/* 5-Win Progress Pips (You) */}
            <div className="flex gap-1.5 mt-1" role="group" aria-label={`Your wins: ${myWins} of 5`}>
              {Array.from({ length: targetWins }).map((_, i) => (
                <div
                  key={`my-win-${i}`}
                  className={cn(
                    "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300",
                    i < myWins
                      ? "bg-[#39DFFF] ring-2 ring-[#39DFFF]/40 shadow-[0_0_8px_#39DFFF] scale-110"
                      : "bg-[#070B25] border border-[#315BFF]/40"
                  )}
                  title={`Your win ${i + 1} of ${targetWins}`}
                />
              ))}
            </div>
          </div>

          {/* Center: Score Display & Active Round Timer */}
          <div className="flex flex-col items-center justify-center text-center">
            {/* Scoreboard Digits */}
            <div className="text-3xl sm:text-5xl font-black font-display tracking-tight text-[#F5F7FF]">
              <span className="text-[#39DFFF] drop-shadow-[0_0_12px_rgba(57,223,255,0.5)]">{myWins}</span>
              <span className="text-[#9BA8D7]/60 font-light mx-2">:</span>
              <span className="text-[#8B2CFF] drop-shadow-[0_0_12px_rgba(139,44,255,0.5)]">{oppWins}</span>
            </div>

            {/* Round info badge */}
            <div className="mt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9BA8D7]">
                {isCompleted
                  ? amWinner
                    ? t("rps.you_won")
                    : isMatchDraw
                    ? t("rps.draw")
                    : t("rps.you_lost")
                  : `${t("rps.round")} ${match.current_round}`}
              </span>
            </div>

            {/* Embedded Active Round Timer */}
            {!isCompleted && (
              <div className="mt-3 w-full max-w-[13rem]">
                <RoundTimer
                  roundDeadline={match.round_deadline ?? null}
                  serverNow={server_now}
                  roundNumber={match.current_round}
                  isResolved={hasSubmitted && (opponent_has_submitted ?? false)}
                  hasSubmitted={hasSubmitted}
                  isClashing={isClashActive}
                  onTimeout={handleTimeout}
                />
              </div>
            )}
          </div>

          {/* Player 2 (Opponent) */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="relative">
              <Avatar
                src={opp.avatar_url}
                name={opp.display_name}
                size="lg"
                className="ring-2 ring-[#8B2CFF] shadow-[0_0_16px_rgba(139,44,255,0.4)]"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#8B2CFF] border-2 border-[#101638]" />
            </div>
            <div>
              <p className="font-bold text-[#F5F7FF] text-sm sm:text-base truncate max-w-[7.5rem]">
                {opp.display_name}
              </p>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full text-[10px] font-semibold text-[#9BA8D7] bg-[#182352] border border-[#315BFF]/20">
                {t("rps.opponent")}
              </span>
            </div>

            {/* 5-Win Progress Pips (Opponent) */}
            <div className="flex gap-1.5 mt-1" role="group" aria-label={`Opponent wins: ${oppWins} of 5`}>
              {Array.from({ length: targetWins }).map((_, i) => (
                <div
                  key={`opp-win-${i}`}
                  className={cn(
                    "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300",
                    i < oppWins
                      ? "bg-[#8B2CFF] ring-2 ring-[#8B2CFF]/40 shadow-[0_0_8px_#8B2CFF] scale-110"
                      : "bg-[#070B25] border border-[#315BFF]/40"
                  )}
                  title={`Opponent win ${i + 1} of ${targetWins}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section C & D: Central Battle Arena & Hand Selection ── */}
      {!isCompleted && (
        <section aria-label="Battle arena and move selection" className="space-y-4">
          {submitMsg && (
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
              {submitMsg}
            </Alert>
          )}

          <ArenaDuelStage
            myMoveThisRound={my_move_this_round}
            submitting={submitting}
            locale={locale}
            myPerspective={myPerspective}
            myName={me.display_name}
            oppName={opp.display_name}
            latestResolvedRound={latestResolvedRound}
            pendingMove={pendingMove}
            opponentHasSubmitted={opponent_has_submitted ?? false}
            onSelectMove={(move) => setPendingMove(move)}
            onSubmitMove={handleSubmit}
            onClashActiveChange={(active) => setIsClashActive(active)}
          />
        </section>
      )}

      {/* ── Section E: Match Completed Banner & Actions ── */}
      {isCompleted && (
        <div className="space-y-6 animate-fade-in">
          <div
            className={cn(
              "p-6 sm:p-10 text-center rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-md",
              amWinner
                ? "bg-gradient-to-b from-[#101638] via-[#101C48] to-[#0D1540] border-2 border-[#39DFFF] shadow-[0_0_40px_rgba(57,223,255,0.3)]"
                : isMatchDraw
                ? "bg-[#101638] border border-[#315BFF]/40"
                : "bg-gradient-to-b from-[#101638] to-[#250F28] border-2 border-[#FF4B72]/60 shadow-[0_0_40px_rgba(255,75,114,0.2)]"
            )}
          >
            {amWinner ? (
              <>
                <div className="relative inline-block mb-3">
                  <Trophy className="h-16 w-16 text-[#39DFFF] mx-auto animate-bounce drop-shadow-[0_0_20px_rgba(57,223,255,0.7)]" />
                  <Sparkles className="h-6 w-6 text-[#8B2CFF] absolute -top-2 -right-2 animate-spin" />
                </div>
                <h3 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight">
                  {t("rps.you_won")}
                </h3>
                <p className="text-sm sm:text-base font-bold text-[#39DFFF] mt-1.5">
                  First to reach 5 round wins! Final score: {myWins} – {oppWins}
                </p>
              </>
            ) : isMatchDraw ? (
              <>
                <Minus className="h-14 w-14 text-[#9BA8D7] mx-auto mb-2" />
                <h3 className="font-display font-bold text-3xl text-[#F5F7FF]">
                  {t("rps.draw")}
                </h3>
                <p className="text-sm font-semibold text-[#9BA8D7] mt-1">
                  Match completed in a mutual draw.
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-14 w-14 text-[#FF4B72] mx-auto mb-2 drop-shadow-[0_0_16px_rgba(255,75,114,0.5)]" />
                <h3 className="font-display font-bold text-3xl text-[#F5F7FF]">
                  {t("rps.you_lost")}
                </h3>
                <p className="text-sm font-semibold text-[#FF4B72] mt-1">
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

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center mt-7">
              <Button
                variant="primary"
                size="md"
                onClick={handlePlayAgain}
                loading={playAgainLoading}
                disabled={playAgainLoading}
                id="rps-play-again-btn"
                className="!bg-gradient-to-r !from-[#315BFF] !via-[#5244E8] !to-[#8B2CFF] !text-white font-bold px-6 shadow-[0_4px_20px_rgba(49,91,255,0.4)]"
              >
                <RefreshCw className={cn("h-4 w-4 mr-1.5", playAgainLoading && "animate-spin")} />
                {playAgainLoading ? "Finding Match..." : (t("rps.rematch") || "Play Again")}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => router.push("/play/rps")}
                id="rps-back-lobby-btn"
                className="!bg-[#182352] !text-[#F5F7FF] border border-[#315BFF]/40 hover:!bg-[#202E68]"
              >
                Back to Lobby
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => router.push("/history")}
                id="rps-view-history-btn"
                className="!text-[#9BA8D7] hover:!text-[#F5F7FF] hover:!bg-[#182352]"
              >
                {t("rps.view_history") || "Match History"}
              </Button>
            </div>
          </div>

          {/* ── Dare challenge section for completed non-draw matches ── */}
          {!isMatchDraw && (
            <div className="rounded-3xl bg-[#101638] border border-[#315BFF]/30 p-5 shadow-lg">
              {matchChallenge ? (
                <MatchChallengeCard
                  challenge={matchChallenge}
                  userId={userId}
                  opponentName={opp.display_name}
                  onStatusChange={(updated) => setMatchChallenge(updated)}
                />
              ) : amWinner ? (
                <div className="p-6 text-center space-y-3 rounded-2xl bg-gradient-to-r from-[#8B2CFF]/20 to-[#315BFF]/20 border border-[#8B2CFF]/40 shadow-inner">
                  <div className="flex items-center justify-center gap-2 text-[#39DFFF] font-bold text-base">
                    <Sparkles className="h-5 w-5" />
                    <span>{t("challenges.assign_dare")}</span>
                  </div>
                  <p className="text-xs text-[#9BA8D7] max-w-sm mx-auto">
                    {t("challenges.assign_dare_desc")}
                  </p>
                  <Button
                    variant="coral"
                    size="sm"
                    onClick={() => setIsChallengeModalOpen(true)}
                    id="open-assign-challenge-modal-btn"
                    className="bg-gradient-to-r from-[#8B2CFF] to-[#FF4B72] text-white font-bold"
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    {t("challenges.assign_dare")}
                  </Button>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-[#9BA8D7] bg-[#070B25] rounded-xl border border-[#315BFF]/20">
                  Waiting for {opp.display_name} to assign a dare challenge...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Section F: Round History List ── */}
      {rounds.length > 0 && (
        <section
          aria-label="Round history list"
          className="space-y-3 p-4 sm:p-6 rounded-3xl bg-[#101638]/90 border border-[#315BFF]/20 shadow-md backdrop-blur-md"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#315BFF]/20">
            <h3 className="text-xs font-bold text-[#9BA8D7] uppercase tracking-wider">
              {t("rps.round_history")} ({rounds.length})
            </h3>
            <span className="text-[11px] text-[#39DFFF] font-semibold">
              Draws award 0 pts & continue
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
        </section>
      )}

      {/* ── Manual Refresh Retry Button ── */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="text-[#9BA8D7] hover:text-[#F5F7FF] hover:bg-[#182352] gap-2 text-xs"
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
