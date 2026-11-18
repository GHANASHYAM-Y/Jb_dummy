import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { RpsLobby } from "@/features/rock-paper-scissors";
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

  return <RpsLobby userId={user.id} friends={friends} />;
}
