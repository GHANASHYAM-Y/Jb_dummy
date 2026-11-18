"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu, X, ArrowRight, UserCircle, LogIn
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
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

  const pillLink =
    "inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 bg-[#FFF6EC]/95 backdrop-blur-xl border-b-2",
        scrolled ? "border-[#EADBC8] shadow-[0_3px_0_#EADBC8] py-2.5" : "border-transparent py-3.5"
      )}
    >
      <div className="max-w-[1180px] mx-auto px-4 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group select-none shrink-0 rounded-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            aria-label="EVOAIQU Home"
          >
            <span className="b-logo-mark w-[36px] h-[36px] group-hover:rotate-0 transition-transform" aria-hidden="true">EQ</span>
            <span className="font-display font-bold text-[1.7rem] leading-none tracking-tight text-[#1E1B24] group-hover:text-[#FF5A3C] transition-colors">
              EVOAIQU
            </span>
          </Link>

          {/* Desktop pill navigation */}
          <nav
            aria-label="Desktop Navigation"
            className="hidden md:flex items-center gap-1 p-1.5 rounded-full bg-white border-2 border-[#EADBC8]"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex items-center min-h-[40px] px-4 rounded-full text-sm font-bold text-[#6E6878] hover:text-[#C9381F] hover:bg-[#FFE4DD] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden sm:flex items-center gap-2.5">
            {currentUser ? (
              <>
                <Link
                  href="/profile"
                  className={`${pillLink} bg-white border-2 border-[#EADBC8] text-[#1E1B24] hover:bg-[#F5EADC]`}
                >
                  <UserCircle className="w-4 h-4 text-[#FF5A3C]" />
                  <span className="max-w-[120px] truncate">{currentUser.email?.split("@")[0] ?? "Player"}</span>
                </Link>
                <Link href="/games" className="evo-btn evo-btn-primary evo-btn-sm font-bold">
                  Open Arena
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`${pillLink} bg-white border-2 border-[#EADBC8] text-[#1E1B24] hover:bg-[#F5EADC]`}
                >
                  <LogIn className="w-4 h-4 text-[#FF5A3C]" />
                  Sign in
                </Link>
                <Link href="/signup" className="evo-btn evo-btn-primary evo-btn-sm font-bold">
                  Sign up
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Trigger (existing behaviour) */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white border-2 border-[#EADBC8] text-[#1E1B24] hover:text-[#FF5A3C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Drawer (existing behaviour) */}
      {mobileOpen && (
        <div className="sm:hidden border-b-2 border-[#EADBC8] bg-[#FFF6EC] px-4 pt-3 pb-6 animate-fade-in">
          <nav className="flex flex-col gap-1.5 pb-4 border-b-2 border-[#EADBC8]">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between min-h-[48px] px-5 rounded-full text-base font-bold text-[#1E1B24] bg-white border-2 border-[#EADBC8] hover:text-[#C9381F] transition-colors"
              >
                <span>{link.label}</span>
                <span className="text-[#FF5A3C] text-sm" aria-hidden="true">→</span>
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3 pt-4">
            {currentUser ? (
              <>
                <Link href="/games" onClick={() => setMobileOpen(false)} className="evo-btn evo-btn-primary evo-btn-lg w-full font-bold">
                  Enter Game Arena
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className={`${pillLink} w-full bg-white border-2 border-[#EADBC8] text-[#1E1B24]`}>
                  My Profile
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="evo-btn evo-btn-primary evo-btn-lg w-full font-bold">
                  Sign up, it is free
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)} className={`${pillLink} w-full bg-white border-2 border-[#EADBC8] text-[#1E1B24]`}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
