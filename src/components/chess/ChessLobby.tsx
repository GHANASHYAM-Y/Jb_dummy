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
import { Button, Avatar, Spinner } from "@/components/ui";
import type { FriendEntry } from "@/types/database";

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
    <div className="flex flex-col gap-6 select-none">
      {/* ── 1. Resume Active Matches (Recovery / Reconnect) ──────────────────── */}
      {activeMatches.length > 0 && (
        <div className="bg-white border border-[#E2E8E2] rounded-3xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#167D78] animate-pulse" />
            <h2 className="font-display font-bold text-base text-[#203331]">Active Matches in Progress</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeMatches.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3.5 bg-[#F7F8F4] border border-[#E2E8E2] rounded-2xl hover:border-[#167D78] transition-colors"
              >
                <div>
                  <p className="font-bold text-sm text-[#203331]">{m.opponent_name}</p>
                  <p className="text-xs text-[#65736F]">
                    {m.is_my_turn ? (
                      <span className="text-[#167D78] font-bold">Your turn to move</span>
                    ) : (
                      "Opponent's turn"
                    )}
                  </p>
                </div>
                <Link href={`/play/chess/${m.id}`}>
                  <Button variant="primary" size="sm">
                    Resume <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. Match Settings (Time Control & Color) ─────────────────────────── */}
      <div className="bg-white border border-[#E2E8E2] rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="font-display font-extrabold text-xl text-[#203331] mb-1">
            Game Settings
          </h2>
          <p className="text-[#65736F] text-xs">
            Choose clock timing and piece color before issuing a challenge.
          </p>
        </div>

        {/* Time Control Buttons */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#65736F] mb-2">
            Time Control
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setTimeControl(opt)}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-sm font-bold transition-all ${
                  timeControl.label === opt.label
                    ? "bg-[#DDF2EB] border-[#167D78] text-[#167D78] shadow-xs"
                    : "bg-[#F7F8F4] border-[#E2E8E2] text-[#203331] hover:border-[#CBD5E1]"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Preference */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#65736F] mb-2">
            Color Preference
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { val: "random", label: "Random 50/50" },
              { val: "white", label: "White Pieces" },
              { val: "black", label: "Black Pieces" },
            ].map((c) => (
              <button
                key={c.val}
                type="button"
                onClick={() => setPreferredColor(c.val as "random" | "white" | "black")}
                className={`p-2.5 rounded-2xl border text-xs font-bold transition-all ${
                  preferredColor === c.val
                    ? "bg-[#DDF2EB] border-[#167D78] text-[#167D78] shadow-xs"
                    : "bg-[#F7F8F4] border-[#E2E8E2] text-[#203331] hover:border-[#CBD5E1]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Challenge a Friend List ───────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8E2] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-xl text-[#203331]">
              Challenge a Friend
            </h2>
            <p className="text-[#65736F] text-xs">
              Instant 1-on-1 Speed Chess duel with authoritative move validation.
            </p>
          </div>
          <Link href="/friends">
            <Button variant="ghost" size="sm" className="text-xs text-[#167D78]">
              Find Friends <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#FCE6DE] border border-[rgba(217,95,73,0.3)] rounded-2xl text-xs text-[#D95F49] font-medium">
            {errorMsg}
          </div>
        )}

        {friends.length === 0 ? (
          <div className="p-8 text-center bg-[#F7F8F4] border border-dashed border-[#CBD5E1] rounded-2xl space-y-3">
            <Users className="w-8 h-8 text-[#8E9B97] mx-auto" />
            <div>
              <p className="font-bold text-sm text-[#203331]">No Friends Connected Yet</p>
              <p className="text-xs text-[#65736F] mt-0.5">
                Add friends using their Evoora ID to challenge them to Speed Chess.
              </p>
            </div>
            <Link href="/friends">
              <Button variant="primary" size="sm">
                Add Friends
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8E2]">
            {friends.map((friend) => {
              const isChallenging = loadingFriendId === friend.friend_id;
              return (
                <div key={friend.friend_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={friend.avatar_url ?? undefined}
                      name={friend.display_name}
                      className="w-10 h-10 border border-[#E2E8E2]"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#203331] truncate">
                        {friend.display_name}
                      </p>
                      <p className="text-[11px] font-mono text-[#65736F] truncate">
                        {friend.evoora_id ?? "EVO-ID"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleChallenge(friend.friend_id)}
                    disabled={Boolean(loadingFriendId)}
                    className="shrink-0 font-bold"
                  >
                    {isChallenging ? (
                      <Spinner className="w-3.5 h-3.5 mr-1" />
                    ) : (
                      <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                    )}
                    Challenge
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
