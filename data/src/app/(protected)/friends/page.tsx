import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { FriendsClient } from "@/components/friends/FriendsClient";

export const metadata: Metadata = {
  title: "Find Friends — EVOAIQU",
  description: "Search players by display name or unique EVOAIQU ID, connect, and challenge.",
  robots: { index: false },
};

export default async function FriendsPage() {
  await connection();

  const {
    data: { user },
  } = await getServerUser();

  if (!user) redirect("/login?next=/friends");

  return (
    <div className="evo-section py-8 sm:py-12">
      <div className="evo-container max-w-3xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101638] border border-[rgba(57,223,255,0.25)] text-[11px] font-mono font-semibold tracking-wider text-[#39DFFF] uppercase mb-3">
            Social Network
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight mb-2">
            Find Friends
          </h1>
          <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
            Search players by display name or unique EVOAIQU ID, connect, and challenge to duels & dares.
          </p>
          <hr className="evo-divider mt-6" />
        </div>

        {/* Friend & Search system */}
        <FriendsClient userId={user.id} />
      </div>
    </div>
  );
}
