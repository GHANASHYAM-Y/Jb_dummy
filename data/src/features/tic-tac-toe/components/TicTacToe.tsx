"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  EMPTY_BOARD,
  applyMove,
  computerMove,
  findWin,
  isDraw,
  other,
  type Board,
  type Difficulty,
  type Mark,
} from "../engine/engine";

type Mode = "computer" | "friend";

interface Score {
  X: number;
  O: number;
  draws: number;
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]";
const COMPUTER_DELAY_MS = 450;

const MARK_STYLE: Record<Mark, string> = {
  X: "text-[#FF5A3C]",
  O: "text-[#14A07F]",
};

const CELL_NAMES = [
  "top left",
  "top middle",
  "top right",
  "middle left",
  "center",
  "middle right",
  "bottom left",
  "bottom middle",
  "bottom right",
];

export function TicTacToe() {
  const [mode, setMode] = useState<Mode>("computer");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [turn, setTurn] = useState<Mark>("X");
  const [opener, setOpener] = useState<Mark>("X");
  const [score, setScore] = useState<Score>({ X: 0, O: 0, draws: 0 });
  const [thinking, setThinking] = useState(false);

  // In "computer" mode you are always X and the computer is always O
  const human: Mark = "X";
  const computer: Mark = "O";

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every reset so a late computer move from an old game is ignored
  const generation = useRef(0);

  const win = findWin(board);
  const draw = isDraw(board);
  const over = Boolean(win) || draw;

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const finish = useCallback((finalBoard: Board) => {
    const w = findWin(finalBoard);
    setScore((s) => (w ? { ...s, [w.winner]: s[w.winner] + 1 } : isDraw(finalBoard) ? { ...s, draws: s.draws + 1 } : s));
  }, []);

  /** Starts a fresh round. When the computer opens, it plays its first move after a beat. */
  const startRound = useCallback(
    (first: Mark, vsComputer: boolean, level: Difficulty) => {
      clearTimer();
      generation.current += 1;
      const mine = generation.current;
      setBoard(EMPTY_BOARD);
      setTurn(first);
      setOpener(first);
      setThinking(false);

      if (vsComputer && first === computer) {
        setThinking(true);
        timer.current = setTimeout(() => {
          if (generation.current !== mine) return;
          const move = computerMove(EMPTY_BOARD, computer, level);
          setBoard(applyMove(EMPTY_BOARD, move, computer));
          setTurn(human);
          setThinking(false);
        }, COMPUTER_DELAY_MS);
      }
    },
    [clearTimer],
  );

  function play(index: number) {
    if (over || thinking) return;
    if (board[index] !== null) return;
    if (mode === "computer" && turn !== human) return;

    const next = applyMove(board, index, turn);
    setBoard(next);

    if (findWin(next) || isDraw(next)) {
      finish(next);
      return;
    }

    const following = other(turn);
    setTurn(following);

    if (mode === "computer") {
      setThinking(true);
      const mine = generation.current;
      timer.current = setTimeout(() => {
        if (generation.current !== mine) return;
        const move = computerMove(next, computer, difficulty);
        const after = applyMove(next, move, computer);
        setBoard(after);
        setThinking(false);
        if (findWin(after) || isDraw(after)) {
          finish(after);
        } else {
          setTurn(human);
        }
      }, COMPUTER_DELAY_MS);
    }
  }

  function chooseMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setScore({ X: 0, O: 0, draws: 0 });
    startRound("X", next === "computer", difficulty);
  }

  function chooseDifficulty(next: Difficulty) {
    if (next === difficulty) return;
    setDifficulty(next);
    setScore({ X: 0, O: 0, draws: 0 });
    startRound("X", mode === "computer", next);
  }

  function playAgain() {
    // Alternate who opens so neither side always goes first
    startRound(other(opener), mode === "computer", difficulty);
  }

  const names: Record<Mark, string> = mode === "computer" ? { X: "You", O: "Computer" } : { X: "Player X", O: "Player O" };

  let status: string;
  if (win) {
    status = mode === "computer" ? (win.winner === human ? "You win! 🎉" : "The computer wins") : `${names[win.winner]} wins! 🎉`;
  } else if (draw) {
    status = "It's a draw";
  } else if (thinking) {
    status = "Computer is thinking…";
  } else {
    status = mode === "computer" ? "Your turn" : `${names[turn]}'s turn`;
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-6 text-[#1E1B24]">
      <Link
        href="/games"
        className={cn("inline-flex items-center gap-1.5 min-h-[44px] px-1 text-sm font-bold text-[#6E6878] hover:text-[#1E1B24] rounded-full", FOCUS)}
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        All games
      </Link>

      <header className="mt-1 mb-4">
        <h1 className="font-display font-bold text-3xl">
          <span aria-hidden="true">⭕</span> Tic Tac Toe
        </h1>
        <p className="mt-1 text-sm text-[#6E6878]">Get three in a row. Play the computer or a friend on the same device.</p>
      </header>

      {/* Mode and difficulty */}
      <div className="b-card !p-3 space-y-3">
        <Segmented
          label="Opponent"
          value={mode}
          onChange={(v) => chooseMode(v as Mode)}
          options={[
            { value: "computer", label: "Computer" },
            { value: "friend", label: "Friend (same device)" },
          ]}
        />
        {mode === "computer" && (
          <Segmented
            label="Difficulty"
            value={difficulty}
            onChange={(v) => chooseDifficulty(v as Difficulty)}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
          />
        )}
      </div>

      {/* Scoreboard */}
      <section aria-label="Score" className="mt-3 grid grid-cols-3 gap-3 text-center">
        <ScoreTile label={names.X} value={score.X} tone="bg-[#FFE4DD]" markClass={MARK_STYLE.X} mark="X" active={!over && turn === "X"} />
        <ScoreTile label="Draws" value={score.draws} tone="bg-[#F5EADC]" />
        <ScoreTile label={names.O} value={score.O} tone="bg-[#E3FAF3]" markClass={MARK_STYLE.O} mark="O" active={!over && turn === "O"} />
      </section>

      <p id="ttt-status" role="status" aria-live="polite" className="mt-4 text-center font-display font-bold text-2xl">
        {status}
      </p>

      {/* Board */}
      <div role="grid" aria-label="Tic Tac Toe board" className="mt-3 mx-auto grid grid-cols-3 gap-2 w-full max-w-[min(340px,48vh)]">
        {board.map((cell, i) => {
          const winning = win?.line.includes(i) ?? false;
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              id={`ttt-cell-${i}`}
              aria-label={`${CELL_NAMES[i]}, ${cell ? `taken by ${cell}` : "empty"}`}
              onClick={() => play(i)}
              disabled={over || cell !== null || thinking}
              className={cn(
                "aspect-square rounded-[22px] border-2 font-display font-bold text-5xl sm:text-6xl leading-none flex items-center justify-center transition-transform",
                winning ? "bg-[#FFC23D] border-[#E9A912] shadow-[0_4px_0_#E9A912]" : "bg-white border-[#EADBC8] shadow-[0_4px_0_#EADBC8]",
                cell === null && !over && !thinking && "hover:-translate-y-0.5 hover:border-[#FF5A3C] cursor-pointer",
                cell ? MARK_STYLE[cell] : "text-transparent",
                FOCUS,
              )}
            >
              {cell ?? "·"}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {over && (
          <button id="ttt-play-again" type="button" onClick={playAgain} className="evo-btn evo-btn-primary evo-btn-lg">
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Play again
          </button>
        )}
        {!over && (
          <button type="button" onClick={() => startRound(opener, mode === "computer", difficulty)} className="evo-btn evo-btn-secondary">
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Restart round
          </button>
        )}
      </div>
    </div>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-[#6E6878] w-full sm:w-24">{label}</span>
      <div className="flex flex-1 gap-1 rounded-full bg-[#F5EADC] p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 min-h-[40px] rounded-full px-3 text-sm font-bold",
              value === o.value ? "bg-white text-[#1E1B24] shadow-[0_2px_0_#EADBC8]" : "text-[#6E6878]",
              FOCUS,
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  tone,
  mark,
  markClass,
  active = false,
}: {
  label: string;
  value: number;
  tone: string;
  mark?: string;
  markClass?: string;
  active?: boolean;
}) {
  return (
    <div className={cn("rounded-[22px] border-2 p-3", tone, active ? "border-[#1E1B24]" : "border-transparent")}>
      <p className="text-xs font-bold text-[#6E6878] truncate">
        {mark && <span className={cn("font-display text-base mr-1", markClass)}>{mark}</span>}
        {label}
      </p>
      <p className="font-display font-bold text-3xl">{value}</p>
    </div>
  );
}
