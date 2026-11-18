import type { Metadata } from "next";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { DrawGuessLobby } from "@/features/draw-guess";
import type { DrawOpenRoom } from "@/features/draw-guess";

export const metadata: Metadata = {
  title: "Draw & Guess — EVOAIQU",
  description: "Sketch the secret word and let your friend guess it before the clock runs out.",
  robots: { index: false },
};

interface RoomRow {
  id: string;
  code: string;
  status: DrawOpenRoom["status"];
  host_id: string;
  guest_id: string | null;
}

/** Draw & Guess lobby: create a room, join with a code, or reopen a room you are in. */
export default async function DrawGuessLobbyPage() {
  await connection();

  let userId: string | null = null;
  let openRooms: DrawOpenRoom[] = [];

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await getServerUser();

    if (user) {
      userId = user.id;
      // The draw tables are not in the generated Database type yet, and the room
      // table is unreadable by clients (it holds the secret word), so the lobby
      // list comes from the room-state RPC for rooms the player already knows.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data } = await db.rpc("draw_list_my_rooms");
      const rows = (data ?? []) as RoomRow[];

      if (rows.length > 0) {
        const opponentIds = Array.from(
          new Set(rows.map((r) => (r.host_id === user.id ? r.guest_id : r.host_id)).filter((id): id is string => Boolean(id))),
        );
        const { data: profileRows } = opponentIds.length
          ? await db.from("profiles").select("id, display_name").in("id", opponentIds)
          : { data: [] };
        const names = new Map<string, string>(
          ((profileRows ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name || "Friend"]),
        );
        openRooms = rows.map((r) => {
          const opponentId = r.host_id === user.id ? r.guest_id : r.host_id;
          return {
            id: r.id,
            code: r.code,
            status: r.status,
            opponent_name: opponentId ? (names.get(opponentId) ?? "Friend") : null,
            created_by_me: r.host_id === user.id,
          };
        });
      }
    }
  } catch (err) {
    console.warn("[DrawGuessLobbyPage] Falling back to guest view:", err);
  }

  return <DrawGuessLobby userId={userId} openRooms={openRooms} />;
}
