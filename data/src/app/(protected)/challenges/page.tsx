import type { Metadata } from "next";
import Link from "next/link";
import { Flame, LogIn } from "lucide-react";
import { connection } from "next/server";
import { getServerUser } from "@/core/supabase/server";
import { ChallengesClient } from "@/features/dare-game";
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
      <div className="mx-auto w-full max-w-[560px] px-4 sm:px-7 py-10 sm:py-16">
        <div className="b-card !p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FFC23D] border-2 border-[#E9A912] flex items-center justify-center text-[#1E1B24] -rotate-6">
            <Flame className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="font-display font-bold text-3xl text-[#1E1B24]">Challenges & Dares</h1>
          <p className="text-sm text-[#6E6878] leading-relaxed">
            Win a match and you pick a dare for the loser. Lose one and you record your dare on video.
            Sign in to see the challenges you have sent and received.
          </p>
          <Link href="/login?next=/challenges" className="inline-block">
            <Button variant="primary" size="lg" className="font-bold">
              <LogIn className="w-4 h-4 mr-2" />
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 sm:px-7 py-6">
      {/* Header */}
      <div className="mb-5 animate-fade-in">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1E1B24] tracking-tight mb-1">
          Challenges & Dares
        </h1>
        <p className="text-[#6E6878] text-sm sm:text-base leading-relaxed">
          Win a match, pick a challenge. Lose a match, accept or submit your video dare!
        </p>
      </div>

      {/* Client challenges hub */}
      <ChallengesClient userId={user.id} />
    </div>
  );
}
