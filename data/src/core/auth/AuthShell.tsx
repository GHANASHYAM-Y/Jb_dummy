import React from "react";
import Link from "next/link";

/**
 * Concept B auth canvas: cream page, floating sticker blobs, a logo mark +
 * Fredoka wordmark, and one centred white sticker card for the form.
 * Purely presentational — all auth logic lives in the form components.
 */
export function AuthBrand({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="EVOAIQU Home"
      className={`inline-flex items-center gap-2.5 select-none rounded-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] ${className}`}
    >
      <span className="b-logo-mark w-[38px] h-[38px] text-sm" aria-hidden="true">EQ</span>
      <span className="font-display font-bold text-[1.75rem] leading-none tracking-tight text-[#1E1B24]">
        EVOAIQU
      </span>
    </Link>
  );
}

export function AuthShell({
  children,
  language,
  sticker = "🎮",
  footer,
  className = "",
}: {
  children: React.ReactNode;
  language?: React.ReactNode;
  sticker?: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex-1 min-h-screen w-full max-w-full flex flex-col bg-[#FFF6EC] text-[#1E1B24] overflow-x-hidden selection:bg-[#FF5A3C]/30 ${className}`}
    >
      {/* Sticker blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -top-16 -left-14 w-56 h-56 rounded-full bg-[#FFC23D]/70" />
        <span className="absolute top-1/3 -right-20 w-64 h-64 rounded-full bg-[#8C7BFF]/25" />
        <span className="absolute -bottom-20 left-1/4 w-60 h-60 rounded-full bg-[#14C49A]/25" />
        <span className="hidden sm:block absolute top-28 left-[12%] text-5xl -rotate-12">✨</span>
        <span className="hidden sm:block absolute bottom-32 right-[12%] text-5xl rotate-12">🎯</span>
      </div>

      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 pt-5 flex items-center justify-between gap-3">
        <AuthBrand />
        {language}
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="relative rounded-[26px] bg-white border-2 border-[#EADBC8] shadow-[0_4px_0_#EADBC8] p-6 sm:p-9">
            <span
              aria-hidden="true"
              className="absolute -top-6 right-6 w-14 h-14 rounded-2xl bg-[#FFC23D] border-2 border-[#E9A912] shadow-[0_4px_0_#E9A912] grid place-items-center text-3xl rotate-6"
            >
              {sticker}
            </span>
            {children}
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 pb-6 flex flex-col sm:flex-row items-center justify-center gap-x-5 gap-y-1 text-xs font-semibold text-[#6E6878] text-center">
        {footer}
        <Link href="/privacy" className="inline-flex items-center min-h-[44px] hover:text-[#FF5A3C] transition-colors">
          Privacy Policy
        </Link>
        <Link href="/terms" className="inline-flex items-center min-h-[44px] hover:text-[#FF5A3C] transition-colors">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}

/** Shared pill-input wrapper class pieces so login/signup/reset stay consistent. */
export const authLabelClass = "text-xs font-bold uppercase tracking-wider text-[#6E6878]";
