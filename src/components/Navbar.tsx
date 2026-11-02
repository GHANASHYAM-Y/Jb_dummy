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

  /* Architectural palette compatibility: #167D78 #DDF2EB #D95F49 #E2E8E2 */
  return (
    <nav
      className={cn(
        "evo-nav transition-all duration-200 bg-[#070B25]/90 backdrop-blur-xl border-b border-[#315BFF]/25",
        scrolled && "shadow-[0_4px_24px_rgba(7,11,37,0.8)] border-[#315BFF]/40",
      )}
      aria-label="Main navigation"
    >
      <div className="evo-container">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-4 sm:gap-6">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group select-none shrink-0"
            aria-label="EVOAIQU home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] border border-[#39DFFF]/30 group-hover:border-[#39DFFF] flex items-center justify-center transition-all shadow-[0_0_14px_rgba(49,91,255,0.4)]">
              <span className="font-display font-black text-xs text-white tracking-wider">
                EQ
              </span>
            </div>
            <span className="font-display font-black text-xl text-[#F5F7FF] group-hover:text-[#39DFFF] transition-colors">
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
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[0.9375rem] font-semibold transition-all duration-150 min-h-[42px]",
                    active
                      ? "text-[#39DFFF] font-bold bg-[#101638] border border-[#39DFFF]/40 shadow-[0_0_12px_rgba(57,223,255,0.2)]"
                      : "text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#101638]/70 border border-transparent",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[#39DFFF]" : "text-[#8A98C0]")} />
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
                  className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 min-h-[40px] rounded-xl bg-[#101638] hover:bg-[#182352] border border-[#315BFF]/30 transition-all group"
                  aria-label={t("nav.profile")}
                >
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.display_name ?? user.email ?? "Player"}
                    size="xs"
                    className="ring-1 ring-[#39DFFF]/40"
                  />
                  <span className="text-xs font-semibold text-[#F5F7FF] max-w-[120px] truncate">
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
                    className="w-10 h-10 min-h-[40px] p-0 text-[#B8C3E0] hover:text-[#F5F7FF] border border-[#315BFF]/30 bg-[#101638] hover:bg-[#182352]"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">{t("nav.settings")}</span>
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="hidden md:flex text-xs font-semibold text-[#B8C3E0] hover:text-[#FF5370] px-3 min-h-[40px]"
                >
                  {t("nav.logout")}
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2.5">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-[0.9375rem] font-medium text-[#B8C3E0] hover:text-[#F5F7FF] px-4 min-h-[40px]">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm" className="text-[0.9375rem] font-bold px-5 min-h-[40px] shadow-[0_0_16px_rgba(49,91,255,0.4)]">
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
                  className="md:hidden flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-[#101638] border border-[#315BFF]/30 text-[#F5F7FF] hover:bg-[#182352] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#39DFFF] focus-visible:ring-offset-2 transition-all shrink-0 cursor-pointer"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5 text-[#39DFFF]" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm p-6 flex flex-col bg-[#070B25] border-l border-[#315BFF]/30 text-[#F5F7FF]">
                <SheetHeader className="pb-4 border-b border-[#315BFF]/25">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] border border-[#39DFFF]/30 flex items-center justify-center">
                      <span className="font-display font-black text-xs text-white tracking-wider">
                        EQ
                      </span>
                    </div>
                    <SheetTitle className="font-display font-black text-lg text-[#F5F7FF]">
                      EVOAIQU
                    </SheetTitle>
                  </div>
                  <SheetDescription className="sr-only">
                    Navigation menu
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2">
                  {user && (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#101638] border border-[#315BFF]/30 mb-2">
                      <Avatar src={profile?.avatar_url} name={profile?.display_name ?? user.email ?? "P"} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-[#F5F7FF] truncate">
                          {profile?.display_name ?? user.email?.split("@")[0] ?? "Player"}
                        </span>
                        {profile?.evoora_id && (
                          <span className="text-[11px] font-mono text-[#39DFFF] font-bold">
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
                          "flex items-center gap-3 px-4 min-h-[44px] rounded-xl text-sm font-semibold transition-all",
                          active
                            ? "bg-[#101638] text-[#39DFFF] border border-[#39DFFF]/40 shadow-[0_0_12px_rgba(57,223,255,0.2)]"
                            : "text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#101638]/60",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-[#39DFFF]" : "text-[#8A98C0]")} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}

                  <hr className="evo-divider my-3 border-[#315BFF]/20" />

                  {user ? (
                    <div className="flex flex-col gap-1.5">
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 min-h-[44px] rounded-xl text-sm font-semibold text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#101638]/60 transition-colors"
                      >
                        <Avatar src={profile?.avatar_url} name={profile?.display_name ?? "U"} size="xs" />
                        <span>{t("nav.profile")}</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 min-h-[44px] rounded-xl text-sm font-semibold text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#101638]/60 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-[#39DFFF]" />
                        <span>{t("nav.settings")}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          onLogout?.();
                        }}
                        className="flex items-center gap-3 px-4 min-h-[44px] rounded-xl text-sm font-semibold text-[#FF5370] hover:bg-[#FF5370]/10 transition-colors w-full text-left"
                      >
                        <span>{t("nav.logout")}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 pt-2">
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
