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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101638] border border-[rgba(57,223,255,0.25)] text-[11px] font-mono font-semibold tracking-wider text-[#39DFFF] uppercase mb-3">
            Dare Arena
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight mb-2">
            Challenges & Dares
          </h1>
          <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
            Win a match, pick a challenge. Lose a match, accept or submit your video dare!
          </p>
          <hr className="evo-divider mt-6" />
        </div>

        {/* Client challenges hub */}
        <ChallengesClient userId={user.id} />
      </div>
    </div>
  );
}
