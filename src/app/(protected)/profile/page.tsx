import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProfileViewClient } from "@/components/profile/ProfileViewClient";
import type { Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Profile — EVOAIQU",
  description: "View and manage your EVOAIQU profile, game statistics, and achievements.",
  robots: { index: false },
};

export default async function ProfilePage() {
  await connection();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/profile");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as Profile | null;

  // Real profile statistics
  let totalMatches = 0;
  let wins = 0;
  let friendsCount = 0;
  let daresCount = 0;

  try {
    const { count: matchesCount } = await supabase
      .from("rps_matches")
      .select("id", { count: "exact", head: true })
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`);
    if (matchesCount) totalMatches = matchesCount;

    const { count: winsCount } = await supabase
      .from("rps_matches")
      .select("id", { count: "exact", head: true })
      .eq("winner_id", user.id);
    if (winsCount) wins = winsCount;

    const { count: frCount } = await supabase
      .from("friend_requests")
      .select("id", { count: "exact", head: true })
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "accepted");
    if (frCount) friendsCount = frCount;

    const { count: dCount } = await supabase
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .or(`winner_id.eq.${user.id},loser_id.eq.${user.id}`)
      .eq("status", "completed");
    if (dCount) daresCount = dCount;
  } catch (err) {
    console.warn("[ProfilePage] Stats query fallback:", err);
  }

  const losses = Math.max(0, totalMatches - wins);
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  if (!profile) {
    return (
      <div className="py-16 evo-container max-w-xl text-center">
        <div className="p-8 rounded-2xl bg-[#101638] border border-[rgba(255,255,255,0.08)] shadow-[0_0_24px_rgba(0,0,0,0.3)]">
          <h1 className="font-display font-bold text-2xl text-[#F5F7FF] mb-2">
            Profile Setup Required
          </h1>
          <p className="text-[#B8C3E0] text-sm">
            Your profile record is being initialized. Please refresh in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 min-h-[calc(100vh-5rem)]">
      <div className="evo-container">
        <ProfileViewClient
          user={{ id: user.id, email: user.email }}
          profile={profile}
          stats={{
            totalMatches,
            wins,
            losses,
            winRate,
            friendsCount,
            daresCount,
          }}
        />
      </div>
    </div>
  );
}
