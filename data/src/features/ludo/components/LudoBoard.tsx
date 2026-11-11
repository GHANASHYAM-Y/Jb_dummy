"use client";

import React from "react";
import { cn } from "@/shared/lib/utils";
import {
  COLORS,
  FINISHED,
  START_INDEX,
  STAR_SQUARES,
  TRACK_LENGTH,
  YARD,
  rotationFor,
  type Color,
  type LudoEvent,
  type LudoState,
} from "@/features/ludo/engine/engine";
import { GRID, YARD_ORIGIN, homeColumnCell, tokenCell, trackCell, yardCells } from "@/features/ludo/engine/board";

// ── Shared presentation helpers ───────────────────────────────────────────────

export const COLOR_HEX: Record<Color, string> = {
  red: "#FF5370",
  green: "#2DD4A4",
  yellow: "#FBBF24",
  blue: "#4D8BFF",
};

export const COLOR_NAME: Record<Color, string> = {
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
};

/** The die value to show: the pending roll, or the one behind the last event. */
export function shownDice(state: LudoState): number | null {
  if (state.dice !== null) return state.dice;
  const ev = state.lastEvent;
  if (!ev) return null;
  if (ev.type === "roll") return ev.dice;
  if (ev.type === "move") return ev.from === YARD ? 6 : ev.to - ev.from;
  return null;
}

/** One line of game commentary. The viewer's colour is "You". */
export function describeEvent(event: LudoEvent | null, labelOf: (c: Color) => string, myColor: Color): string | null {
  if (!event) return null;
  const mine = event.color === myColor;
  const who = mine ? "You" : labelOf(event.color);

  if (event.type === "roll") {
    if (event.threeSixes) return `${who} rolled three 6s in a row. Turn over.`;
    if (event.noMoves) return `${who} rolled a ${event.dice}. No token can move.`;
    return mine ? `You rolled a ${event.dice}. Pick a token.` : `${who} rolled a ${event.dice}.`;
  }

  if (event.type === "pass") {
    if (event.reason === "timeout") return `${who} ran out of time.`;
    if (event.reason === "three_sixes") return `${who} rolled three 6s. Turn over.`;
    return `${who} had no moves.`;
  }

  let text: string;
  if (event.captured.length > 0) {
    const victims = Array.from(new Set(event.captured.map((c) => c.color)));
    if (mine) {
      text = `You captured ${victims.map((c) => `${labelOf(c)}'s`).join(" and ")} token!`;
    } else if (victims.includes(myColor)) {
      text = `${who} captured your token!`;
    } else {
      text = `${who} captured ${victims.map((c) => `${labelOf(c)}'s`).join(" and ")} token!`;
    }
  } else if (event.finished) {
    text = `${who} got a token home!`;
  } else if (event.from === YARD) {
    text = `${who} brought a token out.`;
  } else {
    const steps = event.to - event.from;
    text = `${who} moved ${steps} ${steps === 1 ? "square" : "squares"}.`;
  }
  if (event.extraTurn) text += mine ? " Roll again!" : " Extra roll.";
  return text;
}

// ── Players bar ───────────────────────────────────────────────────────────────

export interface LudoPlayerChip {
  color: Color;
  label: string;
  home: number;
  isTurn: boolean;
  isMe: boolean;
}

export function LudoPlayersBar({ players }: { players: LudoPlayerChip[] }) {
  return (
    <ul className={cn("grid gap-2", players.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
      {players.map((p) => (
        <li
          key={p.color}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-2xl border bg-[#101638] min-w-0 transition-colors",
            p.isTurn ? "border-[#39DFFF]/60 shadow-[0_0_12px_rgba(57,223,255,0.25)]" : "border-[rgba(255,255,255,0.08)]",
          )}
          aria-current={p.isTurn ? "step" : undefined}
        >
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0 border-2 border-white/80"
            style={{ backgroundColor: COLOR_HEX[p.color] }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-bold truncate", p.isMe ? "text-[#39DFFF]" : "text-[#F5F7FF]")}>{p.label}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#8B98B5]">
              {p.isTurn ? "Turn" : COLOR_NAME[p.color]} · {p.home}/4 home
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────

interface LudoBoardProps {
  state: LudoState;
  /** The viewer's colour: its yard is drawn bottom-left. */
  myColor: Color;
  /** Token indexes of the current player that may be clicked. */
  movableTokens: number[];
  onTokenClick?: (token: number) => void;
  lastEvent?: LudoEvent | null;
  /** Names shown in each yard (never rotated). */
  labels?: Partial<Record<Color, string>>;
  className?: string;
}

interface Point {
  y: number;
  x: number;
}

/** Rotate a point on the 15x15 board clockwise by a multiple of 90 degrees. */
function rotatePoint(p: Point, deg: number): Point {
  let { y, x } = p;
  for (let i = 0; i < ((deg / 90) % 4 + 4) % 4; i++) {
    [y, x] = [x, GRID - y];
  }
  return { y, x };
}

const pct = (v: number) => `${(v / GRID) * 100}%`;

function starPoints(cx: number, cy: number, outer = 0.36, inner = 0.15): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)}`);
  }
  return pts.join(" ");
}

const START_SQUARE_COLOR = new Map<number, Color>(COLORS.map((c) => [START_INDEX[c], c]));

const CENTRE_TRIANGLES: Record<Color, string> = {
  red: "6,9 9,9 7.5,7.5",
  green: "6,6 6,9 7.5,7.5",
  yellow: "6,6 9,6 7.5,7.5",
  blue: "9,6 9,9 7.5,7.5",
};

/** Static board artwork in the standard orientation (red yard bottom-left). */
const BoardArt = React.memo(function BoardArt({ active }: { active: string }) {
  const inPlay = new Set(active.split(","));
  return (
    <>
      <rect x={0} y={0} width={GRID} height={GRID} rx={0.35} fill="#0B1030" />

      {/* Yards */}
      {COLORS.map((c) => {
        const o = YARD_ORIGIN[c];
        return (
          <g key={`yard-${c}`} opacity={inPlay.has(c) ? 1 : 0.3}>
            <rect x={o.col + 0.08} y={o.row + 0.08} width={5.84} height={5.84} rx={0.45} fill={COLOR_HEX[c]} />
            <rect x={o.col + 0.75} y={o.row + 0.75} width={4.5} height={4.5} rx={0.45} fill="#070B25" />
            {yardCells(c).map((cell, i) => (
              <circle
                key={i}
                cx={cell.col + 0.5}
                cy={cell.row + 0.5}
                r={0.42}
                fill="none"
                stroke={COLOR_HEX[c]}
                strokeWidth={0.07}
                opacity={0.7}
              />
            ))}
          </g>
        );
      })}

      {/* Shared track */}
      {Array.from({ length: TRACK_LENGTH }, (_, square) => {
        const cell = trackCell(square);
        const startColor = START_SQUARE_COLOR.get(square);
        const star = STAR_SQUARES.includes(square);
        return (
          <g key={`sq-${square}`}>
            <rect
              x={cell.col + 0.04}
              y={cell.row + 0.04}
              width={0.92}
              height={0.92}
              rx={0.12}
              fill={startColor ? COLOR_HEX[startColor] : "#1A2253"}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={0.03}
            />
            {(star || startColor) && (
              <polygon
                points={starPoints(cell.col + 0.5, cell.row + 0.5)}
                fill={startColor ? "rgba(7,11,37,0.55)" : "rgba(245,247,255,0.55)"}
              />
            )}
          </g>
        );
      })}

      {/* Home columns */}
      {COLORS.map((c) =>
        [1, 2, 3, 4, 5].map((step) => {
          const cell = homeColumnCell(c, step);
          return (
            <rect
              key={`home-${c}-${step}`}
              x={cell.col + 0.04}
              y={cell.row + 0.04}
              width={0.92}
              height={0.92}
              rx={0.12}
              fill={COLOR_HEX[c]}
              opacity={inPlay.has(c) ? 0.85 : 0.3}
            />
          );
        }),
      )}

      {/* Centre */}
      <rect x={6} y={6} width={3} height={3} fill="#070B25" />
      {COLORS.map((c) => (
        <polygon
          key={`tri-${c}`}
          points={CENTRE_TRIANGLES[c]}
          fill={COLOR_HEX[c]}
          opacity={inPlay.has(c) ? 0.9 : 0.3}
          stroke="#070B25"
          strokeWidth={0.05}
        />
      ))}
    </>
  );
});

function whereLabel(progress: number): string {
  if (progress === YARD) return "in the yard";
  if (progress >= FINISHED) return "home";
  if (progress > 50) return "in the home column";
  return `${progress} ${progress === 1 ? "step" : "steps"} from start`;
}

interface PlacedToken {
  color: Color;
  index: number;
  progress: number;
  center: Point;
}

export function LudoBoard({
  state,
  myColor,
  movableTokens,
  onTokenClick,
  lastEvent,
  labels,
  className,
}: LudoBoardProps) {
  const deg = rotationFor(myColor);
  const turnColor = state.players[state.turn]?.color ?? null;
  const active = state.players.map((p) => p.color).join(",");

  // Place every token (in screen space, after rotation) and group shared cells
  const placed: PlacedToken[] = [];
  for (const p of state.players) {
    (state.tokens[p.color] ?? []).forEach((progress, index) => {
      const cell = tokenCell(p.color, progress, index);
      placed.push({ color: p.color, index, progress, center: rotatePoint({ y: cell.row + 0.5, x: cell.col + 0.5 }, deg) });
    });
  }
  const groups = new Map<string, PlacedToken[]>();
  for (const t of placed) {
    const key = `${t.center.y.toFixed(2)}:${t.center.x.toFixed(2)}`;
    const list = groups.get(key);
    if (list) list.push(t);
    else groups.set(key, [t]);
  }

  const movable = new Set(turnColor ? movableTokens.map((i) => `${turnColor}-${i}`) : []);

  // Short flash where the last move landed (re-mounts on every new event)
  let flash: { center: Point; color: Color } | null = null;
  if (lastEvent?.type === "move") {
    const cell = tokenCell(lastEvent.color, lastEvent.to, lastEvent.token);
    flash = { center: rotatePoint({ y: cell.row + 0.5, x: cell.col + 0.5 }, deg), color: lastEvent.color };
  }

  return (
    <div className={cn("relative w-full aspect-square select-none", className)}>
      <style>{`
        @keyframes ludo-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,247,255,0.85); } 50% { box-shadow: 0 0 0 5px rgba(245,247,255,0); } }
        @keyframes ludo-flash { from { opacity: 0.9; transform: translate(-50%,-50%) scale(0.8); } to { opacity: 0; transform: translate(-50%,-50%) scale(2); } }
        .ludo-movable { animation: ludo-pulse 1.1s ease-in-out infinite; }
        .ludo-flash { animation: ludo-flash 0.9s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .ludo-anim, .ludo-movable, .ludo-flash { animation: none !important; transition: none !important; } }
      `}</style>

      <svg
        viewBox={`0 0 ${GRID} ${GRID}`}
        className="absolute inset-0 w-full h-full rounded-2xl"
        role="img"
        aria-label="Ludo board"
      >
        <g transform={`rotate(${deg} 7.5 7.5)`}>
          <BoardArt active={active} />
        </g>
      </svg>

      {/* Yard labels (upright) */}
      {labels &&
        state.players.map((p) => {
          const o = YARD_ORIGIN[p.color];
          const c = rotatePoint({ y: o.row + 3, x: o.col + 3 }, deg);
          const text = labels[p.color];
          if (!text) return null;
          return (
            <span
              key={`label-${p.color}`}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-bold truncate text-center pointer-events-none",
                p.color === turnColor ? "bg-[#39DFFF] text-[#070B25]" : "bg-[#101638]/90 text-[#F5F7FF]",
              )}
              style={{ left: pct(c.x), top: pct(c.y), maxWidth: pct(2.6) }}
            >
              {text}
            </span>
          );
        })}

      {flash && (
        <span
          key={`flash-${state.moveCount}`}
          className="ludo-flash absolute rounded-full pointer-events-none border-2"
          style={{
            left: pct(flash.center.x),
            top: pct(flash.center.y),
            width: pct(1),
            height: pct(1),
            borderColor: COLOR_HEX[flash.color],
          }}
          aria-hidden="true"
        />
      )}

      {/* Tokens */}
      {Array.from(groups.values()).flatMap((group) => {
        const n = group.length;
        const scale = n === 1 ? 0.78 : n === 2 ? 0.62 : 0.52;
        const offsets: [number, number][] =
          n === 1
            ? [[0, 0]]
            : n === 2
            ? [
                [-0.17, -0.17],
                [0.17, 0.17],
              ]
            : [
                [-0.22, -0.22],
                [-0.22, 0.22],
                [0.22, -0.22],
                [0.22, 0.22],
              ];
        const nodes = group.map((t, i) => {
          const [dy, dx] = offsets[i % offsets.length];
          const key = `${t.color}-${t.index}`;
          const canMove = movable.has(key) && Boolean(onTokenClick);
          const label = canMove
            ? `Move ${t.color} token ${t.index + 1}`
            : `${COLOR_NAME[t.color]} token ${t.index + 1}, ${whereLabel(t.progress)}`;
          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              disabled={!canMove}
              onClick={canMove ? () => onTokenClick?.(t.index) : undefined}
              className={cn(
                "ludo-anim absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-0 transition-[left,top] duration-300 ease-out",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#39DFFF]",
                canMove ? "z-20 cursor-pointer ludo-movable" : "z-10 cursor-default",
              )}
              style={{
                left: pct(t.center.x + dx),
                top: pct(t.center.y + dy),
                width: pct(scale),
                height: pct(scale),
              }}
            >
              <span
                className="block w-full h-full rounded-full border-2 shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                style={{
                  backgroundColor: COLOR_HEX[t.color],
                  borderColor: canMove ? "#F5F7FF" : "rgba(7,11,37,0.85)",
                  backgroundImage: "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.55) 0 22%, transparent 24%)",
                }}
              />
            </button>
          );
        });
        if (n > 1) {
          const t = group[0];
          nodes.push(
            <span
              key={`count-${t.color}-${t.index}`}
              className="absolute z-30 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#F5F7FF] text-[#070B25] text-[9px] font-black leading-[14px] text-center pointer-events-none"
              style={{ left: pct(t.center.x + 0.2), top: pct(t.center.y - 0.62) }}
              aria-hidden="true"
            >
              {n}
            </span>,
          );
        }
        return nodes;
      })}
    </div>
  );
}
