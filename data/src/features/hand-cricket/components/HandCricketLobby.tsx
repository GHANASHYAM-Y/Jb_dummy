"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, LogIn, Swords, Users } from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { cn } from "@/shared/lib/utils";
import { OVER_OPTIONS, type OversOption } from "@/features/hand-cricket/engine/engine";
import { Avatar, Button } from "@/shared/ui";
import {
  LobbyFrame, LobbyBackLink, LobbyHero, LobbyCard, PickWhoRow, InviteRailCard, RecordRailCard,
  heroCtaClass, type PickFriend,
} from "@/shared/game/LobbyChrome";
import type { FriendEntry } from "@/core/supabase/database";
import type { HandCricketOpenMatch } from "@/features/hand-cricket/types";
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
    <LobbyFrame
      rail={
        <>
          <InviteRailCard label="Friends can challenge you to a match. The winner dares the loser." />
          <RecordRailCard />
        </>
      }
    >
      <LobbyBackLink />

      <LobbyHero
        color="mint"
        emoji="🏏"
        eyebrow="Hand Arena"
        title="Hand Cricket"
        tagline="Throw 1 to 6. Match the batter to get them out, dodge the bowler to score. Two overs each."
        chips={["Hidden throws", "11 a side", "Dare for the loser"]}
      >
        <Link href="/play/hand-cricket/solo" className={heroCtaClass}>
          <Bot className="w-4 h-4" aria-hidden="true" />
          Play vs bot
        </Link>
        {userId && (
          <a href="#hc-pick" className={heroCtaClass}>
            <Swords className="w-4 h-4" aria-hidden="true" />
            Challenge a friend
          </a>
        )}
      </LobbyHero>

      {!userId ? (
        <LobbyCard className="text-center space-y-3">
          <Users className="w-8 h-8 text-[#6E6878] mx-auto" aria-hidden="true" />
          <div>
            <h2 className="font-display font-bold text-xl text-[#1E1B24]">Play your friends</h2>
            <p className="text-sm text-[#6E6878] mt-1">
              Sign in to challenge friends. The winner gets to dare the loser.
            </p>
          </div>
          <Link href="/login?next=/play/hand-cricket" className="inline-block">
            <Button variant="secondary" size="md" className="font-bold">
              <LogIn className="w-4 h-4 mr-2" />
              Sign in
            </Button>
          </Link>
        </LobbyCard>
      ) : (
        <>
          {/* ── Open matches ───────────────────────────────────────────────── */}
          {openMatches.length > 0 && (
            <LobbyCard tone="hot">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <h2 className="font-display font-bold text-lg text-white">Your matches</h2>
              </div>
              <ul className="space-y-3">
                {openMatches.map((m) => {
                  const status = openMatchStatus(m);
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 p-4 bg-white border-2 border-white rounded-[22px]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={m.opponent_avatar} name={m.opponent_name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[#1E1B24] truncate">{m.opponent_name}</p>
                          <p className={status.urgent ? "text-xs text-[#C9381F] font-semibold" : "text-xs text-[#6E6878]"}>
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
            </LobbyCard>
          )}

          {/* ── Pick who to play ───────────────────────────────────────────── */}
          <LobbyCard className="space-y-5">
            <div id="hc-pick" className="flex items-start justify-between gap-3 scroll-mt-24">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-xl text-[#1E1B24]">Pick who to play</h2>
                <p className="text-[#6E6878] text-sm mt-0.5">
                  11 players a side, hidden throws, and a dare for the loser.
                </p>
              </div>
              <Link href="/friends" className="shrink-0">
                <Button variant="ghost" size="sm" className="text-xs text-[#FF5A3C]">
                  Find friends <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            <div>
              <p id="hc-overs-label" className="text-xs font-extrabold uppercase tracking-wider text-[#6E6878] mb-2">Overs per side</p>
              <div
                className="grid grid-cols-4 gap-1 p-1 rounded-full bg-[#F5EADC]"
                role="radiogroup"
                aria-label="Overs per side"
              >
                {OVER_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={overs === option}
                    onClick={() => setOvers(option)}
                    className={cn(
                      "min-h-[44px] rounded-full border-2 font-display font-bold text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                      overs === option
                        ? "bg-white border-[#EADBC8] text-[#1E1B24] shadow-[0_2px_0_#EADBC8]"
                        : "border-transparent text-[#6E6878] hover:text-[#1E1B24]",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-[#FFE4DD] border-2 border-[#E5484D]/40 rounded-[18px] text-xs text-[#B42318] font-medium" role="alert">
                {errorMsg}
              </div>
            )}

            {friends.length === 0 ? (
              <div className="p-8 text-center bg-[#FFF6EC] border-2 border-dashed border-[#EADBC8] rounded-[22px] space-y-3">
                <Users className="w-8 h-8 text-[#6E6878] mx-auto" aria-hidden="true" />
                <div>
                  <p className="font-bold text-sm text-[#1E1B24]">No friends yet</p>
                  <p className="text-xs text-[#6E6878] mt-1">Add friends with their EVOAIQU ID to challenge them.</p>
                </div>
                <Link href="/friends" className="inline-block">
                  <Button variant="primary" size="sm" className="font-bold">Add friends</Button>
                </Link>
              </div>
            ) : (
              <PickWhoRow
                title="Challenge"
                friends={friends.map((friend): PickFriend => ({
                  id: friend.friend_id,
                  name: friend.display_name,
                  avatar: friend.avatar_url,
                  ariaLabel: `Challenge ${friend.display_name}`,
                  disabled: loadingFriendId !== null,
                  busy: loadingFriendId === friend.friend_id,
                }))}
                onPick={handleChallenge}
              />
            )}
          </LobbyCard>
        </>
      )}

      {/* ── Rules ────────────────────────────────────────────────────────────── */}
      <LobbyCard className="space-y-4">
        <h2 className="font-display font-bold text-xl text-[#1E1B24]">How it works</h2>
        <HandCricketRules />
      </LobbyCard>
    </LobbyFrame>
  );
}
