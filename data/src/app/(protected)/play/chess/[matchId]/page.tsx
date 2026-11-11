import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { AlertCircle, ShieldAlert, ArrowLeft } from "lucide-react";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { ChessMatchBoard } from "@/features/chess";
import { getCapturedPieces, getLegalMoves } from "@/features/chess/server";
import { ChessMatchState } from "@/features/chess/server";
import { Button } from "@/shared/ui";
import { UUID_RE } from "@/shared/lib/validation";

export const metadata: Metadata = {
  title: "Speed Chess — EVOAIQU",
  robots: { index: false },
};

interface Props {
  params: Promise<{ matchId: string }>;
}


export default async function ChessMatchPage({ params }: Props) {
  await connection();
  const { matchId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getServerUser();

  if (!user) {
    redirect(`/login?next=/play/chess/${matchId}`);
  }

  const renderError = (
    title: string,
    message: string,
    actionHref: string,
    actionLabel: string,
    isForbidden = false,
  ) => (
    <div className="evo-section py-12 md:py-20">
      <div className="evo-container max-w-lg">
        <div className="evo-card p-8 bg-[#101638] border border-[rgba(255,255,255,0.08)] text-center shadow-2xl space-y-4">
          <div
            className={`w-12 h-12 rounded-2xl ${
              isForbidden ? "bg-[rgba(255,83,112,0.15)] text-[#FF5370]" : "bg-[#070B25] text-[#8B98B5]"
            } border border-[rgba(255,255,255,0.08)] flex items-center justify-center mx-auto`}
          >
            {isForbidden ? <ShieldAlert className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-[#F5F7FF] mb-1.5">{title}</h1>
            <p className="text-[#B8C3E0] text-sm leading-relaxed">{message}</p>
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

  if (!matchId || !UUID_RE.test(matchId)) {
    return renderError(
      "Invalid Match ID",
      "The match identifier provided in the URL is not a valid format.",
      "/games",
      "Back to Game Arena",
    );
  }

  // Fetch chess match record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawChessData, error: matchError } = await (supabase as any)
    .from("chess_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (matchError || !rawChessData) {
    return renderError(
      "Chess Match Not Found",
      "This speed chess match does not exist, was cancelled, or has expired.",
      "/games",
      "Back to Game Arena",
    );
  }

  const chessMatch = rawChessData as ChessMatchState & { created_at: string };

  // Authorization: Participants only
  const isWhite = user.id === chessMatch.white_player_id;
  const isBlack = user.id === chessMatch.black_player_id;
  if (!isWhite && !isBlack) {
    return renderError(
      "Access Restricted",
      "Only the participants assigned to this speed chess match are authorized to enter.",
      "/games",
      "Back to Game Arena",
      true,
    );
  }

  // Fetch player profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProfiles } = await (supabase as any)
    .from("profiles")
    .select("id, display_name, evoora_id, avatar_url")
    .in("id", [chessMatch.white_player_id, chessMatch.black_player_id]);

  const profileList = (rawProfiles || []) as Array<{
    id: string;
    display_name: string | null;
    evoora_id: string | null;
    avatar_url: string | null;
  }>;
  const profileMap = new Map(profileList.map((p) => [p.id, p]));

  const whitePlayer = {
    id: chessMatch.white_player_id,
    display_name: profileMap.get(chessMatch.white_player_id)?.display_name || "White Player",
    evoora_id: profileMap.get(chessMatch.white_player_id)?.evoora_id || "EVO-WHITE",
    avatar_url: profileMap.get(chessMatch.white_player_id)?.avatar_url || null,
  };

  const blackPlayer = {
    id: chessMatch.black_player_id,
    display_name: profileMap.get(chessMatch.black_player_id)?.display_name || "Black Player",
    evoora_id: profileMap.get(chessMatch.black_player_id)?.evoora_id || "EVO-BLACK",
    avatar_url: profileMap.get(chessMatch.black_player_id)?.avatar_url || null,
  };

  // Calculate captured pieces
  const captured = getCapturedPieces(chessMatch.fen);

  // Calculate legal moves for active viewer
  const isMyTurn = (chessMatch.turn === "w" && isWhite) || (chessMatch.turn === "b" && isBlack);
  const isGameActive = chessMatch.game_status === "active" || chessMatch.game_status === "check";
  const legalMoves = isMyTurn && isGameActive ? getLegalMoves(chessMatch.fen) : [];

  return (
    <div className="min-h-screen bg-[#070B14] py-4 md:py-8 px-2 md:px-4 flex flex-col justify-center">
      <ChessMatchBoard
        initialMatch={{
          id: chessMatch.id,
          fen: chessMatch.fen,
          pgn: chessMatch.pgn,
          turn: chessMatch.turn,
          ply: chessMatch.ply,
          time_control_seconds: chessMatch.time_control_seconds,
          increment_seconds: chessMatch.increment_seconds,
          white_time_remaining_ms: chessMatch.white_time_remaining_ms,
          black_time_remaining_ms: chessMatch.black_time_remaining_ms,
          is_check: chessMatch.is_check,
          is_checkmate: chessMatch.is_checkmate,
          is_stalemate: chessMatch.is_stalemate,
          is_draw: chessMatch.is_draw,
          game_status: chessMatch.game_status,
          draw_offered_by: chessMatch.draw_offered_by,
          resigned_by: chessMatch.resigned_by,
          last_move_at: chessMatch.last_move_at,
          created_at: chessMatch.created_at,
        }}
        viewer={{
          userId: user.id,
          color: isWhite ? "w" : "b",
          isMyTurn,
        }}
        players={{
          white: whitePlayer,
          black: blackPlayer,
        }}
        initialLegalMoves={legalMoves}
        initialCaptured={captured}
      />
    </div>
  );
}
