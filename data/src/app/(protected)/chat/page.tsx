import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { ChatStoriesClient } from "@/features/dare-game";
import type { FriendEntry } from "@/core/supabase/database";

export const metadata: Metadata = {
  title: "Chat & Stories — EVOAIQU",
  description: "Connect with friends, chat, view 24-hour dare stories, and share match challenges.",
  robots: { index: false },
};

export default async function ChatPage() {
  await connection();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getServerUser();

  if (!user) {
    redirect("/login?next=/chat");
  }

  // Load friends list for direct messaging & story reels
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: friendsData } = await (supabase as any).rpc("get_friends");
  const friends: FriendEntry[] = friendsData ?? [];

  return (
    <div className="evo-section py-4 sm:py-6">
      <div className="evo-container max-w-6xl">
        <ChatStoriesClient userId={user.id} initialFriends={friends} />
      </div>
    </div>
  );
}
