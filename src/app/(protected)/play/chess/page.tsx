import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ChessLobby } from "@/components/chess/ChessLobby";
import type { FriendEntry } from "@/types/database";

export const metadata: Metadata = {
  title: "Speed Chess — EVOAIQU",
  description: "Play authoritative FIDE Speed Chess with real-time clocks and post-game Dares.",
  robots: { index: false },
};

export default async function ChessLobbyPage() {
  await connection();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/play/chess");
  }

  // 1. Fetch accepted friends
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: friendsData } = await (supabase as any).rpc("get_friends");
  const friends: FriendEntry[] = friendsData ?? [];

  // 2. Fetch active chess matches for current user (recovery / reconnect support)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeChessMatches } = await (supabase as any)
    .from("chess_matches")
    .select(`
      id,
      white_player_id,
      black_player_id,
      turn,
      game_status,
      time_control_seconds
    `)
    .in("game_status", ["active", "check"])
    .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
    .order("last_move_at", { ascending: false })
    .limit(4);

  // 3. Resolve opponent names for active matches
  const opponentIds = new Set<string>();
  (activeChessMatches || []).forEach((m: { white_player_id: string; black_player_id: string }) => {
    const oppId = m.white_player_id === user.id ? m.black_player_id : m.white_player_id;
    opponentIds.add(oppId);
  });

  const profileMap = new Map<string, string>();
  if (opponentIds.size > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: oppProfiles } = await (supabase as any)
      .from("profiles")
      .select("id, display_name")
      .in("id", Array.from(opponentIds));

    (oppProfiles || []).forEach((p: { id: string; display_name: string | null }) => {
      profileMap.set(p.id, p.display_name || "Opponent");
    });
  }

  const activeMatchesFormatted = (activeChessMatches || []).map((m: {
    id: string;
    white_player_id: string;
    black_player_id: string;
    turn: "w" | "b";
    game_status: string;
    time_control_seconds: number;
  }) => {
    const isWhite = m.white_player_id === user.id;
    const oppId = isWhite ? m.black_player_id : m.white_player_id;
    const isMyTurn = (m.turn === "w" && isWhite) || (m.turn === "b" && !isWhite);

    return {
      id: m.id,
      opponent_name: profileMap.get(oppId) || "Opponent",
      turn: m.turn,
      is_my_turn: isMyTurn,
      game_status: m.game_status,
      time_control_seconds: m.time_control_seconds,
    };
  });

  return (
    <div className="evo-section py-6 sm:py-10">
      <div className="evo-container max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display font-black text-3xl text-[#203331] mb-1">
            Speed Chess Arena
          </h1>
          <p className="text-[#65736F] text-sm font-medium">
            Server-authoritative FIDE rules, timed blitz clocks, and post-game Dares for the vanquished.
          </p>
        </div>

        <ChessLobby
          userId={user.id}
          friends={friends}
          activeMatches={activeMatchesFormatted}
        />
      </div>
    </div>
  );
}
