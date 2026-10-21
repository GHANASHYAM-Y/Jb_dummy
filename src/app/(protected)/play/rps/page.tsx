import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RpsLobby } from "@/components/rps/RpsLobby";
import type { FriendEntry } from "@/types/database";

export const metadata: Metadata = {
  title: "Rock, Paper, Scissors — EVOAIQU",
  description: "Challenge a friend to a First-to-5 Rock, Paper, Scissors match.",
  robots: { index: false },
};

export default async function RpsPage() {
  await connection();

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/play/rps");

  // Fetch accepted friends for the challenge list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: friendsData } = await (supabase as any).rpc("get_friends");
  const friends: FriendEntry[] = friendsData ?? [];

  return (
    <div className="evo-section py-6 sm:py-10">
      <div className="evo-container max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display font-bold text-3xl text-[#203331] mb-1">
            Rock, Paper, Scissors
          </h1>
          <p className="text-[#65736F] text-sm font-medium">
            Challenge a friend to a First-to-5 match with 10-second move rounds.
          </p>
        </div>
        <RpsLobby userId={user.id} friends={friends} />
      </div>
    </div>
  );
}
