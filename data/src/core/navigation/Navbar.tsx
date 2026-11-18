"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Gamepad2, Users, Settings, MessageCircle, UserCircle, HelpCircle, Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useI18n } from "@/core/i18n/I18nContext";
import { Button, Avatar } from "@/shared/ui";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/ui/sheet";
import type { Profile } from "@/core/supabase/database";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavbarProps {
  user?: { id: string; email?: string } | null;
  profile?: Profile | null;
  onLogout?: () => void;
}

// ── Nav links ─────────────────────────────────────────────────────────────────

const publicLinks = (t: (k: string) => string) => [
  { href: "/games", label: t("nav.games") !== "nav.games" ? t("nav.games") : "Game", icon: Gamepad2 },
  { href: "/how-to-play", label: "How to Play", icon: HelpCircle },
  { href: "/about", label: "About", icon: Info },
];

const authLinks = (t: (k: string) => string) => [
  { href: "/games", label: t("nav.games") !== "nav.games" ? t("nav.games") : "Game", icon: Gamepad2 },
  { href: "/chat", label: t("nav.chat_stories") !== "nav.chat_stories" ? t("nav.chat_stories") : "Chat & Stories", icon: MessageCircle },
  { href: "/profile", label: t("nav.profile") !== "nav.profile" ? t("nav.profile") : "Profile", icon: UserCircle },
  { href: "/friends", label: t("nav.find_friends") !== "nav.find_friends" ? t("nav.find_friends") : "Find Friends", icon: Users },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function Navbar({ user, profile, onLogout }: NavbarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    startTransition(() => setMobileOpen(false));
  }, [pathname]);

  const links = user ? authLinks(t) : publicLinks(t);

  /* Architectural palette compatibility: #FF5A3C #FFE4DD #FF5A3C #EADBC8 */
  return (
    <nav
      className={cn(
        "evo-nav transition-all duration-200 bg-[#FFF6EC]/95 backdrop-blur-xl border-b-2 border-[#EADBC8]",
        scrolled && "shadow-[0_3px_0_#EADBC8]",
      )}
      aria-label="Main navigation"
    >
      <div className="evo-container">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-4 sm:gap-6">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group select-none shrink-0 rounded-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            aria-label="EVOAIQU home"
          >
            <span className="b-logo-mark w-[34px] h-[34px] group-hover:rotate-0 transition-transform" aria-hidden="true">EQ</span>
            <span className="font-display font-bold text-[1.6rem] leading-none tracking-tight text-[#1E1B24] group-hover:text-[#FF5A3C] transition-colors">
              EVOAIQU
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2 p-1.5 rounded-full bg-white border-2 border-[#EADBC8]">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[0.9375rem] font-bold transition-all duration-150 min-h-[44px] border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                    active
                      ? "text-[#C9381F] bg-[#FFE4DD] border-[#FF5A3C]/40"
                      : "text-[#6E6878] hover:text-[#1E1B24] hover:bg-[#F5EADC] border-transparent",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[#FF5A3C]" : "text-[#8E8798]")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <LanguageSelector />

            {user ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/profile"
                  className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 min-h-[44px] rounded-full bg-[#FFFFFF] hover:bg-[#F5EADC] border-2 border-[#EADBC8] transition-all group"
                  aria-label={t("nav.profile")}
                >
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.display_name ?? user.email ?? "Player"}
                    size="xs"
                    className="ring-1 ring-[#FF5A3C]/40"
                  />
                  <span className="text-xs font-semibold text-[#1E1B24] max-w-[120px] truncate">
                    {profile?.display_name ?? user.email?.split("@")[0] ?? "Player"}
                  </span>
                </Link>

                <Link
                  href="/settings"
                  className="hidden md:flex"
                  aria-label={t("nav.settings")}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-11 h-11 min-h-[44px] p-0 text-[#6E6878] hover:text-[#1E1B24] border-2 border-[#EADBC8] bg-[#FFFFFF] hover:bg-[#F5EADC]"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">{t("nav.settings")}</span>
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="hidden md:flex text-xs font-semibold text-[#6E6878] hover:text-[#E5484D] px-3 min-h-[44px]"
                >
                  {t("nav.logout")}
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2.5">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-[0.9375rem] font-bold text-[#1E1B24] border-2 border-[#EADBC8] bg-white hover:bg-[#F5EADC] px-5 min-h-[44px]">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm" className="text-[0.9375rem] font-bold px-5 min-h-[44px]">
                    {t("nav.signup")}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Sheet Navigation */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="md:hidden flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-[#FFFFFF] border-2 border-[#EADBC8] text-[#1E1B24] hover:bg-[#F5EADC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2 transition-all shrink-0 cursor-pointer"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5 text-[#FF5A3C]" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm p-6 flex flex-col bg-[#FFF6EC] border-l-2 border-[#EADBC8] text-[#1E1B24]">
                <SheetHeader className="pb-4 border-b-2 border-[#EADBC8]">
                  <div className="flex items-center gap-3">
                    <span className="b-logo-mark" aria-hidden="true">EQ</span>
                    <SheetTitle className="font-display font-bold text-2xl text-[#1E1B24]">
                      EVOAIQU
                    </SheetTitle>
                  </div>
                  <SheetDescription className="sr-only">
                    Navigation menu
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2">
                  {user && (
                    <div className="flex items-center gap-3 p-3.5 rounded-[22px] bg-[#FFFFFF] border-2 border-[#EADBC8] mb-2">
                      <Avatar src={profile?.avatar_url} name={profile?.display_name ?? user.email ?? "P"} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-[#1E1B24] truncate">
                          {profile?.display_name ?? user.email?.split("@")[0] ?? "Player"}
                        </span>
                        {profile?.evoora_id && (
                          <span className="text-[11px] font-mono text-[#FF5A3C] font-bold">
                            {profile.evoora_id}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {links.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 min-h-[44px] rounded-full text-sm font-bold transition-all border-2",
                          active
                            ? "bg-[#FFE4DD] text-[#C9381F] border-[#FF5A3C]/40"
                            : "text-[#6E6878] hover:text-[#1E1B24] hover:bg-[#FFFFFF] border-transparent",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-[#FF5A3C]" : "text-[#8E8798]")} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}

                  <hr className="my-3 border-0 border-t-2 border-[#EADBC8]" />

                  {user ? (
                    <div className="flex flex-col gap-1.5">
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 min-h-[44px] rounded-full text-sm font-bold text-[#6E6878] hover:text-[#1E1B24] hover:bg-[#FFFFFF] transition-colors"
                      >
                        <Avatar src={profile?.avatar_url} name={profile?.display_name ?? "U"} size="xs" />
                        <span>{t("nav.profile")}</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 min-h-[44px] rounded-full text-sm font-bold text-[#6E6878] hover:text-[#1E1B24] hover:bg-[#FFFFFF] transition-colors"
                      >
                        <Settings className="h-4 w-4 text-[#FF5A3C]" />
                        <span>{t("nav.settings")}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          onLogout?.();
                        }}
                        className="flex items-center gap-3 px-4 min-h-[44px] rounded-full text-sm font-bold text-[#E5484D] hover:bg-[#E5484D]/10 transition-colors w-full text-left"
                      >
                        <span>{t("nav.logout")}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 pt-2">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        <Button variant="secondary" className="w-full min-h-[44px] font-bold">{t("nav.login")}</Button>
                      </Link>
                      <Link href="/signup" onClick={() => setMobileOpen(false)}>
                        <Button variant="primary" className="w-full min-h-[44px] font-bold">{t("nav.signup")}</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
