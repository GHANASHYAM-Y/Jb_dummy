import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { Navbar } from "@/core/navigation/Navbar";
import { Footer } from "@/core/navigation/Footer";
import { InviteLandingClient } from "@/core/friends/InviteLandingClient";
import { Spinner } from "@/shared/ui";
import type { Profile } from "@/core/supabase/database";


interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Connect on EVOAIQU",
    description: "Accept invitation to connect and play games on EVOAIQU.",
    robots: { index: false },
  };
}

async function InviteContent({ params }: PageProps) {
  await connection();
  const { token } = await params;

  let initialData: {
    ok: boolean;
    code?: string;
    message?: string;
    relationship?: string;
    inviter?: { display_name: string; avatar_url: string | null; evoora_id: string };
  } = {
    ok: false,
    code: "invalid_token",
    message: "Invalid invitation token.",
  };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await getServerUser();

  let currentProfile: Profile | null = null;

  try {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      currentProfile = profile as Profile | null;
    }

    // Resolve invite token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: resolveResult, error } = await (supabase as any).rpc("resolve_friend_invite", {
      p_token: token.trim().toLowerCase(),
    });

    if (!error && resolveResult) {
      initialData = resolveResult;
    }
  } catch (err) {
    console.error("[InvitePage] Resolution error:", err);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF6EC] text-[#1E1B24] relative overflow-hidden">
      {/* Decorative sticker blobs */}
      <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 rounded-full bg-[#8C7BFF]/20" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-24 -right-12 w-44 h-44 rounded-full bg-[#FFC23D]/30" aria-hidden="true" />

      <Navbar
        user={user}
        profile={currentProfile ?? undefined}
      />

      <main className="flex-1 flex items-center justify-center py-16 px-4 relative z-10">
        <InviteLandingClient
          token={token}
          initialData={initialData}
          isAuthenticated={Boolean(user)}
        />
      </main>

      <Footer />
    </div>
  );
}

export default function InvitePage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-screen bg-[#FFF6EC] text-[#FF5A3C]">
          <Spinner size="lg" className="text-[#FF5A3C]" />
        </div>
      }
    >
      <InviteContent params={params} />
    </Suspense>
  );
}
