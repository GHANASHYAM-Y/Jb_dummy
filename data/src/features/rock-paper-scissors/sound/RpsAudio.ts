"use client";

/**
 * EVOAIQU RPS Audio & Haptics Engine
 *
 * Uses the Web Audio API to synthesize custom sound effects in real time:
 * - Zero external audio assets (no missing 404s, zero bandwidth overhead)
 * - Safe against autoplay blocking (unlocked on first user interaction)
 * - Accessible mute toggle with persistent storage
 * - Non-intrusive mobile haptic feedback
 */

const STORAGE_KEY = "evoaiqu_rps_sound_muted";

class RpsAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private listeners: Set<(muted: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.isMuted = stored === "true";
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(muted));
    }
    this.listeners.forEach((fn) => fn(muted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public subscribe(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Safe vibration feedback on supported mobile devices */
  public triggerHaptic(pattern: number | number[] = 20): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignored on unsupported platforms
      }
    }
  }

  /** Soft click when tapping a move card */
  public playMoveSelect(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic(12);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Firm confirmation chime when locking in move */
  public playMoveLockIn(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic([20, 40, 25]);

    const now = ctx.currentTime;
    // Dual pleasant chime
    [520, 650].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.04;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  }

  /** Wooden tick during final 3 seconds of countdown */
  public playCountdownTick(isUrgent = false): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic(isUrgent ? 25 : 10);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isUrgent ? "triangle" : "sine";
    osc.frequency.setValueAtTime(isUrgent ? 880 : 700, now);

    gain.gain.setValueAtTime(isUrgent ? 0.09 : 0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /** Dramatic countdown beat for the 3-2-1 clash reveal */
  public playClashCount(step: number): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic(30);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Frequency ascends: 3 = 260Hz, 2 = 330Hz, 1 = 440Hz
    const freq = step === 1 ? 440 : step === 2 ? 330 : 260;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Impact hit and resonant shockwave when moves clash */
  public playClashImpact(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic([45, 30, 45]);

    const now = ctx.currentTime;

    // 1. Low punch
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "triangle";
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(50, now + 0.18);
    subGain.gain.setValueAtTime(0.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.2);

    // 2. High snap
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = "sine";
    snap.frequency.setValueAtTime(580, now);
    snap.frequency.exponentialRampToValueAtTime(220, now + 0.08);
    snapGain.gain.setValueAtTime(0.18, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    snap.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(now);
    snap.stop(now + 0.1);
  }

  /** Upward bright chime when winning a round (+1 pt) */
  public playRoundWin(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic([30, 50, 40]);

    const now = ctx.currentTime;
    // C5 (523), E5 (659), G5 (784)
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.08;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  /** Gentle descending interval when losing a round */
  public playRoundLoss(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic(40);

    const now = ctx.currentTime;
    [415.3, 329.63].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.1;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /** Neutral double tap when round is a draw */
  public playRoundDraw(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic(20);

    const now = ctx.currentTime;
    [480, 480].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.09;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    });
  }

  /** Triumphant fanfare when match is won (First to 5) */
  public playMatchVictory(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic([60, 60, 80, 60, 120]);

    const now = ctx.currentTime;
    // G4, C5, E5, G5 sustained
    const notes = [
      { f: 392.0, d: 0.12, off: 0 },
      { f: 523.25, d: 0.12, off: 0.12 },
      { f: 659.25, d: 0.14, off: 0.24 },
      { f: 783.99, d: 0.45, off: 0.38 },
      { f: 1046.5, d: 0.55, off: 0.42 }, // high octave shimmer
    ];

    notes.forEach(({ f, d, off }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + off;

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + d);
    });
  }
}

export const rpsAudio = new RpsAudioEngine();
