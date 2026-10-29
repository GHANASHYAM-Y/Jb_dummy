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

  return (
    <footer className="w-full bg-[#070B25] border-t border-[#315BFF]/25 text-[#9BA8D7] relative overflow-hidden">
      {/* Ambient Top Edge Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-px bg-gradient-to-r from-transparent via-[#39DFFF]/40 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-10 border-b border-[#315BFF]/20">
          
          {/* Brand Info */}
          <div className="lg:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center shadow-[0_0_16px_rgba(49,91,255,0.4)] border border-[#39DFFF]/30">
                <span className="font-display font-black text-sm text-white">EQ</span>
              </div>
              <span className="font-display font-black text-xl text-[#F5F7FF] tracking-wider">
                EVOAIQU
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-[#9BA8D7] leading-relaxed max-w-sm">
              The next-generation social gaming platform bringing people together through competitive multiplayer battles, friendly rivalries, and unforgettable moments.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101638] border border-[#315BFF]/30 text-xs text-[#39DFFF] font-mono">
              <Shield className="w-3.5 h-3.5" />
              <span>Safe • Consensual • 100% Free</span>
            </div>
          </div>

          {/* Quick Games */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F5F7FF] font-mono">
              Game Arenas
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              {gameLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="hover:text-[#39DFFF] transition-colors inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation & Platform */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F5F7FF] font-mono">
              Platform
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              {exploreLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="hover:text-[#39DFFF] transition-colors inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F5F7FF] font-mono">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              {legalLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="hover:text-[#39DFFF] transition-colors inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Rights */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9BA8D7]/80">
          <p>© {currentYear} EVOAIQU Platform. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-xs text-[#9BA8D7]/70">
            Built for friendly rivalry and unforgettable moments.
          </p>
        </div>
      </div>
    </footer>
  );
}
