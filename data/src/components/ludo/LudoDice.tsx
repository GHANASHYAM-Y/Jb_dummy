"use client";

import React, { useEffect, useState } from "react";
import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Color } from "@/lib/ludo/engine";
import { COLOR_HEX } from "./LudoBoard";

/** Pip positions on a 3x3 grid (0 = top-left, 8 = bottom-right). */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function DiceFace({ value, color, rolling = false, size = "md" }: { value: number | null; color: Color; rolling?: boolean; size?: "sm" | "md" }) {
  const pips = value ? PIPS[value] ?? [] : [];
  return (
    <div
      className={cn(
        "grid grid-cols-3 grid-rows-3 rounded-2xl bg-[#F5F7FF] border-4 shadow-lg",
        size === "md" ? "w-16 h-16 p-2 gap-0.5" : "w-11 h-11 p-1.5 gap-0",
        rolling && "ludo-dice-rolling",
      )}
      style={{ borderColor: COLOR_HEX[color] }}
      role="img"
      aria-label={value ? `Die showing ${value}` : "Die not rolled yet"}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {pips.includes(i) && <span className="block w-[70%] aspect-square rounded-full bg-[#070B25]" />}
        </span>
      ))}
    </div>
  );
}

interface LudoDiceProps {
  /** Face to show when not rolling (null = blank). */
  value: number | null;
  rolling: boolean;
  disabled: boolean;
  onRoll: () => void;
  /** Colour of the player the die belongs to. */
  color: Color;
  /** Short line under the button, e.g. "Your turn". */
  caption?: string | null;
}

/** Die with a short roll animation and a Roll button (Space or Enter also roll). */
export function LudoDice({ value, rolling, disabled, onRoll, color, caption }: LudoDiceProps) {
  const [spinFace, setSpinFace] = useState(1);

  useEffect(() => {
    if (!rolling) return;
    const id = setInterval(() => setSpinFace(Math.floor(Math.random() * 6) + 1), 90);
    return () => clearInterval(id);
  }, [rolling]);

  // Space / Enter roll when nothing else on the page has keyboard focus
  useEffect(() => {
    if (disabled || rolling) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== " " && event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("button, a, input, textarea, select, [role='button'], [contenteditable='true']")) return;
      event.preventDefault();
      onRoll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, rolling, onRoll]);

  return (
    <div className="flex items-center gap-4">
      <style>{`
        @keyframes ludo-dice-shake { 0% { transform: rotate(0deg) scale(1); } 25% { transform: rotate(-14deg) scale(1.06); } 50% { transform: rotate(10deg) scale(0.96); } 75% { transform: rotate(-6deg) scale(1.04); } 100% { transform: rotate(0deg) scale(1); } }
        .ludo-dice-rolling { animation: ludo-dice-shake 0.35s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ludo-dice-rolling { animation: none; } }
      `}</style>
      <DiceFace value={rolling ? spinFace : value} color={color} rolling={rolling} />
      <div className="flex flex-col items-start gap-1 min-w-0">
        <button
          type="button"
          onClick={onRoll}
          disabled={disabled || rolling}
          className={cn(
            "evo-btn evo-btn-primary font-bold min-w-[120px]",
            (disabled || rolling) && "opacity-50 cursor-not-allowed",
          )}
          aria-keyshortcuts="Space Enter"
        >
          <Dices className="w-4 h-4 mr-2" aria-hidden="true" />
          {rolling ? "Rolling…" : "Roll"}
        </button>
        {caption && <p className="text-[11px] text-[#8B98B5] truncate max-w-[180px]">{caption}</p>}
      </div>
    </div>
  );
}
