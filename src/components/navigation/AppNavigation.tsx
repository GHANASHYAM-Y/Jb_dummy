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
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { Avatar, Button } from "@/components/ui";
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

  // Full-screen games (e.g. active RPS and Chess match boards) hide navigation temporarily with clear exit/back controls
  const isFullScreenGame =
    Boolean(
      pathname &&
      ((pathname.startsWith("/play/rps/") && pathname !== "/play/rps") ||
       (pathname.startsWith("/play/chess/") && pathname !== "/play/chess"))
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

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8F4] text-[#203331]">
      {/* ── Desktop Top Navigation Bar ────────────────────────────────────────── */}
      {!isFullScreenGame && (
        <header
          className={cn(
            "sticky top-0 z-40 w-full bg-white border-b border-[#E2E8E2] transition-shadow duration-200",
            scrolled && "shadow-sm",
          )}
        >
          <div className="evo-container">
            <div className="flex items-center justify-between h-16 gap-4">
              {/* Brand Logo */}
              <Link
                href="/games"
                className="flex items-center gap-2.5 group select-none shrink-0"
                aria-label="EVOAIQU Game Home"
              >
                <div className="w-9 h-9 rounded-xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] group-hover:border-[#167D78] flex items-center justify-center transition-colors shadow-xs">
                  <span className="font-display font-extrabold text-sm text-[#167D78] tracking-wider">
                    EQ
                  </span>
                </div>
                <span className="font-display font-black text-xl tracking-tight text-[#203331] group-hover:text-[#167D78] transition-colors">
                  EVOAIQU
                </span>
              </Link>

              {/* Desktop 4 Primary Destinations */}
              <nav
                className="hidden md:flex items-center gap-1.5 lg:gap-2"
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
                        "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 min-h-[40px]",
                        isActive
                          ? "bg-[#DDF2EB] text-[#167D78] shadow-xs border border-[rgba(22,125,120,0.2)]"
                          : "text-[#65736F] hover:text-[#203331] hover:bg-[#EEF1ED]/80",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#167D78]" : "text-[#8E9B97]")} />
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
                      className="hidden sm:flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-[#F7F8F4] hover:bg-[#EEF1ED] border border-[#E2E8E2] transition-colors"
                      aria-expanded={profileDropdownOpen}
                      aria-haspopup="true"
                    >
                      <Avatar
                        src={profile?.avatar_url}
                        name={displayName}
                        size="xs"
                        className="ring-1 ring-[#167D78]/20"
                      />
                      <div className="flex flex-col text-left min-w-0 max-w-[120px]">
                        <span className="text-xs font-bold text-[#203331] truncate">
                          {displayName}
                        </span>
                        {evoId && (
                          <span className="text-[10px] font-mono font-bold text-[#167D78]">
                            {evoId}
                          </span>
                        )}
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-[#8E9B97]" />
                    </button>

                    {/* Dropdown Menu */}
                    {profileDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setProfileDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#E2E8E2] py-2 z-40 animate-fade-in">
                          <div className="px-3.5 py-2 border-b border-[#E2E8E2] mb-1">
                            <p className="text-xs text-[#8E9B97]">Signed in as</p>
                            <p className="text-sm font-bold text-[#203331] truncate">{displayName}</p>
                            {evoId && (
                              <p className="text-xs font-mono text-[#167D78] font-bold mt-0.5">{evoId}</p>
                            )}
                          </div>

                          <Link
                            href="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#203331] hover:bg-[#F7F8F4] transition-colors"
                          >
                            <UserCircle className="h-4 w-4 text-[#8E9B97]" />
                            <span>My Profile</span>
                          </Link>

                          <Link
                            href="/settings"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#203331] hover:bg-[#F7F8F4] transition-colors"
                          >
                            <Settings className="h-4 w-4 text-[#8E9B97]" />
                            <span>Account Settings</span>
                          </Link>

                          <div className="my-1 border-t border-[#E2E8E2]" />

                          <button
                            type="button"
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              handleLogout();
                            }}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-[#D95F49] hover:bg-[#FCE6DE] w-full text-left transition-colors"
                          >
                            <LogOut className="h-4 w-4 text-[#D95F49]" />
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
                      <Button variant="ghost" size="sm" className="font-semibold text-xs sm:text-sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button variant="primary" size="sm" className="font-bold text-xs sm:text-sm shadow-xs">
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
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E2E8E2] shadow-lg safe-bottom"
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
                      ? "text-[#167D78] font-bold"
                      : "text-[#65736F] hover:text-[#203331]",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-7 rounded-full transition-all",
                      isActive
                        ? "bg-[#DDF2EB] text-[#167D78] scale-105"
                        : "text-[#8E9B97]",
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
