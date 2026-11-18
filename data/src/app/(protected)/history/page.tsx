import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerUser } from "@/core/supabase/server";
import { HistoryClient } from "@/features/rock-paper-scissors";

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
    <div className="px-4 sm:px-7 py-6 text-[#1E1B24]">
      <div className="max-w-[860px] mx-auto space-y-6">
        <div className="animate-fade-in space-y-2">
          <span className="b-chip !cursor-default hover:!transform-none">
            Battle Records
          </span>
          <h1 className="font-display font-semibold text-[32px] leading-tight text-[#1E1B24]">
            Match History
          </h1>
          <p className="text-[#6E6878] text-sm sm:text-base leading-relaxed">
            Your completed Rock, Paper, Scissors matches and head-to-head scorecards.
          </p>
        </div>

        <HistoryClient userId={user.id} />
      </div>
    </div>
  );
}
