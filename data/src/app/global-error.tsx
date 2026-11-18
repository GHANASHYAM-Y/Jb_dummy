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
      <body className="min-h-screen bg-[#FFF6EC] text-[#1E1B24] flex items-center justify-center px-4 font-sans antialiased relative overflow-hidden">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-14 w-56 h-56 rounded-full bg-[#FFC23D]/70" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-16 w-64 h-64 rounded-full bg-[#8C7BFF]/25" />

        <main className="max-w-md w-full bg-white rounded-[26px] p-8 sm:p-10 shadow-[0_4px_0_#EADBC8] border-2 border-[#EADBC8] text-center space-y-6 relative z-10">
          <div className="w-16 h-16 bg-[#FFE4E5] border-2 border-[#E5484D]/40 text-[#E5484D] rounded-[22px] flex items-center justify-center mx-auto -rotate-6">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div className="space-y-3">
            <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-[#9B1C21] bg-[#FFE4E5] border-2 border-[#E5484D]/30 px-3.5 py-1 rounded-full">
              System Recovery
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#1E1B24] tracking-tight">
              Fatal Error
            </h1>
            <p className="text-sm text-[#6E6878] leading-relaxed">
              The root application layout encountered an unexpected failure.
            </p>
            {error.digest && (
              <p className="text-[11px] font-mono text-[#6E6878] pt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] py-3 px-6 rounded-full text-base font-bold text-white bg-[#FF5A3C] shadow-[0_4px_0_#C9381F] hover:-translate-y-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2 transition-transform cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Reload EVOAIQU
          </button>
        </main>
      </body>
    </html>
  );
}
