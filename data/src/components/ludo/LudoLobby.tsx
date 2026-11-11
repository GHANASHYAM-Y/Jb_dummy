"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, LogIn, Play, Swords, Users } from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { Avatar, Button, Spinner } from "@/shared/ui";
import type { FriendEntry } from "@/core/supabase/database";
import type { LudoOpenMatch } from "@/lib/ludo/types";

interface LudoLobbyProps {
  userId: string | null;
  friends: FriendEntry[];
  openMatches: LudoOpenMatch[];
}

function openMatchStatus(m: LudoOpenMatch): { label: string; action: string; urgent: boolean } {
  if (m.phase === "waiting") {
    if (!m.i_joined) return { label: `${m.opponent_name} challenged you`, action: "Accept & play", urgent: true };
    return { label: `Waiting for ${m.opponent_name} to join`, action: "Open", urgent: false };
  }
  return { label: "Game in progress", action: "Resume", urgent: true };
}

const RULES: string[] = [
  "Roll a 6 to bring a token out of your yard onto your start square.",
  "A 6 gives you another roll, but three 6s in a row ends your turn.",
  "Land on an opponent to send their token back to the yard, and roll again.",
  "Start squares and star squares are safe: nobody can be captured there.",
  "Reach home with an exact roll. Getting a token home earns another roll.",
  "First to bring all four tokens home wins.",
];

export function LudoRules() {
  return (
    <ul className="space-y-2.5">
      {RULES.map((rule, i) => (
        <li key={i} className="flex gap-3 text-sm text-[#B8C3E0] leading-relaxed">
          <span className="w-6 h-6 shrink-0 rounded-lg bg-[#39DFFF]/10 border border-[#39DFFF]/30 text-[#39DFFF] text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span>{rule}</span>
        </li>
      ))}
    </ul>
  );
}

export function LudoLobby({ userId, friends, openMatches }: LudoLobbyProps) {
  const router = useRouter();
  const [loadingFriendId, setLoadingFriendId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New challenges from friends show up without a reload
  useEffect(() => {
    if (!userId) return;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const channel = supabase
      .channel(`ludo-lobby:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ludo_matches", filter: `player2_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  const handleChallenge = async (friendId: string) => {
    setLoadingFriendId(friendId);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ludo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponent_id: friendId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.match_id && (res.ok || data?.code === "existing_match")) {
        router.push(`/play/ludo/${data.match_id}`);
        return;
      }
      setErrorMsg(data?.error || "Couldn't create the game. Please try again.");
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoadingFriendId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── Bots ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[rgba(57,223,255,0.25)] bg-[#101638] p-6 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#39DFFF]/20 to-[#315BFF]/30 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] shrink-0">
          <Bot className="w-7 h-7" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-extrabold text-xl text-[#F5F7FF]">Play vs bots</h2>
          <p className="text-sm text-[#B8C3E0] mt-0.5">
            2, 3 or 4 players. No sign-in needed, nothing is saved.
          </p>
        </div>
        <Link href="/play/ludo/bots" className="shrink-0">
          <Button variant="primary" size="md" className="w-full sm:w-auto font-bold">
            <Play className="w-4 h-4 mr-2 fill-current" />
            Play vs bots
          </Button>
        </Link>
      </div>

      {!userId ? (
        <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-6 sm:p-7 shadow-xl text-center space-y-3">
          <Users className="w-8 h-8 text-[#8B98B5] mx-auto" aria-hidden="true" />
          <div>
            <h2 className="font-display font-extrabold text-lg text-[#F5F7FF]">Play your friends</h2>
            <p className="text-sm text-[#B8C3E0] mt-1">Sign in to challenge a friend. The winner gets to dare the loser.</p>
          </div>
          <Link href="/login?next=/play/ludo" className="inline-block">
            <Button variant="secondary" size="md" className="font-bold">
              <LogIn className="w-4 h-4 mr-2" />
              Sign in
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ── Open matches ───────────────────────────────────────────────── */}
          {openMatches.length > 0 && (
            <div className="rounded-3xl border border-[rgba(57,223,255,0.25)] bg-[#101638] p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-[#39DFFF] animate-pulse shadow-[0_0_8px_#39DFFF]" />
                <h2 className="font-display font-bold text-base text-[#F5F7FF]">Your games</h2>
              </div>
              <ul className="space-y-3">
                {openMatches.map((m) => {
                  const status = openMatchStatus(m);
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 p-4 bg-[#070B25]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={m.opponent_avatar} name={m.opponent_name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[#F5F7FF] truncate">{m.opponent_name}</p>
                          <p className={status.urgent ? "text-xs text-[#39DFFF] font-semibold" : "text-xs text-[#8B98B5]"}>
                            {status.label}
                          </p>
                        </div>
                      </div>
                      <Link href={`/play/ludo/${m.id}`} className="shrink-0">
                        <Button variant={status.urgent ? "primary" : "secondary"} size="sm" className="font-bold">
                          {status.action}
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ── Challenge a friend ─────────────────────────────────────────── */}
          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display font-extrabold text-xl text-[#F5F7FF]">Challenge a friend</h2>
                <p className="text-[#B8C3E0] text-sm mt-0.5">One on one, 20 seconds a turn, and a dare for the loser.</p>
              </div>
              <Link href="/friends" className="shrink-0">
                <Button variant="ghost" size="sm" className="text-xs text-[#39DFFF]">
                  Find friends <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {errorMsg && (
              <div
                className="p-3.5 bg-[rgba(255,83,112,0.1)] border border-[rgba(255,83,112,0.3)] rounded-2xl text-xs text-[#FF5370] font-medium"
                role="alert"
              >
                {errorMsg}
              </div>
            )}

            {friends.length === 0 ? (
              <div className="p-8 text-center bg-[#070B25]/60 border border-dashed border-[rgba(255,255,255,0.15)] rounded-2xl space-y-3">
                <Users className="w-8 h-8 text-[#8B98B5] mx-auto" aria-hidden="true" />
                <div>
                  <p className="font-bold text-sm text-[#F5F7FF]">No friends yet</p>
                  <p className="text-xs text-[#B8C3E0] mt-1">Add friends with their EVOAIQU ID to challenge them.</p>
                </div>
                <Link href="/friends" className="inline-block">
                  <Button variant="primary" size="sm" className="font-bold">
                    Add friends
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[rgba(255,255,255,0.06)]">
                {friends.map((friend) => {
                  const isLoading = loadingFriendId === friend.friend_id;
                  return (
                    <li key={friend.friend_id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={friend.avatar_url} name={friend.display_name} />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[#F5F7FF] truncate">{friend.display_name}</p>
                          <p className="text-[11px] font-mono text-[#39DFFF] truncate">{friend.evoora_id}</p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleChallenge(friend.friend_id)}
                        disabled={loadingFriendId !== null}
                        className="shrink-0 font-bold"
                      >
                        {isLoading ? <Spinner size="sm" className="mr-1" /> : <Swords className="w-3.5 h-3.5 mr-1" />}
                        Challenge
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {/* ── Rules ────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-6 sm:p-7 shadow-xl space-y-4">
        <h2 className="font-display font-extrabold text-lg text-[#F5F7FF]">How to play</h2>
        <LudoRules />
      </div>
    </div>
  );
}
