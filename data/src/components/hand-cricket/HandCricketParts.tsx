"use client";

/**
 * Presentational pieces shared by the solo game and friend matches.
 * Layout rule: the viewer ("Me") is always on the LEFT and the opponent on the
 * RIGHT; batting/bowling tags move, the players never swap sides.
 */

import React, { useEffect, useState } from "react";
import { Hand, Pencil, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import {
  BALLS_PER_INNINGS,
  DOK,
  MAX_PLAYER_NAME_LENGTH,
  PLAYERS_PER_TEAM,
  THROW_VALUES,
  ballChipLabel,
  formatOvers,
  formatScore,
  runRate,
  sanitizeSquad,
  throwLabel,
  type BattingLine,
  type BowlingLine,
  type ChaseInfo,
  type InningsScore,
  type ThrowValue,
} from "@/lib/hand-cricket/engine";

// ── Hand tile ─────────────────────────────────────────────────────────────────

interface HandTileProps {
  /** Team label: "Me", "Bot" or the friend's name */
  team: string;
  /** Player currently batting/bowling for this team */
  playerName: string;
  role: "Batting" | "Bowling";
  /** The revealed number (0 = DOK), or null when that player had no hand */
  value: number | null;
  /** True once the ball has been resolved and hands are shown */
  revealed: boolean;
  /** Before reveal: whether this player has thrown yet */
  hasThrown?: boolean;
  highlight?: "out" | "runs" | null;
}

export function HandTile({ team, playerName, role, value, revealed, hasThrown, highlight }: HandTileProps) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
      <div className="text-center min-w-0 w-full">
        <p className="text-sm font-black text-[#F5F7FF] truncate">{team}</p>
        <p className="text-[11px] text-[#B8C3E0] truncate">{playerName}</p>
        <span
          className={cn(
            "inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border",
            role === "Batting"
              ? "bg-[#39DFFF]/15 text-[#39DFFF] border-[#39DFFF]/40"
              : "bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/40",
          )}
        >
          {role}
        </span>
      </div>
      <div
        className={cn(
          "relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border flex flex-col items-center justify-center transition-all duration-200",
          !revealed && "bg-[#070B25] border-[rgba(255,255,255,0.1)]",
          revealed && highlight === "out" && "bg-[#FF5370]/15 border-[#FF5370]/60 shadow-[0_0_24px_rgba(255,83,112,0.35)]",
          revealed && highlight === "runs" && "bg-[#39DFFF]/10 border-[#39DFFF]/50 shadow-[0_0_24px_rgba(57,223,255,0.25)]",
          revealed && !highlight && "bg-[#101638] border-[rgba(255,255,255,0.12)]",
        )}
        aria-live="polite"
      >
        {revealed ? (
          value === null ? (
            <>
              <span className="font-display font-black text-3xl text-[#8B98B5]">—</span>
              <span className="text-[10px] font-semibold text-[#8B98B5] mt-1">No hand</span>
            </>
          ) : (
            <span
              key={value}
              className={cn(
                "font-display font-black text-[#F5F7FF] animate-scale-in",
                value === DOK ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl",
              )}
            >
              {throwLabel(value)}
            </span>
          )
        ) : hasThrown ? (
          <>
            <Hand className="w-9 h-9 text-[#39DFFF]" aria-hidden="true" />
            <span className="text-[10px] font-bold text-[#39DFFF] mt-1.5">Locked in</span>
          </>
        ) : (
          <>
            <Hand className="w-9 h-9 text-[#8B98B5] animate-pulse" aria-hidden="true" />
            <span className="text-[10px] font-semibold text-[#8B98B5] mt-1.5">Thinking…</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Throw pad ─────────────────────────────────────────────────────────────────

interface ThrowPadProps {
  onThrow: (value: ThrowValue) => void;
  disabled: boolean;
  /** Value the player has locked in for this ball */
  selected?: number | null;
  prompt: string;
}

export function ThrowPad({ onThrow, disabled, selected, prompt }: ThrowPadProps) {
  return (
    <div className="space-y-2.5">
      <p className="text-center text-xs font-semibold text-[#B8C3E0]">{prompt}</p>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5" role="group" aria-label="Throw DOK or a number from 1 to 6">
        {THROW_VALUES.map((value) => {
          const isSelected = selected === value;
          const isDok = value === DOK;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onThrow(value)}
              disabled={disabled}
              aria-label={isDok ? "Throw DOK (0)" : `Throw ${value}`}
              aria-pressed={isSelected}
              className={cn(
                "h-14 sm:h-16 rounded-2xl border font-display font-black transition-all select-none",
                isDok ? "text-sm sm:text-base" : "text-2xl sm:text-3xl",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39DFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B14]",
                isSelected
                  ? "bg-[#39DFFF] text-[#070B25] border-[#39DFFF] shadow-[0_0_20px_rgba(57,223,255,0.5)]"
                  : isDok
                  ? "bg-[#1C1630] text-[#FBBF24] border-[#FBBF24]/40 hover:border-[#FBBF24] active:scale-95"
                  : "bg-[#101638] text-[#F5F7FF] border-[rgba(57,223,255,0.25)] hover:border-[#39DFFF] hover:bg-[#151D48] active:scale-95",
                disabled && !isSelected && "opacity-40 cursor-not-allowed active:scale-100",
              )}
            >
              {isDok ? "DOK" : value}
            </button>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-[#8B98B5]">
        DOK = 0: if the batter shows DOK, they score the bowler&apos;s number.
        <span className="hidden sm:inline"> Keys 0–6 work too.</span>
      </p>
    </div>
  );
}

// ── Shot clock ────────────────────────────────────────────────────────────────

interface ShotClockProps {
  remainingMs: number;
  totalMs: number;
  /** When false the bar is shown empty and dimmed (between balls) */
  running: boolean;
  label?: string;
}

export function ShotClock({ remainingMs, totalMs, running, label = "Shot clock" }: ShotClockProps) {
  const clamped = Math.max(0, Math.min(totalMs, remainingMs));
  const fraction = running && totalMs > 0 ? clamped / totalMs : 0;
  const seconds = Math.ceil(clamped / 1000);
  const urgent = running && clamped <= 2000;

  return (
    <div className="space-y-1.5" aria-label={`${label}: ${running ? `${seconds} seconds left` : "waiting"}`}>
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="flex items-center gap-1.5 text-[#8B98B5] uppercase tracking-wider">
          <Timer className="w-3.5 h-3.5" aria-hidden="true" />
          {label}
        </span>
        <span className={cn("font-bold", urgent ? "text-[#FF5370]" : running ? "text-[#39DFFF]" : "text-[#8B98B5]")}>
          {running ? `${seconds}s` : "—"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#070B25] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className={cn("h-full rounded-full", urgent ? "bg-[#FF5370]" : "bg-[#39DFFF]")}
          style={{ width: `${fraction * 100}%`, transition: "width 100ms linear" }}
        />
      </div>
    </div>
  );
}

// ── Scoreboard ────────────────────────────────────────────────────────────────

export interface TeamScoreView {
  /** "Me", "Bot" or the friend's name */
  label: string;
  /** This team's innings (null if it has not batted yet) */
  score: InningsScore | null;
  batting: boolean;
}

interface ScoreboardProps {
  /** Left = me, right = opponent (never swapped) */
  left: TeamScoreView;
  right: TeamScoreView;
  innings: 1 | 2;
  ballsPerInnings?: number;
  target: number | null;
  chase: ChaseInfo | null;
  /** Current batter and bowler with their stats, e.g. "Player 3 · 12 (7)" */
  batterLine?: string | null;
  bowlerLine?: string | null;
}

function TeamColumn({ team, align, ballsPerInnings }: { team: TeamScoreView; align: "left" | "right"; ballsPerInnings: number }) {
  return (
    <div className={cn("min-w-0 flex-1", align === "right" && "text-right")}>
      <p className="flex items-center gap-1.5 text-xs font-black text-[#F5F7FF] truncate" style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {team.batting && align === "left" && <span className="w-2 h-2 rounded-full bg-[#39DFFF] shadow-[0_0_6px_#39DFFF]" />}
        <span className="truncate">{team.label}</span>
        {team.batting && align === "right" && <span className="w-2 h-2 rounded-full bg-[#39DFFF] shadow-[0_0_6px_#39DFFF]" />}
      </p>
      {team.score ? (
        <>
          <p className={cn("font-display font-black leading-none tabular-nums mt-1", team.batting ? "text-4xl text-[#F5F7FF]" : "text-2xl text-[#B8C3E0]")}>
            {formatScore(team.score)}
          </p>
          <p className="text-[11px] font-mono text-[#8B98B5] mt-1">
            {formatOvers(team.score.balls)}/{formatOvers(ballsPerInnings)} ov
            {team.batting && ` · RR ${runRate(team.score.runs, team.score.balls)}`}
          </p>
        </>
      ) : (
        <p className="text-sm font-semibold text-[#8B98B5] mt-2">Yet to bat</p>
      )}
    </div>
  );
}

export function Scoreboard({
  left,
  right,
  innings,
  ballsPerInnings = BALLS_PER_INNINGS,
  target,
  chase,
  batterLine,
  bowlerLine,
}: ScoreboardProps) {
  return (
    <div className="rounded-3xl border border-[rgba(57,223,255,0.2)] bg-[#101638] p-4 sm:p-5 shadow-xl space-y-3">
      <p className="text-center text-[10px] font-mono uppercase tracking-wider text-[#39DFFF]">
        {innings === 1 ? "1st innings" : "2nd innings · chase"}
      </p>
      <div className="flex items-start gap-3">
        <TeamColumn team={left} align="left" ballsPerInnings={ballsPerInnings} />
        <span className="text-xs font-black text-[#8B98B5] pt-6">vs</span>
        <TeamColumn team={right} align="right" ballsPerInnings={ballsPerInnings} />
      </div>

      {(batterLine || bowlerLine) && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[rgba(255,255,255,0.06)] text-[11px]">
          <p className="truncate text-[#B8C3E0]">
            <span className="text-[#39DFFF] font-bold">Bat </span>
            {batterLine}
          </p>
          <p className="truncate text-right text-[#B8C3E0]">
            <span className="text-[#FBBF24] font-bold">Bowl </span>
            {bowlerLine}
          </p>
        </div>
      )}

      {innings === 2 && target !== null && chase && (
        <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#FBBF24]">
            Need {chase.runsNeeded} off {chase.ballsLeft} ball{chase.ballsLeft === 1 ? "" : "s"}
          </span>
          <span className="font-mono text-[#8B98B5]">
            Target {target} · RRR {chase.requiredRate}
          </span>
        </div>
      )}
    </div>
  );
}

// ── This over ─────────────────────────────────────────────────────────────────

interface OverStripProps {
  balls: Array<{ ballNumber: number; runs: number; isOut: boolean }>;
}

export function OverStrip({ balls }: OverStripProps) {
  const slots = Array.from({ length: 6 }, (_, i) => balls[i] ?? null);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B98B5] shrink-0">This over</span>
      <div className="flex gap-1.5">
        {slots.map((ball, i) => (
          <span
            key={ball ? `b-${ball.ballNumber}` : `empty-${i}`}
            className={cn(
              "w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold",
              !ball && "border-dashed border-[rgba(255,255,255,0.12)] text-transparent",
              ball?.isOut && "bg-[#FF5370] border-[#FF5370] text-white",
              ball && !ball.isOut && ball.runs === 0 && "bg-[#070B25] border-[rgba(255,255,255,0.15)] text-[#8B98B5]",
              ball && !ball.isOut && ball.runs >= 4 && "bg-[#39DFFF]/20 border-[#39DFFF] text-[#39DFFF]",
              ball && !ball.isOut && ball.runs > 0 && ball.runs < 4 && "bg-[#101638] border-[rgba(57,223,255,0.3)] text-[#F5F7FF]",
            )}
          >
            {ball ? ballChipLabel(ball) : "·"}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Commentary ────────────────────────────────────────────────────────────────

export function Commentary({ text }: { text: string | null }) {
  return (
    <p
      className="min-h-[2.75rem] rounded-2xl bg-[#070B25]/80 border border-[rgba(255,255,255,0.06)] px-4 py-3 text-sm text-[#B8C3E0] italic"
      aria-live="polite"
    >
      {text ?? "Play is about to begin…"}
    </p>
  );
}

// ── Full scorecard ────────────────────────────────────────────────────────────

interface InningsCardProps {
  title: string;
  squad: string[];
  bowlingSquad: string[];
  score: InningsScore;
  batting: BattingLine[];
  bowling: BowlingLine[];
}

export function InningsCard({ title, squad, bowlingSquad, score, batting, bowling }: InningsCardProps) {
  const yetToBat = batting.filter((b) => !b.batted).map((b) => squad[b.index]);
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#070B25]">
        <span className="text-xs font-black text-[#F5F7FF]">{title}</span>
        <span className="text-xs font-mono text-[#B8C3E0]">
          {formatScore(score)} ({formatOvers(score.balls)} ov)
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[10px] font-mono uppercase tracking-wider text-[#8B98B5]">
          <tr>
            <th scope="col" className="text-left px-3 py-1.5 font-semibold">Batter</th>
            <th scope="col" className="text-right px-2 py-1.5 font-semibold">R</th>
            <th scope="col" className="text-right px-2 py-1.5 font-semibold">B</th>
            <th scope="col" className="text-right px-3 py-1.5 font-semibold">SR</th>
          </tr>
        </thead>
        <tbody>
          {batting
            .filter((b) => b.batted)
            .map((b) => (
              <tr key={b.index} className="border-t border-[rgba(255,255,255,0.06)] text-[#F5F7FF]">
                <td className="px-3 py-1.5">
                  <span className="font-semibold">{squad[b.index]}</span>
                  <span className="ml-1.5 text-[11px] text-[#8B98B5]">{b.isOut ? "out" : "not out"}</span>
                </td>
                <td className="px-2 py-1.5 text-right font-bold tabular-nums">{b.runs}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[#B8C3E0]">{b.balls}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-[#B8C3E0]">
                  {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : "—"}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {yetToBat.length > 0 && (
        <p className="px-3 py-2 border-t border-[rgba(255,255,255,0.06)] text-[11px] text-[#8B98B5]">
          Yet to bat / did not bat: {yetToBat.join(", ")}
        </p>
      )}
      {bowling.length > 0 && (
        <table className="w-full text-sm border-t border-[rgba(255,255,255,0.08)]">
          <thead className="text-[10px] font-mono uppercase tracking-wider text-[#8B98B5]">
            <tr>
              <th scope="col" className="text-left px-3 py-1.5 font-semibold">Bowler</th>
              <th scope="col" className="text-right px-2 py-1.5 font-semibold">O</th>
              <th scope="col" className="text-right px-2 py-1.5 font-semibold">R</th>
              <th scope="col" className="text-right px-3 py-1.5 font-semibold">W</th>
            </tr>
          </thead>
          <tbody>
            {bowling.map((b) => (
              <tr key={b.index} className="border-t border-[rgba(255,255,255,0.06)] text-[#F5F7FF]">
                <td className="px-3 py-1.5 font-semibold">{bowlingSquad[b.index]}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[#B8C3E0]">{formatOvers(b.balls)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[#B8C3E0]">{b.runs}</td>
                <td className="px-3 py-1.5 text-right font-bold tabular-nums">{b.wickets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Squad editor ──────────────────────────────────────────────────────────────

interface SquadEditorProps {
  open: boolean;
  initial: string[];
  onClose: () => void;
  onSave: (names: string[]) => Promise<string | null> | string | null;
}

/** Edit 11 player names. onSave returns an error message, or null on success. */
export function SquadEditor({ open, initial, onClose, onSave }: SquadEditorProps) {
  const [names, setNames] = useState<string[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset the form each time it opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNames(initial);
      setError(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const save = async () => {
    const cleaned = sanitizeSquad(names);
    if (!cleaned) {
      setError(`Every player needs a name of 1 to ${MAX_PLAYER_NAME_LENGTH} characters.`);
      return;
    }
    setSaving(true);
    const result = await onSave(cleaned);
    setSaving(false);
    if (result) setError(result);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Edit player names">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0D1336] border border-[rgba(57,223,255,0.3)] p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-lg text-[#F5F7FF]">My players</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-[#8B98B5] hover:text-[#F5F7FF]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-[#8B98B5]">
          Batting order is top to bottom. Players 7–11 share the bowling, one over each in turn.
        </p>
        <ol className="space-y-2">
          {Array.from({ length: PLAYERS_PER_TEAM }, (_, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 text-right text-xs font-mono text-[#8B98B5]">{i + 1}</span>
              <input
                type="text"
                value={names[i] ?? ""}
                maxLength={MAX_PLAYER_NAME_LENGTH}
                onChange={(e) => {
                  const next = [...names];
                  next[i] = e.target.value;
                  setNames(next);
                }}
                aria-label={`Player ${i + 1} name`}
                className="flex-1 min-w-0 rounded-xl bg-[#070B25] border border-[rgba(255,255,255,0.12)] px-3 py-2 text-sm text-[#F5F7FF] focus:outline-none focus:border-[#39DFFF]"
              />
              {i >= PLAYERS_PER_TEAM - 5 && <span className="text-[10px] font-mono text-[#FBBF24]">bowls</span>}
            </li>
          ))}
        </ol>
        {error && (
          <p className="text-xs text-[#FF5370] font-medium" role="alert">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="md" className="font-bold" onClick={save} loading={saving}>
            Save names
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EditPlayersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#39DFFF] border border-[#39DFFF]/30 hover:bg-[#39DFFF]/10 transition-colors"
    >
      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
      Edit my players
    </button>
  );
}

// ── Rules ─────────────────────────────────────────────────────────────────────

export function HandCricketRules({ className }: { className?: string }) {
  const rules = [
    "Pick 2, 3, 5 or 10 overs. Win the toss, then choose to bat or bowl.",
    "Each team has 11 players. An innings ends at 10 wickets or when the overs run out.",
    "Every ball, both players throw DOK (0) or a number from 1 to 6 within 5 seconds.",
    "Same number (even both DOK): the batter is OUT. Otherwise the batter scores the number they threw.",
    "DOK: if the batter shows DOK, they score the bowler's number instead.",
    "Miss the clock while batting: dot ball. Miss it while bowling: the batter's number counts.",
    "Chase the target in the second innings. Equal scores is a tie.",
  ];
  return (
    <ol className={cn("space-y-2.5 text-sm text-[#B8C3E0]", className)}>
      {rules.map((rule, i) => (
        <li key={rule} className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-[#39DFFF] text-xs font-bold flex items-center justify-center shrink-0">
            {i + 1}
          </span>
          <span className="leading-relaxed">{rule}</span>
        </li>
      ))}
    </ol>
  );
}
