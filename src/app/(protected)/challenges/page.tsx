import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ChallengesClient } from "@/components/challenges/ChallengesClient";

export const metadata: Metadata = {
  title: "Challenges & Dares — EVOAIQU",
  description: "View and respond to challenges assigned by friends in EVOAIQU.",
  robots: { index: false },
};

export default async function ChallengesPage() {
  // Opt out of static prerendering — requires an active auth session.
  await connection();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/challenges");

  return (
    <div className="evo-section py-6 sm:py-10">
      <div className="evo-container max-w-4xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display font-bold text-3xl text-[#203331] mb-1">
            Challenges & Dares
          </h1>
          <p className="text-[#65736F] text-sm font-medium">
            Win a match, pick a challenge. Lose a match, accept or submit your video dare!
          </p>
        </div>

        {/* Client challenges hub */}
        <ChallengesClient userId={user.id} />
      </div>
    </div>
  );
}
