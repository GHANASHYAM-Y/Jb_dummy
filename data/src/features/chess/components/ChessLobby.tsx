"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Users,
  Play,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/shared/ui";
import {
  LobbyFrame, LobbyBackLink, LobbyHero, LobbyCard, PickWhoRow, NumberedRules,
  InviteRailCard, RecordRailCard, heroCtaClass, type PickFriend,
} from "@/shared/game/LobbyChrome";
import type { FriendEntry } from "@/core/supabase/database";

interface ActiveChessMatch {
  id: string;
  opponent_name: string;
  opponent_avatar?: string | null;
  turn: "w" | "b";
  is_my_turn: boolean;
  game_status: string;
  time_control_seconds: number;
}

interface ChessLobbyProps {
  userId?: string;
  friends: FriendEntry[];
  activeMatches?: ActiveChessMatch[];
}

export function ChessLobby({ friends, activeMatches = [] }: ChessLobbyProps) {
  const router = useRouter();

  // Time control selection
  const [timeControl, setTimeControl] = useState<{ seconds: number; inc: number; label: string }>({
    seconds: 300,
    inc: 3,
    label: "Blitz 5m + 3s",
  });

  // Color preference
  const [preferredColor, setPreferredColor] = useState<"random" | "white" | "black">("random");

  const [loadingFriendId, setLoadingFriendId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const TIME_OPTIONS = [
    { seconds: 180, inc: 2, label: "Bullet 3m + 2s" },
    { seconds: 300, inc: 3, label: "Blitz 5m + 3s" },
    { seconds: 600, inc: 5, label: "Rapid 10m + 5s" },
  ];

  const handleChallenge = async (friendId: string) => {
    setLoadingFriendId(friendId);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/chess/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponent_id: friendId,
          time_control_seconds: timeControl.seconds,
          increment_seconds: timeControl.inc,
          preferred_color: preferredColor,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to create chess match.");
        return;
      }

      router.push(`/play/chess/${data.match_id}`);
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
          <InviteRailCard label="Challenge a friend to a timed duel. The winner gets to dare the loser." />
          <RecordRailCard />
        </>
      }
    >
      <LobbyBackLink />

      <LobbyHero
        color="lilac"
        emoji="♟️"
        eyebrow="Strategy Arena"
        title="Speed Chess"
        tagline="Server-authoritative FIDE rules, timed blitz clocks, and post-game Dares for the vanquished."
        chips={["1v1", "Live clocks", "Dare for the loser"]}
      >
        <a href="#chess-pick" className={heroCtaClass}>
          <Play className="w-4 h-4 fill-current" aria-hidden="true" />
          Challenge a friend
        </a>
      </LobbyHero>

      {/* ── 1. Resume Active Matches (Recovery / Reconnect) ──────────────────── */}
      {activeMatches.length > 0 && (
        <LobbyCard tone="hot">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <h2 className="font-display font-bold text-lg text-white">Active Matches in Progress</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {activeMatches.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 p-4 bg-white border-2 border-white rounded-[22px]"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[#1E1B24] truncate">{m.opponent_name}</p>
                  <p className="text-xs mt-0.5">
                    {m.is_my_turn ? (
                      <span className="text-[#C9381F] font-bold">Your turn to move</span>
                    ) : (
                      <span className="text-[#6E6878]">Opponent&apos;s turn</span>
                    )}
                  </p>
                </div>
                <Link href={`/play/chess/${m.id}`} className="shrink-0">
                  <Button variant="primary" size="sm" className="font-bold">
                    Resume <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </LobbyCard>
      )}

      {/* ── 2. Match Settings (Time Control & Color) ─────────────────────────── */}
      <LobbyCard className="space-y-5">
        <div>
          <h2 className="font-display font-bold text-xl text-[#1E1B24] mb-1">Game Settings</h2>
          <p className="text-[#6E6878] text-sm">
            Choose clock timing and piece color before issuing a challenge.
          </p>
        </div>

        {/* Time Control pill segment */}
        <div>
          <p id="chess-clock-label" className="text-xs font-extrabold uppercase tracking-wider text-[#6E6878] mb-2">
            Time Control
          </p>
          <div
            role="radiogroup"
            aria-labelledby="chess-clock-label"
            className="flex flex-col sm:flex-row gap-1 p-1 rounded-[26px] sm:rounded-full bg-[#F5EADC]"
          >
            {TIME_OPTIONS.map((opt) => {
              const active = timeControl.label === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTimeControl(opt)}
                  className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] ${
                    active
                      ? "bg-white text-[#1E1B24] border-2 border-[#EADBC8] shadow-[0_2px_0_#EADBC8]"
                      : "text-[#6E6878] border-2 border-transparent hover:text-[#1E1B24]"
                  }`}
                >
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Preference pill segment */}
        <div>
          <p id="chess-color-label" className="text-xs font-extrabold uppercase tracking-wider text-[#6E6878] mb-2">
            Color Preference
          </p>
          <div
            role="radiogroup"
            aria-labelledby="chess-color-label"
            className="grid grid-cols-3 gap-1 p-1 rounded-full bg-[#F5EADC]"
          >
            {[
              { val: "random", label: "Random 50/50" },
              { val: "white", label: "White Pieces" },
              { val: "black", label: "Black Pieces" },
            ].map((c) => {
              const active = preferredColor === c.val;
              return (
                <button
                  key={c.val}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPreferredColor(c.val as "random" | "white" | "black")}
                  className={`min-h-[44px] px-2 rounded-full text-xs sm:text-sm font-bold transition-all text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] ${
                    active
                      ? "bg-white text-[#1E1B24] border-2 border-[#EADBC8] shadow-[0_2px_0_#EADBC8]"
                      : "text-[#6E6878] border-2 border-transparent hover:text-[#1E1B24]"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </LobbyCard>

      {/* ── 3. Pick who to play ──────────────────────────────────────────────── */}
      <LobbyCard className="space-y-4">
        <div id="chess-pick" className="flex items-center justify-between gap-3 scroll-mt-24">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xl text-[#1E1B24]">Pick who to play</h2>
            <p className="text-[#6E6878] text-sm mt-0.5">
              Tap a friend to start an instant 1-on-1 Speed Chess duel.
            </p>
          </div>
          <Link href="/friends" className="shrink-0">
            <Button variant="ghost" size="sm" className="text-xs text-[#FF5A3C] hover:text-[#C9381F]">
              Find Friends <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3.5 bg-[#FFE4DD] border-2 border-[#E5484D]/40 rounded-[18px] text-xs text-[#B42318] font-medium">
            {errorMsg}
          </div>
        )}

        {friends.length === 0 ? (
          <div className="p-8 text-center bg-[#FFF6EC] border-2 border-dashed border-[#EADBC8] rounded-[22px] space-y-3">
            <Users className="w-8 h-8 text-[#6E6878] mx-auto" />
            <div>
              <p className="font-bold text-sm text-[#1E1B24]">No Friends Connected Yet</p>
              <p className="text-xs text-[#6E6878] mt-1">
                Add friends using their Evoora ID to challenge them to Speed Chess duels.
              </p>
            </div>
            <Link href="/friends">
              <Button variant="primary" size="sm" className="mt-2 font-bold">
                Add Friends
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
              disabled: Boolean(loadingFriendId),
              busy: loadingFriendId === friend.friend_id,
            }))}
            onPick={handleChallenge}
          />
        )}
      </LobbyCard>

      {/* ── 4. Rules ─────────────────────────────────────────────────────────── */}
      <LobbyCard className="space-y-3">
        <h2 className="font-display font-bold text-xl text-[#1E1B24]">How it works</h2>
        <NumberedRules
          rules={[
            "Pick a clock and your colour, then challenge a friend.",
            "Standard FIDE rules. The server checks every move.",
            "Run out of time and you lose, so watch the clock.",
            "The winner gets to dare the loser after the game.",
          ]}
        />
      </LobbyCard>
    </LobbyFrame>
  );
}
