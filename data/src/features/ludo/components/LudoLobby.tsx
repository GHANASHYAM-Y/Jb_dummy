"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, LogIn, Swords, Users } from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { Avatar, Button } from "@/shared/ui";
import {
  LobbyFrame, LobbyBackLink, LobbyHero, LobbyCard, PickWhoRow, InviteRailCard, RecordRailCard,
  heroCtaClass, NumberedRules, type PickFriend,
} from "@/shared/game/LobbyChrome";
import type { FriendEntry } from "@/core/supabase/database";
import type { LudoOpenMatch } from "@/features/ludo/types";

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
  return <NumberedRules rules={RULES} />;
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
    <LobbyFrame
      rail={
        <>
          <InviteRailCard label="Friends can challenge you to a game. The winner dares the loser." />
          <RecordRailCard />
        </>
      }
    >
      <LobbyBackLink />

      <LobbyHero
        color="sun"
        emoji="🎲"
        eyebrow="Board Arena"
        title="Ludo"
        tagline="Roll, race your four tokens round the board and get them home first. Capture anyone who gets in the way."
        chips={["2 to 4 players", "20s turns", "Dare for the loser"]}
      >
        <Link href="/play/ludo/bots" className={heroCtaClass}>
          <Bot className="w-4 h-4" aria-hidden="true" />
          Play vs bots
        </Link>
        {userId && (
          <a href="#ludo-pick" className={heroCtaClass}>
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
            <p className="text-sm text-[#6E6878] mt-1">Sign in to challenge a friend. The winner gets to dare the loser.</p>
          </div>
          <Link href="/login?next=/play/ludo" className="inline-block">
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
                <h2 className="font-display font-bold text-lg text-white">Your games</h2>
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
            </LobbyCard>
          )}

          {/* ── Pick who to play ───────────────────────────────────────────── */}
          <LobbyCard className="space-y-4">
            <div id="ludo-pick" className="flex items-start justify-between gap-3 scroll-mt-24">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-xl text-[#1E1B24]">Pick who to play</h2>
                <p className="text-[#6E6878] text-sm mt-0.5">One on one, 20 seconds a turn, and a dare for the loser.</p>
              </div>
              <Link href="/friends" className="shrink-0">
                <Button variant="ghost" size="sm" className="text-xs text-[#FF5A3C]">
                  Find friends <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {errorMsg && (
              <div
                className="p-3.5 bg-[#FFE4DD] border-2 border-[#E5484D]/40 rounded-[18px] text-xs text-[#B42318] font-medium"
                role="alert"
              >
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
                  <Button variant="primary" size="sm" className="font-bold">
                    Add friends
                  </Button>
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
        <h2 className="font-display font-bold text-xl text-[#1E1B24]">How to play</h2>
        <LudoRules />
      </LobbyCard>
    </LobbyFrame>
  );
}
