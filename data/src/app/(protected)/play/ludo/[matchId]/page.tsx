import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase/server";
import { loadLudoMatch, UUID_RE } from "@/lib/ludo/server";
import { LudoMatchBoard } from "@/components/ludo/LudoMatchBoard";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Ludo — EVOAIQU",
  robots: { index: false },
};

interface Props {
  params: Promise<{ matchId: string }>;
}

function MatchError({ title, message, forbidden = false }: { title: string; message: string; forbidden?: boolean }) {
  return (
    <div className="evo-section py-12 md:py-20">
      <div className="evo-container max-w-lg">
        <div className="evo-card p-8 bg-[#101638] border border-[rgba(255,255,255,0.08)] text-center shadow-2xl space-y-4">
          <div
            className={`w-12 h-12 rounded-2xl ${
              forbidden ? "bg-[rgba(255,83,112,0.15)] text-[#FF5370]" : "bg-[#070B25] text-[#8B98B5]"
            } border border-[rgba(255,255,255,0.08)] flex items-center justify-center mx-auto`}
          >
            {forbidden ? <ShieldAlert className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-[#F5F7FF] mb-1.5">{title}</h1>
            <p className="text-[#B8C3E0] text-sm leading-relaxed">{message}</p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link href="/play/ludo">
              <Button variant="primary" size="md">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Ludo lobby
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LudoMatchPage({ params }: Props) {
  await connection();
  const { matchId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getServerUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/play/ludo/${matchId}`)}`);
  }

  if (!matchId || !UUID_RE.test(matchId)) {
    return <MatchError title="Invalid game link" message="This Ludo link isn't valid." />;
  }

  const loaded = await loadLudoMatch(supabase, matchId);

  if (!loaded.ok) {
    if (loaded.code === "forbidden") {
      return <MatchError forbidden title="Access restricted" message="Only the two players in this Ludo game can open it." />;
    }
    if (loaded.code === "not_found") {
      return <MatchError title="Game not found" message="This Ludo game doesn't exist or was removed." />;
    }
    return (
      <MatchError title="Couldn't load the game" message="Something went wrong loading this game. Please try again in a moment." />
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] py-4 md:py-8 px-3 md:px-4">
      <LudoMatchBoard matchId={matchId} viewerId={user.id} players={loaded.players} initialSnapshot={loaded.snapshot} />
    </div>
  );
}
