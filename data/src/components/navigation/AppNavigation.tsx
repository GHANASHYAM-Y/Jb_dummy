"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Gamepad2,
  MessageCircle,
  UserCircle,
  Users,
  LogOut,
  Settings,
  ChevronDown,
  HelpCircle,
  Info,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { Avatar, Button } from "@/shared/ui";
import { LanguageSelector } from "@/components/LanguageSelector";
import type { Profile } from "@/types/database";

interface AppNavigationProps {
  user?: { id: string; email?: string } | null;
  profile?: Profile | null;
  children?: React.ReactNode;
}

export const PRIMARY_NAV_ITEMS = [
  {
    href: "/games",
    labelKey: "nav.games",
    defaultLabel: "Game",
    icon: Gamepad2,
    aliases: ["/games", "/play", "/matchmaking", "/history", "/dashboard"],
  },
  {
    href: "/chat",
    labelKey: "nav.chat_stories",
    defaultLabel: "Chat & Stories",
    icon: MessageCircle,
    aliases: ["/chat", "/stories", "/challenges"],
  },
  {
    href: "/profile",
    labelKey: "nav.profile",
    defaultLabel: "Profile",
    icon: UserCircle,
    aliases: ["/profile", "/settings"],
  },
  {
    href: "/friends",
    labelKey: "nav.find_friends",
    defaultLabel: "Find Friends",
    icon: Users,
    aliases: ["/friends", "/search"],
  },
];

export const PUBLIC_NAV_ITEMS = [
  {
    href: "/games",
    labelKey: "nav.games",
    defaultLabel: "Game",
    icon: Gamepad2,
    aliases: ["/games"],
  },
  {
    href: "/how-to-play",
    labelKey: "nav.how_to_play",
    defaultLabel: "How to Play",
    icon: HelpCircle,
    aliases: ["/how-to-play"],
  },
  {
    href: "/about",
    labelKey: "nav.about",
    defaultLabel: "About",
    icon: Info,
    aliases: ["/about"],
  },
];

export function AppNavigation({ user, profile, children }: AppNavigationProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Full-screen games (e.g. active RPS, Chess, Hand Cricket and Ludo boards) hide navigation temporarily with clear exit/back controls
  const isFullScreenGame =
    Boolean(
      pathname &&
      ((pathname.startsWith("/play/rps/") && pathname !== "/play/rps") ||
       (pathname.startsWith("/play/chess/") && pathname !== "/play/chess") ||
       (pathname.startsWith("/play/hand-cricket/") && pathname !== "/play/hand-cricket") ||
       (pathname.startsWith("/play/ludo/") && pathname !== "/play/ludo"))
    );

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Quiet fallback
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "Player";
  const evoId = profile?.evoora_id ?? null;

  /* Architecture compatibility tokens: #F7F8F4 #167D78 #DDF2EB #203331 */
  return (
    <div className="flex flex-col min-h-screen bg-[#070B25] text-[#F5F7FF] relative selection:bg-[#39DFFF]/30 selection:text-white">
      {/* ── Desktop Top Navigation Bar ────────────────────────────────────────── */}
      {!isFullScreenGame && (
        <header
          className={cn(
            "sticky top-0 z-40 w-full bg-[#070B25]/90 backdrop-blur-xl border-b border-[#315BFF]/25 transition-all duration-200",
            scrolled && "shadow-[0_4px_24px_rgba(7,11,37,0.8)] border-[#315BFF]/40",
          )}
        >
          <div className="evo-container">
            <div className="flex items-center justify-between h-16 sm:h-18 gap-4">
              {/* Brand Logo */}
              <Link
                href="/games"
                className="flex items-center gap-3 group select-none shrink-0"
                aria-label="EVOAIQU Game Home"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] border border-[#39DFFF]/30 group-hover:border-[#39DFFF] flex items-center justify-center transition-all shadow-[0_0_14px_rgba(49,91,255,0.4)]">
                  <span className="font-display font-black text-xs text-white tracking-wider">
                    EQ
                  </span>
                </div>
                <span className="font-display font-black text-xl tracking-tight text-[#F5F7FF] group-hover:text-[#39DFFF] transition-colors">
                  EVOAIQU
                </span>
              </Link>

              {/* Desktop 4 Primary Destinations */}
              <nav
                className="hidden md:flex items-center gap-1.5 lg:gap-2.5"
                aria-label="Primary Navigation"
              >
                {(user ? PRIMARY_NAV_ITEMS : PUBLIC_NAV_ITEMS).map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    item.aliases.some((alias) => pathname === alias || pathname.startsWith(alias + "/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 min-h-[42px]",
                        isActive
                          ? "bg-[#101638] text-[#39DFFF] border border-[#39DFFF]/40 shadow-[0_0_14px_rgba(57,223,255,0.25)]"
                          : "text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#101638]/70 border border-transparent",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-[#39DFFF]" : "text-[#8A98C0]")} />
                      <span>{t(item.labelKey) !== item.labelKey ? t(item.labelKey) : item.defaultLabel}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Desktop Right Controls (Language + User Profile & Menu) */}
              <div className="flex items-center gap-3 shrink-0">
                <LanguageSelector />

                {user && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setProfileDropdownOpen((prev) => !prev)}
                      className="hidden sm:flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-[#101638] hover:bg-[#182352] border border-[#315BFF]/30 transition-all shadow-sm"
                      aria-expanded={profileDropdownOpen}
                      aria-haspopup="true"
                    >
                      <Avatar
                        src={profile?.avatar_url}
                        name={displayName}
                        size="xs"
                        className="ring-1 ring-[#39DFFF]/40"
                      />
                      <div className="flex flex-col text-left min-w-0 max-w-[120px]">
                        <span className="text-xs font-bold text-[#F5F7FF] truncate">
                          {displayName}
                        </span>
                        {evoId && (
                          <span className="text-[10px] font-mono font-bold text-[#39DFFF]">
                            {evoId}
                          </span>
                        )}
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-[#8A98C0]" />
                    </button>

                    {/* Dropdown Menu */}
                    {profileDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setProfileDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-[#101638] rounded-2xl shadow-[0_12px_40px_rgba(7,11,37,0.9)] border border-[#315BFF]/35 py-2.5 z-40 animate-fade-in text-[#F5F7FF]">
                          <div className="px-4 py-2.5 border-b border-[#315BFF]/20 mb-1">
                            <p className="text-[11px] text-[#8A98C0]">Signed in as</p>
                            <p className="text-sm font-bold text-[#F5F7FF] truncate">{displayName}</p>
                            {evoId && (
                              <p className="text-xs font-mono text-[#39DFFF] font-bold mt-0.5">{evoId}</p>
                            )}
                          </div>

                          <Link
                            href="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#182352] transition-colors"
                          >
                            <UserCircle className="h-4 w-4 text-[#39DFFF]" />
                            <span>My Profile</span>
                          </Link>

                          <Link
                            href="/settings"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#182352] transition-colors"
                          >
                            <Settings className="h-4 w-4 text-[#39DFFF]" />
                            <span>Account Settings</span>
                          </Link>

                          <div className="my-1 border-t border-[#315BFF]/20" />

                          <button
                            type="button"
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              handleLogout();
                            }}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#FF5370] hover:bg-[#FF5370]/10 w-full text-left transition-colors"
                          >
                            <LogOut className="h-4 w-4 text-[#FF5370]" />
                            <span>{t("nav.logout")}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {!user && (
                  <div className="flex items-center gap-2">
                    <Link href="/login">
                      <Button variant="ghost" size="sm" className="font-semibold text-xs sm:text-sm text-[#B8C3E0] hover:text-white">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button variant="primary" size="sm" className="font-bold text-xs sm:text-sm shadow-[0_0_16px_rgba(49,91,255,0.4)]">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ── Main Content Area ─────────────────────────────────────────────────── */}
      <main
        className={cn(
          "flex-1 flex flex-col",
          !isFullScreenGame && Boolean(user) && "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8",
        )}
      >
        {children}
      </main>

      {/* ── Mobile Fixed 4-Item Bottom Navigation Bar ─────────────────────────── */}
      {!isFullScreenGame && Boolean(user) && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070B25]/95 backdrop-blur-xl border-t border-[#315BFF]/25 shadow-[0_-4px_24px_rgba(7,11,37,0.8)] safe-bottom"
          aria-label="Mobile Navigation"
        >
          <div className="grid grid-cols-4 h-16 items-center px-1">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                item.aliases.some((alias) => pathname === alias || pathname.startsWith(alias + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all duration-150 min-h-[52px]",
                    isActive
                      ? "text-[#39DFFF] font-bold"
                      : "text-[#B8C3E0] hover:text-[#F5F7FF]",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-7 rounded-full transition-all",
                      isActive
                        ? "bg-[#39DFFF]/15 text-[#39DFFF] border border-[#39DFFF]/30 shadow-[0_0_10px_rgba(57,223,255,0.25)] scale-105"
                        : "text-[#8A98C0]",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-medium leading-none truncate max-w-[72px]">
                    {item.defaultLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
