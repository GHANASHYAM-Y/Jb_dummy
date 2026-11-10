import type { Metadata } from "next";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase/server";
import { LudoLobby } from "@/components/ludo/LudoLobby";
import type { FriendEntry, MatchPhase } from "@/types/database";
import type { LudoOpenMatch } from "@/lib/ludo/types";

export const metadata: Metadata = {
  title: "Ludo — EVOAIQU",
  description: "Classic Ludo against bots or a friend, with a dare for the loser.",
  robots: { index: false },
};

interface OpenMatchRow {
  id: string;
  phase: MatchPhase;
  player1_id: string;
  player2_id: string;
  created_at: string;
}

/**
 * Ludo lobby. Public: guests can reach bot games from here; signed-in
 * players also see their open games and can challenge friends.
 */
export default async function LudoLobbyPage() {
  await connection();

  let userId: string | null = null;
  let friends: FriendEntry[] = [];
  let openMatches: LudoOpenMatch[] = [];

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await getServerUser();

    if (user) {
      userId = user.id;
      // Ludo tables are not in the generated Database type yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      const [friendsResult, matchesResult] = await Promise.all([
        db.rpc("get_friends"),
        db
          .from("matches")
          .select("id, phase, player1_id, player2_id, created_at")
          .eq("game_type", "ludo")
          .in("phase", ["waiting", "active", "reconnecting"])
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      friends = (friendsResult.data ?? []) as FriendEntry[];
      const rows = (matchesResult.data ?? []) as OpenMatchRow[];

      if (rows.length > 0) {
        const opponentIds = Array.from(
          new Set(rows.map((r) => (r.player1_id === user.id ? r.player2_id : r.player1_id))),
        );

        const [gamesResult, profilesResult] = await Promise.all([
          db
            .from("ludo_matches")
            .select("id, player1_joined, player2_joined")
            .in(
              "id",
              rows.map((r) => r.id),
            ),
          db.from("profiles").select("id, display_name, avatar_url").in("id", opponentIds),
        ]);

        const joined = new Map<string, { player1_joined: boolean; player2_joined: boolean }>(
          ((gamesResult.data ?? []) as Array<{ id: string; player1_joined: boolean; player2_joined: boolean }>).map(
            (g) => [g.id, g],
          ),
        );
        const profiles = new Map<string, { display_name: string | null; avatar_url: string | null }>(
          ((profilesResult.data ?? []) as Array<{ id: string; display_name: string | null; avatar_url: string | null }>).map(
            (p) => [p.id, p],
          ),
        );

        openMatches = rows.map((r) => {
          const iAmP1 = r.player1_id === user.id;
          const opponentId = iAmP1 ? r.player2_id : r.player1_id;
          const flags = joined.get(r.id);
          return {
            id: r.id,
            phase: r.phase,
            opponent_id: opponentId,
            opponent_name: profiles.get(opponentId)?.display_name || "Friend",
            opponent_avatar: profiles.get(opponentId)?.avatar_url ?? null,
            created_by_me: iAmP1,
            i_joined: Boolean(iAmP1 ? flags?.player1_joined : flags?.player2_joined),
            opponent_joined: Boolean(iAmP1 ? flags?.player2_joined : flags?.player1_joined),
            created_at: r.created_at,
          };
        });
      }
    }
  } catch (err) {
    // No Supabase / no session: show the guest lobby (bot games still work)
    console.warn("[LudoLobbyPage] Falling back to guest view:", err);
  }

  return (
    <div className="evo-section py-8 sm:py-12">
      <div className="evo-container max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101638] border border-[rgba(57,223,255,0.25)] text-[11px] font-mono font-semibold tracking-wider text-[#39DFFF] uppercase mb-3">
            Board Arena
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight mb-2">Ludo</h1>
          <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
            Roll, race your four tokens round the board and get them home first. Capture anyone who gets in the way.
          </p>
          <hr className="evo-divider mt-6" />
        </div>

        <LudoLobby userId={userId} friends={friends} openMatches={openMatches} />
      </div>
    </div>
  );
}
