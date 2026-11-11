import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InviteLandingClient } from "@/components/friends/InviteLandingClient";
import { Spinner } from "@/shared/ui";
import type { Profile } from "@/types/database";


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
    <div className="flex flex-col min-h-screen bg-[#070B25] text-[#F5F7FF] relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-radial from-[#315BFF]/15 via-[#8B2CFF]/10 to-transparent blur-3xl"
        aria-hidden="true"
      />

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
        <div className="flex-1 flex items-center justify-center min-h-screen bg-[#070B25] text-[#39DFFF]">
          <Spinner size="lg" className="text-[#39DFFF]" />
        </div>
      }
    >
      <InviteContent params={params} />
    </Suspense>
  );
}
