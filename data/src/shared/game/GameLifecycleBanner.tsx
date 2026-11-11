"use client";

import React, { useState, useMemo, useSyncExternalStore } from "react";
import {
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  XCircle,
  Hourglass,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import type { MatchPhase, GameEndReason } from "@/types/database";

interface GameLifecycleBannerProps {
  matchId: string;
  userId: string;
  phase: MatchPhase;
  endReason?: GameEndReason | null;
  winnerId?: string | null;
  loserId?: string | null;
  lastActivityAt?: string | null;
  reconnectDeadline?: string | null;
  opponentDisconnected?: boolean;
  opponentReconnected?: boolean;
  serverNow?: string | null;
  onLeaveGame?: () => Promise<void>;
  className?: string;
}

let currentClock = 0;
const clockListeners = new Set<() => void>();
let clockInterval: NodeJS.Timeout | null = null;

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockListeners.size === 1 && typeof window !== "undefined") {
    currentClock = Date.now();
    clockInterval = setInterval(() => {
      currentClock = Date.now();
      clockListeners.forEach((cb) => cb());
    }, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
  };
}

function getClockSnapshot(): number {
  return currentClock;
}

function getServerClockSnapshot(): number {
  return 0;
}

export function GameLifecycleBanner({
  matchId,
  userId,
  phase,
  endReason,
  winnerId,
  loserId,
  lastActivityAt,
  reconnectDeadline,
  opponentDisconnected,
  opponentReconnected,
  serverNow,
  onLeaveGame,
  className,
}: GameLifecycleBannerProps) {
  const { t } = useI18n();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const now = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);

  // Calculate remaining inactivity time (10 minutes = 600 seconds from last activity)
  const inactivitySecondsRemaining = useMemo(() => {
    if (!lastActivityAt || phase !== "active") return null;
    const currentMs = now || (serverNow ? new Date(serverNow).getTime() : 0);
    if (!currentMs) return null;
    const lastActiveMs = new Date(lastActivityAt).getTime();
    if (isNaN(lastActiveMs)) return null;
    const elapsedSeconds = Math.max(0, Math.floor((currentMs - lastActiveMs) / 1000));
    return Math.max(0, 600 - elapsedSeconds);
  }, [lastActivityAt, phase, now, serverNow]);

  // Calculate remaining reconnection time (60 seconds deadline)
  const reconnectSecondsRemaining = useMemo(() => {
    if (!reconnectDeadline) return null;
    const currentMs = now || (serverNow ? new Date(serverNow).getTime() : 0);
    if (!currentMs) return null;
    const deadlineMs = new Date(reconnectDeadline).getTime();
    if (isNaN(deadlineMs)) return null;
    return Math.max(0, Math.ceil((deadlineMs - currentMs) / 1000));
  }, [reconnectDeadline, now, serverNow]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLeaveConfirm = async () => {
    setIsLeaving(true);
    try {
      if (onLeaveGame) {
        await onLeaveGame();
      } else {
        await fetch("/api/games/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match_id: matchId }),
        });
      }
    } catch (err) {
      console.error("[GameLifecycleBanner] Failed to leave game:", err);
    } finally {
      setIsLeaving(false);
      setShowLeaveModal(false);
    }
  };

  // Determine appropriate end message
  const isTerminal = phase === "completed" || phase === "aborted" || phase === "forfeited";
  const iWon = winnerId === userId;
  const iLost = loserId === userId;

  let terminalMessage: string | null = null;
  if (isTerminal) {
    if (endReason === "forfeit") {
      terminalMessage = iWon
        ? t("game.result.won_opponent_left") || "You won because your opponent left."
        : iLost
        ? t("game.result.lost_you_left") || "You lost because you left."
        : "Match forfeited.";
    } else if (endReason === "disconnect_timeout") {
      terminalMessage = iWon
        ? t("game.result.won_opponent_timeout") || "You won because your opponent failed to reconnect."
        : "Match ended due to disconnection timeout.";
    } else if (endReason === "inactivity_timeout") {
      terminalMessage = t("game.result.aborted_inactivity") || "Game aborted because of inactivity.";
    } else if (endReason === "waiting_timeout") {
      terminalMessage = t("game.result.aborted_opponent_no_join") || "Game aborted because the opponent did not join.";
    } else if (endReason === "both_left") {
      terminalMessage = t("game.result.aborted_neither_reconnected") || "Game aborted because neither player reconnected.";
    }
  }

  return (
    <>
      <div
        className={cn(
          "w-full rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm transition-all shadow-md",
          isTerminal && endReason === "forfeit" && iWon && "bg-[#101638] border-[#39DFFF]/40 text-[#39DFFF]",
          isTerminal && endReason === "forfeit" && iLost && "bg-[#181126] border-[#FF5370]/40 text-[#FF5370]",
          isTerminal && endReason === "disconnect_timeout" && iWon && "bg-[#101638] border-[#39DFFF]/40 text-[#39DFFF]",
          isTerminal && (endReason === "inactivity_timeout" || endReason === "waiting_timeout" || endReason === "both_left") && "bg-[#101638] border-[#FBBF24]/40 text-[#FBBF24]",
          !isTerminal && opponentDisconnected && "bg-[#1C162E] border-[#FF5370]/50 text-[#FF5370] animate-pulse",
          !isTerminal && phase === "reconnecting" && !opponentDisconnected && "bg-[#1C1A2E] border-[#FBBF24]/40 text-[#FBBF24]",
          !isTerminal && phase === "active" && !opponentDisconnected && "bg-[#101638]/90 border-[#315BFF]/30 text-[#F5F7FF]",
          !isTerminal && phase === "waiting" && "bg-[#101638] border-[#315BFF]/30 text-[#B8C3E0]",
          !isTerminal && phase === "ready" && "bg-[#101638] border-[#39DFFF]/30 text-[#39DFFF]",
          className
        )}
      >
        {/* Left side: Status badge & message */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isTerminal ? (
            terminalMessage ? (
              iWon ? (
                <CheckCircle2 className="w-5 h-5 text-[#39DFFF] flex-shrink-0" />
              ) : iLost ? (
                <XCircle className="w-5 h-5 text-[#FF5370] flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#FBBF24] flex-shrink-0" />
              )
            ) : null
          ) : opponentDisconnected ? (
            <WifiOff className="w-5 h-5 text-[#FF5370] flex-shrink-0 animate-bounce" />
          ) : phase === "reconnecting" ? (
            <RefreshCw className="w-5 h-5 text-[#FBBF24] flex-shrink-0 animate-spin" />
          ) : phase === "active" ? (
            <Wifi className="w-5 h-5 text-[#39DFFF] flex-shrink-0" />
          ) : (
            <Hourglass className="w-5 h-5 text-[#9BA8D7] flex-shrink-0" />
          )}

          <div className="flex flex-col">
            <span className="font-semibold text-xs sm:text-sm tracking-wide">
              {terminalMessage ? (
                terminalMessage
              ) : opponentDisconnected ? (
                `${t("game.status.opponent_disconnected") || "Opponent disconnected."} ${
                  reconnectSecondsRemaining !== null
                    ? `${reconnectSecondsRemaining}s remaining to reconnect.`
                    : t("game.status.reconnect_remaining") || "60 seconds remaining to reconnect."
                }`
              ) : opponentReconnected ? (
                t("game.status.opponent_reconnected") || "Opponent reconnected."
              ) : phase === "reconnecting" ? (
                `${t("game.status.reconnecting") || "Reconnecting..."} ${
                  reconnectSecondsRemaining !== null ? `(${reconnectSecondsRemaining}s)` : ""
                }`
              ) : phase === "waiting" ? (
                t("game.status.waiting_opponent") || "Waiting for opponent."
              ) : phase === "ready" ? (
                t("game.status.waiting_start") || "Waiting for game to start."
              ) : (
                t("game.status.active") || "Game active."
              )}
            </span>
          </div>
        </div>

        {/* Right side: Inactivity countdown & Leave button */}
        <div className="flex items-center gap-3">
          {phase === "active" && !isTerminal && inactivitySecondsRemaining !== null && (
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border",
                inactivitySecondsRemaining < 120
                  ? "bg-[#FF5370]/15 text-[#FF5370] border-[#FF5370]/40 animate-pulse"
                  : "bg-[#070B25] text-[#9BA8D7] border-[#315BFF]/30"
              )}
              title="Game will abort if neither player moves for 10 minutes"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {t("game.inactivity_timer") || "Inactivity"}: {formatTimer(inactivitySecondsRemaining)}
              </span>
            </div>
          )}

          {!isTerminal && onLeaveGame && (
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#FF5370]/15 text-[#FF5370] border border-[#FF5370]/30 hover:bg-[#FF5370]/25 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("game.action.leave") || "Leave Game"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Leave Game Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl bg-[#0D1336] border border-[#FF5370]/40 p-6 shadow-[0_20px_60px_rgba(7,11,37,0.95)] text-[#F5F7FF] space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF5370]/20 text-[#FF5370] border border-[#FF5370]/40 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-display font-bold text-xl text-[#F5F7FF]">
                {t("game.action.leave") || "Leave Game"}
              </h3>
              <p className="text-sm text-[#9BA8D7] leading-relaxed">
                {t("game.action.leave_confirm") ||
                  "Are you sure you want to leave? Your opponent will be awarded the victory immediately."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLeaveModal(false)}
                disabled={isLeaving}
                className="text-[#9BA8D7] hover:text-[#F5F7FF]"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleLeaveConfirm}
                loading={isLeaving}
                className="bg-[#FF5370] hover:bg-[#E03E5A] text-white font-bold"
              >
                Confirm Forfeit
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

