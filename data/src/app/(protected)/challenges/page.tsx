import type { Metadata } from "next";
import Link from "next/link";
import { Flame, LogIn } from "lucide-react";
import { connection } from "next/server";
import { getServerUser } from "@/core/supabase/server";
import { ChallengesClient } from "@/components/challenges/ChallengesClient";
import { Button } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Challenges & Dares — EVOAIQU",
  description: "View and respond to challenges assigned by friends in EVOAIQU.",
  robots: { index: false },
};

export default async function ChallengesPage() {
  // Opt out of static prerendering — requires an active auth session.
  await connection();

  const {
    data: { user },
  } = await getServerUser();

  // /challenges is a public route: show guests what it is instead of bouncing
  // them to /login (that redirect cost a second full page load per click).
  if (!user) {
    return (
      <div className="evo-section py-10 sm:py-16">
        <div className="evo-container max-w-lg">
          <div className="rounded-3xl border border-[rgba(255,83,112,0.3)] bg-[#101638] p-8 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[rgba(255,83,112,0.15)] border border-[#FF5370]/30 flex items-center justify-center text-[#FF5370]">
              <Flame className="w-7 h-7" aria-hidden="true" />
            </div>
            <h1 className="font-display font-black text-2xl text-[#F5F7FF]">Challenges & Dares</h1>
            <p className="text-sm text-[#B8C3E0] leading-relaxed">
              Win a match and you pick a dare for the loser. Lose one and you record your dare on video.
              Sign in to see the challenges you have sent and received.
            </p>
            <Link href="/login?next=/challenges" className="inline-block">
              <Button variant="primary" size="md" className="font-bold">
                <LogIn className="w-4 h-4 mr-2" />
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
