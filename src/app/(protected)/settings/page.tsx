import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { Shield, UserCircle } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your EVOAIQU account settings.",
  robots: { index: false },
};

export default async function SettingsPage() {
  await connection();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/settings");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as Profile | null;

  return (
    <div className="py-8 sm:py-12 min-h-[calc(100vh-5rem)]">
      <div className="evo-container max-w-3xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight mb-2">
            Settings
          </h1>
          <p className="text-[#B8C3E0] text-base leading-relaxed">
            Manage your account security and preferences.
          </p>
        </div>

        <div className="space-y-8">
          {/* Profile section shortcut */}
          {profile && (
            <section className="animate-slide-up" aria-labelledby="profile-settings-heading">
              <div className="flex items-center gap-2.5 mb-4">
                <UserCircle className="h-5 w-5 text-[#39DFFF]" />
                <h2 id="profile-settings-heading" className="font-display font-bold text-xl text-[#F5F7FF]">
                  Profile
                </h2>
              </div>
              <ProfileEditForm profile={profile} />
            </section>
          )}

          {!profile && (
            <div className="rounded-2xl p-6 border border-[rgba(255,83,112,0.3)] bg-[#101638]">
              <p className="text-[#FF5370] font-bold mb-1">Profile not available</p>
              <p className="text-[#B8C3E0] text-sm">
                Apply the database migration to enable profile settings.
              </p>
            </div>
          )}

          <hr className="evo-divider my-8" />

          {/* Security section */}
          <section className="animate-slide-up" style={{ animationDelay: "80ms" }} aria-labelledby="security-settings-heading">
            <div className="flex items-center gap-2.5 mb-4">
              <Shield className="h-5 w-5 text-[#39DFFF]" />
              <h2 id="security-settings-heading" className="font-display font-bold text-xl text-[#F5F7FF]">
                Security
              </h2>
            </div>
            <div className="rounded-2xl p-6 space-y-4 bg-[#101638] border border-[rgba(255,255,255,0.08)] shadow-[0_0_24px_rgba(0,0,0,0.25)]">
              <div>
                <p className="text-[#F5F7FF] text-sm font-semibold">Email address</p>
                <p className="text-[#B8C3E0] font-mono text-sm mt-1">{user.email}</p>
              </div>
              <hr className="evo-divider my-2" />
              <div>
                <p className="text-[#F5F7FF] text-sm font-semibold mb-1">Password</p>
                <p className="text-[#B8C3E0] text-xs mb-3 leading-relaxed">
                  To change your password, send a recovery link to your registered email address.
                </p>
                <Link
                  href="/auth/reset-password"
                  className="text-[#39DFFF] hover:text-[#5B7BFF] transition-colors text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  Send password reset email →
                </Link>
              </div>
            </div>
          </section>

          <hr className="evo-divider my-8" />

          {/* Danger zone */}
          <section className="animate-slide-up" style={{ animationDelay: "160ms" }} aria-labelledby="danger-zone-heading">
            <h2 id="danger-zone-heading" className="font-display font-bold text-xl text-[#FF5370] mb-4 flex items-center gap-2">
              ⚠️ Danger Zone
            </h2>
            <DeleteAccountSection />
          </section>
        </div>
      </div>
    </div>
  );
}
