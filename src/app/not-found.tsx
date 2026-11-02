import Link from "next/link";
import { Compass, Home, Gamepad2 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#070B25] text-[#F5F7FF] flex items-center justify-center px-4 sm:px-6 py-16 relative overflow-hidden">
      {/* Background Cyber Ambient Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(57,223,255,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_120%,rgba(139,44,255,0.12),transparent_70%)] pointer-events-none" />

      <div className="max-w-md w-full bg-[#101638] rounded-3xl p-8 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] text-center space-y-6 relative z-10">
        <div className="w-16 h-16 bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-[#39DFFF] rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(57,223,255,0.25)]">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <span className="inline-block text-xs font-mono font-bold uppercase tracking-wider text-[#39DFFF] bg-[#39DFFF]/10 border border-[#39DFFF]/30 px-3.5 py-1 rounded-full">
            404 — Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-[#F5F7FF] tracking-tight">
            Lost in the Arena?
          </h1>
          <p className="text-sm text-[#B8C3E0] leading-relaxed">
            The page or match duel you are looking for does not exist or has been moved to a new arena.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="evo-btn-secondary flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold"
          >
            <Home className="w-4 h-4 text-[#39DFFF]" /> Home
          </Link>
          <Link
            href="/games"
            className="evo-btn-primary flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold"
          >
            <Gamepad2 className="w-4 h-4" /> Play Games
          </Link>
        </div>
      </div>
    </main>
  );
}
