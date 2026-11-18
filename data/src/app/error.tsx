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
    <main className="min-h-screen bg-[#FFF6EC] text-[#1E1B24] flex items-center justify-center px-4 sm:px-6 py-16 relative overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-14 w-56 h-56 rounded-full bg-[#FFC23D]/70" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-16 w-64 h-64 rounded-full bg-[#8C7BFF]/25" />

      <div className="max-w-md w-full bg-white rounded-[26px] p-8 sm:p-10 shadow-[0_4px_0_#EADBC8] border-2 border-[#EADBC8] text-center space-y-6 relative z-10">
        <div className="w-16 h-16 bg-[#FFE4E5] border-2 border-[#E5484D]/40 text-[#E5484D] rounded-[22px] flex items-center justify-center mx-auto -rotate-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-[#9B1C21] bg-[#FFE4E5] border-2 border-[#E5484D]/30 px-3.5 py-1 rounded-full">
            Application Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#1E1B24] tracking-tight">
            Oops, something went wrong 😬
          </h1>
          <p className="text-sm text-[#6E6878] leading-relaxed">
            An unexpected error occurred while loading this screen. Your session data remains safe.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-[#6E6878] pt-1">
              Error Digest: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="evo-btn evo-btn-primary flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <Link
            href="/games"
            className="evo-btn evo-btn-secondary flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold"
          >
            <Home className="w-4 h-4 text-[#FF5A3C]" /> Go to Games
          </Link>
        </div>
      </div>
    </main>
  );
}
