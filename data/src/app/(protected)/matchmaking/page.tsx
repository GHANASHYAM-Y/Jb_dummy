import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerUser } from "@/core/supabase/server";
import { RandomMatchmakingCard } from "@/features/rock-paper-scissors/matchmaking/RandomMatchmakingCard";

export const metadata: Metadata = {
  title: "Random Matchmaking — EVOAIQU",
  description: "Find an instant online Rock, Paper, Scissors match.",
  robots: { index: false },
};

export default async function MatchmakingPage() {
  await connection();

  const {
    data: { user },
  } = await getServerUser();

  if (!user) redirect("/login?next=/matchmaking");

  return (
    <div className="py-8 sm:py-14 text-[#F5F7FF]">
      <div className="evo-container max-w-2xl px-4 space-y-6">
        {/* Header */}
        <div className="animate-fade-in space-y-2">
          <span className="inline-block px-3.5 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-[#39DFFF] text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(57,223,255,0.2)]">
            Quick Play Queue
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight">
            Random Matchmaking
          </h1>
          <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
            Instantly pair with any active player online for a First-to-5 Rock, Paper, Scissors duel.
          </p>
        </div>

        <hr className="border-t border-[#1C2758] opacity-60" />

        {/* Dedicated Matchmaking Card */}
        <div className="pt-2">
          <RandomMatchmakingCard className="p-6 sm:p-8" />
        </div>
      </div>
    </div>
  );
}
