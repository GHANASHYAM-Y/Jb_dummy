import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HistoryClient } from "@/components/rps/HistoryClient";

export const metadata: Metadata = {
  title: "Match History — EVOAIQU",
  description: "Review your Rock, Paper, Scissors match history on EVOAIQU.",
  robots: { index: false },
};

export default async function HistoryPage() {
  await connection();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/history");

  return (
    <div className="evo-section py-6 sm:py-10">
      <div className="evo-container max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display font-bold text-3xl text-[#203331] mb-1">Match History</h1>
          <p className="text-[#65736F] text-sm font-medium">
            Your completed Rock, Paper, Scissors matches.
          </p>
        </div>
        <HistoryClient userId={user.id} />
      </div>
    </div>
  );
}
