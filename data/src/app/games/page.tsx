import type { Metadata } from "next";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { AppNavigation } from "@/core/navigation/AppNavigation";
import { GameSectionClient } from "@/core/home/GameSectionClient";
import type { Profile } from "@/core/supabase/database";

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
    } = await getServerUser();

    if (authUser) {
      user = { id: authUser.id, email: authUser.email };

      const profileQuery = supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      const matchesQuery = supabase
        .from("rps_matches")
        .select(
          "id, status, player1_id, player2_id, player1_score, player2_score, winner_id, created_at, p1:profiles!rps_matches_player1_id_fkey(display_name, avatar_url), p2:profiles!rps_matches_player2_id_fkey(display_name, avatar_url)",
        )
        .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
        .order("created_at", { ascending: false })
        .limit(3);

      const challengesCountQuery = supabase
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .or(`winner_id.eq.${authUser.id},loser_id.eq.${authUser.id}`)
        .in("status", ["pending", "accepted", "submitted", "retry_requested"]);

      const friendRequestsCountQuery = supabase
        .from("friend_requests")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", authUser.id)
        .eq("status", "pending");

      const [profileResult, matchesResult, challengesResult, requestsResult] =
        await Promise.all([
          Promise.resolve(profileQuery).catch((error: unknown) => {
            console.warn("[GamesPage] Profile query failed:", error);
            return { data: null };
          }),
          Promise.resolve(matchesQuery).catch((error: unknown) => {
            console.warn("[GamesPage] Recent matches query failed:", error);
            return { data: null };
          }),
          Promise.resolve(challengesCountQuery).catch((error: unknown) => {
            console.warn("[GamesPage] Pending challenges query failed:", error);
            return { count: null };
          }),
          Promise.resolve(friendRequestsCountQuery).catch((error: unknown) => {
            console.warn("[GamesPage] Pending friend requests query failed:", error);
            return { count: null };
          }),
        ]);

      profile = profileResult.data as Profile | null;
      if (matchesResult.data) {
        recentMatches = matchesResult.data as unknown as RecentMatchQueryItem[];
      }
      pendingChallengesCount = challengesResult.count ?? 0;
      pendingRequestsCount = requestsResult.count ?? 0;
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
