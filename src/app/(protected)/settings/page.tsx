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
    <div className="evo-section py-6 sm:py-10">
      <div className="evo-container max-w-2xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display font-bold text-3xl text-[#203331] mb-1">Settings</h1>
          <p className="text-[#65736F]">Manage your account and preferences.</p>
        </div>

          <div className="space-y-6">
            {/* Profile section shortcut */}
            {profile && (
              <section className="animate-slide-up" aria-labelledby="profile-settings-heading">
                <div className="flex items-center gap-2 mb-4">
                  <UserCircle className="h-4 w-4 text-[#167D78]" />
                  <h2 id="profile-settings-heading" className="font-bold text-[#203331]">
                    Profile
                  </h2>
                </div>
                <ProfileEditForm profile={profile} />
              </section>
            )}

            {!profile && (
              <div className="evo-card p-5 border-[rgba(217,95,73,0.3)] bg-[#FCE6DE]">
                <p className="text-[#D95F49] font-bold mb-1">Profile not available</p>
                <p className="text-[#65736F] text-sm">
                  Apply the database migration to enable profile settings.
                </p>
              </div>
            )}

            {/* Security section */}
            <section className="animate-slide-up" style={{ animationDelay: "80ms" }} aria-labelledby="security-settings-heading">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-[#167D78]" />
                <h2 id="security-settings-heading" className="font-bold text-[#203331]">
                  Security
                </h2>
              </div>
              <div className="evo-card p-5 space-y-3 bg-white border border-[#E2E8E2] shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#203331] text-sm font-semibold">Email address</p>
                    <p className="text-[#65736F] text-xs mt-0.5">{user.email}</p>
                  </div>
                </div>
                <div className="border-t border-[#E2E8E2] pt-3">
                  <p className="text-[#203331] text-sm font-semibold mb-0.5">Password</p>
                  <p className="text-[#65736F] text-xs mb-2">
                    To change your password, use the forgot password flow.
                  </p>
                  <Link
                    href="/login"
                    className="text-[#167D78] text-sm font-semibold hover:underline"
                  >
                    Send password reset email →
                  </Link>
                </div>
              </div>
            </section>

            {/* Danger zone */}
            <section className="animate-slide-up" style={{ animationDelay: "160ms" }} aria-labelledby="danger-zone-heading">
              <h2 id="danger-zone-heading" className="font-bold text-[#D95F49] mb-4 flex items-center gap-2">
                ⚠️ Danger Zone
              </h2>
              <DeleteAccountSection />
            </section>
          </div>
        </div>
    </div>
  );
}
