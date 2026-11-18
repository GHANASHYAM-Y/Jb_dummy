"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Gamepad2,
  MessageCircle,
  UserCircle,
  Users,
  LogOut,
  Settings,
  HelpCircle,
  Info,
  Play,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useI18n } from "@/core/i18n/I18nContext";
import { Avatar, Button } from "@/shared/ui";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/shared/ui/sheet";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import type { Profile } from "@/core/supabase/database";

interface AppNavigationProps {
  user?: { id: string; email?: string } | null;
  profile?: Profile | null;
  /** Dares that need attention (badge on Chat & Stories). */
  pendingChallenges?: number;
  /** Incoming friend requests (badge on Find Friends). */
  pendingRequests?: number;
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

/** Games offered by the Play button (bottom sheet). */
export const PLAY_MENU_ITEMS = [
  { href: "/play/rps", emoji: "✊", name: "Rock Paper Scissors", blurb: "Quick reflexes. First to 5 wins." },
  { href: "/play/chess", emoji: "♞", name: "Chess", blurb: "Out-think them on the clock." },
  { href: "/play/hand-cricket", emoji: "🏏", name: "Hand Cricket", blurb: "Throw 1 to 6. Don't get caught." },
  { href: "/play/ludo", emoji: "🎲", name: "Ludo", blurb: "Roll, race and capture." },
  { href: "/play/draw-guess", emoji: "🎨", name: "Draw & Guess", blurb: "Sketch the word. Friend guesses." },
  { href: "/play/tic-tac-toe", emoji: "⭕", name: "Tic Tac Toe", blurb: "Three in a row. Beat the computer." },
  { href: "/play/memory-match", emoji: "🧠", name: "Memory Match", blurb: "Flip cards, find every pair." },
  { href: "/play/password-game", emoji: "🔐", name: "Password Game", blurb: "Beat the rules, one letter at a time." },
];

function isItemActive(pathname: string, item: { href: string; aliases: string[] }) {
  return (
    pathname === item.href ||
    item.aliases.some((alias) => pathname === alias || pathname.startsWith(alias + "/"))
  );
}

export function AppNavigation({
  user,
  profile,
  pendingChallenges = 0,
  pendingRequests = 0,
  children,
}: AppNavigationProps) {
  const { t } = useI18n();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [playOpen, setPlayOpen] = useState(false);

  // Full-screen games (e.g. active RPS, Chess, Hand Cricket and Ludo boards) hide navigation temporarily with clear exit/back controls
  const isFullScreenGame =
    Boolean(
      pathname &&
      ((pathname.startsWith("/play/rps/") && pathname !== "/play/rps") ||
       (pathname.startsWith("/play/chess/") && pathname !== "/play/chess") ||
       (pathname.startsWith("/play/hand-cricket/") && pathname !== "/play/hand-cricket") ||
       (pathname.startsWith("/play/ludo/") && pathname !== "/play/ludo") ||
       (pathname.startsWith("/play/draw-guess/") && pathname !== "/play/draw-guess"))
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
  const labelFor = (item: { labelKey: string; defaultLabel: string }) =>
    t(item.labelKey) !== item.labelKey ? t(item.labelKey) : item.defaultLabel;
  const badgeFor = (href: string) =>
    href === "/chat" ? pendingChallenges : href === "/friends" ? pendingRequests : 0;

  // Mobile tab bar order: Game, Find Friends | (Play) | Chat & Stories, Profile
  const tabItems = [PRIMARY_NAV_ITEMS[0], PRIMARY_NAV_ITEMS[3], PRIMARY_NAV_ITEMS[1], PRIMARY_NAV_ITEMS[2]];

  const playSheet = (
    <Sheet open={playOpen} onOpenChange={setPlayOpen}>
      <SheetContent
        side="bottom"
        className="mx-auto w-full max-w-xl rounded-t-[32px] border-2 border-b-0 border-[#EADBC8] bg-[#FFF6EC] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#EADBC8]" aria-hidden="true" />
        <SheetTitle className="font-display text-2xl font-bold text-[#1E1B24]">What are we playing?</SheetTitle>
        <SheetDescription className="mb-4 text-sm text-[#6E6878]">
          Pick a game. The winner picks the loser&apos;s dare.
        </SheetDescription>
        <div className="grid gap-2.5">
          {PLAY_MENU_ITEMS.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              onClick={() => setPlayOpen(false)}
              className="flex items-center gap-4 rounded-[20px] border-2 border-[#EADBC8] bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-[#1E1B24] hover:shadow-[0_4px_0_#1E1B24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            >
              <span className="text-3xl leading-none" aria-hidden="true">{g.emoji}</span>
              <span className="min-w-0">
                <b className="block font-display text-base text-[#1E1B24]">{g.name}</b>
                <small className="block text-xs text-[#6E6878]">{g.blurb}</small>
              </span>
              <span className="ml-auto text-[#8E8798]" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  /* ── Signed-out (public) layout: simple top header ─────────────────────── */
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FFF6EC] text-[#1E1B24] relative selection:bg-[#FF5A3C]/25">
        <header className="sticky top-0 z-40 w-full bg-[#FFF6EC]/95 backdrop-blur-md border-b-2 border-[#EADBC8]">
          <div className="evo-container">
            <div className="flex items-center justify-between h-16 gap-4">
              <Link href="/games" className="flex items-center gap-2 select-none shrink-0" aria-label="EVOAIQU Game Home">
                <span className="b-logo-mark" aria-hidden="true">EQ</span>
                <span className="font-display font-bold text-xl tracking-tight text-[#1E1B24]">evoaiqu</span>
              </Link>

              <nav className="hidden md:flex items-center gap-1.5" aria-label="Primary Navigation">
                {PUBLIC_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold min-h-[42px] transition-colors",
                        active ? "bg-[#1E1B24] text-white" : "text-[#6E6878] hover:bg-[#F5EADC] hover:text-[#1E1B24]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{labelFor(item)}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-2 shrink-0">
                <LanguageSelector />
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">Sign Up</Button>
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    );
  }

  /* ── Full-screen match boards: no chrome ───────────────────────────────── */
  if (isFullScreenGame) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FFF6EC] text-[#1E1B24] relative">
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    );
  }

  /* ── Signed-in Concept B shell ─────────────────────────────────────────── */
  return (
    <div className="b-shell text-[#1E1B24] selection:bg-[#FF5A3C]/25">
      {/* Desktop sidebar */}
      <aside className="b-sidebar" aria-label="Primary Navigation">
        <Link href="/games" className="b-logo" aria-label="EVOAIQU Game Home">
          <span className="b-logo-mark" aria-hidden="true">EQ</span>
          evoaiqu
        </Link>

        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(pathname, item);
          const count = badgeFor(item.href);
          return (
            <Link key={item.href} href={item.href} className="b-nav" aria-current={active ? "page" : undefined}>
              <Icon className="h-5 w-5 shrink-0" />
              <span>{labelFor(item)}</span>
              {count > 0 && <span className="b-nav-count">{count > 9 ? "9+" : count}</span>}
            </Link>
          );
        })}

        <button type="button" className="b-play-btn" onClick={() => setPlayOpen(true)}>
          <Play className="h-5 w-5" fill="currentColor" />
          Play
        </button>

        <div className="mt-2 flex items-center gap-2">
          <LanguageSelector />
          <Link
            href="/settings"
            className="grid h-10 w-10 place-items-center rounded-full bg-[#F5EADC] text-[#6E6878] transition-colors hover:bg-[#EADBC8] hover:text-[#1E1B24]"
            aria-label="Account Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#FDECEC] text-[#C9383D] transition-colors hover:bg-[#FAD4D5]"
            aria-label={t("nav.logout")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <Link href="/profile" className="b-me">
          <Avatar src={profile?.avatar_url} name={displayName} size="sm" />
          <span className="min-w-0">
            <b className="block truncate text-sm text-[#1E1B24]">{displayName}</b>
            {evoId && <small className="block truncate font-mono text-xs font-bold text-[#FF5A3C]">{evoId}</small>}
          </span>
        </Link>
      </aside>

      <div className="b-content">
        {/* Mobile top bar */}
        <div className="b-topbar">
          <Link href="/games" className="b-logo !p-0 !text-[1.375rem]" aria-label="EVOAIQU Game Home">
            <span className="b-logo-mark" aria-hidden="true">EQ</span>
            evoaiqu
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              type="button"
              onClick={handleLogout}
              className="grid h-10 w-10 place-items-center rounded-full bg-[#F5EADC] text-[#6E6878]"
              aria-label={t("nav.logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Main Content Area ─────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar with a raised Play button ───────────────── */}
      <nav
        className="b-tabbar md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-[#EADBC8] safe-bottom"
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-5 h-[74px] items-center">
          {tabItems.slice(0, 2).map((item) => (
            <MobileTab key={item.href} item={item} pathname={pathname} label={labelFor(item)} count={badgeFor(item.href)} />
          ))}
          <span aria-hidden="true" />
          {tabItems.slice(2).map((item) => (
            <MobileTab key={item.href} item={item} pathname={pathname} label={labelFor(item)} count={badgeFor(item.href)} />
          ))}
        </div>
      </nav>
      <button type="button" className="b-fab md:hidden" onClick={() => setPlayOpen(true)} aria-label="Play">
        <Play className="h-7 w-7" fill="currentColor" />
      </button>

      {playSheet}
    </div>
  );
}

function MobileTab({
  item,
  pathname,
  label,
  count,
}: {
  item: (typeof PRIMARY_NAV_ITEMS)[number];
  pathname: string;
  label: string;
  count: number;
}) {
  const Icon = item.icon;
  const active = isItemActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[52px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold leading-none transition-colors",
        active ? "text-[#1E1B24]" : "text-[#6E6878]",
      )}
    >
      <span className="relative">
        <Icon className={cn("h-6 w-6", active && "text-[#FF5A3C]")} />
        {count > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF5A3C] px-1 text-[10px] font-extrabold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      <span className="max-w-[72px] truncate">{label}</span>
    </Link>
  );
}
