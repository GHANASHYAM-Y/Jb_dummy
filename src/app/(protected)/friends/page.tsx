import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FriendsClient } from "@/components/friends/FriendsClient";

export const metadata: Metadata = {
  title: "Find Friends — EVOAIQU",
  description: "Search players by display name or unique EVOAIQU ID, connect, and challenge.",
  robots: { index: false },
};

export default async function FriendsPage() {
  await connection();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/friends");

  return (
    <div className="py-6 sm:py-10">
      <div className="evo-container max-w-3xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#203331] mb-1.5">
            Find Friends
          </h1>
          <p className="text-[#65736F] text-sm sm:text-base">
            Search players by display name or unique EVOAIQU ID, connect, and challenge to dares.
          </p>
        </div>

        {/* Friend & Search system */}
        <FriendsClient userId={user.id} />
      </div>
    </div>
  );
}
