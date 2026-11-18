"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";

/**
 * Concept B "Game lobby" building blocks, shared by every game lobby:
 * back link, coloured hero card, "Pick who to play" avatar row, numbered
 * rules and the two-column page frame with a right rail.
 */

export function LobbyBackLink({ href = "/games", label = "All games" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 min-h-[44px] px-1 text-sm font-bold text-[#6E6878] hover:text-[#1E1B24] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

const HERO_THEMES = {
  tangerine: { bg: "bg-[#FF5A3C] border-[#C9381F] shadow-[0_6px_0_#C9381F]", ink: "text-white", sub: "text-white/90" },
  mint: { bg: "bg-[#14C49A] border-[#0E9B79] shadow-[0_6px_0_#0E9B79]", ink: "text-[#1E1B24]", sub: "text-[#1E1B24]/80" },
  lilac: { bg: "bg-[#8C7BFF] border-[#6A58DB] shadow-[0_6px_0_#6A58DB]", ink: "text-[#1E1B24]", sub: "text-[#1E1B24]/80" },
  sun: { bg: "bg-[#FFC23D] border-[#E9A912] shadow-[0_6px_0_#E9A912]", ink: "text-[#1E1B24]", sub: "text-[#1E1B24]/80" },
} as const;

export type HeroColor = keyof typeof HERO_THEMES;

interface LobbyHeroProps {
  color: HeroColor;
  emoji: string;
  eyebrow?: string;
  title: string;
  tagline: string;
  chips?: string[];
  /** White pill CTA buttons */
  children?: React.ReactNode;
}

export function LobbyHero({ color, emoji, eyebrow, title, tagline, chips = [], children }: LobbyHeroProps) {
  const theme = HERO_THEMES[color];
  return (
    <section
      className={cn("relative overflow-hidden rounded-[32px] border-2 p-6 sm:p-8 animate-fade-in", theme.bg)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none select-none absolute -right-2 -top-2 sm:right-4 sm:top-2 text-[96px] sm:text-[140px] leading-none rotate-12 opacity-90"
      >
        {emoji}
      </span>
      <div className={cn("relative max-w-[78%] sm:max-w-[70%]", theme.ink)}>
        {eyebrow && (
          <p className="text-xs font-extrabold uppercase tracking-wider opacity-90 mb-1">{eyebrow}</p>
        )}
        <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight">{title}</h1>
        <p className={cn("mt-1.5 text-sm sm:text-base leading-relaxed", theme.sub)}>{tagline}</p>
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center px-3 py-1 rounded-full bg-white/90 text-[#1E1B24] text-xs font-bold border-2 border-white"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
      {children && <div className="relative mt-5 flex flex-wrap gap-3">{children}</div>}
    </section>
  );
}

/** White pill CTA used inside a hero */
export const heroCtaClass =
  "inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-white text-[#1E1B24] font-display font-bold text-base border-2 border-white shadow-[0_5px_0_rgba(30,27,36,0.25)] hover:-translate-y-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1B24] focus-visible:ring-offset-2 disabled:opacity-60";

export function LobbyCard({
  className,
  tone = "plain",
  children,
}: {
  className?: string;
  tone?: "plain" | "hot" | "mint" | "lilac" | "sun";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "b-card",
        tone === "hot" && "b-card-hot",
        tone === "mint" && "b-card-mint",
        tone === "lilac" && "b-card-lilac",
        tone === "sun" && "b-card-sun",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface PickFriend {
  id: string;
  name: string;
  avatar?: string | null;
  buttonId?: string;
  ariaLabel: string;
  disabled?: boolean;
  busy?: boolean;
  /** small label under the name, e.g. "Invited" */
  tag?: string;
}

export function PickWhoRow({
  title = "Pick who to play",
  friends,
  onPick,
  action,
}: {
  title?: string;
  friends: PickFriend[];
  onPick: (id: string) => void;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display font-bold text-xl text-[#1E1B24]">{title}</h2>
        {action}
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 list-none">
        {friends.map((f) => (
          <li key={f.id} className="shrink-0 w-[72px]">
            <button
              type="button"
              id={f.buttonId}
              aria-label={f.ariaLabel}
              onClick={() => onPick(f.id)}
              disabled={f.disabled}
              className="group flex w-full flex-col items-center gap-1.5 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] disabled:opacity-60"
            >
              <span
                className={cn(
                  "b-story-ring rounded-full transition-transform group-hover:-translate-y-0.5",
                  f.busy && "animate-pulse",
                )}
              >
                <Avatar
                  src={f.avatar}
                  name={f.name}
                  className="!w-[58px] !h-[58px] border-2 border-white"
                />
              </span>
              <span className="w-full truncate text-center text-xs font-bold text-[#1E1B24]">{f.name}</span>
              {f.tag && <span className="text-[10px] font-bold text-[#6E6878]">{f.tag}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NumberedRules({ rules, className }: { rules: React.ReactNode[]; className?: string }) {
  return (
    <ol className={cn("space-y-3 text-sm text-[#6E6878]", className)}>
      {rules.map((rule, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-7 h-7 shrink-0 rounded-full bg-[#FFC23D] border-2 border-[#E9A912] text-[#1E1B24] text-xs font-extrabold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="leading-relaxed pt-0.5">{rule}</span>
        </li>
      ))}
    </ol>
  );
}

/** Two-column feed frame: main column + 300px right rail (hidden on mobile, stacked below). */
export function LobbyFrame({
  rail,
  children,
}: {
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full px-4 sm:px-7 py-6 max-w-[1000px]">
      <div
        className={cn(
          "grid gap-7 grid-cols-1",
          rail && "lg:grid-cols-[minmax(0,640px)_300px] lg:justify-center",
        )}
      >
        <div className="min-w-0 flex flex-col gap-5 text-[#1E1B24]">{children}</div>
        {rail && <aside className="min-w-0 flex flex-col gap-4">{rail}</aside>}
      </div>
    </div>
  );
}

export function InviteRailCard({ label, href = "/friends" }: { label: string; href?: string }) {
  return (
    <LobbyCard tone="lilac">
      <h3 className="font-display font-bold text-lg text-[#1E1B24]">Waiting for you</h3>
      <p className="mt-1 text-sm text-[#6E6878] leading-relaxed">{label}</p>
      <Link
        href={href}
        className="mt-3 inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-white border-2 border-[#D7D0FF] text-sm font-bold text-[#1E1B24] shadow-[0_3px_0_#D7D0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
      >
        Find friends
      </Link>
    </LobbyCard>
  );
}

export function RecordRailCard({ href = "/history" }: { href?: string }) {
  return (
    <LobbyCard>
      <h3 className="font-display font-bold text-lg text-[#1E1B24]">Your record</h3>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-[22px] bg-[#E3FAF3] p-3 text-center">
          <p className="text-xl" aria-hidden="true">🏆</p>
          <p className="text-xs font-bold text-[#1E1B24]">Wins</p>
        </div>
        <div className="rounded-[22px] bg-[#EEEBFF] p-3 text-center">
          <p className="text-xl" aria-hidden="true">🎯</p>
          <p className="text-xs font-bold text-[#1E1B24]">Matches</p>
        </div>
      </div>
      <Link
        href={href}
        className="mt-3 inline-flex items-center justify-center w-full min-h-[44px] rounded-full bg-[#F5EADC] text-sm font-bold text-[#1E1B24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
      >
        See match history
      </Link>
    </LobbyCard>
  );
}
