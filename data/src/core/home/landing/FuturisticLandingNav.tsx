"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu, X, ArrowRight, UserCircle, LogIn
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui";
import { createClient } from "@/core/supabase/client";

interface FuturisticLandingNavProps {
  user?: { id: string; email?: string } | null;
}

export function FuturisticLandingNav({ user }: FuturisticLandingNavProps) {
  const [clientUser, setClientUser] = useState<{ id: string; email?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (user) return;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setClientUser({ id: data.user.id, email: data.user.email });
        }
      });
    } catch {
      // Quiet fallback
    }
  }, [user]);

  const currentUser = user || clientUser;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#hero", label: "Home" },
    { href: "#games", label: "Games" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "/about", label: "About" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-[#070B25]/92 border-b border-[#315BFF]/25 backdrop-blur-xl shadow-[0_8px_30px_rgba(7,11,37,0.85)] py-3.5 sm:py-4"
          : "bg-transparent py-5 sm:py-6"
      )}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16">
        <div className="flex items-center justify-between">
          
          {/* ── Brand Logo ── */}
          <Link
            href="/"
            className="flex items-center gap-3.5 group select-none shrink-0"
            aria-label="EVOAIQU Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center shadow-[0_0_16px_rgba(49,91,255,0.4)] border border-[#39DFFF]/40 group-hover:scale-105 transition-transform">
              <span className="font-display font-black text-sm text-white tracking-wider">
                EQ
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl text-[#F5F7FF] tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#39DFFF] group-hover:to-[#8B2CFF] transition-all">
                EVOAIQU
              </span>
              <span className="text-[10px] font-mono font-semibold text-[#B8C3E0] tracking-[0.15em] uppercase -mt-0.5 hidden sm:block">
                CYBER ARENA
              </span>
            </div>
          </Link>

          {/* ── Desktop Navigation Links ── */}
          <nav
            aria-label="Desktop Navigation"
            className="hidden md:flex items-center gap-2 lg:gap-3 px-3.5 py-1.5 rounded-2xl bg-[#101638]/70 border border-[#315BFF]/25 backdrop-blur-md"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#315BFF]/15 transition-all cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* ── Desktop Right Controls & CTAs ── */}
          <div className="hidden sm:flex items-center gap-3.5">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <Link href="/profile">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#101638] border border-[#315BFF]/30 text-xs font-semibold text-[#F5F7FF] hover:border-[#39DFFF] transition-colors">
                    <UserCircle className="w-4 h-4 text-[#39DFFF]" />
                    <span className="max-w-[120px] truncate">{currentUser.email?.split("@")[0] ?? "Player"}</span>
                  </div>
                </Link>
                <Link href="/games">
                  <Button
                    variant="primary"
                    size="sm"
                    className="!bg-gradient-to-r !from-[#315BFF] !to-[#8B2CFF] !text-white font-bold shadow-[0_0_16px_rgba(49,91,255,0.4)] px-5 py-2 rounded-xl"
                  >
                    Open Arena
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3.5">
                <Link href="/login">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#101638] transition-colors"
                  >
                    <LogIn className="w-4 h-4 text-[#39DFFF]" />
                    Log In
                  </button>
                </Link>
                <Link href="/signup">
                  <Button
                    variant="primary"
                    size="sm"
                    className="!bg-gradient-to-r !from-[#315BFF] !to-[#8B2CFF] !text-white font-bold shadow-[0_0_20px_rgba(49,91,255,0.45)] px-5 py-2 rounded-xl"
                  >
                    Play Now
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile Hamburger Trigger ── */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2.5 rounded-xl bg-[#101638] border border-[#315BFF]/30 text-[#F5F7FF] hover:text-[#39DFFF] focus:outline-none focus:ring-2 focus:ring-[#39DFFF] transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* ── Mobile Dropdown Drawer ── */}
      {mobileOpen && (
        <div className="sm:hidden border-b border-[#315BFF]/30 bg-[#070B25]/98 backdrop-blur-2xl px-6 pt-4 pb-8 animate-fade-in shadow-2xl">
          <nav className="flex flex-col gap-2 pt-2 pb-5 border-b border-[#315BFF]/20">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold text-[#F5F7FF] hover:bg-[#101638] hover:text-[#39DFFF] transition-colors"
              >
                <span>{link.label}</span>
                <span className="text-[#39DFFF] text-sm">→</span>
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3 pt-5">
            {currentUser ? (
              <>
                <Link
                  href="/games"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] text-white text-center font-bold text-sm shadow-md"
                >
                  Enter Game Arena
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 rounded-xl bg-[#101638] border border-[#315BFF]/30 text-[#B8C3E0] text-center font-semibold text-xs"
                >
                  My Profile
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] text-white text-center font-bold text-sm shadow-[0_0_20px_rgba(49,91,255,0.4)]"
                >
                  Play Now — Free Registration
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 rounded-xl bg-[#101638] border border-[#315BFF]/30 text-[#F5F7FF] text-center font-semibold text-xs"
                >
                  Log In to Existing Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
