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
      <body className="min-h-screen bg-[#F7F8F4] flex items-center justify-center px-4 font-sans antialiased text-[#203331]">
        <main className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-[#203331]/10 text-center space-y-6">
          <div className="w-16 h-16 bg-[#D95F49]/10 text-[#D95F49] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D95F49] bg-[#D95F49]/10 px-3 py-1 rounded-full">
              System Recovery
            </span>
            <h1 className="text-2xl font-black text-[#203331] tracking-tight">
              Fatal Error
            </h1>
            <p className="text-sm text-[#203331]/70 leading-relaxed">
              The root application layout encountered an unexpected failure.
            </p>
            {error.digest && (
              <p className="text-[11px] font-mono text-[#203331]/40 pt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-[#167D78] hover:bg-[#126864] transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> Reload EVOAIQU
          </button>
        </main>
      </body>
    </html>
  );
}
