import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { AppNavigation } from "@/core/navigation/AppNavigation";
import type { Profile } from "@/core/supabase/database";

export const instant = false;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  let user: { id: string; email?: string } | null = null;
  let profile: Profile | null = null;
  let pendingChallenges = 0;
  let pendingRequests = 0;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await getServerUser();

    if (authUser) {
      user = { id: authUser.id, email: authUser.email };
      // Profile and both badge counts load in parallel: one round trip, not two
      const [profileRes, challengesRes, requestsRes] = await Promise.all([
        Promise.resolve(supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle())
          .catch(() => ({ data: null })),
        Promise.resolve(supabase
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .or(`winner_id.eq.${authUser.id},loser_id.eq.${authUser.id}`)
          .in("status", ["pending", "accepted", "submitted", "retry_requested"]))
          .catch(() => ({ count: null })),
        Promise.resolve(supabase
          .from("friend_requests")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", authUser.id)
          .eq("status", "pending"))
          .catch(() => ({ count: null })),
      ]);
      profile = (profileRes.data ?? null) as Profile | null;
      pendingChallenges = challengesRes.count ?? 0;
      pendingRequests = requestsRes.count ?? 0;
    }
  } catch (err) {
    // Graceful fallback for offline / mock testing environments
    console.warn("[ProtectedLayout] User session resolution fallback:", err);
  }

  return (
    <AppNavigation
      user={user}
      profile={profile}
      pendingChallenges={pendingChallenges}
      pendingRequests={pendingRequests}
    >
      {children}
    </AppNavigation>
  );
}
