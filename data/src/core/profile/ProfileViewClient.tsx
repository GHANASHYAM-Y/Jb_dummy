"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  CalendarDays,
  Globe,
  Lock,
  LogOut,
  ChevronRight,
  Pencil,
  UserX,
  Trash2,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn, timeAgo } from "@/shared/lib/utils";
import { Avatar } from "@/shared/ui";
import { useI18n } from "@/core/i18n/I18nContext";
import { ProfileEditForm } from "@/core/profile/ProfileEditForm";
import type { Profile } from "@/core/supabase/database";

interface ProfileStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  friendsCount: number;
  daresCount: number;
}

interface ProfileViewClientProps {
  user: { id: string; email?: string | null };
  profile: Profile;
  stats: ProfileStats;
}

interface HistoryRow {
  match_id: string;
  opponent_name: string;
  opponent_avatar: string | null;
  my_wins: number;
  opp_wins: number;
  winner_id: string | null;
  is_draw: boolean;
  completed_at: string;
}

type Tab = "matches" | "settings";

const badges = [
  { label: "First Blood", cls: "bg-[#FFE4DD] border-[#FFC9BC] text-[#C9381F] -rotate-2" },
  { label: "Dare Hero", cls: "bg-[#FFC23D] border-[#E9A912] text-[#1E1B24] rotate-1" },
  { label: "Social Butterfly", cls: "bg-[#EEEBFF] border-[#D7D0FF] text-[#4B3FC4] -rotate-1" },
];

export function ProfileViewClient({
  user,
  profile,
  stats,
}: ProfileViewClientProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("matches");
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);

  const displayName = profile.display_name || user.email?.split("@")[0] || "Player";
  const evoId = profile.evoora_id;

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/rps/history");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (mounted) setHistory((data.history ?? []).slice(0, 10));
      } catch {
        if (mounted) setHistory([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(evoId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  }, [evoId]);

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

  const memberSince = (() => {
    try {
      return new Date(profile.created_at).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return "2026";
    }
  })();

  const statBubbles = [
    { label: "Matches", value: stats.totalMatches, bg: "bg-[#FFE4DD]", fg: "text-[#C9381F]" },
    { label: "Victories", value: stats.wins, bg: "bg-[#E3FAF3]", fg: "text-[#0B7D63]" },
    { label: "Win rate", value: `${stats.winRate}%`, bg: "bg-[#FFF1CC]", fg: "text-[#8A5F00]" },
    { label: "Dares done", value: stats.daresCount, bg: "bg-[#EEEBFF]", fg: "text-[#4B3FC4]" },
  ];

  const rowCls =
    "flex items-center gap-3.5 w-full min-h-[64px] p-3.5 rounded-[22px] border-2 border-[#EADBC8] bg-white text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]";
  const iconCls = "w-11 h-11 rounded-full flex items-center justify-center shrink-0";

  return (
    <div className="space-y-6 max-w-[860px] mx-auto">
      {/* Cover + identity */}
      <div className="b-card !p-0 overflow-hidden !rounded-[30px]">
        <div className="relative h-[150px] bg-gradient-to-br from-[#F5EADC] via-[#FFE4DD] to-[#FFC9BC] overflow-hidden">
          <span aria-hidden className="absolute -top-8 -right-6 w-36 h-36 rounded-full bg-[#FFC23D]/80" />
          <span aria-hidden className="absolute top-10 right-32 w-14 h-14 rounded-full bg-[#8C7BFF]/70" />
          <span aria-hidden className="absolute -bottom-6 left-10 w-24 h-24 rounded-full bg-[#14C49A]/70" />
          <span aria-hidden className="absolute bottom-4 left-48 w-8 h-8 rounded-full bg-white/70" />
        </div>

        <div className="px-5 sm:px-8 pb-6">
          <div className="-mt-[52px] flex items-end justify-between gap-3">
            <Avatar
              src={profile.avatar_url}
              name={displayName}
              size="xl"
              className="!w-[104px] !h-[104px] text-3xl border-[5px] !border-[#FFF6EC] bg-[#F5EADC] shrink-0"
            />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 mb-1",
                profile.is_public
                  ? "bg-[#E3FAF3] text-[#0B7D63] border-[#B7EEDD]"
                  : "bg-[#F5EADC] text-[#6E6878] border-[#EADBC8]",
              )}
            >
              {profile.is_public ? (
                <>
                  <Globe className="h-3.5 w-3.5" /> Public Profile
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" /> Private Profile
                </>
              )}
            </span>
          </div>

          <h1 className="font-display font-semibold text-[30px] leading-tight text-[#1E1B24] mt-3">
            {displayName}
          </h1>

          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <span className="text-xs text-[#6E6878]">Evoora ID:</span>
            <span className="font-mono font-bold text-xs px-3 py-1 rounded-full bg-[#F5EADC] border-2 border-[#EADBC8] text-[#C9381F]">
              {evoId}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center justify-center w-11 h-11 -my-2 rounded-full hover:bg-[#F5EADC] text-[#6E6878] hover:text-[#1E1B24] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
              title="Copy ID"
              aria-label="Copy ID"
            >
              {copied ? <Check className="h-4 w-4 text-[#0B7D63]" /> : <Copy className="h-4 w-4" />}
            </button>
            <span className="inline-flex items-center gap-1 text-xs text-[#6E6878]">
              <CalendarDays className="h-3.5 w-3.5 text-[#FF5A3C]" />
              Joined {memberSince}
            </span>
          </div>

          <p className="text-sm text-[#6E6878] max-w-xl leading-relaxed mt-3">
            {profile.bio || "Gaming enthusiast on EVOAIQU. Challenge me to Rock Paper Scissors!"}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {statBubbles.map((s) => (
              <div key={s.label} className={cn("rounded-[22px] p-4 text-center", s.bg)}>
                <p className={cn("font-display font-semibold text-3xl", s.fg)}>{s.value}</p>
                <p className="text-xs font-semibold text-[#6E6878] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5 mt-5" aria-label="Badges">
            {badges.map((b) => (
              <span
                key={b.label}
                className={cn("px-3.5 py-1.5 rounded-full border-2 text-xs font-bold", b.cls)}
              >
                {b.label}
              </span>
            ))}
            <span className="px-3.5 py-1.5 rounded-full border-2 border-[#EADBC8] bg-white text-xs font-bold text-[#6E6878] rotate-1">
              {stats.friendsCount} friends
            </span>
          </div>
        </div>
      </div>

      {/* Pill tabs */}
      <div role="tablist" aria-label="Profile sections" className="flex gap-1.5 p-1.5 rounded-full bg-[#F5EADC] w-full sm:w-fit">
        {(
          [
            ["matches", "Matches"],
            ["settings", "Settings"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 sm:flex-none min-h-[44px] px-6 rounded-full text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
              activeTab === key
                ? "bg-white text-[#1E1B24] shadow-[0_3px_0_#EADBC8]"
                : "text-[#6E6878] hover:text-[#1E1B24]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Matches */}
      {activeTab === "matches" && (
        <section aria-labelledby="matches-heading" className="b-card !p-4 sm:!p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 id="matches-heading" className="font-display font-semibold text-xl text-[#1E1B24]">
              Recent matches
            </h2>
            <Link
              href="/history"
              className="inline-flex items-center min-h-[44px] text-sm font-bold text-[#C9381F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] rounded-full px-2"
            >
              View all
            </Link>
          </div>

          {history === null ? (
            <p className="text-sm text-[#6E6878] px-1 py-6 text-center">Loading…</p>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-display font-semibold text-lg text-[#1E1B24]">No matches yet</p>
              <Link href="/play/rps" className="evo-btn evo-btn-primary mt-4 inline-flex">
                Play your first match
              </Link>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {history.map((m) => {
                const won = m.winner_id === user.id;
                return (
                  <li key={m.match_id}>
                    <Link
                      href={`/play/rps/${m.match_id}`}
                      className={rowCls}
                      aria-label={`Match vs ${m.opponent_name}`}
                    >
                      <span
                        className={cn(
                          "w-11 h-11 rounded-[14px] flex items-center justify-center font-display font-semibold text-lg shrink-0 border-2",
                          won
                            ? "bg-[#E3FAF3] border-[#B7EEDD] text-[#0B7D63]"
                            : "bg-[#F5EADC] border-[#EADBC8] text-[#6E6878]",
                        )}
                      >
                        {won ? "W" : m.is_draw ? "D" : "L"}
                      </span>
                      <Avatar src={m.opponent_avatar} name={m.opponent_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#1E1B24] truncate">vs {m.opponent_name}</p>
                        <p className="text-xs text-[#6E6878]">
                          {won ? t("rps.win") : m.is_draw ? t("rps.draw") : t("rps.loss")} · {timeAgo(m.completed_at)}
                        </p>
                      </div>
                      <span className="font-display font-semibold text-lg text-[#1E1B24] shrink-0">
                        {m.my_wins}–{m.opp_wins}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Settings */}
      {activeTab === "settings" && (
        <section aria-labelledby="profile-settings-heading" className="space-y-3 animate-fade-in">
          <h2 id="profile-settings-heading" className="sr-only">
            Settings
          </h2>

          <button type="button" className={rowCls} onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
            <span className={cn(iconCls, "bg-[#FFE4DD] text-[#C9381F]")}>
              <Pencil className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-sm text-[#1E1B24]">Edit profile</span>
              <span className="block text-xs text-[#6E6878]">Name, bio, language and visibility</span>
            </span>
            <ChevronRight className={cn("h-5 w-5 text-[#8E8798] transition-transform", editing && "rotate-90")} />
          </button>

          {editing && (
            <div className="b-card animate-fade-in">
              <ProfileEditForm profile={profile} />
            </div>
          )}

          <Link href="/settings" className={rowCls}>
            <span className={cn(iconCls, "bg-[#EEEBFF] text-[#4B3FC4]")}>
              <SettingsIcon className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-sm text-[#1E1B24]">All settings</span>
              <span className="block text-xs text-[#6E6878]">Security, password and account</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#8E8798]" />
          </Link>

          <Link href="/friends" className={rowCls}>
            <span className={cn(iconCls, "bg-[#FFF1CC] text-[#8A5F00]")}>
              <UserX className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-sm text-[#1E1B24]">Blocked players</span>
              <span className="block text-xs text-[#6E6878]">View and unblock users you have blocked</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#8E8798]" />
          </Link>

          <button type="button" className={rowCls} onClick={handleLogout}>
            <span className={cn(iconCls, "bg-[#F5EADC] text-[#1E1B24]")}>
              <LogOut className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-sm text-[#1E1B24]">Sign out</span>
              <span className="block text-xs text-[#6E6878]">End your current session on this device</span>
            </span>
          </button>

          <Link href="/settings#delete-account" className={cn(rowCls, "!border-[#F6C9CB]")}>
            <span className={cn(iconCls, "bg-[#FDECEC] text-[#E5484D]")}>
              <Trash2 className="h-5 w-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-sm text-[#E5484D]">Delete account</span>
              <span className="block text-xs text-[#6E6878]">Permanently remove your account and data</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#8E8798]" />
          </Link>
        </section>
      )}
    </div>
  );
}
