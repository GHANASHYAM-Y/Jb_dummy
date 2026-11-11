"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Coins,
  Flame,
  Hourglass,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { Avatar, Badge, Button, Spinner } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import { GameLifecycleBanner } from "@/shared/game/GameLifecycleBanner";
import { useMatchConnection } from "@/shared/game/useMatchConnection";
import { postJson } from "@/shared/lib/http";
import { ChallengeSelectionModal, useMatchChallenge } from "@/features/dare-game";
import { MatchChallengeCard } from "@/features/dare-game";
import {
  DEADLINE_TOLERANCE_MS,
  SHOT_CLOCK_MS,
  TOSS_WINDOW_MS,
  battingCard,
  bowlingCard,
  chaseInfo,
  commentaryFor,
  currentBatter,
  currentBatterIndex,
  currentBowlerIndex,
  currentOverBalls,
  formatOvers,
  otherSide,
  resultSummary,
  type Side,
  type ThrowValue,
} from "@/features/hand-cricket/engine/engine";
import { clockOffsetMs, currentBallKey, sideOfPlayer, snapshotToState, squadsOf } from "@/features/hand-cricket/engine/snapshot";
import {
  isLivePhase,
  isTerminalPhase,
  type HandCricketPlayers,
  type HandCricketSnapshot,
} from "@/features/hand-cricket/types";
import {
  Commentary,
  EditPlayersButton,
  HandTile,
  InningsCard,
  OverStrip,
  Scoreboard,
  ShotClock,
  SquadEditor,
  ThrowPad,
} from "./HandCricketParts";

/** Claim an expired clock a little after the server's own tolerance. */
const CLAIM_GRACE_MS = DEADLINE_TOLERANCE_MS + 250;
const POLL_INTERVAL_MS = 3_000;

interface HandCricketMatchBoardProps {
  matchId: string;
  viewerId: string;
  players: HandCricketPlayers;
  initialSnapshot: HandCricketSnapshot;
}

function useTicker(active: boolean, intervalMs = 100): number {
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

export function HandCricketMatchBoard({ matchId, viewerId, players, initialSnapshot }: HandCricketMatchBoardProps) {
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<HandCricketSnapshot>(initialSnapshot);
  const [offsetMs, setOffsetMs] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [pending, setPending] = useState<{ key: string; value: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dareOpen, setDareOpen] = useState(false);
  const [rematching, setRematching] = useState(false);

  const requestSeq = useRef(0);
  const claimedRef = useRef<Set<string>>(new Set());
  const joinedRef = useRef(false);
  const phaseRef = useRef(initialSnapshot.match.phase);

  const { match, game } = snapshot;
  const phase = match.phase;
  const terminal = isTerminalPhase(phase);
  const live = isLivePhase(phase);

  const now = useTicker(!terminal);
  const serverNow = now === 0 ? 0 : now + offsetMs;

  // ── Who is who ──────────────────────────────────────────────────────────────

  const mySide: Side = sideOfPlayer(snapshot, viewerId) ?? "A";
  const me = mySide === "A" ? players.player1 : players.player2;
  const opponent = mySide === "A" ? players.player2 : players.player1;
  // Team labels: the viewer is always "Me"; the other side is the friend's name
  const oppSide: Side = mySide === "A" ? "B" : "A";
  const names = useMemo<Record<Side, string>>(() => {
    const label = (side: Side) =>
      side === mySide ? "Me" : side === "A" ? players.player1.display_name : players.player2.display_name;
    return { A: label("A"), B: label("B") };
  }, [players, mySide]);
  const squads = useMemo(() => squadsOf(snapshot), [snapshot]);
  const [editorOpen, setEditorOpen] = useState(false);
  const nameOf = useCallback(
    (playerId: string | null) => (playerId === players.player1.id ? names.A : playerId === players.player2.id ? names.B : "—"),
    [players, names],
  );

  const engineState = useMemo(() => snapshotToState(snapshot), [snapshot]);

  // ── Server sync ─────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const res = await fetch(`/api/hand-cricket/match/${matchId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (seq !== requestSeq.current || !data?.success || !data.state) return;
      setSnapshot(data.state as HandCricketSnapshot);
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
    postJson(`/api/hand-cricket/match/${matchId}/join`)
      .catch(() => null)
      .finally(() => {
        void refresh();
      });
  }, [matchId, refresh]);

  // Realtime: any change to the match row triggers a fresh, authoritative read
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`hand-cricket:${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "hand_cricket_matches", filter: `id=eq.${matchId}` },
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
  const myDisconnectedAt = mySide === "A" ? match.player1_disconnected_at : match.player2_disconnected_at;
  useMatchConnection({ matchId, phaseRef, live, myDisconnectedAt, refresh });

  // Claim expired clocks (toss window or shot clock). The server re-checks the deadline.
  useEffect(() => {
    if (!live || serverNow === 0) return;
    if (!(game.player1_joined && game.player2_joined)) return;

    let key: string | null = null;
    let deadlineIso: string | null = null;
    if (game.status === "toss") {
      key = "toss";
      deadlineIso = game.toss_deadline;
    } else if (game.status === "in_play") {
      key = currentBallKey(snapshot);
      deadlineIso = game.ball_deadline;
    }
    if (!key || !deadlineIso) return;

    const deadlineMs = Date.parse(deadlineIso);
    if (Number.isNaN(deadlineMs) || serverNow < deadlineMs + CLAIM_GRACE_MS) return;
    if (claimedRef.current.has(key)) return;

    const claimKey = key;
    claimedRef.current.add(claimKey);
    postJson(`/api/hand-cricket/match/${matchId}/timeout`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.code === "not_timed_out") {
          const retryIn = Math.max(300, Number(data.remaining_ms) || 500);
          setTimeout(() => claimedRef.current.delete(claimKey), retryIn);
        }
      })
      .catch(() => {
        setTimeout(() => claimedRef.current.delete(claimKey), 1_000);
      })
      .finally(() => {
        void refresh();
      });
  }, [serverNow, live, game, snapshot, matchId, refresh]);

  // Load (and, for the loser, keep checking for) the dare once the match is decided
  const iWon = match.winner_id === viewerId;
  const iLost = match.loser_id === viewerId;
  const [challenge, setChallenge] = useMatchChallenge({
    matchId,
    decided: phase === "completed" && !match.is_draw,
    pollWhileWaiting: iLost,
  });

  // ── Actions ─────────────────────────────────────────────────────────────────

  const ballKey = currentBallKey(snapshot);
  const myThrow = snapshot.my_throw ?? (pending && pending.key === ballKey ? pending.value : null);

  const opensAtMs = game.ball_opens_at ? Date.parse(game.ball_opens_at) : 0;
  const deadlineMs = game.ball_deadline ? Date.parse(game.ball_deadline) : 0;
  const ballOpen = live && game.status === "in_play" && serverNow > 0 && serverNow >= opensAtMs;
  const canThrow =
    ballOpen && myThrow === null && !submitting && serverNow <= deadlineMs + DEADLINE_TOLERANCE_MS;

  const handleThrow = useCallback(
    async (value: ThrowValue) => {
      if (!canThrow) return;
      setSubmitting(true);
      setActionError(null);
      setPending({ key: ballKey, value });
      try {
        const res = await postJson(`/api/hand-cricket/match/${matchId}/throw`, {
          innings: game.innings,
          ball_number: game.ball_number,
          value,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setPending(null);
          if (data?.code !== "stale_ball" && data?.code !== "ball_timed_out") {
            setActionError(data?.error || "Your throw didn't go through. Try again.");
          }
        }
      } catch {
        setPending(null);
        setActionError("Network error. Your throw may not have counted.");
      } finally {
        setSubmitting(false);
        void refresh();
      }
    },
    [canThrow, ballKey, matchId, game.innings, game.ball_number, refresh],
  );

  // Keyboard: 0 (DOK) to 6
  useEffect(() => {
    if (!canThrow) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!/^[0-6]$/.test(event.key)) return;
      event.preventDefault();
      void handleThrow(Number(event.key) as ThrowValue);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canThrow, handleThrow]);

  const saveMySquad = async (newNames: string[]): Promise<string | null> => {
    try {
      const res = await postJson(`/api/hand-cricket/match/${matchId}/squad`, { names: newNames });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) return data?.error || "Couldn't save the names.";
      void refresh();
      return null;
    } catch {
      return "Network error. Please try again.";
    }
  };

  const handleToss = async (decision: "bat" | "bowl") => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await postJson(`/api/hand-cricket/match/${matchId}/toss`, { decision });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setActionError(data?.error || "Couldn't record your choice.");
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
      void refresh();
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      await postJson(`/api/hand-cricket/match/${matchId}/cancel`);
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
      const res = await postJson("/api/hand-cricket/create", { opponent_id: opponent.id });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.match_id) {
        router.push(`/play/hand-cricket/${data.match_id}`);
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

  const oppDisconnectedAt = oppSide === "A" ? match.player1_disconnected_at : match.player2_disconnected_at;
  const oppReconnectDeadline = oppSide === "A" ? match.player1_reconnect_deadline : match.player2_reconnect_deadline;
  const myReconnectDeadline = mySide === "A" ? match.player1_reconnect_deadline : match.player2_reconnect_deadline;

  const balls = engineState?.balls ?? [];
  const lastBall = balls.length > 0 ? balls[balls.length - 1] : null;
  const revealBall =
    lastBall && engineState && (game.status !== "in_play" || lastBall.innings === game.innings) ? lastBall : null;
  const inReveal =
    revealBall !== null && (game.status !== "in_play" || !live || (serverNow > 0 && serverNow < opensAtMs));
  const isInningsBreak =
    live && game.status === "in_play" && game.innings === 2 && game.ball_number === 1 && serverNow > 0 && serverNow < opensAtMs;

  const iAmBatting = game.batting_player_id === viewerId;
  const inningsBalls = balls.filter((b) => b.innings === game.innings);
  const commentary = lastBall
    ? commentaryFor(lastBall, squads[lastBall.batter][lastBall.batterIndex], squads[lastBall.bowler][lastBall.bowlerIndex])
    : null;
  const highlight = revealBall ? (revealBall.isOut ? "out" : revealBall.runs > 0 ? "runs" : null) : null;

  /** Tile for one side (me left, opponent right); uses the revealed ball's roles while showing it. */
  const tileFor = (side: Side) => {
    if (inReveal && revealBall) {
      const batting = revealBall.batter === side;
      return {
        role: (batting ? "Batting" : "Bowling") as "Batting" | "Bowling",
        playerName: squads[side][batting ? revealBall.batterIndex : revealBall.bowlerIndex],
        value: batting ? revealBall.batterThrow : revealBall.bowlerThrow,
      };
    }
    const batting = engineState ? currentBatter(engineState) === side : false;
    return {
      role: (batting ? "Batting" : "Bowling") as "Batting" | "Bowling",
      playerName: engineState
        ? squads[side][batting ? currentBatterIndex(engineState) : currentBowlerIndex(engineState)]
        : "",
      value: null,
    };
  };

  const teamScore = (side: Side) => {
    if (!engineState) return null;
    if (engineState.firstBatter === side) return engineState.innings1;
    return engineState.innings === 2 ? engineState.innings2 : null;
  };

  const crease = (() => {
    if (!engineState || !live || game.status !== "in_play") return { batterLine: null, bowlerLine: null };
    const battingSide = currentBatter(engineState);
    const bIdx = currentBatterIndex(engineState);
    const bat = battingCard(engineState, engineState.innings)[bIdx];
    const bwlIdx = currentBowlerIndex(engineState);
    const bowl = bowlingCard(engineState, engineState.innings).find((l) => l.index === bwlIdx);
    return {
      batterLine: `${squads[battingSide][bIdx]} · ${bat.runs} (${bat.balls})`,
      bowlerLine: `${squads[otherSide(battingSide)][bwlIdx]} · ${formatOvers(bowl?.balls ?? 0)}-${bowl?.runs ?? 0}-${bowl?.wickets ?? 0}`,
    };
  })();

  const tossDeadlineMs = game.toss_deadline ? Date.parse(game.toss_deadline) : 0;
  const iWonToss = game.toss_winner_id === viewerId;
  const waitingDeadlineMs = match.waiting_deadline ? Date.parse(match.waiting_deadline) : 0;
  const showResult = terminal || game.status === "finished";

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#101638] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-xl">
        <Link
          href="/play/hand-cricket"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#B8C3E0] hover:text-[#39DFFF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lobby</span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={live ? "teal" : "muted"}>Hand Cricket · Friend match</Badge>
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

      {/* Players */}
      <div className="grid grid-cols-2 gap-3">
        {[me, opponent].map((player) => {
          const batting = live && game.status === "in_play" && game.batting_player_id === player.id;
          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-2.5 p-3 rounded-2xl border bg-[#101638] min-w-0",
                batting ? "border-[#39DFFF]/50" : "border-[rgba(255,255,255,0.08)]",
              )}
            >
              <Avatar src={player.avatar_url} name={player.display_name} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#F5F7FF] truncate">
                  {player.display_name}
                  {player.id === viewerId && <span className="text-[#39DFFF] font-semibold"> (you)</span>}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8B98B5]">
                  {game.status === "in_play" && live
                    ? batting
                      ? "Batting"
                      : "Bowling"
                    : player.evoora_id ?? "Player"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!terminal && (
        <div className="flex justify-end">
          <EditPlayersButton onClick={() => setEditorOpen(true)} />
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-[rgba(255,83,112,0.1)] border border-[rgba(255,83,112,0.3)] rounded-2xl text-xs text-[#FF5370] font-medium" role="alert">
          {actionError}
        </div>
      )}

      {/* ── Waiting for the friend to open the match ─────────────────────────── */}
      {phase === "waiting" && (
        <div className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638] p-6 text-center space-y-4 shadow-xl animate-fade-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#39DFFF]/10 border border-[#39DFFF]/30 flex items-center justify-center text-[#39DFFF]">
            <Hourglass className="w-7 h-7 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-[#F5F7FF]">Waiting for {opponent.display_name}</h1>
            <p className="text-sm text-[#B8C3E0] mt-1">
              They&apos;ll see your challenge in their Hand Cricket lobby. The toss happens as soon as they open it.
            </p>
          </div>
          {waitingDeadlineMs > 0 && serverNow > 0 && (
            <p className="text-xs font-mono text-[#8B98B5]">
              Challenge expires in {formatClock(waitingDeadlineMs - serverNow)}
            </p>
          )}
          <Button variant="ghost" size="sm" onClick={handleCancel} loading={submitting} className="text-[#FF5370] hover:text-[#FF8599]">
            Cancel challenge
          </Button>
        </div>
      )}

      {/* ── Toss ─────────────────────────────────────────────────────────────── */}
      {live && game.status === "toss" && (
        <div className="rounded-3xl border border-[#FBBF24]/30 bg-[#101638] p-6 text-center space-y-4 shadow-xl animate-scale-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FBBF24]/15 border border-[#FBBF24]/40 flex items-center justify-center text-[#FBBF24]">
            <Coins className="w-7 h-7" aria-hidden="true" />
          </div>
          {!(game.player1_joined && game.player2_joined) ? (
            <p className="text-sm text-[#B8C3E0] flex items-center justify-center gap-2">
              <Spinner size="sm" /> Getting both players ready…
            </p>
          ) : (
            <>
              <h1 className="font-display font-black text-xl text-[#F5F7FF]">
                {iWonToss ? "You won the toss!" : `${opponent.display_name} won the toss`}
              </h1>
              {iWonToss ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="primary" size="lg" className="font-bold" disabled={submitting} onClick={() => handleToss("bat")}>
                    Bat first
                  </Button>
                  <Button variant="secondary" size="lg" className="font-bold" disabled={submitting} onClick={() => handleToss("bowl")}>
                    Bowl first
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-[#B8C3E0]">Waiting for them to choose bat or bowl…</p>
              )}
              {tossDeadlineMs > 0 && (
                <ShotClock
                  label={iWonToss ? "Decide in" : "Their decision"}
                  remainingMs={tossDeadlineMs - serverNow}
                  totalMs={TOSS_WINDOW_MS}
                  running={serverNow > 0 && serverNow < tossDeadlineMs}
                />
              )}
              <p className="text-[11px] text-[#8B98B5]">If no choice is made in time, the toss winner bats first.</p>
            </>
          )}
        </div>
      )}

      {/* ── Play ─────────────────────────────────────────────────────────────── */}
      {engineState && (game.status === "in_play" || showResult) && phase !== "waiting" && (
        <>
          <Scoreboard
            left={{
              label: names[mySide],
              score: teamScore(mySide),
              batting: live && game.status === "in_play" && currentBatter(engineState) === mySide,
            }}
            right={{
              label: names[oppSide],
              score: teamScore(oppSide),
              batting: live && game.status === "in_play" && currentBatter(engineState) === oppSide,
            }}
            innings={engineState.innings}
            ballsPerInnings={engineState.ballsPerInnings}
            target={engineState.target}
            chase={live && engineState.status !== "finished" ? chaseInfo(engineState) : null}
            batterLine={crease.batterLine}
            bowlerLine={crease.bowlerLine}
          />

          {isInningsBreak && (
            <div className="rounded-2xl border border-[#FBBF24]/40 bg-[#101638] px-4 py-3 text-center text-sm font-bold text-[#FBBF24] animate-fade-in">
              Innings break · {nameOf(game.batting_player_id)} needs {engineState.target} to win
            </div>
          )}

          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638]/80 p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              {/* Me: always on the left */}
              <HandTile
                team={names[mySide]}
                {...tileFor(mySide)}
                revealed={inReveal}
                hasThrown={myThrow !== null}
                highlight={inReveal ? highlight : null}
              />
              <span className="font-display font-black text-lg text-[#8B98B5]" aria-hidden="true">vs</span>
              {/* Opponent: always on the right */}
              <HandTile
                team={names[oppSide]}
                {...tileFor(oppSide)}
                revealed={inReveal}
                hasThrown={snapshot.opponent_has_thrown}
                highlight={inReveal ? highlight : null}
              />
            </div>

            {inReveal && revealBall && (
              <p
                className={cn(
                  "text-center font-display font-black text-2xl animate-rps-pop",
                  revealBall.isOut ? "text-[#FF5370]" : revealBall.runs > 0 ? "text-[#39DFFF]" : "text-[#8B98B5]",
                )}
              >
                {revealBall.isOut
                  ? "OUT!"
                  : revealBall.kind === "dok" && revealBall.runs > 0
                  ? `DOK! +${revealBall.runs}`
                  : revealBall.runs > 0
                  ? `+${revealBall.runs}`
                  : "Dot ball"}
              </p>
            )}

            {live && game.status === "in_play" && (
              <>
                <ShotClock remainingMs={deadlineMs - serverNow} totalMs={SHOT_CLOCK_MS} running={ballOpen && serverNow < deadlineMs} />
                <ThrowPad
                  onThrow={(value) => void handleThrow(value)}
                  disabled={!canThrow}
                  selected={myThrow}
                  prompt={
                    !ballOpen
                      ? "Next ball coming up…"
                      : myThrow !== null
                      ? `Locked in ${myThrow}. Waiting for ${opponent.display_name}…`
                      : iAmBatting
                      ? "You're batting: pick your shot."
                      : "You're bowling: match their number to get them out."
                  }
                />
              </>
            )}

            <OverStrip balls={currentOverBalls(inningsBalls)} />
          </div>

          <Commentary text={commentary} />
        </>
      )}

      {/* ── Result ───────────────────────────────────────────────────────────── */}
      {showResult && phase !== "waiting" && (
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
                : match.is_draw
                ? "It's a tie!"
                : iWon
                ? "You won!"
                : iLost
                ? `${opponent.display_name} wins`
                : "Match over"}
            </h2>
            {phase === "completed" && engineState && (
              <p className="text-sm text-[#B8C3E0]">{resultSummary(engineState, names)}</p>
            )}
            {phase === "forfeited" && (
              <p className="text-sm text-[#B8C3E0]">
                {iWon ? `${opponent.display_name} left the match.` : "You left the match."}
              </p>
            )}
          </div>

          {engineState && (
            <>
              <InningsCard
                title={`${names[engineState.firstBatter]} batting`}
                squad={squads[engineState.firstBatter]}
                bowlingSquad={squads[otherSide(engineState.firstBatter)]}
                score={engineState.innings1}
                batting={battingCard(engineState, 1)}
                bowling={bowlingCard(engineState, 1)}
              />
              {engineState.innings === 2 && (
                <InningsCard
                  title={`${names[otherSide(engineState.firstBatter)]} batting`}
                  squad={squads[otherSide(engineState.firstBatter)]}
                  bowlingSquad={squads[engineState.firstBatter]}
                  score={engineState.innings2}
                  batting={battingCard(engineState, 2)}
                  bowling={bowlingCard(engineState, 2)}
                />
              )}
            </>
          )}

          {/* Dare the loser (only for a match decided on the field) */}
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
            <Link href="/play/hand-cricket" className="block">
              <Button variant="secondary" size="md" className="w-full font-bold">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Lobby
              </Button>
            </Link>
          </div>
        </div>
      )}

      <SquadEditor
        open={editorOpen}
        initial={squads[mySide]}
        onClose={() => setEditorOpen(false)}
        onSave={saveMySquad}
      />

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

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
