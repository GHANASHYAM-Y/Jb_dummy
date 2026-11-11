"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  CalendarDays,
  Globe,
  Lock,
  Trophy,
  Gamepad2,
  Users,
  Flame,
  LogOut,
  ChevronRight,
  Film,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Avatar, Button } from "@/shared/ui";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import type { Profile } from "@/types/database";

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

export function ProfileViewClient({
  user,
  profile,
  stats,
}: ProfileViewClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "settings">("overview");

  const displayName = profile.display_name || user.email?.split("@")[0] || "Player";
  const evoId = profile.evoora_id;

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

  const defaultInterests = [
    "Rock Paper Scissors",
    "Chess",
    "Speed Dare",
    "Dance Challenges",
    "Quick Play",
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ── 1. Profile Hero ──────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <Avatar
              src={profile.avatar_url}
              name={displayName}
              size="lg"
              className="w-20 h-20 text-xl ring-4 ring-[#39DFFF]/30 shrink-0"
            />
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display font-black text-2xl sm:text-3xl text-[#F5F7FF]">
                  {displayName}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold",
                    profile.is_public
                      ? "bg-[#39DFFF]/15 text-[#39DFFF] border border-[#39DFFF]/30"
                      : "bg-[#161F48] text-[#B8C3E0] border border-[rgba(255,255,255,0.1)]",
                  )}
                >
                  {profile.is_public ? (
                    <>
                      <Globe className="h-3 w-3" /> Public Profile
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" /> Private Profile
                    </>
                  )}
                </span>
              </div>

              {/* Unique EVOAIQU ID */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#B8C3E0]">Evoora ID:</span>
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-[#070B25] border border-[rgba(255,255,255,0.12)] text-[#39DFFF]">
                  {evoId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded-md hover:bg-[#161F48] text-[#B8C3E0] hover:text-[#F5F7FF] transition-colors"
                  title="Copy ID"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#39DFFF]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>

                <div className="flex items-center gap-1 text-xs text-[#B8C3E0] ml-2">
                  <CalendarDays className="h-3.5 w-3.5 text-[#39DFFF]" />
                  <span>Joined {memberSince}</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-[#B8C3E0] max-w-xl leading-relaxed pt-1">
                {profile.bio || "Gaming enthusiast on EVOAIQU. Challenge me to Rock Paper Scissors!"}
              </p>

              {/* Interests */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                {defaultInterests.map((interest) => (
                  <span
                    key={interest}
                    className="px-2.5 py-0.5 rounded-lg bg-[#070B25] border border-[rgba(255,255,255,0.08)] text-[11px] font-semibold text-[#B8C3E0]"
                  >
                    #{interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <Button
              variant={activeTab === "overview" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("overview")}
              className="text-xs font-bold"
            >
              Overview
            </Button>
            <Button
              variant={activeTab === "edit" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("edit")}
              className="text-xs font-bold"
            >
              Edit Profile
            </Button>
            <Button
              variant={activeTab === "settings" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("settings")}
              className="text-xs font-bold"
            >
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Content Sections Based on Active Tab ─────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-fade-in">
          {/* Game Statistics Grid */}
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="font-display font-bold text-lg sm:text-xl text-[#F5F7FF] mb-4">
              Game Statistics
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-5 shadow-[0_0_20px_rgba(0,0,0,0.25)] text-center">
                <p className="text-xs font-semibold text-[#B8C3E0] mb-1">Matches Played</p>
                <p className="font-display font-black text-2xl sm:text-3xl text-[#F5F7FF]">
                  {stats.totalMatches}
                </p>
              </div>

              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-5 shadow-[0_0_20px_rgba(0,0,0,0.25)] text-center">
                <p className="text-xs font-semibold text-[#B8C3E0] mb-1">Victories</p>
                <p className="font-display font-black text-2xl sm:text-3xl text-[#39DFFF]">
                  {stats.wins}
                </p>
              </div>

              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-5 shadow-[0_0_20px_rgba(0,0,0,0.25)] text-center">
                <p className="text-xs font-semibold text-[#B8C3E0] mb-1">Win Rate</p>
                <p className="font-display font-black text-2xl sm:text-3xl text-[#F5F7FF]">
                  {stats.winRate}%
                </p>
              </div>

              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-5 shadow-[0_0_20px_rgba(0,0,0,0.25)] text-center">
                <p className="text-xs font-semibold text-[#B8C3E0] mb-1">Dares Completed</p>
                <p className="font-display font-black text-2xl sm:text-3xl text-[#FF5370]">
                  {stats.daresCount}
                </p>
              </div>
            </div>
          </section>

          <hr className="evo-divider my-6" />

          {/* Achievements Showcase */}
          <section aria-labelledby="achievements-heading">
            <h2 id="achievements-heading" className="font-display font-bold text-lg sm:text-xl text-[#F5F7FF] mb-4">
              Achievements & Badges
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-4 shadow-[0_0_20px_rgba(0,0,0,0.25)] flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#39DFFF]/15 border border-[#39DFFF]/30 flex items-center justify-center text-[#39DFFF] shrink-0">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#F5F7FF]">First Blood</p>
                  <p className="text-xs text-[#B8C3E0]">Win your first RPS match</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-4 shadow-[0_0_20px_rgba(0,0,0,0.25)] flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#FF5370]/15 border border-[#FF5370]/30 flex items-center justify-center text-[#FF5370] shrink-0">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#F5F7FF]">Dare Hero</p>
                  <p className="text-xs text-[#B8C3E0]">Submit a challenge dare video</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-4 shadow-[0_0_20px_rgba(0,0,0,0.25)] flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#8B2CFF]/15 border border-[#8B2CFF]/30 flex items-center justify-center text-[#8B2CFF] shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#F5F7FF]">Social Butterfly</p>
                  <p className="text-xs text-[#B8C3E0]">Connect with {stats.friendsCount} friends</p>
                </div>
              </div>
            </div>
          </section>

          <hr className="evo-divider my-6" />

          {/* Quick Shortcuts */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link
              href="/games"
              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-5 shadow-[0_0_20px_rgba(0,0,0,0.25)] hover:border-[#39DFFF]/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#39DFFF]/15 border border-[#39DFFF]/30 flex items-center justify-center text-[#39DFFF]">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#F5F7FF]">Gaming Arena</p>
                  <p className="text-xs text-[#B8C3E0]">Play RPS or matchmaking</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#B8C3E0] group-hover:text-[#39DFFF] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/chat?tab=stories"
              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-5 shadow-[0_0_20px_rgba(0,0,0,0.25)] hover:border-[#FF5370]/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5370]/15 border border-[#FF5370]/30 flex items-center justify-center text-[#FF5370]">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#F5F7FF]">Stories & Dares</p>
                  <p className="text-xs text-[#B8C3E0]">Active 24h video dares</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#B8C3E0] group-hover:text-[#FF5370] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/friends"
              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-5 shadow-[0_0_20px_rgba(0,0,0,0.25)] hover:border-[#8B2CFF]/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8B2CFF]/15 border border-[#8B2CFF]/30 flex items-center justify-center text-[#8B2CFF]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#F5F7FF]">Friends Network</p>
                  <p className="text-xs text-[#B8C3E0]">{stats.friendsCount} Connected</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#B8C3E0] group-hover:text-[#8B2CFF] group-hover:translate-x-1 transition-all" />
            </Link>
          </section>
        </div>
      )}

      {/* ── Tab: Edit Profile ───────────────────────────────────────────────── */}
      {activeTab === "edit" && (
        <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)] animate-fade-in">
          <h2 className="font-display font-bold text-xl text-[#F5F7FF] mb-2">
            Edit Your Profile
          </h2>
          <p className="text-[#B8C3E0] text-sm mb-6">
            Update your display name, bio, language preference, and public visibility.
          </p>
          <ProfileEditForm profile={profile} />
        </div>
      )}

      {/* ── Tab: Settings & Danger Zone ─────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)] space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-[#F5F7FF] mb-1">
                Account & Privacy Settings
              </h2>
              <p className="text-[#B8C3E0] text-sm">
                Manage your account credentials, security, and blocked users.
              </p>
            </div>

            <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-[#F5F7FF]">Manage Blocked Users</p>
                <p className="text-xs text-[#B8C3E0]">View and unblock users you have previously blocked</p>
              </div>
              <Link href="/friends">
                <Button variant="secondary" size="sm">
                  View Blocked
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-[#F5F7FF]">Sign Out</p>
                <p className="text-xs text-[#B8C3E0]">End your current session on this device</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-[#FF5370] hover:bg-[#FF5370]/15 border border-[rgba(255,83,112,0.3)] font-semibold"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-3xl border border-[rgba(255,83,112,0.3)] bg-[#101638] p-6 sm:p-8 shadow-[0_0_24px_rgba(255,83,112,0.1)]">
            <h3 className="font-bold text-base text-[#FF5370] mb-1">Danger Zone</h3>
            <p className="text-xs text-[#B8C3E0] mb-4">
              Permanently delete your EVOAIQU account, games history, and personal profile data.
            </p>
            <Link href="/settings#delete-account">
              <Button variant="ghost" size="sm" className="text-[#FF5370] border border-[rgba(255,83,112,0.3)] hover:bg-[#FF5370]/15">
                Proceed to Delete Account
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
