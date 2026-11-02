"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error to standard console for telemetry/monitoring
    console.error("[EVOAIQU App Error]:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#070B25] text-[#F5F7FF] flex items-center justify-center px-4 sm:px-6 py-16 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,83,112,0.1),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_120%,rgba(139,44,255,0.12),transparent_70%)] pointer-events-none" />

      <div className="max-w-md w-full bg-[#101638] rounded-3xl p-8 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] text-center space-y-6 relative z-10">
        <div className="w-16 h-16 bg-[#FF5370]/15 border border-[#FF5370]/30 text-[#FF5370] rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(255,83,112,0.25)]">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <span className="inline-block text-xs font-mono font-bold uppercase tracking-wider text-[#FF5370] bg-[#FF5370]/10 border border-[#FF5370]/30 px-3.5 py-1 rounded-full">
            Application Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-[#F5F7FF] tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-[#B8C3E0] leading-relaxed">
            An unexpected error occurred while loading this screen. Your session data remains safe.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-[#B8C3E0]/50 pt-1">
              Error Digest: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="evo-btn-primary flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <Link
            href="/games"
            className="evo-btn-secondary flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold"
          >
            <Home className="w-4 h-4 text-[#39DFFF]" /> Go to Games
          </Link>
        </div>
      </div>
    </main>
  );
}
