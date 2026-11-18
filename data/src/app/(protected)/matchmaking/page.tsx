import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerUser } from "@/core/supabase/server";
import { RandomMatchmakingCard } from "@/features/rock-paper-scissors";
import { LobbyBackLink } from "@/shared/game/LobbyChrome";

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
    <div className="mx-auto w-full max-w-[760px] px-4 sm:px-7 py-6 text-[#1E1B24] space-y-5">
      <LobbyBackLink />
      <div className="animate-fade-in text-center space-y-2">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1E1B24]">
          Random Matchmaking
        </h1>
        <p className="text-[#6E6878] text-sm sm:text-base leading-relaxed">
          Instantly pair with any active player online for a First-to-5 Rock, Paper, Scissors duel.
        </p>
      </div>

      {/* Dedicated Matchmaking Card */}
      <RandomMatchmakingCard className="p-6 sm:p-8" />
    </div>
  );
}
