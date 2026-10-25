"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Gamepad2, Users, Settings, MessageCircle, UserCircle, HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Avatar } from "@/components/ui";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Profile } from "@/types/database";

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

  return (
    <nav
      className={cn(
        "evo-nav transition-all duration-200",
        scrolled && "shadow-md border-b border-[#E2E8E2]",
      )}
      aria-label="Main navigation"
    >
      <div className="evo-container">
        <div className="flex items-center justify-between h-16 gap-4 sm:gap-6">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group select-none shrink-0"
            aria-label="EVOAIQU home"
          >
            <div className="w-8 h-8 rounded-lg bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] group-hover:border-[#167D78] flex items-center justify-center transition-colors">
              <span className="font-display font-extrabold text-xs text-[#167D78] tracking-wider">
                EQ
              </span>
            </div>
            <span className="font-display font-extrabold text-xl text-[#203331] group-hover:text-[#167D78] transition-colors">
              EVOAIQU
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[0.9375rem] font-medium transition-all duration-150 min-h-[40px]",
                    active
                      ? "text-[#167D78] font-bold bg-[#DDF2EB] border border-[rgba(22,125,120,0.2)] shadow-xs"
                      : "text-[#65736F] hover:text-[#203331] hover:bg-[#EEF1ED]/80",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[#167D78]" : "text-[#8E9B97]")} />
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
                  className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 min-h-[40px] rounded-lg bg-white hover:bg-[#F7F8F4] border border-[#E2E8E2] hover:border-[#CBD4CB] transition-all group"
                  aria-label={t("nav.profile")}
                >
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.display_name ?? user.email ?? "Player"}
                    size="xs"
                    className="ring-1 ring-[#E2E8E2]"
                  />
                  <span className="text-xs font-semibold text-[#203331] max-w-[120px] truncate">
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
                    className="w-10 h-10 min-h-[40px] p-0 text-[#65736F] hover:text-[#203331] border border-[#E2E8E2] bg-white hover:bg-[#F7F8F4]"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">{t("nav.settings")}</span>
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="hidden md:flex text-xs font-semibold text-[#65736F] hover:text-[#D95F49] px-3 min-h-[40px]"
                >
                  {t("nav.logout")}
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2.5">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-[0.9375rem] font-medium text-[#65736F] hover:text-[#203331] px-4 min-h-[40px]">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm" className="text-[0.9375rem] font-bold px-5 min-h-[40px] shadow-xs">
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
                  className="md:hidden flex items-center justify-center w-10 h-10 min-h-[40px] min-w-[40px] rounded-lg bg-white border border-[#E2E8E2] text-[#203331] hover:bg-[#F7F8F4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#167D78] focus-visible:ring-offset-2 transition-all shrink-0"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm p-5 flex flex-col bg-white">
                <SheetHeader className="pb-3 border-b border-[#E2E8E2]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center">
                      <span className="font-display font-extrabold text-xs text-[#167D78] tracking-wider">
                        EQ
                      </span>
                    </div>
                    <SheetTitle className="font-display font-extrabold text-lg text-[#203331]">
                      EVOAIQU
                    </SheetTitle>
                  </div>
                  <SheetDescription className="sr-only">
                    Navigation menu
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-1.5">
                  {user && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F8F4] border border-[#E2E8E2] mb-2">
                      <Avatar src={profile?.avatar_url} name={profile?.display_name ?? user.email ?? "P"} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-[#203331] truncate">
                          {profile?.display_name ?? user.email?.split("@")[0] ?? "Player"}
                        </span>
                        {profile?.evoora_id && (
                          <span className="text-[11px] font-mono text-[#167D78] font-bold">
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
                          "flex items-center gap-3 px-3.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-[#DDF2EB] text-[#167D78] border border-[rgba(22,125,120,0.2)] font-semibold"
                            : "text-[#65736F] hover:text-[#203331] hover:bg-[#F7F8F4]",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-[#167D78]" : "text-[#8E9B97]")} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}

                  <hr className="evo-divider my-2 border-[#E2E8E2]" />

                  {user ? (
                    <div className="flex flex-col gap-1">
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-[#65736F] hover:text-[#203331] hover:bg-[#F7F8F4] transition-colors"
                      >
                        <Avatar src={profile?.avatar_url} name={profile?.display_name ?? "U"} size="xs" />
                        <span>{t("nav.profile")}</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-[#65736F] hover:text-[#203331] hover:bg-[#F7F8F4] transition-colors"
                      >
                        <Settings className="h-4 w-4 text-[#8E9B97]" />
                        <span>{t("nav.settings")}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          onLogout?.();
                        }}
                        className="flex items-center gap-3 px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-[#D95F49] hover:bg-[#FCE6DE] transition-colors w-full text-left"
                      >
                        <span>{t("nav.logout")}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 pt-2">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        <Button variant="secondary" className="w-full min-h-[44px]">{t("nav.login")}</Button>
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
