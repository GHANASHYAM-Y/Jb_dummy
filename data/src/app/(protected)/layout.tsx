import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase/server";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import type { Profile } from "@/types/database";

export const instant = false;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  let user: { id: string; email?: string } | null = null;
  let profile: Profile | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await getServerUser();

    if (authUser) {
      user = { id: authUser.id, email: authUser.email };
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();
      profile = data as Profile | null;
    }
  } catch (err) {
    // Graceful fallback for offline / mock testing environments
    console.warn("[ProtectedLayout] User session resolution fallback:", err);
  }

  return (
    <AppNavigation user={user} profile={profile}>
      {children}
    </AppNavigation>
  );
}
