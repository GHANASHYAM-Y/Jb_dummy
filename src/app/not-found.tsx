import Link from "next/link";
import { Compass, Home, Gamepad2 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F7F8F4] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-[#203331]/10 text-center space-y-6">
        <div className="w-16 h-16 bg-[#DDF2EB] text-[#167D78] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D95F49] bg-[#D95F49]/10 px-3 py-1 rounded-full">
            404 — Page Not Found
          </span>
          <h1 className="text-2xl font-black text-[#203331] tracking-tight">
            Lost in the Arena?
          </h1>
          <p className="text-sm text-[#203331]/70 leading-relaxed">
            The page or match duel you are looking for does not exist or has been moved to a new arena.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-[#203331] bg-[#F7F8F4] border border-[#203331]/10 hover:bg-[#203331]/5 transition-colors"
          >
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link
            href="/games"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-[#167D78] hover:bg-[#126864] transition-colors shadow-sm"
          >
            <Gamepad2 className="w-4 h-4" /> Play Games
          </Link>
        </div>
      </div>
    </main>
  );
}
