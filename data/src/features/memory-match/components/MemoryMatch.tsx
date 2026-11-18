"use client";

import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Star } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  BEST_KEY_PREFIX,
  LEVELS,
  createGame,
  flip,
  formatTime,
  hideMismatch,
  isMismatchPending,
  isNewBest,
  parseBest,
  result,
  stars,
  type Best,
  type GameState,
  type Level,
} from "../engine/engine";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]";
const MISMATCH_MS = 900;

type Action =
  | { type: "start"; level: Level; players: 1 | 2 }
  | { type: "flip"; index: number }
  | { type: "hide" }
  | { type: "quit" };

function reducer(state: GameState | null, action: Action): GameState | null {
  switch (action.type) {
    case "start":
      return createGame(action.level, action.players);
    case "flip":
      return state ? flip(state, action.index) : state;
    case "hide":
      return state ? hideMismatch(state) : state;
    case "quit":
      return null;
  }
}

function readBest(level: Level): Best | null {
  try {
    return parseBest(window.localStorage.getItem(BEST_KEY_PREFIX + level));
  } catch {
    return null;
  }
}

function writeBest(level: Level, best: Best) {
  try {
    window.localStorage.setItem(BEST_KEY_PREFIX + level, JSON.stringify(best));
  } catch {
    // Storage blocked: the best just isn't remembered
  }
}

export function MemoryMatch() {
  // The deck is shuffled only after a button press, never during render, so server and browser agree
  const [game, dispatch] = useReducer(reducer, null);
  const [setupLevel, setupLevelSet] = useState<Level>("medium");
  const [setupPlayers, setupPlayersSet] = useState<1 | 2>(1);
  const [seconds, setSeconds] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [best, setBest] = useState<Best | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFor = useRef<GameState | null>(null);

  const status = game?.status;
  const mismatch = game ? isMismatchPending(game) : false;

  // Clock: runs while a game is in progress
  useEffect(() => {
    if (status !== "playing") return;
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [status]);

  // Hide a mismatched pair after a short look
  useEffect(() => {
    if (!mismatch) return;
    hideTimer.current = setTimeout(() => dispatch({ type: "hide" }), MISMATCH_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [mismatch]);

  // Save a new personal best (solo only), once per finished game
  useEffect(() => {
    if (!game || game.status !== "won" || game.players !== 1) return;
    if (savedFor.current === game) return;
    savedFor.current = game;
    const next: Best = { moves: game.moves, seconds };
    const current = readBest(game.level);
    if (isNewBest(current, next)) {
      writeBest(game.level, next);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewBest(true);
      setBest(next);
    } else {
      setNewBest(false);
      setBest(current);
    }
  }, [game, seconds]);

  const start = useCallback((level: Level, players: 1 | 2) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    savedFor.current = null;
    setSeconds(0);
    setNewBest(false);
    setBest(null);
    dispatch({ type: "start", level, players });
  }, []);

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto w-full max-w-[640px] px-4 py-6 text-[#1E1B24]">
      <Link
        href="/games"
        className={cn("inline-flex items-center gap-1.5 min-h-[44px] px-1 text-sm font-bold text-[#6E6878] hover:text-[#1E1B24] rounded-full", FOCUS)}
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        All games
      </Link>
      <header className="mt-2 mb-5">
        <h1 className="font-display font-bold text-3xl">
          <span aria-hidden="true">🧠</span> Memory Match
        </h1>
        <p className="mt-1 text-sm text-[#6E6878]">Flip two cards at a time and find every matching pair.</p>
      </header>
      {children}
    </div>
  );

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (!game) {
    return shell(
      <div className="b-card b-card-mint space-y-5">
        <fieldset>
          <legend className="font-display font-bold text-lg mb-2">How many players?</legend>
          <div className="flex gap-2">
            {([1, 2] as const).map((n) => (
              <ChoiceButton key={n} selected={setupPlayers === n} onClick={() => setupPlayersSet(n)}>
                {n === 1 ? "Solo" : "2 players (same device)"}
              </ChoiceButton>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-display font-bold text-lg mb-2">Pick a level</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(LEVELS) as Level[]).map((l) => (
              <ChoiceButton key={l} selected={setupLevel === l} onClick={() => setupLevelSet(l)}>
                {LEVELS[l].label}
              </ChoiceButton>
            ))}
          </div>
        </fieldset>
        <button id="mm-start" type="button" onClick={() => start(setupLevel, setupPlayers)} className="evo-btn evo-btn-primary evo-btn-lg w-full">
          Start game
        </button>
      </div>,
    );
  }

  // ── Game screen ───────────────────────────────────────────────────────────
  const { cols } = LEVELS[game.level];
  const outcome = result(game);
  const won = game.status === "won";
  const names = ["Player 1", "Player 2"];

  return shell(
    <div className="space-y-4">
      <section aria-label="Game status" className="b-card !p-3 flex flex-wrap items-center justify-between gap-3">
        {game.players === 1 ? (
          <>
            <Stat label="Moves" value={String(game.moves)} />
            <Stat label="Pairs" value={`${game.scores[0]}/${LEVELS[game.level].pairs}`} />
            <Stat label="Time" value={formatTime(seconds)} />
          </>
        ) : (
          <>
            <PlayerStat name={names[0]} score={game.scores[0]} active={!won && game.turn === 0} />
            <Stat label="Moves" value={String(game.moves)} />
            <PlayerStat name={names[1]} score={game.scores[1]} active={!won && game.turn === 1} />
          </>
        )}
      </section>

      <div
        role="grid"
        aria-label="Memory cards"
        className="grid gap-2 sm:gap-3 mx-auto w-full"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols === 6 ? 600 : 460 }}
      >
        {game.cards.map((card, i) => {
          const shown = card.faceUp || card.matched;
          return (
            <button
              key={card.id}
              type="button"
              role="gridcell"
              id={`mm-card-${i}`}
              aria-label={shown ? `Card ${i + 1}, ${card.symbol}${card.matched ? ", matched" : ""}` : `Card ${i + 1}, face down`}
              onClick={() => dispatch({ type: "flip", index: i })}
              disabled={shown || mismatch || won}
              className={cn(
                "aspect-square rounded-[18px] border-2 flex items-center justify-center text-3xl sm:text-4xl select-none transition-transform",
                card.matched
                  ? "bg-[#E3FAF3] border-[#14C49A] shadow-[0_3px_0_#0E9B79]"
                  : card.faceUp
                    ? "bg-white border-[#FF5A3C] shadow-[0_3px_0_#C9381F]"
                    : "bg-[#8C7BFF] border-[#6A58DB] shadow-[0_4px_0_#6A58DB] hover:-translate-y-0.5 cursor-pointer",
                FOCUS,
              )}
            >
              {shown ? <span aria-hidden="true">{card.symbol}</span> : <span aria-hidden="true" className="text-white font-display font-bold text-2xl">?</span>}
            </button>
          );
        })}
      </div>

      {won && (
        <div id="mm-result" role="status" className="b-card b-card-sun text-center space-y-3">
          {outcome.kind === "solo" ? (
            <>
              <h2 className="font-display font-bold text-3xl">You found them all! 🎉</h2>
              <div className="flex justify-center gap-1" aria-label={`${stars(game.level, game.moves)} out of 3 stars`}>
                {[1, 2, 3].map((n) => (
                  <Star
                    key={n}
                    className={cn("w-8 h-8", n <= stars(game.level, game.moves) ? "fill-[#FF5A3C] text-[#FF5A3C]" : "text-[#E9A912]/50")}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-sm font-bold">
                {game.moves} moves in {formatTime(seconds)}
              </p>
              {newBest ? (
                <p className="font-bold text-[#C9381F]">New personal best!</p>
              ) : best ? (
                <p className="text-sm text-[#6E6878]">
                  Your best on this level: {best.moves} moves in {formatTime(best.seconds)}
                </p>
              ) : null}
            </>
          ) : (
            <h2 className="font-display font-bold text-3xl">
              {outcome.kind === "tie" ? "It's a tie! 🤝" : `${names[outcome.player]} wins! 🏆`}
            </h2>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button id="mm-play-again" type="button" onClick={() => start(game.level, game.players)} className="evo-btn evo-btn-primary">
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          {won ? "Play again" : "Restart"}
        </button>
        <button type="button" onClick={() => dispatch({ type: "quit" })} className="evo-btn evo-btn-secondary">
          Change level
        </button>
      </div>
    </div>,
  );
}

function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-[48px] rounded-full border-2 px-4 text-sm font-bold flex-1",
        selected ? "border-[#1E1B24] bg-white shadow-[0_3px_0_#1E1B24]" : "border-[#EADBC8] bg-white/70 text-[#6E6878]",
        FOCUS,
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center flex-1">
      <p className="text-xs font-bold text-[#6E6878]">{label}</p>
      <p className="font-display font-bold text-2xl">{value}</p>
    </div>
  );
}

function PlayerStat({ name, score, active }: { name: string; score: number; active: boolean }) {
  return (
    <div className={cn("flex-1 rounded-[18px] border-2 px-3 py-1.5 text-center", active ? "border-[#FF5A3C] bg-[#FFE4DD]" : "border-transparent")}>
      <p className="text-xs font-bold text-[#6E6878]">
        {name}
        {active ? " · your turn" : ""}
      </p>
      <p className="font-display font-bold text-2xl">{score}</p>
    </div>
  );
}
