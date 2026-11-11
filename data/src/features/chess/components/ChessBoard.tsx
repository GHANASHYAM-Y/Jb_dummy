"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ChessPieceSvg } from "./ChessPieceSvg";
import { ChessColor, LegalMoveTarget } from "@/features/chess/types";
import { cn } from "@/shared/lib/utils";

interface ChessBoardProps {
  fen: string;
  turn: ChessColor;
  viewerColor: ChessColor;
  isMyTurn: boolean;
  isCheck: boolean;
  lastMove?: { from: string; to: string } | null;
  legalMoves: LegalMoveTarget[];
  onMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
  disabled?: boolean;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  turn,
  viewerColor,
  isMyTurn,
  isCheck,
  lastMove,
  legalMoves,
  onMove,
  disabled = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [draggedSquare, setDraggedSquare] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  // 1. Parse FEN board position into 8x8 matrix
  const boardMatrix = useMemo(() => {
    const [placement] = fen.split(" ");
    const rows = placement.split("/");
    const grid: Record<string, string> = {};

    rows.forEach((rowStr, rankIdx) => {
      const rank = (8 - rankIdx).toString();
      let fileIdx = 0;
      for (const char of rowStr) {
        if (/[1-8]/.test(char)) {
          fileIdx += parseInt(char, 10);
        } else {
          const file = FILES[fileIdx];
          grid[`${file}${rank}`] = char;
          fileIdx += 1;
        }
      }
    });

    return grid;
  }, [fen]);

  // 2. Determine ordered ranks and files based on player board perspective
  const isFlipped = viewerColor === "b";
  const displayRanks = useMemo(() => (isFlipped ? [...RANKS].reverse() : RANKS), [isFlipped]);
  const displayFiles = useMemo(() => (isFlipped ? [...FILES].reverse() : FILES), [isFlipped]);

  // 3. Find the King currently under check
  const checkedKingSquare = useMemo(() => {
    if (!isCheck) return null;
    const targetKingPiece = turn === "w" ? "K" : "k";
    for (const [sq, piece] of Object.entries(boardMatrix)) {
      if (piece === targetKingPiece) return sq;
    }
    return null;
  }, [isCheck, turn, boardMatrix]);

  // 4. Calculate legal destinations for currently selected square
  const legalDestinationsForSelected = useMemo(() => {
    if (!selectedSquare) return new Map<string, LegalMoveTarget>();
    const targets = legalMoves.filter((m) => m.from === selectedSquare);
    const map = new Map<string, LegalMoveTarget>();
    targets.forEach((t) => map.set(t.to, t));
    return map;
  }, [selectedSquare, legalMoves]);

  // 5. Handle Square Selection / Click-to-Move
  const handleSquareClick = useCallback(
    async (square: string) => {
      if (disabled || !isMyTurn) return;

      const pieceOnSquare = boardMatrix[square];
      const isOwnPiece =
        pieceOnSquare &&
        ((viewerColor === "w" && pieceOnSquare === pieceOnSquare.toUpperCase()) ||
          (viewerColor === "b" && pieceOnSquare === pieceOnSquare.toLowerCase()));

      // Case A: Clicking own piece selects it
      if (isOwnPiece) {
        setSelectedSquare(square);
        return;
      }

      // Case B: Clicking a destination while a piece is selected
      if (selectedSquare) {
        const moveTarget = legalDestinationsForSelected.get(square);
        if (moveTarget) {
          const movingPiece = boardMatrix[selectedSquare];
          const isPawn = movingPiece && movingPiece.toLowerCase() === "p";
          const isPromoting =
            isPawn && ((viewerColor === "w" && square.endsWith("8")) || (viewerColor === "b" && square.endsWith("1")));

          if (isPromoting) {
            setPendingPromotion({ from: selectedSquare, to: square });
            return;
          }

          setSelectedSquare(null);
          await onMove(selectedSquare, square);
          return;
        }

        // Clicking an invalid square deselects
        setSelectedSquare(null);
      }
    },
    [disabled, isMyTurn, boardMatrix, viewerColor, selectedSquare, legalDestinationsForSelected, onMove],
  );

  // 6. Handle Drag-and-Drop
  const handleDragStart = useCallback(
    (e: React.DragEvent, square: string) => {
      if (disabled || !isMyTurn) {
        e.preventDefault();
        return;
      }
      const pieceOnSquare = boardMatrix[square];
      const isOwnPiece =
        pieceOnSquare &&
        ((viewerColor === "w" && pieceOnSquare === pieceOnSquare.toUpperCase()) ||
          (viewerColor === "b" && pieceOnSquare === pieceOnSquare.toLowerCase()));

      if (!isOwnPiece) {
        e.preventDefault();
        return;
      }

      setDraggedSquare(square);
      setSelectedSquare(square);
      e.dataTransfer.setData("text/plain", square);
      e.dataTransfer.effectAllowed = "move";
    },
    [disabled, isMyTurn, boardMatrix, viewerColor],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetSquare: string) => {
      e.preventDefault();
      const sourceSquare = draggedSquare || e.dataTransfer.getData("text/plain");
      setDraggedSquare(null);

      if (!sourceSquare || sourceSquare === targetSquare) return;

      const validMove = legalMoves.find((m) => m.from === sourceSquare && m.to === targetSquare);
      if (!validMove) return;

      const movingPiece = boardMatrix[sourceSquare];
      const isPawn = movingPiece && movingPiece.toLowerCase() === "p";
      const isPromoting =
        isPawn && ((viewerColor === "w" && targetSquare.endsWith("8")) || (viewerColor === "b" && targetSquare.endsWith("1")));

      if (isPromoting) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        return;
      }

      setSelectedSquare(null);
      await onMove(sourceSquare, targetSquare);
    },
    [draggedSquare, legalMoves, boardMatrix, viewerColor, onMove],
  );

  // 7. Complete Promotion selection
  const handleSelectPromotion = useCallback(
    async (promoPiece: string) => {
      if (!pendingPromotion) return;
      const { from, to } = pendingPromotion;
      setPendingPromotion(null);
      setSelectedSquare(null);
      await onMove(from, to, promoPiece);
    },
    [pendingPromotion, onMove],
  );

  return (
    <div className="relative w-full max-w-[540px] mx-auto select-none">
      {/* Board Frame */}
      <div className="aspect-square w-full rounded-2xl overflow-hidden border-2 border-[#1E293B] shadow-2xl bg-[#0F172A] p-1.5 md:p-2.5">
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border border-[#334155]">
          {displayRanks.map((rank, rankIdx) =>
            displayFiles.map((file, fileIdx) => {
              const square = `${file}${rank}`;
              const piece = boardMatrix[square];
              const isDark = (rankIdx + fileIdx) % 2 === 1;

              const isSelected = selectedSquare === square;
              const isLastMoveSource = lastMove?.from === square;
              const isLastMoveTarget = lastMove?.to === square;
              const isKingInCheck = checkedKingSquare === square;

              const legalTarget = legalDestinationsForSelected.get(square);
              const isLegalMove = Boolean(legalTarget);
              const isCapture = isLegalMove && (Boolean(piece) || legalTarget?.isCapture);

              // Coordinates indicators on outer edges
              const showRankCoord = fileIdx === 0;
              const showFileCoord = rankIdx === 7;

              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, square)}
                  className={cn(
                    "relative flex items-center justify-center cursor-pointer transition-colors duration-100",
                    isDark ? "bg-[#334155]/80 hover:bg-[#334155]" : "bg-[#94A3B8]/90 hover:bg-[#CBD5E1]",
                    isSelected && "ring-4 ring-inset ring-[#14B8A6] z-10",
                    (isLastMoveSource || isLastMoveTarget) && "bg-amber-400/35",
                    isKingInCheck && "bg-rose-500/70 ring-4 ring-inset ring-rose-500 animate-pulse z-10",
                  )}
                  data-square={square}
                  role="button"
                  aria-label={`${square} ${piece ? `piece ${piece}` : "empty"}`}
                >
                  {/* Rank Coordinate label (Top Left) */}
                  {showRankCoord && (
                    <span
                      className={cn(
                        "absolute top-0.5 left-1 text-[9px] md:text-[11px] font-mono font-bold pointer-events-none select-none",
                        isDark ? "text-slate-400" : "text-slate-700",
                      )}
                    >
                      {rank}
                    </span>
                  )}

                  {/* File Coordinate label (Bottom Right) */}
                  {showFileCoord && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 right-1 text-[9px] md:text-[11px] font-mono font-bold pointer-events-none select-none",
                        isDark ? "text-slate-400" : "text-slate-700",
                      )}
                    >
                      {file}
                    </span>
                  )}

                  {/* Chess Piece Graphic */}
                  {piece && (
                    <div
                      draggable={!disabled && isMyTurn}
                      onDragStart={(e) => handleDragStart(e, square)}
                      className={cn(
                        "w-4/5 h-4/5 flex items-center justify-center transition-transform",
                        !disabled && isMyTurn && "hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <ChessPieceSvg piece={piece} />
                    </div>
                  )}

                  {/* Legal Move Indicators */}
                  {isLegalMove && !isCapture && (
                    <div className="absolute w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-[#14B8A6] opacity-75 shadow-sm pointer-events-none transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />
                  )}

                  {isCapture && (
                    <div className="absolute inset-1 rounded-full border-[3.5px] border-[#EF4444] opacity-80 pointer-events-none animate-pulse" />
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm rounded-2xl p-4 animate-in fade-in duration-150">
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 shadow-2xl max-w-xs w-full text-center space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Promote Pawn</h3>
            <p className="text-xs text-slate-300">Choose which piece your pawn evolves into:</p>
            <div className="grid grid-cols-4 gap-2.5 pt-1">
              {[
                { type: "q", label: "Queen" },
                { type: "r", label: "Rook" },
                { type: "b", label: "Bishop" },
                { type: "n", label: "Knight" },
              ].map(({ type, label }) => {
                const pieceSymbol = viewerColor === "w" ? type.toUpperCase() : type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectPromotion(type)}
                    className="p-3 bg-[#0F172A] hover:bg-[#334155] border border-[#475569] rounded-xl flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 shadow-md"
                    title={label}
                  >
                    <div className="w-10 h-10">
                      <ChessPieceSvg piece={pieceSymbol} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-300">{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPendingPromotion(null)}
              className="text-xs text-slate-400 hover:text-white pt-2 underline underline-offset-4"
            >
              Cancel Move
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
