"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Flag,
  Handshake,
  Volume2,
  VolumeX,
  Clock,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChessBoard } from "./ChessBoard";
import { ChessPieceSvg } from "./ChessPieceSvg";
import { ChessVictoryModal } from "./ChessVictoryModal";
import { chessSounds } from "@/lib/chess/sounds";
import { Button, Badge, Avatar } from "@/components/ui";
import { ChessColor, LegalMoveTarget, CapturedPieces } from "@/lib/chess/types";
import { cn } from "@/lib/utils";

interface PlayerInfo {
  id: string;
  display_name: string;
  evoora_id?: string | null;
  avatar_url?: string | null;
}

interface ChessMatchBoardProps {
  initialMatch: {
    id: string;
    fen: string;
    pgn: string;
    turn: ChessColor;
    ply: number;
    time_control_seconds: number;
    increment_seconds: number;
    white_time_remaining_ms: number;
    black_time_remaining_ms: number;
    is_check: boolean;
    is_checkmate: boolean;
    is_stalemate: boolean;
    is_draw: boolean;
    game_status: string;
    draw_offered_by: string | null;
    resigned_by: string | null;
    last_move_at: string;
    created_at: string;
  };
  viewer: {
    userId: string;
    color: ChessColor;
    isMyTurn: boolean;
  };
  players: {
    white: PlayerInfo;
    black: PlayerInfo;
  };
  initialLegalMoves: LegalMoveTarget[];
  initialCaptured: CapturedPieces;
  serverNow?: string;
}

export const ChessMatchBoard: React.FC<ChessMatchBoardProps> = ({
  initialMatch,
  viewer,
  players,
  initialLegalMoves,
  initialCaptured,
}) => {
  const supabase = useMemo(() => createClient(), []);

  // Match State
  const [match, setMatch] = useState(initialMatch);
  const [legalMoves, setLegalMoves] = useState<LegalMoveTarget[]>(initialLegalMoves);
  const [captured, setCaptured] = useState<CapturedPieces>(initialCaptured);
  const [isConnected, setIsConnected] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Local Clocks State
  const [whiteClockMs, setWhiteClockMs] = useState(initialMatch.white_time_remaining_ms);
  const [blackClockMs, setBlackClockMs] = useState(initialMatch.black_time_remaining_ms);

  const isWhiteViewer = viewer.color === "w";
  const myPlayer = isWhiteViewer ? players.white : players.black;
  const oppPlayer = isWhiteViewer ? players.black : players.white;

  const isGameActive = match.game_status === "active" || match.game_status === "check";
  const isMyTurn = (match.turn === "w" && isWhiteViewer) || (match.turn === "b" && !isWhiteViewer);

  // Action Modals & States
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(!isGameActive);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [winReason, setWinReason] = useState<string | null>(null);

  // Parse last move from PGN or ply if available
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: string; to: string } | null>(null);

  // 1. Clock Countdown Ticker (100ms high-resolution ticker)
  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const lastMoveTs = new Date(match.last_move_at).getTime();
      const elapsed = Math.max(0, now - lastMoveTs);

      if (match.turn === "w") {
        const remaining = Math.max(0, match.white_time_remaining_ms - elapsed);
        setWhiteClockMs(remaining);
      } else {
        const remaining = Math.max(0, match.black_time_remaining_ms - elapsed);
        setBlackClockMs(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [match, isGameActive]);

  // 2. Fetch authoritative match state refresh
  const refreshMatchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/chess/match/${match.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.match) {
        setMatch(data.match);
        setLegalMoves(data.legalMoves || []);
        setCaptured(data.captured || { white: [], black: [], whiteScore: 0, blackScore: 0, advantage: 0 });
        setWhiteClockMs(data.match.white_time_remaining_ms);
        setBlackClockMs(data.match.black_time_remaining_ms);

        if (!data.match.is_check && !isGameActive) {
          setShowVictoryModal(true);
        }
      }
    } catch {
      // Quiet fail
    }
  }, [match.id, isGameActive]);

  // 3. Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chess:${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chess_matches",
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          const updated = payload.new as typeof initialMatch;
          setMatch((prev) => ({
            ...prev,
            ...updated,
          }));
          setWhiteClockMs(updated.white_time_remaining_ms);
          setBlackClockMs(updated.black_time_remaining_ms);

          // Audio cues
          if (updated.is_check) {
            chessSounds.playCheck();
          } else {
            chessSounds.playMove();
          }

          // Check for game end
          if (updated.game_status !== "active" && updated.game_status !== "check") {
            const isWinner =
              (updated.game_status === "checkmate" && updated.turn !== viewer.color) ||
              (updated.resigned_by && updated.resigned_by !== viewer.userId);

            if (isWinner) {
              chessSounds.playVictory();
            } else if (updated.is_draw) {
              chessSounds.playDefeat();
            } else {
              chessSounds.playDefeat();
            }
            setShowVictoryModal(true);
          }

          // Refresh legal moves for turn holder
          refreshMatchState();
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id, supabase, viewer.color, viewer.userId, refreshMatchState]);

  // 4. Polling Fallback (every 4 seconds) to guarantee synchronization
  useEffect(() => {
    if (!isGameActive) return;
    const pollInterval = setInterval(() => {
      refreshMatchState();
    }, 4000);
    return () => clearInterval(pollInterval);
  }, [isGameActive, refreshMatchState]);

  // 5. Handle Move Execution
  const handleMove = useCallback(
    async (from: string, to: string, promotion?: string): Promise<boolean> => {
      if (isSubmittingMove || !isMyTurn || !isGameActive) return false;

      setIsSubmittingMove(true);
      try {
        const res = await fetch(`/api/chess/match/${match.id}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expected_ply: match.ply,
            from,
            to,
            promotion,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          console.warn("[Chess] Move failed:", data.error);
          await refreshMatchState();
          return false;
        }

        // Optimistically record last move highlight
        setLastMoveSquares({ from, to });

        // Tactile sound effect
        if (data.is_capture) {
          chessSounds.playCapture();
        } else if (data.is_check) {
          chessSounds.playCheck();
        } else {
          chessSounds.playMove();
        }

        // Apply updated state immediately
        setMatch((prev) => ({
          ...prev,
          fen: data.fen,
          pgn: data.pgn,
          turn: data.turn,
          ply: data.ply,
          is_check: data.is_check,
          is_checkmate: data.is_checkmate,
          is_stalemate: data.is_stalemate,
          is_draw: data.is_draw,
          game_status: data.game_status,
          white_time_remaining_ms: data.white_time_remaining_ms,
          black_time_remaining_ms: data.black_time_remaining_ms,
          last_move_at: new Date().toISOString(),
        }));

        setWhiteClockMs(data.white_time_remaining_ms);
        setBlackClockMs(data.black_time_remaining_ms);

        if (data.game_status !== "active" && data.game_status !== "check") {
          setWinnerId(data.winner_id);
          setWinReason(data.game_status);
          chessSounds.playVictory();
          setShowVictoryModal(true);
        } else {
          // Fetch new legal moves for next position
          await refreshMatchState();
        }

        return true;
      } catch (err) {
        console.error("[Chess] Move submission error:", err);
        await refreshMatchState();
        return false;
      } finally {
        setIsSubmittingMove(false);
      }
    },
    [isSubmittingMove, isMyTurn, isGameActive, match.id, match.ply, refreshMatchState],
  );

  // 7. Handle Resignation
  const handleResign = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/chess/match/${match.id}/resign`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setWinnerId(data.winner_id);
        setWinReason("resigned");
        chessSounds.playDefeat();
        setShowResignConfirm(false);
        setShowVictoryModal(true);
        await refreshMatchState();
      }
    } catch (err) {
      console.error("[Chess] Resign failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Handle Draw Offer & Responses
  const handleDrawAction = async (action: "offer" | "accept" | "decline") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/chess/match/${match.id}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === "accept") {
          setShowVictoryModal(true);
        }
        await refreshMatchState();
      }
    } catch (err) {
      console.error("[Chess] Draw action failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Handle Claim Timeout
  const handleClaimTimeout = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/chess/match/${match.id}/timeout`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setWinnerId(data.winner_id);
        setWinReason("timeout");
        chessSounds.playVictory();
        setShowVictoryModal(true);
        await refreshMatchState();
      }
    } catch (err) {
      console.error("[Chess] Claim timeout failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Format clock mm:ss or mm:ss.d
  const formatTime = (ms: number): string => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (totalSecs < 10) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${tenths}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const oppClockMs = isWhiteViewer ? blackClockMs : whiteClockMs;
  const myClockMs = isWhiteViewer ? whiteClockMs : blackClockMs;

  const isOppClockLow = oppClockMs < 30000;
  const isMyClockLow = myClockMs < 30000;

  const isOppTurn = (match.turn === "w" && !isWhiteViewer) || (match.turn === "b" && isWhiteViewer);
  const oppHasTimedOut = isOppTurn && oppClockMs <= 0;

  const oppOfferedDraw = match.draw_offered_by && match.draw_offered_by !== viewer.userId;
  const iOfferedDraw = match.draw_offered_by && match.draw_offered_by === viewer.userId;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 select-none">
      {/* ── Top Game Bar: Header, Live status, Sound toggle ──────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border border-[#E2E8E2] rounded-2xl shadow-card">
        <Link
          href="/games"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#65736F] hover:text-[#203331] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Arena</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant={isGameActive ? (match.is_check ? "coral" : "teal") : "muted"}>
            {match.is_check ? "Check!" : isGameActive ? "Speed Blitz 5+3" : "Finished"}
          </Badge>
          <span
            className={cn("w-2 h-2 rounded-full", isConnected ? "bg-[#167D78] animate-pulse" : "bg-[#D95F49]")}
            title={isConnected ? "Realtime connected" : "Connecting..."}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            const nextMuted = chessSounds.toggleMute();
            setIsMuted(nextMuted);
          }}
          className="p-1.5 rounded-lg text-[#65736F] hover:text-[#203331] hover:bg-[#F7F8F4] transition-colors"
          title={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Opponent Player Card ────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200",
          isOppTurn && isGameActive
            ? "bg-[#DDF2EB]/40 border-[#167D78] shadow-md shadow-[#167D78]/10"
            : "bg-white border-[#E2E8E2] shadow-card",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={oppPlayer.avatar_url ?? undefined}
            name={oppPlayer.display_name}
            className="w-10 h-10 border border-[#E2E8E2] shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm text-[#203331] truncate">{oppPlayer.display_name}</span>
              <span className="text-[10px] text-[#65736F] uppercase font-mono shrink-0">
                {isWhiteViewer ? "Black" : "White"}
              </span>
            </div>
            {/* Captured Pieces by Opponent */}
            <div className="flex items-center gap-1 mt-0.5 min-h-[18px]">
              {(isWhiteViewer ? captured.black : captured.white).map((p, i) => (
                <div key={i} className="w-4 h-4">
                  <ChessPieceSvg piece={p} />
                </div>
              ))}
              {/* Material Advantage Badge */}
              {((isWhiteViewer && captured.advantage < 0) || (!isWhiteViewer && captured.advantage > 0)) && (
                <span className="text-[10px] font-bold text-emerald-400 ml-1">
                  +{Math.abs(captured.advantage)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Opponent Digital Clock */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-lg md:text-xl shrink-0",
            isOppClockLow ? "bg-[#FCE6DE] border-[#D95F49] text-[#D95F49] animate-pulse" : "bg-[#F7F8F4] border-[#E2E8E2] text-[#203331]",
          )}
        >
          <Clock className="w-4 h-4 text-[#8E9B97]" />
          <span>{formatTime(oppClockMs)}</span>
        </div>
      </div>

      {/* ── Draw Offer Notification Banner (if opponent offered) ────────────── */}
      {oppOfferedDraw && isGameActive && (
        <div className="p-3 bg-[#FEF3C7] border border-[#D97706]/30 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-[#92400E]">
            <Handshake className="w-4 h-4 shrink-0 text-[#D97706]" />
            <span>{oppPlayer.display_name} offers a draw.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleDrawAction("accept")}
              disabled={actionLoading}
              className="h-7 text-xs font-bold"
            >
              Accept
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDrawAction("decline")}
              disabled={actionLoading}
              className="h-7 text-xs"
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* ── Interactive Chess Board ─────────────────────────────────────────── */}
      <ChessBoard
        fen={match.fen}
        turn={match.turn}
        viewerColor={viewer.color}
        isMyTurn={isMyTurn}
        isCheck={match.is_check}
        lastMove={lastMoveSquares}
        legalMoves={legalMoves}
        onMove={handleMove}
        disabled={!isGameActive || isSubmittingMove}
      />

      {/* ── Viewer Player Card ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200",
          isMyTurn && isGameActive
            ? "bg-[#DDF2EB]/40 border-[#167D78] shadow-md shadow-[#167D78]/10"
            : "bg-white border-[#E2E8E2] shadow-card",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={myPlayer.avatar_url ?? undefined}
            name={myPlayer.display_name}
            className="w-10 h-10 border border-[#E2E8E2] shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm text-[#203331] truncate">{myPlayer.display_name} (You)</span>
              <span className="text-[10px] text-[#65736F] uppercase font-mono shrink-0">
                {isWhiteViewer ? "White" : "Black"}
              </span>
            </div>
            {/* Captured Pieces by Viewer */}
            <div className="flex items-center gap-1 mt-0.5 min-h-[18px]">
              {(isWhiteViewer ? captured.white : captured.black).map((p, i) => (
                <div key={i} className="w-4 h-4">
                  <ChessPieceSvg piece={p} />
                </div>
              ))}
              {/* Material Advantage Badge */}
              {((isWhiteViewer && captured.advantage > 0) || (!isWhiteViewer && captured.advantage < 0)) && (
                <span className="text-[10px] font-bold text-[#167D78] ml-1">
                  +{Math.abs(captured.advantage)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Viewer Digital Clock */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-lg md:text-xl shrink-0",
            isMyClockLow ? "bg-[#FCE6DE] border-[#D95F49] text-[#D95F49] animate-pulse" : "bg-[#F7F8F4] border-[#E2E8E2] text-[#203331]",
          )}
        >
          <Clock className="w-4 h-4 text-[#8E9B97]" />
          <span>{formatTime(myClockMs)}</span>
        </div>
      </div>

      {/* ── In-Game Action Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 p-2.5 bg-white border border-[#E2E8E2] rounded-2xl shadow-card">
        {oppHasTimedOut ? (
          <Button
            variant="coral"
            size="sm"
            onClick={handleClaimTimeout}
            disabled={actionLoading}
            className="w-full font-bold animate-bounce"
          >
            Claim Opponent Timeout!
          </Button>
        ) : (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowResignConfirm(true)}
              disabled={!isGameActive || actionLoading}
              className="text-xs"
            >
              <Flag className="w-3.5 h-3.5 mr-1.5" />
              Resign
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDrawAction("offer")}
              disabled={!isGameActive || Boolean(iOfferedDraw) || actionLoading}
              className="text-xs"
            >
              <Handshake className="w-3.5 h-3.5 mr-1.5" />
              {iOfferedDraw ? "Draw Offered" : "Offer Draw"}
            </Button>
          </>
        )}
      </div>

      {/* ── Resignation Confirmation Modal ──────────────────────────────────── */}
      {showResignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#E2E8E2] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.3)] text-[#D95F49] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#203331]">Resign Chess Match?</h3>
              <p className="text-xs text-[#65736F] mt-1 leading-relaxed">
                Resigning concludes the game immediately as a defeat and grants your opponent the right to assign a Dare.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowResignConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="coral"
                size="md"
                onClick={handleResign}
                disabled={actionLoading}
                className="flex-1 font-bold"
              >
                Resign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Post-Game Victory / Defeat / Dare Modal ──────────────────────────── */}
      <ChessVictoryModal
        isOpen={showVictoryModal}
        onClose={() => setShowVictoryModal(false)}
        matchId={match.id}
        viewerId={viewer.userId}
        winnerId={winnerId || (match.game_status === "checkmate" ? (match.turn === "w" ? players.black.id : players.white.id) : null)}
        winReason={winReason || match.game_status}
        isDraw={match.is_draw}
        whitePlayer={players.white}
        blackPlayer={players.black}
      />
    </div>
  );
};
