"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Bot, Coins, RotateCcw, Trophy, Users, XCircle } from "lucide-react";
import { Button, Badge } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import {
  BOT_SQUAD,
  OVER_OPTIONS,
  SHOT_CLOCK_MS,
  battingCard,
  bowlingCard,
  chaseInfo,
  commentaryFor,
  computerThrow,
  createMatch,
  currentBatter,
  currentBatterIndex,
  currentBowlerIndex,
  currentOverBalls,
  defaultSquad,
  formatOvers,
  otherSide,
  playBall,
  resultSummary,
  sanitizeSquad,
  type BallRecord,
  type HandCricketState,
  type OversOption,
  type Side,
  type ThrowValue,
} from "@/lib/hand-cricket/engine";
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

const ME: Side = "A";
const BOT: Side = "B";
const TEAM: Record<Side, string> = { A: "Me", B: "Bot" };
const SQUAD_STORAGE_KEY = "evoaiqu.handCricket.mySquad";
/** Solo can move a little faster than friend matches: no network round trip. */
const SOLO_REVEAL_MS = 1400;
const FIRST_BALL_DELAY_MS = 900;

type Stage = "setup" | "toss_call" | "toss_decision" | "bot_decided" | "playing" | "innings_break" | "finished";
type CoinFace = "heads" | "tails";

interface BallClock {
  opensAt: number;
  deadline: number;
  /** When the bot's hand shows as "locked in" (cosmetic) */
  botReadyAt: number;
}

function loadSavedSquad(): string[] | null {
  try {
    const raw = window.localStorage.getItem(SQUAD_STORAGE_KEY);
    return raw ? sanitizeSquad(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveSquad(names: string[]) {
  try {
    window.localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify(names));
  } catch {
    // Storage unavailable (private mode etc.): names still apply to this match
  }
}

/** Re-renders on an interval while active; returns 0 until the first tick. */
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

export function HandCricketSolo() {
  const [stage, setStage] = useState<Stage>("setup");
  const [overs, setOvers] = useState<OversOption>(2);
  const [mySquad, setMySquad] = useState<string[]>(() => defaultSquad());
  const [squadLoaded, setSquadLoaded] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [coin, setCoin] = useState<CoinFace | null>(null);
  const [botChoice, setBotChoice] = useState<"bat" | "bowl" | null>(null);
  const [match, setMatch] = useState<HandCricketState | null>(null);
  const [lastBall, setLastBall] = useState<BallRecord | null>(null);
  const [clock, setClock] = useState<BallClock | null>(null);
  const [ballResolved, setBallResolved] = useState(false);

  // Synchronous guard so a tap and the shot clock can never both resolve a ball
  const resolvingRef = useRef(false);

  const squads = useMemo<Record<Side, string[]>>(() => ({ A: mySquad, B: [...BOT_SQUAD] }), [mySquad]);
  const now = useTicker(stage === "playing");

  /** Saved names from this device, loaded the first time they're needed. */
  const currentSquad = useCallback((): string[] => {
    if (squadLoaded) return mySquad;
    const saved = loadSavedSquad();
    setSquadLoaded(true);
    if (saved) setMySquad(saved);
    return saved ?? mySquad;
  }, [squadLoaded, mySquad]);

  const openNextBall = useCallback((delayMs: number) => {
    const opensAt = Date.now() + delayMs;
    resolvingRef.current = false;
    setBallResolved(false);
    setClock({
      opensAt,
      deadline: opensAt + SHOT_CLOCK_MS,
      botReadyAt: opensAt + 300 + Math.floor(Math.random() * 1200),
    });
  }, []);

  const startMatch = useCallback(
    (firstBatter: Side) => {
      setMatch(createMatch(firstBatter, overs));
      setLastBall(null);
      setStage("playing");
      openNextBall(FIRST_BALL_DELAY_MS);
    },
    [openNextBall, overs],
  );

  const resolveBall = useCallback(
    (myThrow: ThrowValue | null) => {
      if (!match || resolvingRef.current) return;
      resolvingRef.current = true;
      setBallResolved(true);

      const botThrow = computerThrow();
      const iAmBatting = currentBatter(match) === ME;
      const result = playBall(match, iAmBatting ? myThrow : botThrow, iAmBatting ? botThrow : myThrow);

      setMatch(result.state);
      setLastBall(result.ball);

      if (result.matchOver) {
        setStage("finished");
      } else if (result.inningsOver) {
        setStage("innings_break");
      } else {
        openNextBall(SOLO_REVEAL_MS);
      }
    },
    [match, openNextBall],
  );

  const ballOpen = stage === "playing" && clock !== null && now >= clock.opensAt && !ballResolved;
  const canThrow = ballOpen && clock !== null && now < clock.deadline;

  // Shot clock expiry: I had no hand for this ball
  useEffect(() => {
    if (stage !== "playing" || !clock || ballResolved) return;
    const id = setTimeout(() => resolveBall(null), Math.max(0, clock.deadline - Date.now()));
    return () => clearTimeout(id);
  }, [stage, clock, ballResolved, resolveBall]);

  // Keyboard: 0 (DOK) to 6
  useEffect(() => {
    if (!canThrow) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!/^[0-6]$/.test(event.key)) return;
      event.preventDefault();
      resolveBall(Number(event.key) as ThrowValue);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canThrow, resolveBall]);

  const callToss = (call: CoinFace) => {
    currentSquad();
    const face: CoinFace = Math.random() < 0.5 ? "heads" : "tails";
    setCoin(face);
    if (face === call) {
      setStage("toss_decision");
    } else {
      setBotChoice(Math.random() < 0.5 ? "bat" : "bowl");
      setStage("bot_decided");
    }
  };

  const resetGame = () => {
    resolvingRef.current = false;
    setStage("setup");
    setCoin(null);
    setBotChoice(null);
    setMatch(null);
    setLastBall(null);
    setClock(null);
    setBallResolved(false);
  };

  const openEditor = () => {
    currentSquad();
    setEditorOpen(true);
  };

  const saveMySquad = (names: string[]) => {
    setMySquad(names);
    setSquadLoaded(true);
    saveSquad(names);
    return null;
  };

  // ── Derived display values ──────────────────────────────────────────────────

  // Re-show the last ball only within its own innings (not on the first ball of the chase)
  const revealBall =
    lastBall && match && (stage !== "playing" || lastBall.innings === match.innings) ? lastBall : null;
  const inReveal = revealBall !== null && (stage !== "playing" || (clock !== null && now < clock.opensAt));
  const iAmBatting = match ? currentBatter(match) === ME : false;
  const inningsBalls = match ? match.balls.filter((b) => b.innings === match.innings) : [];
  const commentary = lastBall
    ? commentaryFor(lastBall, squads[lastBall.batter][lastBall.batterIndex], squads[lastBall.bowler][lastBall.bowlerIndex])
    : null;
  const highlight = revealBall ? (revealBall.isOut ? "out" : revealBall.runs > 0 ? "runs" : null) : null;

  /** Tile data for one side; uses the revealed ball's roles while showing it. */
  const tileFor = (side: Side) => {
    if (inReveal && revealBall) {
      const batting = revealBall.batter === side;
      return {
        role: (batting ? "Batting" : "Bowling") as "Batting" | "Bowling",
        playerName: squads[side][batting ? revealBall.batterIndex : revealBall.bowlerIndex],
        value: batting ? revealBall.batterThrow : revealBall.bowlerThrow,
      };
    }
    const batting = match ? currentBatter(match) === side : side === ME;
    return {
      role: (batting ? "Batting" : "Bowling") as "Batting" | "Bowling",
      playerName: match ? squads[side][batting ? currentBatterIndex(match) : currentBowlerIndex(match)] : "",
      value: null,
    };
  };

  /** "Player 3 · 12 (7)" and "Nova · 1.2-9-1" for the scoreboard. */
  const crease = (() => {
    if (!match || stage === "finished") return { batterLine: null, bowlerLine: null };
    const battingSide = currentBatter(match);
    const bowlingSide = otherSide(battingSide);
    const bIdx = currentBatterIndex(match);
    const bat = battingCard(match, match.innings)[bIdx];
    const bwlIdx = currentBowlerIndex(match);
    const bowl = bowlingCard(match, match.innings).find((l) => l.index === bwlIdx);
    return {
      batterLine: `${squads[battingSide][bIdx]} · ${bat.runs} (${bat.balls})`,
      bowlerLine: `${squads[bowlingSide][bwlIdx]} · ${formatOvers(bowl?.balls ?? 0)}-${bowl?.runs ?? 0}-${bowl?.wickets ?? 0}`,
    };
  })();

  const teamScore = (side: Side) => {
    if (!match) return null;
    if (match.firstBatter === side) return match.innings1;
    return match.innings === 2 ? match.innings2 : null;
  };

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
        <Badge variant="teal">
          <Bot className="w-3.5 h-3.5 mr-1 inline" aria-hidden="true" />
          Me vs Bot
        </Badge>
      </div>

      {/* ── Setup: overs + players ───────────────────────────────────────────── */}
      {stage === "setup" && (
        <div className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638] p-6 sm:p-8 space-y-6 shadow-xl animate-fade-in">
          <div className="text-center">
            <h1 className="font-display font-black text-2xl text-[#F5F7FF]">Me vs Bot</h1>
            <p className="text-sm text-[#B8C3E0] mt-1">11 players a side. Pick the overs, name your team, then toss.</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#39DFFF] mb-3">Overs per side</p>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Overs per side">
              {OVER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={overs === option}
                  onClick={() => setOvers(option)}
                  className={cn(
                    "py-3 rounded-2xl border font-display font-black text-xl transition-all",
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

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[#B8C3E0]">Your 11 players</p>
            <EditPlayersButton onClick={openEditor} />
          </div>

          <Button variant="primary" size="lg" className="w-full font-bold" onClick={() => setStage("toss_call")}>
            Go to toss
          </Button>
        </div>
      )}

      {/* ── Toss ─────────────────────────────────────────────────────────────── */}
      {stage === "toss_call" && (
        <div className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638] p-6 sm:p-8 text-center space-y-5 shadow-xl animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FBBF24]/15 border border-[#FBBF24]/40 flex items-center justify-center text-[#FBBF24]">
            <Coins className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-[#F5F7FF]">Call the toss</h1>
            <p className="text-sm text-[#B8C3E0] mt-1">
              {overs} overs a side. Win the toss and you choose to bat or bowl first.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="primary" size="lg" className="font-bold" onClick={() => callToss("heads")}>
              Heads
            </Button>
            <Button variant="secondary" size="lg" className="font-bold" onClick={() => callToss("tails")}>
              Tails
            </Button>
          </div>
        </div>
      )}

      {(stage === "toss_decision" || stage === "bot_decided") && (
        <div className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638] p-6 sm:p-8 text-center space-y-5 shadow-xl animate-scale-in">
          <p className="text-xs font-mono uppercase tracking-wider text-[#8B98B5]">
            The coin landed <span className="text-[#FBBF24] font-bold">{coin}</span>
          </p>
          {stage === "toss_decision" ? (
            <>
              <h1 className="font-display font-black text-2xl text-[#F5F7FF]">You won the toss!</h1>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="primary" size="lg" className="font-bold" onClick={() => startMatch(ME)}>
                  Bat first
                </Button>
                <Button variant="secondary" size="lg" className="font-bold" onClick={() => startMatch(BOT)}>
                  Bowl first
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display font-black text-2xl text-[#F5F7FF]">Bot won the toss and chose to {botChoice}</h1>
              <p className="text-sm text-[#B8C3E0]">
                {botChoice === "bat" ? "You'll bowl first, then chase." : "You'll bat first and set the target."}
              </p>
              <Button
                variant="primary"
                size="lg"
                className="w-full font-bold"
                onClick={() => startMatch(botChoice === "bat" ? BOT : ME)}
              >
                Start match
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Play ─────────────────────────────────────────────────────────────── */}
      {match && (stage === "playing" || stage === "innings_break" || stage === "finished") && (
        <>
          <Scoreboard
            left={{ label: TEAM.A, score: teamScore(ME), batting: stage !== "finished" && currentBatter(match) === ME }}
            right={{ label: TEAM.B, score: teamScore(BOT), batting: stage !== "finished" && currentBatter(match) === BOT }}
            innings={match.innings}
            ballsPerInnings={match.ballsPerInnings}
            target={match.target}
            chase={match.status === "finished" ? null : chaseInfo(match)}
            batterLine={crease.batterLine}
            bowlerLine={crease.bowlerLine}
          />

          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638]/80 p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              {/* Me: always on the left */}
              <HandTile
                team={TEAM.A}
                {...tileFor(ME)}
                revealed={inReveal}
                hasThrown={false}
                highlight={inReveal ? highlight : null}
              />
              <span className="font-display font-black text-lg text-[#8B98B5]" aria-hidden="true">vs</span>
              {/* Bot: always on the right */}
              <HandTile
                team={TEAM.B}
                {...tileFor(BOT)}
                revealed={inReveal}
                hasThrown={clock !== null && now >= clock.botReadyAt}
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

            {stage === "playing" && clock && (
              <>
                <ShotClock remainingMs={clock.deadline - now} totalMs={SHOT_CLOCK_MS} running={ballOpen} />
                <ThrowPad
                  onThrow={(value) => resolveBall(value)}
                  disabled={!canThrow}
                  prompt={
                    !ballOpen
                      ? "Next ball coming up…"
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

      {/* ── Innings break ────────────────────────────────────────────────────── */}
      {stage === "innings_break" && match && (
        <div className="rounded-3xl border border-[#FBBF24]/40 bg-[#101638] p-6 text-center space-y-4 shadow-xl animate-slide-up">
          <p className="text-xs font-mono uppercase tracking-wider text-[#FBBF24]">Innings break</p>
          <h2 className="font-display font-black text-xl text-[#F5F7FF]">
            {TEAM[match.firstBatter]} made {match.innings1.runs}/{match.innings1.wickets} in {formatOvers(match.innings1.balls)} overs
          </h2>
          <p className="text-sm text-[#B8C3E0]">
            {currentBatter(match) === ME ? `You need ${match.target} to win.` : `Bot needs ${match.target} to win. Defend it!`}
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full font-bold"
            onClick={() => {
              setStage("playing");
              openNextBall(FIRST_BALL_DELAY_MS);
            }}
          >
            {currentBatter(match) === ME ? "Start the chase" : "Start bowling"}
          </Button>
        </div>
      )}

      {/* ── Result ───────────────────────────────────────────────────────────── */}
      {stage === "finished" && match && <SoloResult match={match} squads={squads} onPlayAgain={resetGame} />}

      <SquadEditor open={editorOpen} initial={mySquad} onClose={() => setEditorOpen(false)} onSave={saveMySquad} />
    </div>
  );
}

function SoloResult({
  match,
  squads,
  onPlayAgain,
}: {
  match: HandCricketState;
  squads: Record<Side, string[]>;
  onPlayAgain: () => void;
}) {
  const iWon = match.winner === ME;
  const summary = resultSummary(match, TEAM);
  const first = match.firstBatter;
  const second = otherSide(first);

  return (
    <div className="rounded-3xl border border-[rgba(57,223,255,0.25)] bg-[#101638] p-6 space-y-5 shadow-2xl animate-slide-up">
      <div className="text-center space-y-2">
        <div
          className={cn(
            "w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center",
            match.isDraw
              ? "bg-[#070B25] border-[rgba(255,255,255,0.12)] text-[#B8C3E0]"
              : iWon
              ? "bg-[#39DFFF]/15 border-[#39DFFF]/40 text-[#39DFFF]"
              : "bg-[#FF5370]/15 border-[#FF5370]/40 text-[#FF5370]",
          )}
        >
          {match.isDraw ? (
            <Award className="w-8 h-8" aria-hidden="true" />
          ) : iWon ? (
            <Trophy className="w-8 h-8" aria-hidden="true" />
          ) : (
            <XCircle className="w-8 h-8" aria-hidden="true" />
          )}
        </div>
        <h2 className="font-display font-black text-2xl text-[#F5F7FF]">
          {match.isDraw ? "It's a tie!" : iWon ? "You won!" : "Bot wins"}
        </h2>
        {summary && <p className="text-sm text-[#B8C3E0]">{summary}</p>}
      </div>

      <InningsCard
        title={`${TEAM[first]} batting`}
        squad={squads[first]}
        bowlingSquad={squads[second]}
        score={match.innings1}
        batting={battingCard(match, 1)}
        bowling={bowlingCard(match, 1)}
      />
      <InningsCard
        title={`${TEAM[second]} batting`}
        squad={squads[second]}
        bowlingSquad={squads[first]}
        score={match.innings2}
        batting={battingCard(match, 2)}
        bowling={bowlingCard(match, 2)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button variant="primary" size="md" className="font-bold" onClick={onPlayAgain}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Play again
        </Button>
        <Link href="/play/hand-cricket" className="block">
          <Button variant="secondary" size="md" className="w-full font-bold">
            <Users className="w-4 h-4 mr-2" />
            Challenge a friend
          </Button>
        </Link>
      </div>
    </div>
  );
}
