import type { Metadata } from "next";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { GameSectionClient } from "@/components/games/GameSectionClient";
import type { Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Game — EVOAIQU",
  description:
    "Real-time social gaming arena: Rock Paper Scissors, Matchmaking, and Challenges.",
};

export const instant = false;

interface RecentMatchQueryItem {
  id: string;
  status: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  created_at: string;
  p1?: { display_name?: string; avatar_url?: string } | null;
  p2?: { display_name?: string; avatar_url?: string } | null;
}

export default async function GamesPage() {
  await connection();

  let user: { id: string; email?: string } | null = null;
  let profile: Profile | null = null;
  let recentMatches: RecentMatchQueryItem[] = [];
  let pendingChallengesCount = 0;
  let pendingRequestsCount = 0;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      user = { id: authUser.id, email: authUser.email };

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();
      profile = profileData as Profile | null;

      // Recent matches
      try {
        const { data: matches } = await supabase
          .from("rps_matches")
          .select(
            "id, status, player1_id, player2_id, player1_score, player2_score, winner_id, created_at, p1:profiles!rps_matches_player1_id_fkey(display_name, avatar_url), p2:profiles!rps_matches_player2_id_fkey(display_name, avatar_url)",
          )
          .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
          .order("created_at", { ascending: false })
          .limit(3);
        if (matches) recentMatches = matches as unknown as RecentMatchQueryItem[];
      } catch {
        // Fallback if rps_matches view/fkey differs
      }

      // Pending dares/challenges
      try {
        const { count } = await supabase
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .or(`winner_id.eq.${authUser.id},loser_id.eq.${authUser.id}`)
          .in("status", ["pending", "accepted", "submitted", "retry_requested"]);
        if (count) pendingChallengesCount = count;
      } catch {
        // Fallback
      }

      // Pending friend requests
      try {
        const { count } = await supabase
          .from("friend_requests")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", authUser.id)
          .eq("status", "pending");
        if (count) pendingRequestsCount = count;
      } catch {
        // Fallback
      }
    }
  } catch (err) {
    console.warn("[GamesPage] Session resolution fallback:", err);
  }

  return (
    <AppNavigation user={user} profile={profile}>
      <GameSectionClient
        user={user}
        profile={profile}
        recentMatches={recentMatches}
        pendingChallengesCount={pendingChallengesCount}
        pendingRequestsCount={pendingRequestsCount}
      />
    </AppNavigation>
  );
}
