import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient, getServerUser } from "@/core/supabase/server";
import { DeleteAccountSection } from "@/core/settings/DeleteAccountSection";
import { SignOutRow } from "@/core/settings/SignOutRow";
import { ProfileEditForm } from "@/core/profile/ProfileEditForm";
import { ChevronRight, KeyRound, Mail, Pencil, UserX } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/core/supabase/database";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your EVOAIQU account settings.",
  robots: { index: false },
};

const rowCls =
  "flex items-center gap-3.5 w-full min-h-[64px] p-3.5 rounded-[22px] border-2 border-[#EADBC8] bg-white text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] cursor-pointer";
const iconCls = "w-11 h-11 rounded-full flex items-center justify-center shrink-0";

export default async function SettingsPage() {
  await connection();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await getServerUser();

  if (!user) redirect("/login?next=/settings");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as Profile | null;

  return (
    <div className="px-4 sm:px-7 py-6 min-h-[calc(100vh-5rem)]">
      <div className="max-w-[860px] mx-auto">
        <div className="mb-6 animate-fade-in">
          <h1 className="font-display font-semibold text-[32px] leading-tight text-[#1E1B24] mb-1">
            Settings
          </h1>
          <p className="text-[#6E6878] text-base leading-relaxed">
            Manage your account security and preferences.
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <section className="animate-slide-up space-y-3" aria-labelledby="profile-settings-heading">
            <h2 id="profile-settings-heading" className="font-display font-semibold text-xl text-[#1E1B24] px-1">
              Profile
            </h2>
            {profile ? (
              <details className="group">
                <summary className={`${rowCls} list-none [&::-webkit-details-marker]:hidden`}>
                  <span className={`${iconCls} bg-[#FFE4DD] text-[#C9381F]`}>
                    <Pencil className="h-5 w-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-[#1E1B24]">Edit profile</span>
                    <span className="block text-xs text-[#6E6878]">Name, bio, language and visibility</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-[#8E8798] transition-transform group-open:rotate-90" />
                </summary>
                <div className="b-card mt-3">
                  <ProfileEditForm profile={profile} />
                </div>
              </details>
            ) : (
              <div className="b-card !border-[#F6C9CB]">
                <p className="text-[#E5484D] font-bold mb-1">Profile not available</p>
                <p className="text-[#6E6878] text-sm">
                  Apply the database migration to enable profile settings.
                </p>
              </div>
            )}

            <Link href="/friends" className={rowCls}>
              <span className={`${iconCls} bg-[#FFF1CC] text-[#8A5F00]`}>
                <UserX className="h-5 w-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-[#1E1B24]">Blocked players</span>
                <span className="block text-xs text-[#6E6878]">View and unblock users you have blocked</span>
              </span>
              <ChevronRight className="h-5 w-5 text-[#8E8798]" />
            </Link>
          </section>

          {/* Security */}
          <section className="animate-slide-up space-y-3" style={{ animationDelay: "80ms" }} aria-labelledby="security-settings-heading">
            <h2 id="security-settings-heading" className="font-display font-semibold text-xl text-[#1E1B24] px-1">
              Security
            </h2>
            <div className={`${rowCls} cursor-default hover:translate-y-0`}>
              <span className={`${iconCls} bg-[#E3FAF3] text-[#0B7D63]`}>
                <Mail className="h-5 w-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-[#1E1B24]">Email address</span>
                <span className="block font-mono text-xs text-[#6E6878] truncate">{user.email}</span>
              </span>
            </div>
            <Link href="/auth/reset-password" className={rowCls}>
              <span className={`${iconCls} bg-[#EEEBFF] text-[#4B3FC4]`}>
                <KeyRound className="h-5 w-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-[#1E1B24]">Password</span>
                <span className="block text-xs text-[#6E6878]">
                  Send a recovery link to your registered email address
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-[#8E8798]" />
            </Link>
            <SignOutRow className={rowCls} />
          </section>

          {/* Danger zone */}
          <section className="animate-slide-up" style={{ animationDelay: "160ms" }} aria-labelledby="danger-zone-heading">
            <h2 id="danger-zone-heading" className="font-display font-semibold text-xl text-[#E5484D] mb-3 px-1 flex items-center gap-2">
              ⚠️ Danger Zone
            </h2>
            <DeleteAccountSection />
          </section>
        </div>
      </div>
    </div>
  );
}
