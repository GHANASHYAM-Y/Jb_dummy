"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[EVOAIQU Root Layout Fatal Error]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070B25] text-[#F5F7FF] flex items-center justify-center px-4 font-sans antialiased relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,83,112,0.1),transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_120%,rgba(139,44,255,0.12),transparent_70%)] pointer-events-none" />

        <main className="max-w-md w-full bg-[#101638] rounded-3xl p-8 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] text-center space-y-6 relative z-10">
          <div className="w-16 h-16 bg-[#FF5370]/15 border border-[#FF5370]/30 text-[#FF5370] rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(255,83,112,0.25)]">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div className="space-y-3">
            <span className="inline-block text-xs font-mono font-bold uppercase tracking-wider text-[#FF5370] bg-[#FF5370]/10 border border-[#FF5370]/30 px-3.5 py-1 rounded-full">
              System Recovery
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#F5F7FF] tracking-tight">
              Fatal Error
            </h1>
            <p className="text-sm text-[#B8C3E0] leading-relaxed">
              The root application layout encountered an unexpected failure.
            </p>
            {error.digest && (
              <p className="text-[11px] font-mono text-[#B8C3E0]/50 pt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] hover:opacity-95 shadow-[0_0_20px_rgba(49,91,255,0.4)] transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Reload EVOAIQU
          </button>
        </main>
      </body>
    </html>
  );
}
