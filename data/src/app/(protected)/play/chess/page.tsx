import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { ChessLobby } from "@/features/chess/components/ChessLobby";
import type { FriendEntry } from "@/core/supabase/database";

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
  } = await getServerUser();

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
    <div className="evo-section py-8 sm:py-12">
      <div className="evo-container max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101638] border border-[rgba(57,223,255,0.25)] text-[11px] font-mono font-semibold tracking-wider text-[#39DFFF] uppercase mb-3">
            Strategy Arena
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight mb-2">
            Speed Chess Arena
          </h1>
          <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
            Server-authoritative FIDE rules, timed blitz clocks, and post-game Dares for the vanquished.
          </p>
          <hr className="evo-divider mt-6" />
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
