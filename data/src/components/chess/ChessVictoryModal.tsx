"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Flame,
  RotateCcw,
  ArrowLeft,
  XCircle,
  Sparkles,
  Award,
  X,
} from "lucide-react";
import { Button, Badge } from "@/shared/ui";
import { ChallengeSelectionModal } from "@/components/challenges/ChallengeSelectionModal";
import { MatchChallengeCard } from "@/components/challenges/MatchChallengeCard";
import type { Challenge } from "@/types/database";

interface ChessVictoryModalProps {
  isOpen: boolean;
  onClose?: () => void;
  matchId: string;
  viewerId: string;
  winnerId: string | null;
  winReason: string | null;
  isDraw: boolean;
  whitePlayer: { id: string; display_name: string; evoora_id?: string | null };
  blackPlayer: { id: string; display_name: string; evoora_id?: string | null };
  initialChallenge?: Challenge | null;
}

export const ChessVictoryModal: React.FC<ChessVictoryModalProps> = ({
  isOpen,
  onClose,
  matchId,
  viewerId,
  winnerId,
  winReason,
  isDraw,
  whitePlayer,
  blackPlayer,
  initialChallenge = null,
}) => {
  const router = useRouter();
  const [isDareModalOpen, setIsDareModalOpen] = useState(false);
  const [assignedChallenge, setAssignedChallenge] = useState<Challenge | null>(initialChallenge);
  const [isRematching, setIsRematching] = useState(false);

  if (!isOpen) return null;

  const isWinner = viewerId === winnerId;
  const opponent = viewerId === whitePlayer.id ? blackPlayer : whitePlayer;

  // Format reason label
  const reasonLabel =
    winReason === "checkmate"
      ? "Victory by Checkmate"
      : winReason === "resigned"
      ? "Won by Resignation"
      : winReason === "timeout"
      ? "Won on Time"
      : winReason === "stalemate"
      ? "Draw by Stalemate"
      : winReason === "insufficient_material"
      ? "Draw by Insufficient Material"
      : isDraw
      ? "Draw Agreed"
      : "Match Completed";

  const handleRematch = async () => {
    setIsRematching(true);
    try {
      const res = await fetch("/api/chess/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponent_id: opponent.id }),
      });
      const data = await res.json();
      if (data.success && data.match_id) {
        router.push(`/play/chess/${data.match_id}`);
      }
    } catch {
      // Fallback
    } finally {
      setIsRematching(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white border border-[#E2E8E2] rounded-3xl max-w-md w-full p-6 md:p-8 text-center shadow-2xl space-y-6 relative overflow-hidden text-[#203331]">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#8E9B97] hover:text-[#203331] hover:bg-[#F7F8F4] transition-colors z-20"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Outcome Graphic */}
          <div className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center shadow-xs relative z-10 border border-[#E2E8E2]">
            {isWinner ? (
              <div className="w-full h-full rounded-3xl bg-[#DDF2EB] flex items-center justify-center text-[#167D78]">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>
            ) : isDraw ? (
              <div className="w-full h-full rounded-3xl bg-[#EEF1ED] flex items-center justify-center text-[#65736F]">
                <Award className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-full h-full rounded-3xl bg-[#FCE6DE] flex items-center justify-center text-[#D95F49]">
                <XCircle className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Title & Reason */}
          <div className="space-y-1.5 relative z-10">
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-[#203331]">
              {isWinner ? "Triumphant Victory!" : isDraw ? "Honorable Stalemate" : "Defeat"}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <Badge variant={isWinner ? "teal" : isDraw ? "muted" : "coral"}>
                {reasonLabel}
              </Badge>
            </div>
          </div>

          {/* Already-assigned Dare display */}
          {assignedChallenge && (
            <div className="text-left relative z-10 pt-2">
              <MatchChallengeCard
                challenge={assignedChallenge}
                userId={viewerId}
                opponentName={opponent.display_name}
                opponentEvoId={opponent.evoora_id ?? undefined}
                onStatusChange={(updated) => setAssignedChallenge(updated)}
              />
            </div>
          )}

          {/* Winner Dare Action */}
          {isWinner && !assignedChallenge && (
            <div className="bg-[#FCE6DE] border border-[rgba(217,95,73,0.3)] rounded-2xl p-4 text-center space-y-3 relative z-10">
              <div className="flex items-center justify-center gap-1.5 text-[#D95F49] text-sm font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Winner Privilege Unlocked</span>
              </div>
              <p className="text-xs text-[#65736F]">
                You vanquished <strong className="text-[#203331]">{opponent.display_name}</strong>! Choose a dare from Dare Studio.
              </p>
              <Button
                variant="coral"
                size="md"
                onClick={() => setIsDareModalOpen(true)}
                className="w-full font-bold shadow-sm"
              >
                <Flame className="w-4 h-4 mr-2" />
                Dare the Loser
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 relative z-10">
            <Button
              variant="primary"
              size="md"
              onClick={handleRematch}
              disabled={isRematching}
              className="flex-1 font-bold"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isRematching ? "Creating..." : "Rematch"}
            </Button>

            <Link href="/games" className="flex-1">
              <Button variant="secondary" size="md" className="w-full font-semibold">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Arena
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Dare Selection Modal */}
      <ChallengeSelectionModal
        isOpen={isDareModalOpen}
        onClose={() => setIsDareModalOpen(false)}
        matchId={matchId}
        opponentName={opponent.display_name}
        onSuccess={(ch) => {
          setAssignedChallenge(ch);
          setIsDareModalOpen(false);
        }}
      />
    </>
  );
};
