import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { RpsMatchBoard } from "@/features/rock-paper-scissors";

import Link from "next/link";
import { AlertCircle, ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui";
import { UUID_RE } from "@/shared/lib/validation";

export const metadata: Metadata = {
  title: "Match — EVOAIQU RPS",
  robots: { index: false },
};

interface Props {
  params: Promise<{ matchId: string }>;
}


export default async function RpsMatchPage({ params }: Props) {
  await connection();

  const { matchId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await getServerUser();
  if (!user) redirect(`/login?next=/play/rps/${matchId}`);

  const renderError = (title: string, message: string, actionHref: string, actionLabel: string, isForbidden = false) => (
    <div className="min-h-screen bg-[#070B25] text-[#F5F7FF] py-12 md:py-20 px-4 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="p-8 rounded-3xl bg-[#101638] border border-[#315BFF]/30 text-center shadow-[0_16px_48px_rgba(7,11,37,0.9)] space-y-4">
          <div className={`w-14 h-14 rounded-2xl ${isForbidden ? "bg-[#FF4B72]/20 text-[#FF4B72] border border-[#FF4B72]/40" : "bg-[#182352] text-[#39DFFF] border border-[#315BFF]/40"} flex items-center justify-center mx-auto shadow-md`}>
            {isForbidden ? <ShieldAlert className="h-7 w-7" /> : <AlertCircle className="h-7 w-7" />}
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-[#F5F7FF] mb-2">
              {title}
            </h1>
            <p className="text-[#9BA8D7] text-sm leading-relaxed">
              {message}
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link href={actionHref}>
              <Button variant="primary" size="md" className="bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] text-white font-bold">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                {actionLabel}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  if (!UUID_RE.test(matchId)) {
    return renderError(
      "Invalid Match ID",
      "The match identifier provided in the URL is not a valid format.",
      "/play/rps",
      "Back to RPS Lobby"
    );
  }

  // Load match record to verify participant and get player IDs for the board.
  const { data: rawMatchData, error: matchError } = await supabase
    .from("matches")
    .select("id, player1_id, player2_id, phase")
    .eq("id", matchId)
    .single();

  const matchData = rawMatchData as unknown as {
    id: string;
    player1_id: string;
    player2_id: string;
    phase: string;
  } | null;

  if (matchError || !matchData) {
    console.error("[play/rps/[matchId]] Match lookup failed:", { matchId, error: matchError?.message });
    return renderError(
      "Match Not Found",
      "This match does not exist, was cancelled, or has expired.",
      "/play/rps",
      "Back to RPS Lobby"
    );
  }

  if (matchData.player1_id !== user.id && matchData.player2_id !== user.id) {
    console.warn("[play/rps/[matchId]] Unauthorized participant attempt:", { matchId, userId: user.id });
    return renderError(
      "Access Restricted",
      "You are not an authorized player in this match.",
      "/games",
      "Browse All Games",
      true
    );
  }

  interface PlayerProfile {
    id: string;
    display_name: string;
    evoora_id: string;
    avatar_url: string | null;
  }

  // Load both player profiles for the board.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, evoora_id, avatar_url")
    .in("id", [matchData.player1_id, matchData.player2_id]);

  const profileList = (profiles ?? []) as unknown as PlayerProfile[];
  const profileMap = Object.fromEntries(
    profileList.map(p => [p.id, p] as [string, PlayerProfile])
  );
  const player1 = profileMap[matchData.player1_id];
  const player2 = profileMap[matchData.player2_id];
  if (!player1 || !player2) {
    console.error("[play/rps/[matchId]] Player profile missing:", { matchId });
    return renderError(
      "Match Unavailable",
      "Unable to retrieve profile information for the participants.",
      "/play/rps",
      "Back to RPS Lobby"
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#070B25] text-[#F5F7FF] py-6 sm:py-10 px-3 sm:px-6 relative overflow-hidden flex flex-col items-center">
      {/* Ambient background glow highlights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#315BFF]/15 via-[#8B2CFF]/10 to-transparent pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto relative z-10">
        <RpsMatchBoard
          matchId={matchId}
          userId={user.id}
          player1={{
            id: player1.id,
            display_name: player1.display_name,
            evoora_id: player1.evoora_id,
            avatar_url: player1.avatar_url,
          }}
          player2={{
            id: player2.id,
            display_name: player2.display_name,
            evoora_id: player2.evoora_id,
            avatar_url: player2.avatar_url,
          }}
        />
      </div>
    </div>
  );
}
