import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { RpsLobby } from "@/components/rps/RpsLobby";
import type { FriendEntry } from "@/core/supabase/database";

export const metadata: Metadata = {
  title: "Rock, Paper, Scissors — EVOAIQU",
  description: "Challenge a friend to a First-to-5 Rock, Paper, Scissors match.",
  robots: { index: false },
};

export default async function RpsPage() {
  await connection();

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await getServerUser();
  if (!user) redirect("/login?next=/play/rps");

  // Fetch accepted friends for the challenge list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: friendsData } = await (supabase as any).rpc("get_friends");
  const friends: FriendEntry[] = friendsData ?? [];

  return (
    <div className="py-8 sm:py-14 text-[#F5F7FF]">
      <div className="evo-container max-w-2xl px-4 space-y-6">
        <div className="animate-fade-in space-y-2">
          <span className="inline-block px-3.5 py-1 rounded-full bg-[#39DFFF]/15 border border-[#39DFFF]/30 text-[#39DFFF] text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(57,223,255,0.2)]">
            Synchronous 1v1 Arena
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight">
            Rock, Paper, Scissors
          </h1>
          <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
            Challenge a friend to a First-to-5 match with 10-second move rounds.
          </p>
        </div>

        <hr className="border-t border-[#1C2758] opacity-60" />

        <RpsLobby userId={user.id} friends={friends} />
      </div>
    </div>
  );
}
