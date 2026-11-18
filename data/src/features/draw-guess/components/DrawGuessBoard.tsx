"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Eraser, Trash2, Undo2 } from "lucide-react";
import { Alert, Avatar } from "@/shared/ui";
import { createClient } from "@/core/supabase/client";
import { postJson } from "@/shared/lib/http";
import { cn } from "@/shared/lib/utils";
import {
  BRUSH_COLORS,
  BRUSH_SIZES,
  CANVAS_BG,
  MAX_STROKES,
  outcome,
  sanitizePoint,
  sanitizeStroke,
  secondsLeft,
  wordMask,
} from "../engine/engine";
import type { DrawPlayers, DrawSnapshot, Stroke, StrokePoint } from "../types";

interface Props {
  roomId: string;
  viewerId: string;
  players: DrawPlayers;
  initialSnapshot: DrawSnapshot;
}

const POLL_MS = 1500;
const SEND_EVERY_MS = 50;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]";

type SegmentMessage = { id: string; color: string; size: number; points: unknown[] };

export function DrawGuessBoard({ roomId, viewerId, players: initialPlayers, initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState<DrawSnapshot>(initialSnapshot);
  const [players, setPlayers] = useState<DrawPlayers>(initialPlayers);
  // Best estimate of the server clock, refreshed by the ticker below
  const [serverNow, setServerNow] = useState(() => Date.parse(initialSnapshot.server_now));
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [color, setColor] = useState<string>(BRUSH_COLORS[0]);
  const [size, setSize] = useState<number>(BRUSH_SIZES[1]);
  const [eraser, setEraser] = useState(false);

  const { room } = snapshot;
  const isHost = viewerId === room.host_id;
  const isDrawer = room.drawer_id === viewerId;
  const me = isHost ? players.host : players.guest;
  const opponent = isHost ? players.guest : players.host;
  const myScore = isHost ? room.host_score : room.guest_score;
  const theirScore = isHost ? room.guest_score : room.host_score;

  // Server clock offset (server minus this device), kept current by each state fetch
  const clockOffset = useRef(0);
  const remaining = secondsLeft(room.round_deadline, serverNow);

  // ── Realtime channel and canvas state ──────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const currentRef = useRef<Stroke | null>(null);
  const pendingRef = useRef<StrokePoint[]>([]);
  const lastSendRef = useRef(0);
  const roundRef = useRef(room.round_number);
  const isDrawerRef = useRef(isDrawer);
  useEffect(() => {
    isDrawerRef.current = isDrawer;
  }, [isDrawer]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { width, height } = canvas;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = (stroke.size / 600) * width;
      const [x0, y0] = stroke.points[0];
      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(x0 * width, y0 * height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(x0 * width, y0 * height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i][0] * width, stroke.points[i][1] * height);
      }
      ctx.stroke();
    }
  }, []);

  const send = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    void channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  // Keep the canvas bitmap sharp and sized to its box
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      redraw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw, room.status]);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/draw-guess/room/${roomId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { snapshot?: DrawSnapshot; players?: DrawPlayers };
      if (data.snapshot) {
        clockOffset.current = Date.parse(data.snapshot.server_now) - Date.now();
        setSnapshot(data.snapshot);
      }
      if (data.players) setPlayers(data.players);
    } catch {
      // Network blip: the next poll retries
    }
  }, [roomId]);

  // Subscribe to drawing events
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]>;
    try {
      const supabase = createClient();
      channel = supabase.channel(`draw-guess:${roomId}`, { config: { broadcast: { self: false } } });
    } catch {
      return; // Supabase not configured: polling still shows the game state
    }

    channel
      .on("broadcast", { event: "seg" }, ({ payload }) => {
        if (isDrawerRef.current) return;
        const msg = payload as SegmentMessage;
        const clean = sanitizeStroke({ ...msg, points: msg.points ?? [] });
        if (!clean) return;
        const existing = strokesRef.current.find((s) => s.id === clean.id);
        if (existing) existing.points.push(...clean.points);
        else if (strokesRef.current.length < MAX_STROKES) strokesRef.current.push(clean);
        redraw();
      })
      .on("broadcast", { event: "clear" }, () => {
        if (isDrawerRef.current) return;
        strokesRef.current = [];
        redraw();
      })
      .on("broadcast", { event: "undo" }, () => {
        if (isDrawerRef.current) return;
        strokesRef.current.pop();
        redraw();
      })
      .on("broadcast", { event: "sync-req" }, () => {
        if (!isDrawerRef.current) return;
        void channel.send({ type: "broadcast", event: "sync", payload: { strokes: strokesRef.current } });
      })
      .on("broadcast", { event: "sync" }, ({ payload }) => {
        if (isDrawerRef.current) return;
        const raw = (payload as { strokes?: unknown[] }).strokes;
        if (!Array.isArray(raw)) return;
        strokesRef.current = raw.slice(0, MAX_STROKES).map(sanitizeStroke).filter((s): s is Stroke => s !== null);
        redraw();
      })
      .on("broadcast", { event: "poke" }, () => {
        void fetchState();
      })
      .subscribe((status) => {
        // A guesser who joins late (or reloads) asks the drawer to resend the picture
        if (status === "SUBSCRIBED" && !isDrawerRef.current) {
          void channel.send({ type: "broadcast", event: "sync-req", payload: {} });
        }
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void channel.unsubscribe();
    };
  }, [roomId, redraw, fetchState]);

  // A new round starts with a clean canvas for both players
  useEffect(() => {
    if (roundRef.current !== room.round_number) {
      roundRef.current = room.round_number;
      strokesRef.current = [];
      currentRef.current = null;
      setGuess("");
      setError(null);
      redraw();
    }
  }, [room.round_number, redraw]);

  // Poll the room state and tick the clock
  useEffect(() => {
    if (room.status === "finished") return;
    const poll = setInterval(() => void fetchState(), POLL_MS);
    return () => clearInterval(poll);
  }, [fetchState, room.status]);

  useEffect(() => {
    const tick = setInterval(() => setServerNow(Date.now() + clockOffset.current), 250);
    return () => clearInterval(tick);
  }, []);

  // When the clock hits zero, ask the server to close the round
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (room.status === "drawing" && remaining === 0) void fetchState();
  }, [room.status, remaining, fetchState]);

  // ── Drawing (drawer only) ──────────────────────────────────────────────────
  const canDraw = isDrawer && room.status === "drawing" && remaining > 0;

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): StrokePoint | null {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return sanitizePoint([(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]);
  }

  function flushPending(force = false) {
    const stroke = currentRef.current;
    if (!stroke || pendingRef.current.length === 0) return;
    const t = Date.now();
    if (!force && t - lastSendRef.current < SEND_EVERY_MS) return;
    lastSendRef.current = t;
    send("seg", { id: stroke.id, color: stroke.color, size: stroke.size, points: pendingRef.current });
    pendingRef.current = [];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || strokesRef.current.length >= MAX_STROKES) return;
    const p = pointFromEvent(e);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke: Stroke = {
      id: `${viewerId.slice(0, 8)}-${Date.now().toString(36)}-${strokesRef.current.length}`,
      color: eraser ? CANVAS_BG : color,
      size: eraser ? 28 : size,
      points: [p],
    };
    strokesRef.current.push(stroke);
    currentRef.current = stroke;
    pendingRef.current = [p];
    flushPending(true);
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = currentRef.current;
    if (!stroke) return;
    const p = pointFromEvent(e);
    if (!p) return;
    stroke.points.push(p);
    pendingRef.current.push(p);
    flushPending();
    redraw();
  }

  function endStroke() {
    flushPending(true);
    currentRef.current = null;
  }

  function undo() {
    if (!canDraw) return;
    strokesRef.current.pop();
    redraw();
    send("undo");
  }

  function clearCanvas() {
    if (!canDraw) return;
    strokesRef.current = [];
    redraw();
    send("clear");
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function advance() {
    setBusy(true);
    setError(null);
    try {
      const res = await postJson(`/api/draw-guess/room/${roomId}/advance`);
      if (!res.ok) throw new Error("Could not start the next round.");
      await fetchState();
      send("poke");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the next round.");
    } finally {
      setBusy(false);
    }
  }

  async function submitGuess(e: React.FormEvent) {
    e.preventDefault();
    const text = guess.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postJson(`/api/draw-guess/room/${roomId}/guess`, { guess: text });
      const data = (await res.json()) as { correct?: boolean; success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not send your guess.");
      setGuess("");
      await fetchState();
      send("poke");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your guess.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the code is on screen anyway
    }
  }

  const nameOf = useMemo(
    () => (id: string) => (id === players.host.id ? players.host.display_name : (players.guest?.display_name ?? "Player")),
    [players],
  );

  // ── Views ──────────────────────────────────────────────────────────────────
  const hostIs = outcome(room.host_score, room.guest_score);
  const iWon = (hostIs === "host" && isHost) || (hostIs === "guest" && !isHost);

  return (
    <div className="mx-auto w-full max-w-[760px] px-1 sm:px-4 text-[#1E1B24]">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 mb-4">
        <Link
          id="draw-exit-btn"
          href="/play/draw-guess"
          className={cn(
            "inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full border-2 border-[#EADBC8] bg-white text-sm font-bold text-[#1E1B24]",
            FOCUS,
          )}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Leave
        </Link>
        <h1 className="font-display font-bold text-xl sm:text-2xl">
          <span aria-hidden="true">🎨</span> Draw &amp; Guess
        </h1>
        <span className="w-[88px] text-right text-xs font-bold text-[#6E6878]">
          {room.round_number > 0 ? `Round ${Math.min(room.round_number, room.rounds_total)}/${room.rounds_total}` : ""}
        </span>
      </header>

      {/* Scoreboard */}
      <section aria-label="Scores" className="b-card mb-4 !p-3 sm:!p-4 flex items-center justify-between gap-3">
        <PlayerChip name={me?.display_name ?? "You"} avatar={me?.avatar_url ?? null} score={myScore} drawing={room.status === "drawing" && isDrawer} label="You" />
        <span className="font-display font-bold text-[#8E8798]">vs</span>
        <PlayerChip
          name={opponent?.display_name ?? "Waiting…"}
          avatar={opponent?.avatar_url ?? null}
          score={theirScore}
          drawing={room.status === "drawing" && !isDrawer}
          label="Friend"
          right
        />
      </section>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {room.status === "waiting" && (
        <div className="b-card b-card-lilac text-center space-y-4">
          <h2 className="font-display font-bold text-2xl">Waiting for a friend…</h2>
          <p className="text-sm text-[#6E6878]">Send them this code. They enter it on the Draw &amp; Guess page.</p>
          <p id="draw-room-code-display" className="font-mono text-5xl font-bold tracking-[0.25em] text-[#1E1B24]">
            {room.code}
          </p>
          <button type="button" onClick={copyCode} className="evo-btn evo-btn-secondary min-h-[48px] px-6">
            {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      )}

      {room.status === "ready" && (
        <div className="b-card text-center space-y-4">
          <h2 className="font-display font-bold text-2xl">
            {opponent?.display_name ?? "Your friend"} is here!
          </h2>
          <p className="text-sm text-[#6E6878]">
            {room.rounds_total} rounds, 75 seconds each. {isHost ? "You draw first." : `${players.host.display_name} draws first.`}
          </p>
          <button id="draw-start-btn" type="button" onClick={advance} disabled={busy} className="evo-btn evo-btn-primary evo-btn-lg">
            {busy ? "Starting…" : "Start the game"}
          </button>
        </div>
      )}

      {(room.status === "drawing" || room.status === "round_over") && (
        <section className="space-y-3" aria-label="Drawing round">
          {/* Word + clock */}
          <div className="b-card b-card-sun !p-3 sm:!p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[#6E6878]">
                {room.status === "round_over"
                  ? room.round_solved
                    ? "Guessed it!"
                    : "Time's up. The word was"
                  : isDrawer
                    ? "Draw this word"
                    : `${nameOf(room.drawer_id ?? "")} is drawing`}
              </p>
              <p
                id="draw-word"
                aria-label={room.status === "round_over" || isDrawer ? undefined : `Word has ${room.word_length ?? 0} letters`}
                className="font-display font-bold text-2xl sm:text-3xl tracking-wide break-words"
              >
                {wordMask(room.word, room.word_length)}
              </p>
            </div>
            <div
              id="draw-timer"
              role="timer"
              aria-label={`${remaining} seconds left`}
              className={cn(
                "shrink-0 w-16 h-16 rounded-full border-2 flex items-center justify-center font-display font-bold text-2xl bg-white",
                room.status === "drawing" && remaining <= 10 ? "border-[#E5484D] text-[#E5484D]" : "border-[#1E1B24] text-[#1E1B24]",
              )}
            >
              {room.status === "drawing" ? remaining : 0}
            </div>
          </div>

          {/* Canvas */}
          <div className="relative rounded-[26px] border-2 border-[#EADBC8] bg-white shadow-[0_4px_0_#EADBC8] overflow-hidden">
            <canvas
              ref={canvasRef}
              id="draw-canvas"
              aria-label={isDrawer ? "Drawing canvas" : "The drawing so far"}
              className={cn("block w-full aspect-[4/3] touch-none", canDraw ? "cursor-crosshair" : "cursor-default")}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
            />
            {room.status === "round_over" && (
              <div className="absolute inset-x-0 bottom-0 bg-[#1E1B24]/85 px-4 py-2 text-center text-sm font-bold text-white">
                {room.round_solved ? "Nice one! Points added to both scores." : "Nobody got it this time."}
              </div>
            )}
          </div>

          {/* Drawer tools */}
          {isDrawer && room.status === "drawing" && (
            <div className="b-card !p-3 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Drawing tools">
              {BRUSH_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Brush color ${c}`}
                  aria-pressed={!eraser && color === c}
                  onClick={() => {
                    setColor(c);
                    setEraser(false);
                  }}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "w-9 h-9 rounded-full border-2",
                    !eraser && color === c ? "border-[#FF5A3C] ring-2 ring-[#FF5A3C]/40 scale-110" : "border-white shadow-[0_0_0_1px_#EADBC8]",
                    FOCUS,
                  )}
                />
              ))}
              <span className="w-px h-7 bg-[#EADBC8] mx-1" aria-hidden="true" />
              {BRUSH_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`Brush size ${s}`}
                  aria-pressed={!eraser && size === s}
                  onClick={() => {
                    setSize(s);
                    setEraser(false);
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center",
                    !eraser && size === s ? "border-[#FF5A3C] bg-[#FFE4DD]" : "border-[#EADBC8] bg-white",
                    FOCUS,
                  )}
                >
                  <span className="rounded-full bg-[#1E1B24]" style={{ width: s + 2, height: s + 2 }} />
                </button>
              ))}
              <span className="w-px h-7 bg-[#EADBC8] mx-1" aria-hidden="true" />
              <ToolButton label="Eraser" active={eraser} onClick={() => setEraser((v) => !v)}>
                <Eraser className="w-4 h-4" aria-hidden="true" />
              </ToolButton>
              <ToolButton label="Undo" onClick={undo}>
                <Undo2 className="w-4 h-4" aria-hidden="true" />
              </ToolButton>
              <ToolButton label="Clear" onClick={clearCanvas}>
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </ToolButton>
            </div>
          )}

          {/* Guesser form */}
          {!isDrawer && room.status === "drawing" && (
            <form onSubmit={submitGuess} className="flex gap-2">
              <label htmlFor="draw-guess-input" className="sr-only">
                Your guess
              </label>
              <input
                id="draw-guess-input"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                maxLength={40}
                autoComplete="off"
                placeholder="Type your guess…"
                className="evo-input flex-1 min-h-[48px]"
              />
              <button type="submit" id="draw-guess-btn" disabled={busy || guess.trim().length === 0} className="evo-btn evo-btn-primary min-h-[48px] px-6">
                Guess
              </button>
            </form>
          )}

          {/* Guess feed */}
          {snapshot.guesses.length > 0 && (
            <ul className="b-card !p-3 space-y-1.5 list-none" aria-label="Guesses" aria-live="polite">
              {snapshot.guesses.map((g, i) => (
                <li key={`${g.created_at}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className="font-bold">{g.user_id === viewerId ? "You" : nameOf(g.user_id)}:</span>
                  <span className={cn(g.is_correct ? "font-bold text-[#0E9B79]" : "text-[#6E6878]")}>{g.guess}</span>
                  {g.is_correct && <Check className="w-4 h-4 text-[#0E9B79]" aria-label="Correct" />}
                </li>
              ))}
            </ul>
          )}

          {room.status === "round_over" && (
            <div className="text-center">
              <button id="draw-next-btn" type="button" onClick={advance} disabled={busy} className="evo-btn evo-btn-primary evo-btn-lg">
                {busy ? "One moment…" : room.round_number >= room.rounds_total ? "See final scores" : "Next round"}
              </button>
            </div>
          )}
        </section>
      )}

      {room.status === "finished" && (
        <div className="b-card b-card-hot text-center space-y-4">
          <p className="text-6xl" aria-hidden="true">
            {hostIs === "draw" ? "🤝" : iWon ? "🏆" : "🎨"}
          </p>
          <h2 id="draw-result" className="font-display font-bold text-4xl">
            {hostIs === "draw" ? "It's a draw!" : iWon ? "You win!" : `${opponent?.display_name ?? "Your friend"} wins!`}
          </h2>
          <p className="text-lg font-bold">
            {myScore} – {theirScore}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/play/draw-guess" className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-full bg-white text-[#1E1B24] font-display font-bold border-2 border-white shadow-[0_5px_0_rgba(30,27,36,0.25)]">
              Play again
            </Link>
            <Link href="/games" className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-full bg-white/20 text-white font-display font-bold border-2 border-white/60">
              All games
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerChip({
  name,
  avatar,
  score,
  drawing,
  label,
  right = false,
}: {
  name: string;
  avatar: string | null;
  score: number;
  drawing: boolean;
  label: string;
  right?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", right && "flex-row-reverse text-right")}>
      <Avatar src={avatar} name={name} size="md" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{name}</p>
        <p className="text-xs text-[#6E6878]">
          {label}
          {drawing ? " · drawing ✏️" : ""}
        </p>
      </div>
      <p className={cn("font-display font-bold text-2xl", right ? "mr-auto" : "ml-auto")}>{score}</p>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full border-2 text-sm font-bold",
        active ? "border-[#FF5A3C] bg-[#FFE4DD]" : "border-[#EADBC8] bg-white",
        FOCUS,
      )}
    >
      {children}
      {label}
    </button>
  );
}
