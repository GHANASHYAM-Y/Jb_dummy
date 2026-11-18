"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, LogIn, Plus } from "lucide-react";
import { Alert, Avatar } from "@/shared/ui";
import {
  InviteRailCard,
  LobbyBackLink,
  LobbyCard,
  LobbyFrame,
  LobbyHero,
  NumberedRules,
  heroCtaClass,
} from "@/shared/game/LobbyChrome";
import { postJson } from "@/shared/lib/http";
import { normalizeRoomCode, isRoomCode } from "../engine/engine";
import type { DrawOpenRoom } from "../types";

interface Props {
  userId: string | null;
  openRooms: DrawOpenRoom[];
}

const STATUS_LABEL: Record<DrawOpenRoom["status"], string> = {
  waiting: "Waiting for a friend",
  ready: "Ready to start",
  drawing: "Round in progress",
  round_over: "Between rounds",
  finished: "Finished",
};

const RULES = [
  "One player gets a secret word and draws it. No letters, no talking.",
  "The other player types guesses. The faster the right guess, the more points.",
  "4 rounds, and you swap roles every round. Most points wins.",
];

export function DrawGuessLobby({ userId, openRooms }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createRoom() {
    setBusy("create");
    setError(null);
    try {
      const res = await postJson("/api/draw-guess/create");
      const data = (await res.json()) as { room_id?: string; error?: string };
      if (!res.ok || !data.room_id) throw new Error(data.error || "Could not create a room.");
      router.push(`/play/draw-guess/${data.room_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a room.");
      setBusy(null);
    }
  }

  async function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!isRoomCode(code)) {
      setError("Enter the 5-character room code.");
      return;
    }
    setBusy("join");
    setError(null);
    try {
      const res = await postJson("/api/draw-guess/join", { code });
      const data = (await res.json()) as { room_id?: string; code?: string; error?: string };
      if (!res.ok || !data.room_id) {
        const reason =
          data.code === "not_found"
            ? "No room with that code."
            : data.code === "room_full"
              ? "That room already has two players."
              : data.error || "Could not join that room.";
        throw new Error(reason);
      }
      router.push(`/play/draw-guess/${data.room_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join that room.");
      setBusy(null);
    }
  }

  return (
    <LobbyFrame
      rail={
        <>
          <InviteRailCard label="Add a friend first, then send them your room code to play together." />
        </>
      }
    >
      <LobbyBackLink />

      <LobbyHero
        color="sun"
        emoji="🎨"
        eyebrow="New"
        title="Draw & Guess"
        tagline="Sketch the secret word. Your friend has to guess it before the clock runs out."
        chips={["2 players", "4 rounds", "75 seconds each"]}
      >
        {userId ? (
          <button type="button" id="draw-create-room" onClick={createRoom} disabled={busy !== null} className={heroCtaClass}>
            <Plus className="w-5 h-5" aria-hidden="true" />
            {busy === "create" ? "Creating…" : "Create a room"}
          </button>
        ) : (
          <Link href="/login?next=/play/draw-guess" className={heroCtaClass}>
            <LogIn className="w-5 h-5" aria-hidden="true" />
            Sign in to play
          </Link>
        )}
      </LobbyHero>

      {error && (
        <Alert variant="error" className="animate-fade-in">
          {error}
        </Alert>
      )}

      {userId && (
        <LobbyCard>
          <h2 className="font-display font-bold text-xl text-[#1E1B24]">Got a room code?</h2>
          <p className="mt-1 text-sm text-[#6E6878]">Ask your friend for their 5-character code.</p>
          <form onSubmit={joinRoom} className="mt-4 flex flex-col sm:flex-row gap-3">
            <label htmlFor="draw-room-code" className="sr-only">
              Room code
            </label>
            <input
              id="draw-room-code"
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              placeholder="ABCDE"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={5}
              className="evo-input flex-1 min-h-[48px] text-center font-mono text-xl tracking-[0.3em] uppercase"
            />
            <button
              type="submit"
              id="draw-join-room"
              disabled={busy !== null || code.length !== 5}
              className="evo-btn evo-btn-primary min-h-[48px] px-6"
            >
              {busy === "join" ? "Joining…" : "Join room"}
            </button>
          </form>
        </LobbyCard>
      )}

      {openRooms.length > 0 && (
        <LobbyCard>
          <h2 className="font-display font-bold text-xl text-[#1E1B24]">Your open rooms</h2>
          <ul className="mt-3 space-y-2 list-none">
            {openRooms.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/play/draw-guess/${room.id}`}
                  className="flex items-center gap-3 min-h-[56px] rounded-[18px] border-2 border-[#EADBC8] bg-[#FFF6EC] px-3 py-2 hover:border-[#FF5A3C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
                >
                  <Avatar name={room.opponent_name ?? "?"} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#1E1B24]">
                      {room.opponent_name ? `Room with ${room.opponent_name}` : "Room waiting for a friend"}
                    </span>
                    <span className="block text-xs text-[#6E6878]">
                      {STATUS_LABEL[room.status]} · code {room.code}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-[#FF5A3C]">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        </LobbyCard>
      )}

      <LobbyCard>
        <h2 className="font-display font-bold text-xl text-[#1E1B24] flex items-center gap-2">
          <Copy className="w-5 h-5 text-[#8C7BFF]" aria-hidden="true" />
          How it works
        </h2>
        <NumberedRules className="mt-4" rules={RULES} />
      </LobbyCard>
    </LobbyFrame>
  );
}
