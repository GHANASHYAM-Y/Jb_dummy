"use client";

import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

// Evaluated at module load time — stable during prerender (Next.js 16 requirement).
const CURRENT_YEAR = new Date().getFullYear();

export function FuturisticFooter() {
  const currentYear = CURRENT_YEAR;

  const gameLinks = [
    { href: "/play/rps", label: "Rock, Paper, Scissors" },
    { href: "/play/chess", label: "Speed Chess" },
    { href: "/play/hand-cricket", label: "Hand Cricket" },
    { href: "/play/ludo", label: "Ludo" },
    { href: "/play/password-game", label: "Password Game" },
    { href: "/challenges", label: "Dare Challenges & Stories" },
    { href: "/games", label: "All Game Arenas" },
  ];

  const exploreLinks = [
    { href: "/how-to-play", label: "How It Works" },
    { href: "/about", label: "About EVOAIQU" },
    { href: "/login", label: "Player Login" },
    { href: "/signup", label: "Join EVOAIQU" },
  ];

  const legalLinks = [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ];

  const column = (title: string, items: { href: string; label: string }[]) => (
    <div className="space-y-3">
      <h4 className="font-display font-bold text-lg text-[#1E1B24]">{title}</h4>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="inline-flex items-center min-h-[36px] font-semibold text-[#6E6878] hover:text-[#C9381F] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="w-full bg-[#FFF6EC] text-[#6E6878] px-4 sm:px-7 pb-8 pt-4">
      <div className="max-w-[1180px] mx-auto rounded-[32px] bg-white border-2 border-[#EADBC8] shadow-[0_4px_0_#EADBC8] px-6 sm:px-10 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-10 border-b-2 border-[#EADBC8]">
          {/* Brand Info */}
          <div className="lg:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]">
              <span className="b-logo-mark w-[36px] h-[36px]" aria-hidden="true">EQ</span>
              <span className="font-display font-bold text-[1.7rem] leading-none tracking-tight text-[#1E1B24]">
                EVOAIQU
              </span>
            </Link>

            <p className="text-sm text-[#6E6878] leading-relaxed max-w-sm">
              The social gaming platform bringing people together through quick multiplayer battles, friendly rivalries, and unforgettable moments.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E3FAF3] border-2 border-[#B7EEDD] text-xs text-[#0B6B55] font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Safe • Consensual • 100% Free</span>
            </div>
          </div>

          <div className="lg:col-span-3">{column("Game Arenas", gameLinks)}</div>
          <div className="lg:col-span-2">{column("Platform", exploreLinks)}</div>
          <div className="lg:col-span-2">{column("Trust & Legal", legalLinks)}</div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-[#6E6878]">
          <p>© {currentYear} EVOAIQU Platform. All rights reserved.</p>
          <p>Built for friendly rivalry and unforgettable moments. 🎉</p>
        </div>
      </div>
    </footer>
  );
}
