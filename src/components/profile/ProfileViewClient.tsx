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
import { cn } from "@/lib/utils";
import { Avatar, Button } from "@/components/ui";
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
      <div className="rounded-3xl border border-[#E2E8E2] bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <Avatar
              src={profile.avatar_url}
              name={displayName}
              size="lg"
              className="w-20 h-20 text-xl ring-4 ring-[#DDF2EB] shrink-0"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display font-black text-2xl sm:text-3xl text-[#203331]">
                  {displayName}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold",
                    profile.is_public
                      ? "bg-[#DDF2EB] text-[#167D78] border border-[rgba(22,125,120,0.2)]"
                      : "bg-[#EEF1ED] text-[#65736F] border border-[#E2E8E2]",
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
                <span className="text-xs text-[#65736F]">Evoora ID:</span>
                <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-[#EEF1ED] border border-[#E2E8E2] text-[#167D78]">
                  {evoId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded-md hover:bg-[#EEF1ED] text-[#65736F] hover:text-[#203331] transition-colors"
                  title="Copy ID"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#167D78]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>

                <div className="flex items-center gap-1 text-xs text-[#8E9B97] ml-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Joined {memberSince}</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-[#65736F] max-w-xl leading-relaxed pt-1">
                {profile.bio || "Gaming enthusiast on EVOAIQU. Challenge me to Rock Paper Scissors!"}
              </p>

              {/* Interests */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                {defaultInterests.map((interest) => (
                  <span
                    key={interest}
                    className="px-2.5 py-0.5 rounded-lg bg-[#F7F8F4] border border-[#E2E8E2] text-[11px] font-semibold text-[#65736F]"
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
            <h2 id="stats-heading" className="font-display font-bold text-lg sm:text-xl text-[#203331] mb-4">
              Game Statistics
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#E2E8E2] bg-white p-5 shadow-xs text-center">
                <p className="text-xs font-semibold text-[#65736F] mb-1">Matches Played</p>
                <p className="font-display font-black text-2xl sm:text-3xl text-[#203331]">
                  {stats.totalMatches}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8E2] bg-white p-5 shadow-xs text-center">
                <p className="text-xs font-semibold text-[#65736F] mb-1">Victories</p>
                <p className="font-display font-black text-2xl sm:text-3xl text-[#167D78]">
                  {stats.wins}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8E2] bg-white p-5 shadow-xs text-center">
                <p className="text-xs font-semibold text-[#65736F] mb-1">Win Rate</p>
                <p className="font-display font-black text-2xl sm:text-3xl text-[#203331]">
                  {stats.winRate}%
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8E2] bg-white p-5 shadow-xs text-center">
                <p className="text-xs font-semibold text-[#65736F] mb-1">Dares Completed</p>
                <p className="font-display font-black text-2xl sm:text-3xl text-[#D95F49]">
                  {stats.daresCount}
                </p>
              </div>
            </div>
          </section>

          {/* Achievements Showcase */}
          <section aria-labelledby="achievements-heading">
            <h2 id="achievements-heading" className="font-display font-bold text-lg sm:text-xl text-[#203331] mb-4">
              Achievements & Badges
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[#E2E8E2] bg-white p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#DDF2EB] flex items-center justify-center text-[#167D78] shrink-0">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#203331]">First Blood</p>
                  <p className="text-xs text-[#65736F]">Win your first RPS match</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2E8E2] bg-white p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#FCE6DE] flex items-center justify-center text-[#D95F49] shrink-0">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#203331]">Dare Hero</p>
                  <p className="text-xs text-[#65736F]">Submit a challenge dare video</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2E8E2] bg-white p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#EEF1ED] flex items-center justify-center text-[#65736F] shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#203331]">Social Butterfly</p>
                  <p className="text-xs text-[#65736F]">Connect with {stats.friendsCount} friends</p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Shortcuts */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link
              href="/games"
              className="rounded-2xl border border-[#E2E8E2] bg-white p-5 shadow-xs hover:border-[#167D78] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DDF2EB] flex items-center justify-center text-[#167D78]">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#203331]">Gaming Arena</p>
                  <p className="text-xs text-[#65736F]">Play RPS or matchmaking</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8E9B97] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/chat?tab=stories"
              className="rounded-2xl border border-[#E2E8E2] bg-white p-5 shadow-xs hover:border-[#D95F49] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FCE6DE] flex items-center justify-center text-[#D95F49]">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#203331]">Stories & Dares</p>
                  <p className="text-xs text-[#65736F]">Active 24h video dares</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8E9B97] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/friends"
              className="rounded-2xl border border-[#E2E8E2] bg-white p-5 shadow-xs hover:border-[#167D78] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DDF2EB] flex items-center justify-center text-[#167D78]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#203331]">Friends Network</p>
                  <p className="text-xs text-[#65736F]">{stats.friendsCount} Connected</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8E9B97] group-hover:translate-x-1 transition-transform" />
            </Link>
          </section>
        </div>
      )}

      {/* ── Tab: Edit Profile ───────────────────────────────────────────────── */}
      {activeTab === "edit" && (
        <div className="rounded-3xl border border-[#E2E8E2] bg-white p-6 sm:p-8 shadow-xs animate-fade-in">
          <h2 className="font-display font-bold text-xl text-[#203331] mb-2">
            Edit Your Profile
          </h2>
          <p className="text-[#65736F] text-sm mb-6">
            Update your display name, bio, language preference, and public visibility.
          </p>
          <ProfileEditForm profile={profile} />
        </div>
      )}

      {/* ── Tab: Settings & Danger Zone ─────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-3xl border border-[#E2E8E2] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-[#203331] mb-1">
                Account & Privacy Settings
              </h2>
              <p className="text-[#65736F] text-sm">
                Manage your account credentials, security, and blocked users.
              </p>
            </div>

            <div className="pt-4 border-t border-[#E2E8E2] flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-[#203331]">Manage Blocked Users</p>
                <p className="text-xs text-[#65736F]">View and unblock users you have previously blocked</p>
              </div>
              <Link href="/friends">
                <Button variant="secondary" size="sm">
                  View Blocked
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t border-[#E2E8E2] flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-[#203331]">Sign Out</p>
                <p className="text-xs text-[#65736F]">End your current session on this device</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-[#D95F49] hover:bg-[#FCE6DE] font-semibold"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-3xl border border-[rgba(217,95,73,0.3)] bg-white p-6 sm:p-8 shadow-xs">
            <h3 className="font-bold text-base text-[#D95F49] mb-1">Danger Zone</h3>
            <p className="text-xs text-[#65736F] mb-4">
              Permanently delete your EVOAIQU account, games history, and personal profile data.
            </p>
            <Link href="/settings#delete-account">
              <Button variant="ghost" size="sm" className="text-[#D95F49] border border-[rgba(217,95,73,0.3)] hover:bg-[#FCE6DE]">
                Proceed to Delete Account
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
