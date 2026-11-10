"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Play, RotateCcw, Settings2, Trophy, XCircle } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  applyMove,
  applyRoll,
  chooseBotMove,
  createGame,
  currentPlayer,
  legalMoves,
  rollDie,
  seatColors,
  tokensHome,
  type Color,
  type LudoPlayer,
  type LudoState,
} from "@/lib/ludo/engine";
import { COLOR_HEX, COLOR_NAME, LudoBoard, LudoPlayersBar, describeEvent, shownDice } from "./LudoBoard";
import { LudoDice } from "./LudoDice";

type PlayerCount = 2 | 3 | 4;

const PLAYER_COUNTS: PlayerCount[] = [2, 3, 4];
const ME_COLOR: Color = "red";
const BOT_DELAY_MS = 700;
const ROLL_ANIM_MS = 550;
const AUTO_MOVE_MS = 600;

function makePlayers(count: PlayerCount): LudoPlayer[] {
  return seatColors(count).map((color, i) => ({
    color,
    kind: i === 0 ? "human" : "bot",
    userId: null,
    label: i === 0 ? "Me" : `Bot ${i}`,
  }));
}

export function LudoBotGame() {
  const [count, setCount] = useState<PlayerCount>(2);
  const [game, setGame] = useState<LudoState | null>(null);
  const [rolling, setRolling] = useState(false);

  const labelOf = useCallback(
    (c: Color) => game?.players.find((p) => p.color === c)?.label ?? COLOR_NAME[c],
    [game],
  );

  /** Apply a move only if the game hasn't changed since it was chosen. */
  const move = useCallback((expectedMoveCount: number, token: number) => {
    setGame((g) =>
      g && g.status === "playing" && g.moveCount === expectedMoveCount && legalMoves(g).includes(token)
        ? applyMove(g, token).state
        : g,
    );
  }, []);

  // Drives the game: finishes rolls, plays bot turns, auto-moves my only option
  useEffect(() => {
    if (!game || game.status !== "playing") return;
    const expected = game.moveCount;

    if (rolling) {
      const id = setTimeout(() => {
        const dice = rollDie();
        setGame((g) =>
          g && g.status === "playing" && g.dice === null && g.moveCount === expected ? applyRoll(g, dice).state : g,
        );
        setRolling(false);
      }, ROLL_ANIM_MS);
      return () => clearTimeout(id);
    }

    const player = currentPlayer(game);
    if (player.kind === "bot") {
      const id = setTimeout(() => {
        if (game.dice === null) {
          setRolling(true);
        } else {
          const token = chooseBotMove(game);
          if (token !== null) move(expected, token);
        }
      }, BOT_DELAY_MS);
      return () => clearTimeout(id);
    }

    if (game.dice !== null) {
      const moves = legalMoves(game);
      if (moves.length === 1) {
        const id = setTimeout(() => move(expected, moves[0]), AUTO_MOVE_MS);
        return () => clearTimeout(id);
      }
    }
  }, [game, rolling, move]);

  const start = (n: PlayerCount) => {
    setRolling(false);
    setGame(createGame(makePlayers(n)));
  };

  const me = game ? game.players.find((p) => p.color === ME_COLOR) ?? game.players[0] : null;
  const turnPlayer = game ? currentPlayer(game) : null;
  const myTurn = Boolean(game && game.status === "playing" && turnPlayer?.color === ME_COLOR);
  const canRoll = myTurn && game?.dice === null && !rolling;
  const movable = useMemo(() => (game && myTurn && !rolling ? legalMoves(game) : []), [game, myTurn, rolling]);

  const handleRoll = useCallback(() => {
    if (canRoll) setRolling(true);
  }, [canRoll]);

  const handleToken = (token: number) => {
    if (game && movable.includes(token)) move(game.moveCount, token);
  };

  // ── Setup ───────────────────────────────────────────────────────────────────

  if (!game) {
    const preview = makePlayers(count);
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
        <TopBar />
        <div className="rounded-3xl border border-[rgba(57,223,255,0.25)] bg-[#101638] p-6 sm:p-7 shadow-xl space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#39DFFF]/10 border border-[#39DFFF]/30 flex items-center justify-center text-[#39DFFF] shrink-0">
              <Bot className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display font-black text-xl text-[#F5F7FF]">Me vs bots</h1>
              <p className="text-sm text-[#B8C3E0]">Runs on this device. No sign-in needed.</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#39DFFF] mb-2">Players</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Number of players">
              {PLAYER_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={count === n}
                  onClick={() => setCount(n)}
                  className={cn(
                    "py-3 rounded-2xl border font-display font-black text-lg transition-all",
                    count === n
                      ? "bg-[#39DFFF]/15 border-[#39DFFF] text-[#39DFFF]"
                      : "bg-[#070B25] border-[rgba(255,255,255,0.08)] text-[#B8C3E0] hover:border-[#39DFFF]/40",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-2">
            {preview.map((p) => (
              <li
                key={p.color}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#070B25] border border-[rgba(255,255,255,0.08)]"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-white/80"
                  style={{ backgroundColor: COLOR_HEX[p.color] }}
                  aria-hidden="true"
                />
                <span className={cn("text-sm font-bold", p.kind === "human" ? "text-[#39DFFF]" : "text-[#F5F7FF]")}>
                  {p.label}
                </span>
                <span className="text-[10px] font-mono uppercase text-[#8B98B5] ml-auto">{COLOR_NAME[p.color]}</span>
              </li>
            ))}
          </ul>

          <Button variant="primary" size="lg" className="w-full font-bold" onClick={() => start(count)}>
            <Play className="w-4 h-4 mr-2 fill-current" />
            Start game
          </Button>
        </div>
      </div>
    );
  }

  // ── Play ────────────────────────────────────────────────────────────────────

  const finished = game.status === "finished";
  const iWon = game.winner === ME_COLOR;
  const event = describeEvent(game.lastEvent, labelOf, ME_COLOR);
  const diceColor: Color =
    rolling || game.dice !== null ? turnPlayer!.color : game.lastEvent?.color ?? turnPlayer!.color;

  const prompt = finished
    ? null
    : myTurn
    ? rolling
      ? "Rolling…"
      : game.dice === null
      ? "Your turn: roll the die."
      : movable.length === 1
      ? "Moving your only token…"
      : "Pick a highlighted token."
    : `${turnPlayer!.label} is playing…`;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 select-none">
      <TopBar playing />

      <LudoPlayersBar
        players={game.players.map((p) => ({
          color: p.color,
          label: p.label,
          home: tokensHome(game, p.color),
          isTurn: !finished && p.color === turnPlayer!.color,
          isMe: p.color === ME_COLOR,
        }))}
      />

      <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-2 sm:p-3 shadow-xl">
        <LudoBoard
          state={game}
          myColor={me?.color ?? ME_COLOR}
          movableTokens={movable}
          onTokenClick={handleToken}
          lastEvent={game.lastEvent}
          labels={Object.fromEntries(game.players.map((p) => [p.color, p.label]))}
        />
      </div>

      {!finished && (
        <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#101638] p-4 sm:p-5 shadow-xl space-y-3">
          <p className="min-h-[1.25rem] text-sm font-semibold text-[#F5F7FF]" aria-live="polite">
            {event ?? "Roll a 6 to bring a token out."}
          </p>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <LudoDice
              value={shownDice(game)}
              rolling={rolling}
              disabled={!canRoll}
              onRoll={handleRoll}
              color={diceColor}
              caption={prompt}
            />
          </div>
        </div>
      )}

      {finished && (
        <div className="rounded-3xl border border-[rgba(57,223,255,0.25)] bg-[#101638] p-6 space-y-5 shadow-2xl animate-slide-up">
          <div className="text-center space-y-2">
            <div
              className={cn(
                "w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center",
                iWon
                  ? "bg-[#39DFFF]/15 border-[#39DFFF]/40 text-[#39DFFF]"
                  : "bg-[#FF5370]/15 border-[#FF5370]/40 text-[#FF5370]",
              )}
            >
              {iWon ? <Trophy className="w-8 h-8" aria-hidden="true" /> : <XCircle className="w-8 h-8" aria-hidden="true" />}
            </div>
            <h2 className="font-display font-black text-2xl text-[#F5F7FF]">
              {iWon ? "You won!" : `${game.winner ? labelOf(game.winner) : "A bot"} wins`}
            </h2>
            <p className="text-sm text-[#B8C3E0]">
              {iWon ? "All four of your tokens made it home." : `You got ${tokensHome(game, ME_COLOR)} of 4 tokens home.`}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="primary" size="md" className="font-bold" onClick={() => start(game.players.length as PlayerCount)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Play again
            </Button>
            <Button variant="secondary" size="md" className="font-bold" onClick={() => setGame(null)}>
              <Settings2 className="w-4 h-4 mr-2" />
              Change players
            </Button>
            <Link href="/play/ludo" className="block">
              <Button variant="secondary" size="md" className="w-full font-bold">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to lobby
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!finished && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="text-xs text-[#8B98B5]" onClick={() => setGame(null)}>
            Quit and start over
          </Button>
        </div>
      )}
    </div>
  );
}

function TopBar({ playing = false }: { playing?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#101638] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-xl">
      <Link
        href="/play/ludo"
        className="flex items-center gap-1.5 text-xs font-semibold text-[#B8C3E0] hover:text-[#39DFFF] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Lobby</span>
      </Link>
      <Badge variant={playing ? "teal" : "muted"}>Ludo · Me vs bots</Badge>
    </div>
  );
}
