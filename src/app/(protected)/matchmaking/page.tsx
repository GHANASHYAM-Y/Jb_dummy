import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RandomMatchmakingCard } from "@/components/matchmaking/RandomMatchmakingCard";

export const metadata: Metadata = {
  title: "Random Matchmaking — EVOAIQU",
  description: "Find an instant online Rock, Paper, Scissors match.",
  robots: { index: false },
};

export default async function MatchmakingPage() {
  await connection();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/matchmaking");

  return (
    <div className="evo-section py-6 sm:py-10">
      <div className="evo-container max-w-2xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display font-bold text-3xl text-[#203331] mb-1">
            Random Matchmaking
          </h1>
          <p className="text-[#65736F] text-sm font-medium">
            Instantly pair with any active player online for a First-to-5 Rock, Paper, Scissors game.
          </p>
        </div>

        {/* Dedicated Matchmaking Card */}
        <RandomMatchmakingCard className="p-8" />
      </div>
    </div>
  );
}
