import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerUser } from "@/core/supabase/server";
import { HistoryClient } from "@/features/rock-paper-scissors/components/HistoryClient";

export const metadata: Metadata = {
  title: "Match History — EVOAIQU",
  description: "Review your Rock, Paper, Scissors match history on EVOAIQU.",
  robots: { index: false },
};

export default async function HistoryPage() {
  await connection();
  const { data: { user } } = await getServerUser();
  if (!user) redirect("/login?next=/history");

  return (
    <div className="py-8 sm:py-14 text-[#F5F7FF]">
      <div className="evo-container max-w-2xl px-4 space-y-6">
        <div className="animate-fade-in space-y-2">
          <span className="inline-block px-3.5 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-[#39DFFF] text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(57,223,255,0.2)]">
            Battle Records
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight">
            Match History
          </h1>
          <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
            Your completed Rock, Paper, Scissors matches and head-to-head scorecards.
          </p>
        </div>

        <hr className="border-t border-[#1C2758] opacity-60" />

        <HistoryClient userId={user.id} />
      </div>
    </div>
  );
}
