import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { loadHandCricketMatch, UUID_RE } from "@/features/hand-cricket/server";
import { HandCricketMatchBoard } from "@/features/hand-cricket";
import { Button } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Hand Cricket — EVOAIQU",
  robots: { index: false },
};

interface Props {
  params: Promise<{ matchId: string }>;
}

function MatchError({ title, message, forbidden = false }: { title: string; message: string; forbidden?: boolean }) {
  return (
    <div className="evo-section py-12 md:py-20">
      <div className="evo-container max-w-lg">
        <div className="evo-card p-8 bg-[#FFFFFF] border border-[rgba(30,27,36,0.08)] text-center shadow-2xl space-y-4">
          <div
            className={`w-12 h-12 rounded-2xl ${
              forbidden ? "bg-[rgba(229,72,77,0.15)] text-[#E5484D]" : "bg-[#FFF6EC] text-[#6E6878]"
            } border border-[rgba(30,27,36,0.08)] flex items-center justify-center mx-auto`}
          >
            {forbidden ? <ShieldAlert className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-[#1E1B24] mb-1.5">{title}</h1>
            <p className="text-[#6E6878] text-sm leading-relaxed">{message}</p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link href="/play/hand-cricket">
              <Button variant="primary" size="md">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Hand Cricket lobby
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HandCricketMatchPage({ params }: Props) {
  await connection();
  const { matchId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getServerUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/play/hand-cricket/${matchId}`)}`);
  }

  if (!matchId || !UUID_RE.test(matchId)) {
    return <MatchError title="Invalid match link" message="This hand cricket link isn't valid." />;
  }

  const loaded = await loadHandCricketMatch(supabase, matchId);

  if (!loaded.ok) {
    if (loaded.code === "forbidden") {
      return (
        <MatchError
          forbidden
          title="Access restricted"
          message="Only the two players in this hand cricket match can open it."
        />
      );
    }
    if (loaded.code === "not_found") {
      return (
        <MatchError
          title="Match not found"
          message="This hand cricket match doesn't exist or was removed."
        />
      );
    }
    return (
      <MatchError
        title="Couldn't load the match"
        message="Something went wrong loading this match. Please try again in a moment."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF6EC] py-4 md:py-8 px-3 md:px-4">
      <HandCricketMatchBoard
        matchId={matchId}
        viewerId={user.id}
        players={loaded.players}
        initialSnapshot={loaded.snapshot}
      />
    </div>
  );
}
