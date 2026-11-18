import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { UUID_RE, loadDrawRoom } from "@/features/draw-guess/server";
import { DrawGuessBoard } from "@/features/draw-guess";
import { Button } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Draw & Guess — EVOAIQU",
  robots: { index: false },
};

interface Props {
  params: Promise<{ roomId: string }>;
}

function RoomError({ title, message, forbidden = false }: { title: string; message: string; forbidden?: boolean }) {
  return (
    <div className="evo-section py-12 md:py-20">
      <div className="evo-container max-w-lg">
        <div className="b-card p-8 text-center space-y-4">
          <div
            className={`w-12 h-12 rounded-2xl ${
              forbidden ? "bg-[rgba(229,72,77,0.15)] text-[#E5484D]" : "bg-[#FFF6EC] text-[#6E6878]"
            } border-2 border-[#EADBC8] flex items-center justify-center mx-auto`}
          >
            {forbidden ? <ShieldAlert className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-[#1E1B24] mb-1.5">{title}</h1>
            <p className="text-[#6E6878] text-sm leading-relaxed">{message}</p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link href="/play/draw-guess">
              <Button variant="primary" size="md">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Draw &amp; Guess lobby
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DrawGuessRoomPage({ params }: Props) {
  await connection();
  const { roomId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getServerUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/play/draw-guess/${roomId}`)}`);
  }

  if (!roomId || !UUID_RE.test(roomId)) {
    return <RoomError title="Invalid room link" message="This Draw & Guess link isn't valid." />;
  }

  const loaded = await loadDrawRoom(supabase, roomId);

  if (!loaded.ok) {
    if (loaded.code === "forbidden") {
      return <RoomError forbidden title="Access restricted" message="Only the two players in this room can open it. Ask your friend for the room code instead." />;
    }
    if (loaded.code === "not_found") {
      return <RoomError title="Room not found" message="This room doesn't exist or has been cleaned up." />;
    }
    return <RoomError title="Couldn't load the room" message="Something went wrong loading this room. Please try again in a moment." />;
  }

  return (
    <div className="min-h-screen bg-[#FFF6EC] py-4 md:py-8 px-3 md:px-4">
      <DrawGuessBoard roomId={roomId} viewerId={user.id} players={loaded.players} initialSnapshot={loaded.snapshot} />
    </div>
  );
}
