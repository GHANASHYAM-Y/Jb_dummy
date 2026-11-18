import Link from "next/link";
import { Compass, Home, Gamepad2 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FFF6EC] text-[#1E1B24] flex items-center justify-center px-4 sm:px-6 py-16 relative overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-14 w-56 h-56 rounded-full bg-[#FFC23D]/70" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-16 w-64 h-64 rounded-full bg-[#8C7BFF]/25" />

      <div className="max-w-md w-full bg-white rounded-[26px] p-8 sm:p-10 shadow-[0_4px_0_#EADBC8] border-2 border-[#EADBC8] text-center space-y-6 relative z-10">
        <div className="w-16 h-16 bg-[#FFC23D] border-2 border-[#E9A912] shadow-[0_4px_0_#E9A912] text-[#1E1B24] rounded-[22px] flex items-center justify-center mx-auto rotate-6">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-[#C9381F] bg-[#FFE4DD] border-2 border-[#FF5A3C]/30 px-3.5 py-1 rounded-full">
            404 — Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#1E1B24] tracking-tight">
            Lost in the Arena? 🧭
          </h1>
          <p className="text-sm text-[#6E6878] leading-relaxed">
            The page or match duel you are looking for does not exist or has been moved to a new arena.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="evo-btn evo-btn-secondary flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold"
          >
            <Home className="w-4 h-4 text-[#FF5A3C]" /> Home
          </Link>
          <Link
            href="/games"
            className="evo-btn evo-btn-primary flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold"
          >
            <Gamepad2 className="w-4 h-4" /> Play Games
          </Link>
        </div>
      </div>
    </main>
  );
}
