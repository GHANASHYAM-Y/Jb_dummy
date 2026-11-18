"use client";

import React, { useState } from "react";
import { cn } from "@/shared/lib/utils";

const MOVES = [
  { id: "rock", emoji: "✊", label: "Rock", tile: "bg-[#FFC23D] border-[#E9A912] shadow-[0_5px_0_#E9A912] -rotate-6" },
  { id: "paper", emoji: "✋", label: "Paper", tile: "bg-[#14C49A] border-[#0FA07D] shadow-[0_5px_0_#0FA07D] rotate-2" },
  { id: "scissors", emoji: "✌️", label: "Scissors", tile: "bg-[#8C7BFF] border-[#6D5BE0] shadow-[0_5px_0_#6D5BE0] rotate-6" },
] as const;

/**
 * Concept B hero artwork: three chunky sticker tiles (rock / paper /
 * scissors) on a sticker card with a "first to 5" scoreline and a dare
 * bubble. Tiles are tappable for a little pick animation only.
 */
export function FuturisticHeroArtwork() {
  const [active, setActive] = useState<(typeof MOVES)[number]["id"]>("rock");

  return (
    <div className="relative w-full max-w-[460px] mx-auto select-none" role="group" aria-label="Rock Paper Scissors sticker preview">
      <div className="b-card !rounded-[32px] !p-6 sm:!p-7 space-y-5">
        <div className="flex items-center justify-between">
          <span className="b-chip !py-1.5 !text-xs">⚡ First to 5</span>
          <span className="font-display font-bold text-2xl text-[#1E1B24]">
            3 <span className="text-[#8E8798]">–</span> 2
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {MOVES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(m.id)}
              aria-pressed={active === m.id}
              aria-label={m.label}
              className={cn(
                "aspect-square rounded-[26px] border-2 grid place-items-center text-5xl transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2 cursor-pointer",
                m.tile,
                active === m.id ? "-translate-y-2 scale-105" : "hover:-translate-y-1",
              )}
            >
              <span aria-hidden="true">{m.emoji}</span>
            </button>
          ))}
        </div>

        <div className="rounded-[22px] bg-[#FF5A3C] text-white p-4 shadow-[0_5px_0_#C9381F]">
          <p className="text-xs font-extrabold uppercase tracking-wider">You owe a dare</p>
          <p className="font-display font-bold text-xl leading-snug">🎤 Singing: belt one chorus!</p>
        </div>
      </div>

      <span aria-hidden="true" className="absolute -top-5 -right-3 text-4xl rotate-12">✨</span>
      <span aria-hidden="true" className="absolute -bottom-5 -left-3 text-4xl -rotate-12">🏆</span>
    </div>
  );
}
