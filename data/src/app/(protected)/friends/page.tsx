import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerUser } from "@/core/supabase/server";
import { FriendsClient } from "@/core/friends/FriendsClient";

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
    <div className="mx-auto w-full max-w-[968px] px-4 sm:px-7 py-6">
      {/* Header */}
      <div className="mb-5 animate-fade-in">
        <h1 className="font-display text-3xl sm:text-4xl text-[#1E1B24] mb-1">
          Find Friends
        </h1>
        <p className="text-[#6E6878] text-sm sm:text-base leading-relaxed">
          Search players by display name or unique EVOAIQU ID, connect, and challenge to duels &amp; dares.
        </p>
      </div>

      {/* Friend & Search system */}
      <FriendsClient userId={user.id} />
    </div>
  );
}
