import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RpsMatchBoard } from "@/components/rps/RpsMatchBoard";

import Link from "next/link";
import { AlertCircle, ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Match — EVOAIQU RPS",
  robots: { index: false },
};

interface Props {
  params: Promise<{ matchId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RpsMatchPage({ params }: Props) {
  await connection();

  const { matchId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/play/rps/${matchId}`);

  const renderError = (title: string, message: string, actionHref: string, actionLabel: string, isForbidden = false) => (
    <div className="evo-section py-12 md:py-20">
      <div className="evo-container max-w-lg">
        <div className="evo-card p-8 bg-white border border-[#E2E8E2] text-center shadow-card space-y-4">
          <div className={`w-12 h-12 rounded-2xl ${isForbidden ? "bg-[#FCE6DE] text-[#D95F49]" : "bg-[#EEF1ED] text-[#65736F]"} border border-[#E2E8E2] flex items-center justify-center mx-auto`}>
            {isForbidden ? <ShieldAlert className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-[#203331] mb-1.5">
              {title}
            </h1>
            <p className="text-[#65736F] text-sm leading-relaxed">
              {message}
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link href={actionHref}>
              <Button variant="primary" size="md">
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
    <div className="evo-section py-6 sm:py-10">
      <div className="evo-container max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#167D78] hover:text-[#115E5A] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit to Game Arena
          </Link>
          <span className="text-xs text-[#65736F] font-mono">Match #{matchId.slice(0, 8)}</span>
        </div>
        <div className="mb-6 animate-fade-in">
          <h1 className="font-display font-bold text-2xl text-[#203331] mb-1">
            Rock, Paper, Scissors
          </h1>
        </div>
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
