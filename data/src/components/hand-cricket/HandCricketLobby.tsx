"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, LogIn, Play, Swords, Users } from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { cn } from "@/shared/lib/utils";
import { OVER_OPTIONS, type OversOption } from "@/lib/hand-cricket/engine";
import { Avatar, Button, Spinner } from "@/shared/ui";
import type { FriendEntry } from "@/core/supabase/database";
import type { HandCricketOpenMatch } from "@/lib/hand-cricket/types";
import { HandCricketRules } from "./HandCricketParts";

interface HandCricketLobbyProps {
  userId: string | null;
  friends: FriendEntry[];
  openMatches: HandCricketOpenMatch[];
}

function openMatchStatus(m: HandCricketOpenMatch): { label: string; action: string; urgent: boolean } {
  if (m.phase === "waiting") {
    if (!m.i_joined) return { label: `${m.opponent_name} challenged you`, action: "Accept & play", urgent: true };
    return { label: `Waiting for ${m.opponent_name} to join`, action: "Open", urgent: false };
  }
  return { label: "Match in progress", action: "Resume", urgent: true };
}

export function HandCricketLobby({ userId, friends, openMatches }: HandCricketLobbyProps) {
  const router = useRouter();
  const [loadingFriendId, setLoadingFriendId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overs, setOvers] = useState<OversOption>(2);

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
      .channel(`hand-cricket-lobby:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hand_cricket_matches", filter: `player2_id=eq.${userId}` },
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
      const res = await fetch("/api/hand-cricket/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponent_id: friendId, overs }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data.match_id) {
        setErrorMsg(data?.error || "Couldn't create the match. Please try again.");
        return;
      }
      router.push(`/play/hand-cricket/${data.match_id}`);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoadingFriendId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── Solo ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[rgba(57,223,255,0.25)] bg-[#101638] p-6 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#39DFFF]/20 to-[#315BFF]/30 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] shrink-0">
          <Bot className="w-7 h-7" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-extrabold text-xl text-[#F5F7FF]">Play solo</h2>
          <p className="text-sm text-[#B8C3E0] mt-0.5">
            Practise against EVO Bot. No sign-in needed, nothing is saved.
          </p>
        </div>
        <Link href="/play/hand-cricket/solo" className="shrink-0">
          <Button variant="primary" size="md" className="w-full sm:w-auto font-bold">
            <Play className="w-4 h-4 mr-2 fill-current" />
            Play vs bot
          </Button>
        </Link>
      </div>

      {!userId ? (
        <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-6 sm:p-7 shadow-xl text-center space-y-3">
          <Users className="w-8 h-8 text-[#8B98B5] mx-auto" aria-hidden="true" />
          <div>
            <h2 className="font-display font-extrabold text-lg text-[#F5F7FF]">Play your friends</h2>
            <p className="text-sm text-[#B8C3E0] mt-1">
              Sign in to challenge friends. The winner gets to dare the loser.
            </p>
          </div>
          <Link href="/login?next=/play/hand-cricket" className="inline-block">
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
                <h2 className="font-display font-bold text-base text-[#F5F7FF]">Your matches</h2>
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
                      <Link href={`/play/hand-cricket/${m.id}`} className="shrink-0">
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
                <p className="text-[#B8C3E0] text-sm mt-0.5">
                  11 players a side, hidden throws, and a dare for the loser.
                </p>
              </div>
              <Link href="/friends" className="shrink-0">
                <Button variant="ghost" size="sm" className="text-xs text-[#39DFFF]">
                  Find friends <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#39DFFF] mb-2">Overs per side</p>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Overs per side">
                {OVER_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={overs === option}
                    onClick={() => setOvers(option)}
                    className={cn(
                      "py-2.5 rounded-2xl border font-display font-black text-lg transition-all",
                      overs === option
                        ? "bg-[#39DFFF]/15 border-[#39DFFF] text-[#39DFFF]"
                        : "bg-[#070B25] border-[rgba(255,255,255,0.08)] text-[#B8C3E0] hover:border-[#39DFFF]/40",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-[rgba(255,83,112,0.1)] border border-[rgba(255,83,112,0.3)] rounded-2xl text-xs text-[#FF5370] font-medium" role="alert">
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
                  <Button variant="primary" size="sm" className="font-bold">Add friends</Button>
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
        <h2 className="font-display font-extrabold text-lg text-[#F5F7FF]">How it works</h2>
        <HandCricketRules />
      </div>
    </div>
  );
}
