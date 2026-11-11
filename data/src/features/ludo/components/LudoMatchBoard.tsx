"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, Flame, Hourglass, RotateCcw, Sparkles, Trophy, XCircle } from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { Avatar, Badge, Button, Spinner } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import { GameLifecycleBanner } from "@/shared/game/GameLifecycleBanner";
import { useMatchConnection } from "@/shared/game/useMatchConnection";
import { postJson } from "@/shared/lib/http";
import { ChallengeSelectionModal, useMatchChallenge } from "@/features/dare-game";
import { MatchChallengeCard } from "@/features/dare-game";
import type { MatchPhase } from "@/core/supabase/database";
import { currentPlayer, legalMoves, tokensHome, type Color } from "@/features/ludo/engine/engine";
import { LUDO_TURN_MS, type LudoPlayers, type LudoSnapshot } from "@/features/ludo/types";
import { COLOR_HEX, LudoBoard, LudoPlayersBar, describeEvent, shownDice } from "./LudoBoard";
import { LudoDice } from "./LudoDice";

const POLL_INTERVAL_MS = 3_000;
/** Claim an expired turn a little after the deadline so the server agrees. */
const CLAIM_GRACE_MS = 1_250;
const AUTO_MOVE_MS = 600;
const MIN_ROLL_ANIM_MS = 450;

const LIVE_PHASES: MatchPhase[] = ["active", "reconnecting"];
const TERMINAL_PHASES: MatchPhase[] = ["completed", "aborted", "forfeited", "cancelled"];

interface LudoMatchBoardProps {
  matchId: string;
  viewerId: string;
  players: LudoPlayers;
  initialSnapshot: LudoSnapshot;
}

function useTicker(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, intervalMs]);
  return now;
}

function clockOffsetMs(serverNowIso: string): number {
  const serverMs = Date.parse(serverNowIso);
  return Number.isNaN(serverMs) ? 0 : serverMs - Date.now();
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function LudoMatchBoard({ matchId, viewerId, players, initialSnapshot }: LudoMatchBoardProps) {
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<LudoSnapshot>(initialSnapshot);
  const [offsetMs, setOffsetMs] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dareOpen, setDareOpen] = useState(false);
  const [rematching, setRematching] = useState(false);

  const requestSeq = useRef(0);
  const claimedRef = useRef<Set<number>>(new Set());
  const autoMovedRef = useRef<number | null>(null);
  const joinedRef = useRef(false);
  const phaseRef = useRef(initialSnapshot.match.phase);

  const { match, game } = snapshot;
  const state = game.state;
  const phase = match.phase;
  const terminal = TERMINAL_PHASES.includes(phase);
  const live = LIVE_PHASES.includes(phase);

  const now = useTicker(!terminal);
  const serverNow = now === 0 ? 0 : now + offsetMs;

  // ── Who is who: player1 is red, player2 is yellow ──────────────────────────
  const iAmP1 = viewerId === match.player1_id;
  const myColor: Color = iAmP1 ? "red" : "yellow";
  const oppColor: Color = iAmP1 ? "yellow" : "red";
  const opponent = iAmP1 ? players.player2 : players.player1;
  const labelOf = useCallback((c: Color) => (c === myColor ? "Me" : opponent.display_name), [myColor, opponent]);

  // ── Server sync ─────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const res = await fetch(`/api/ludo/match/${matchId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (seq !== requestSeq.current || !data?.success || !data.state) return;
      setSnapshot(data.state as LudoSnapshot);
      setOffsetMs(clockOffsetMs(data.state.server_now));
    } catch {
      // Network blip: the poller will try again
    }
  }, [matchId]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Tell the server we're here (starts the match once both players have joined)
  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    postJson(`/api/ludo/match/${matchId}/join`)
      .catch(() => null)
      .finally(() => {
        void refresh();
      });
  }, [matchId, refresh]);

  // Realtime: any change to the match rows triggers a fresh, authoritative read
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const channel = supabase
      .channel(`ludo:${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ludo_matches", filter: `id=eq.${matchId}` },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        () => {
          void refresh();
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, refresh]);

  // Polling fallback in case a Realtime event is missed
  useEffect(() => {
    if (terminal) return;
    const id = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [terminal, refresh]);

  // Network drops and refreshes: report disconnects, reconnect when back
  const myDisconnectedAt = iAmP1 ? match.player1_disconnected_at : match.player2_disconnected_at;
  useMatchConnection({ matchId, phaseRef, live, myDisconnectedAt, refresh });

  // ── Turn state ──────────────────────────────────────────────────────────────

  const bothJoined = game.player1_joined && game.player2_joined;
  const playing = live && game.status === "playing" && state.status === "playing" && bothJoined;
  const turnColor = currentPlayer(state)?.color ?? null;
  const myTurn = playing && turnColor === myColor;
  const deadlineMs = game.turn_deadline ? Date.parse(game.turn_deadline) : 0;
  const canRoll = myTurn && state.dice === null && !submitting;
  const movable = useMemo(
    () => (myTurn && state.dice !== null && !submitting ? legalMoves(state) : []),
    [myTurn, state, submitting],
  );

  // Claim an expired turn. The server re-checks the deadline.
  useEffect(() => {
    if (!playing || serverNow === 0 || !deadlineMs) return;
    if (serverNow < deadlineMs + CLAIM_GRACE_MS) return;
    const key = game.version;
    if (claimedRef.current.has(key)) return;
    claimedRef.current.add(key);
    postJson(`/api/ludo/match/${matchId}/timeout`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.code === "not_timed_out") {
          setTimeout(() => claimedRef.current.delete(key), 1_000);
        }
      })
      .catch(() => {
        setTimeout(() => claimedRef.current.delete(key), 1_000);
      })
      .finally(() => {
        void refresh();
      });
  }, [playing, serverNow, deadlineMs, game.version, matchId, refresh]);

  // Load (and, for the loser, keep checking for) the dare once the match is decided
  const iWon = match.winner_id === viewerId;
  const iLost = match.loser_id === viewerId;
  const [challenge, setChallenge] = useMatchChallenge({
    matchId,
    decided: phase === "completed" && !match.is_draw,
    pollWhileWaiting: iLost,
  });

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleRoll = useCallback(async () => {
    if (!canRoll) return;
    setSubmitting(true);
    setRolling(true);
    setActionError(null);
    try {
      const [res] = await Promise.all([
        postJson(`/api/ludo/match/${matchId}/roll`, { version: game.version }),
        delay(MIN_ROLL_ANIM_MS),
      ]);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        if (data?.code !== "stale_version") setActionError(data?.error || "Your roll didn't go through. Try again.");
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      await refresh();
      setRolling(false);
      setSubmitting(false);
    }
  }, [canRoll, matchId, game.version, refresh]);

  const handleMove = useCallback(
    async (token: number) => {
      if (!myTurn || submitting || state.dice === null) return;
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await postJson(`/api/ludo/match/${matchId}/move`, { version: game.version, token });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          if (data?.code !== "stale_version") setActionError(data?.error || "That move didn't go through.");
        }
      } catch {
        setActionError("Network error. Please try again.");
      } finally {
        await refresh();
        setSubmitting(false);
      }
    },
    [myTurn, submitting, state.dice, matchId, game.version, refresh],
  );

  // Only one token can move: move it after a brief highlight
  useEffect(() => {
    if (movable.length !== 1 || autoMovedRef.current === game.version) return;
    const version = game.version;
    const token = movable[0];
    const id = setTimeout(() => {
      autoMovedRef.current = version;
      void handleMove(token);
    }, AUTO_MOVE_MS);
    return () => clearTimeout(id);
  }, [movable, game.version, handleMove]);

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      await postJson(`/api/ludo/match/${matchId}/cancel`);
    } catch {
      // Refresh below shows the real state either way
    } finally {
      setSubmitting(false);
      void refresh();
    }
  };

  const handleLeave = async () => {
    try {
      await postJson("/api/games/leave", { match_id: matchId });
    } finally {
      void refresh();
    }
  };

  const handleRematch = async () => {
    setRematching(true);
    setActionError(null);
    try {
      const res = await postJson("/api/ludo/create", { opponent_id: opponent.id });
      const data = await res.json().catch(() => null);
      if (data?.match_id && (res.ok || data?.code === "existing_match")) {
        router.push(`/play/ludo/${data.match_id}`);
        return;
      }
      setActionError(data?.error || "Couldn't start a rematch.");
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setRematching(false);
    }
  };

  // ── Derived display values ──────────────────────────────────────────────────

  const oppDisconnectedAt = iAmP1 ? match.player2_disconnected_at : match.player1_disconnected_at;
  const oppReconnectDeadline = iAmP1 ? match.player2_reconnect_deadline : match.player1_reconnect_deadline;
  const myReconnectDeadline = iAmP1 ? match.player1_reconnect_deadline : match.player2_reconnect_deadline;
  const waitingDeadlineMs = match.waiting_deadline ? Date.parse(match.waiting_deadline) : 0;
  const showResult = terminal;
  const remainingMs = deadlineMs && serverNow ? deadlineMs - serverNow : LUDO_TURN_MS;
  const event = describeEvent(state.lastEvent, labelOf, myColor);
  const diceColor: Color =
    rolling || state.dice !== null || !state.lastEvent ? turnColor ?? myColor : state.lastEvent.color;

  const prompt = !playing
    ? null
    : myTurn
    ? rolling
      ? "Rolling…"
      : state.dice === null
      ? "Your turn: roll the die."
      : movable.length === 1
      ? "Moving your only token…"
      : submitting
      ? "Moving…"
      : "Pick a highlighted token."
    : `${opponent.display_name} is playing…`;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#101638] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-xl">
        <Link
          href="/play/ludo"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#B8C3E0] hover:text-[#39DFFF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lobby</span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={live ? "teal" : "muted"}>Ludo · Friend match</Badge>
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-[#39DFFF] animate-pulse shadow-[0_0_8px_#39DFFF]" : "bg-[#FF5370]",
            )}
            title={isConnected ? "Live updates connected" : "Reconnecting…"}
          />
        </div>
      </div>

      <GameLifecycleBanner
        matchId={matchId}
        userId={viewerId}
        phase={phase}
        endReason={match.end_reason}
        winnerId={match.winner_id}
        loserId={match.loser_id}
        lastActivityAt={match.last_activity_at}
        reconnectDeadline={oppDisconnectedAt ? oppReconnectDeadline : myReconnectDeadline}
        opponentDisconnected={Boolean(oppDisconnectedAt) && live}
        serverNow={snapshot.server_now}
        onLeaveGame={live ? handleLeave : undefined}
      />

      {actionError && (
        <div
          className="p-3 bg-[rgba(255,83,112,0.1)] border border-[rgba(255,83,112,0.3)] rounded-2xl text-xs text-[#FF5370] font-medium"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {/* ── Waiting for the friend to open the match ─────────────────────────── */}
      {phase === "waiting" && (
        <div className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638] p-6 text-center space-y-4 shadow-xl animate-fade-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#39DFFF]/10 border border-[#39DFFF]/30 flex items-center justify-center text-[#39DFFF]">
            <Hourglass className="w-7 h-7 animate-pulse" aria-hidden="true" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Avatar src={opponent.avatar_url} name={opponent.display_name} size="sm" />
            <h1 className="font-display font-black text-xl text-[#F5F7FF] truncate">Waiting for {opponent.display_name}</h1>
          </div>
          <p className="text-sm text-[#B8C3E0]">
            They&apos;ll see your challenge in their Ludo lobby. The game starts as soon as they open it.
          </p>
          {waitingDeadlineMs > 0 && serverNow > 0 && (
            <p className="text-xs font-mono text-[#8B98B5]">Challenge expires in {formatClock(waitingDeadlineMs - serverNow)}</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            loading={submitting}
            className="text-[#FF5370] hover:text-[#FF8599]"
          >
            Cancel challenge
          </Button>
        </div>
      )}

      {/* ── Board ────────────────────────────────────────────────────────────── */}
      {phase !== "waiting" && (
        <>
          <LudoPlayersBar
            players={[myColor, oppColor].map((c) => ({
              color: c,
              label: labelOf(c),
              home: tokensHome(state, c),
              isTurn: playing && turnColor === c,
              isMe: c === myColor,
            }))}
          />

          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-2 sm:p-3 shadow-xl">
            <LudoBoard
              state={state}
              myColor={myColor}
              movableTokens={movable}
              onTokenClick={(token) => void handleMove(token)}
              lastEvent={state.lastEvent}
              labels={{ [myColor]: "Me", [oppColor]: opponent.display_name }}
            />
          </div>

          {live && !playing && !terminal && (
            <p className="text-sm text-[#B8C3E0] flex items-center justify-center gap-2">
              <Spinner size="sm" /> Getting both players ready…
            </p>
          )}

          {playing && (
            <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-4 sm:p-5 shadow-xl space-y-3">
              <p className="min-h-[1.25rem] text-sm font-semibold text-[#F5F7FF]" aria-live="polite">
                {event ?? "Roll a 6 to bring a token out."}
              </p>
              <TurnClock remainingMs={remainingMs} color={turnColor ? COLOR_HEX[turnColor] : "#39DFFF"} mine={myTurn} />
              <LudoDice
                value={shownDice(state)}
                rolling={rolling}
                disabled={!canRoll}
                onRoll={() => void handleRoll()}
                color={diceColor}
                caption={prompt}
              />
            </div>
          )}
        </>
      )}

      {/* ── Result ───────────────────────────────────────────────────────────── */}
      {showResult && (
        <div className="rounded-3xl border border-[rgba(57,223,255,0.25)] bg-[#101638] p-6 space-y-5 shadow-2xl animate-slide-up">
          <div className="text-center space-y-2">
            <div
              className={cn(
                "w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center",
                iWon
                  ? "bg-[#39DFFF]/15 border-[#39DFFF]/40 text-[#39DFFF]"
                  : iLost
                  ? "bg-[#FF5370]/15 border-[#FF5370]/40 text-[#FF5370]"
                  : "bg-[#070B25] border-[rgba(255,255,255,0.12)] text-[#B8C3E0]",
              )}
            >
              {iWon ? (
                <Trophy className="w-8 h-8" aria-hidden="true" />
              ) : iLost ? (
                <XCircle className="w-8 h-8" aria-hidden="true" />
              ) : (
                <Award className="w-8 h-8" aria-hidden="true" />
              )}
            </div>
            <h2 className="font-display font-black text-2xl text-[#F5F7FF]">
              {phase === "cancelled"
                ? "Challenge called off"
                : phase === "aborted"
                ? "Match abandoned"
                : iWon
                ? "You won!"
                : iLost
                ? `${opponent.display_name} wins`
                : "Match over"}
            </h2>
            {phase === "completed" && (
              <p className="text-sm text-[#B8C3E0]">
                Tokens home: Me {tokensHome(state, myColor)}/4 · {opponent.display_name} {tokensHome(state, oppColor)}/4
              </p>
            )}
            {phase === "forfeited" && (
              <p className="text-sm text-[#B8C3E0]">
                {iWon ? `${opponent.display_name} left the match.` : "You left the match."}
              </p>
            )}
          </div>

          {/* Dare the loser (only for a match decided on the board) */}
          {phase === "completed" && !match.is_draw && challenge && (
            <MatchChallengeCard
              challenge={challenge}
              userId={viewerId}
              opponentName={opponent.display_name}
              opponentEvoId={opponent.evoora_id ?? undefined}
              onStatusChange={(updated) => setChallenge(updated)}
            />
          )}

          {phase === "completed" && iWon && !challenge && (
            <div className="bg-[rgba(255,83,112,0.1)] border border-[rgba(255,83,112,0.3)] rounded-2xl p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-1.5 text-[#FF8599] text-sm font-bold">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Winner&apos;s privilege</span>
              </div>
              <p className="text-xs text-[#B8C3E0]">
                You beat <strong className="text-[#F5F7FF]">{opponent.display_name}</strong>. Pick a dare for them.
              </p>
              <Button variant="coral" size="md" onClick={() => setDareOpen(true)} className="w-full font-bold">
                <Flame className="w-4 h-4 mr-2" />
                Dare the loser
              </Button>
            </div>
          )}

          {phase === "completed" && iLost && !challenge && (
            <p className="text-center text-xs text-[#8B98B5]">
              {opponent.display_name} may send you a dare. It will appear here.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="primary" size="md" className="font-bold" onClick={handleRematch} loading={rematching}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Rematch
            </Button>
            <Link href="/play/ludo" className="block">
              <Button variant="secondary" size="md" className="w-full font-bold">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Lobby
              </Button>
            </Link>
          </div>
        </div>
      )}

      <ChallengeSelectionModal
        isOpen={dareOpen}
        onClose={() => setDareOpen(false)}
        matchId={matchId}
        opponentName={opponent.display_name}
        onSuccess={(created) => {
          setChallenge(created);
          setDareOpen(false);
        }}
      />
    </div>
  );
}

function TurnClock({ remainingMs, color, mine }: { remainingMs: number; color: string; mine: boolean }) {
  const clamped = Math.max(0, Math.min(LUDO_TURN_MS, remainingMs));
  const fraction = clamped / LUDO_TURN_MS;
  const secs = Math.ceil(clamped / 1000);
  const low = secs <= 5;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider">
        <span className="text-[#8B98B5]">{mine ? "Your time" : "Their time"}</span>
        <span className={low ? "text-[#FF5370] font-bold" : "text-[#B8C3E0]"}>{secs}s</span>
      </div>
      <div
        className="h-1.5 rounded-full bg-[#070B25] overflow-hidden"
        role="progressbar"
        aria-label="Turn time left"
        aria-valuemin={0}
        aria-valuemax={Math.round(LUDO_TURN_MS / 1000)}
        aria-valuenow={secs}
      >
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-linear"
          style={{ width: `${fraction * 100}%`, backgroundColor: low ? "#FF5370" : color }}
        />
      </div>
    </div>
  );
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
