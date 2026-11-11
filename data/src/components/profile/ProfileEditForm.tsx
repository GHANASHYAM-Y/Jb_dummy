"use client";

import React, { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Globe, Eye, EyeOff, Save, Check, AlertCircle, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Alert, Avatar } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import type { Profile, ProfileUpdate, Locale } from "@/types/database";

interface ProfileEditFormProps {
  profile: Profile;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Editable fields only — evoora_id and id are never in state
  const [displayName, setDisplayName]     = useState(profile.display_name);
  const [bio, setBio]                     = useState(profile.bio ?? "");
  const [locale, setLocale]               = useState<Locale>(profile.preferred_locale);
  const [isPublic, setIsPublic]           = useState(profile.is_public);

  const [status, setStatus]               = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);

  // Validation
  const nameError = displayName.trim().length < 2
    ? "Display name must be at least 2 characters."
    : displayName.trim().length > 64
    ? "Display name must be at most 64 characters."
    : null;

  const bioError = bio.length > 280
    ? "Bio must be at most 280 characters."
    : null;

  const isDirty =
    displayName.trim() !== profile.display_name ||
    bio.trim() !== (profile.bio ?? "") ||
    locale !== profile.preferred_locale ||
    isPublic !== profile.is_public;

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profile.evoora_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — ignore
    }
  }, [profile.evoora_id]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (nameError || bioError || status === "saving") return;

      setStatus("saving");
      setErrorMsg(null);

      const update: ProfileUpdate = {
        display_name:     displayName.trim(),
        bio:              bio.trim() || null,
        preferred_locale: locale,
        is_public:        isPublic,
      };

      try {
        const supabase = createClient();
        // Cast required: Supabase client infers Update as `never` when the
        // table's Update type is a restricted Partial. RLS on the server
        // enforces the real column restrictions regardless.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("profiles")
          .update(update)
          .eq("id", profile.id);

        if (error) {
          setErrorMsg(t("profile.save_error"));
          setStatus("error");
          return;
        }

        setStatus("saved");
        // Refresh server component data without full reload
        startTransition(() => {
          router.refresh();
        });

        // Reset saved status after 3s
        setTimeout(() => setStatus("idle"), 3000);
      } catch {
        setErrorMsg(t("profile.save_error"));
        setStatus("error");
      }
    },
    [displayName, bio, locale, isPublic, nameError, bioError, profile.id, status, t, router],
  );

  return (
    <div className="space-y-6">
      {/* ── Evoora ID card (read-only, prominent) ── */}
      <div className="rounded-2xl p-6 bg-[#101638] border border-[rgba(255,255,255,0.08)] shadow-[0_0_24px_rgba(0,0,0,0.25)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#39DFFF]/15 border border-[#39DFFF]/30 flex items-center justify-center flex-shrink-0 text-[#39DFFF]">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#B8C3E0] text-xs font-semibold uppercase tracking-wider mb-1">
              {t("profile.evoora_id")}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-2xl text-[#F5F7FF] tracking-widest">
                {profile.evoora_id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs",
                  copied
                    ? "bg-[#39DFFF]/20 border border-[#39DFFF]/50 text-[#39DFFF]"
                    : "bg-[#070B25] border border-[rgba(255,255,255,0.12)] text-[#F5F7FF] hover:bg-[#161F48]",
                )}
                aria-label="Copy EVOAIQU ID"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#39DFFF]" /> : <Copy className="h-3.5 w-3.5 text-[#B8C3E0]" />}
                <span>{copied ? t("common.copied") : t("common.copy")}</span>
              </button>
            </div>
            <p className="text-[#B8C3E0]/70 text-xs mt-2 leading-relaxed">
              {t("profile.evoora_id_hint")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Avatar area ── */}
      <div className="rounded-2xl p-6 bg-[#101638] border border-[rgba(255,255,255,0.08)] shadow-[0_0_24px_rgba(0,0,0,0.25)]">
        <p className="text-[#F5F7FF] font-semibold text-base mb-4">Avatar</p>
        <div className="flex items-center gap-5">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name}
            size="xl"
            className="ring-2 ring-[#39DFFF]/40"
          />
          <div>
            <p className="text-[#B8C3E0] text-sm">
              {t("profile.avatar_fallback")}
            </p>
            <p className="text-[#B8C3E0]/70 text-xs mt-1">
              Avatar storage via Supabase Storage is available in Milestone 3.
            </p>
          </div>
        </div>
      </div>

      {/* ── Edit form ── */}
      <form onSubmit={handleSave} noValidate className="rounded-2xl p-6 space-y-6 bg-[#101638] border border-[rgba(255,255,255,0.08)] shadow-[0_0_24px_rgba(0,0,0,0.25)]">
        <p className="text-[#F5F7FF] font-bold text-lg">{t("profile.edit")}</p>

        {/* Status messages */}
        {status === "saved" && (
          <Alert variant="success" icon={<Check className="h-4 w-4" />}>
            {t("profile.saved")}
          </Alert>
        )}
        {status === "error" && errorMsg && (
          <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
            {errorMsg}
          </Alert>
        )}

        {/* Display name */}
        <div>
          <label htmlFor="prof-name" className="evo-label">
            {t("profile.display_name")} <span className="text-[#FF5370]">*</span>
          </label>
          <input
            id="prof-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={cn("evo-input mt-1.5", nameError && displayName.length > 0 && "error")}
            maxLength={64}
            required
            autoComplete="name"
          />
          <div className="flex justify-between mt-1">
            {nameError && displayName.length > 0 ? (
              <p className="text-[#FF5370] text-xs">{nameError}</p>
            ) : (
              <span />
            )}
            <p className="text-[#B8C3E0]/70 text-xs">{displayName.length}/64</p>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="prof-bio" className="evo-label">
            {t("profile.bio")}{" "}
            <span className="text-[#B8C3E0]/70 font-normal text-xs">
              ({t("common.optional")})
            </span>
          </label>
          <textarea
            id="prof-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("profile.bio_placeholder")}
            rows={3}
            maxLength={280}
            className={cn(
              "evo-input mt-1.5 resize-none",
              bioError && "error",
            )}
          />
          <div className="flex justify-between mt-1">
            {bioError ? (
              <p className="text-[#FF5370] text-xs">{bioError}</p>
            ) : (
              <span />
            )}
            <p className="text-[#B8C3E0]/70 text-xs">{bio.length}/280</p>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="evo-label flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#39DFFF]" />
            {t("profile.language")}
          </label>
          <div className="flex gap-3 mt-2">
            {(["en", "ta"] as Locale[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all",
                  locale === l
                    ? "bg-[#39DFFF]/15 border-[#39DFFF] text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.2)]"
                    : "bg-[#070B25] border-[rgba(255,255,255,0.1)] text-[#B8C3E0] hover:border-[#39DFFF]/40 hover:bg-[#161F48]",
                )}
              >
                {l === "en" ? "🇬🇧 English" : "🇮🇳 தமிழ்"}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="evo-label">{t("profile.visibility")}</label>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all",
                isPublic
                  ? "bg-[#39DFFF]/15 border-[#39DFFF] text-[#39DFFF] shadow-[0_0_12px_rgba(57,223,255,0.2)]"
                  : "bg-[#070B25] border-[rgba(255,255,255,0.1)] text-[#B8C3E0] hover:border-[#39DFFF]/40 hover:bg-[#161F48]",
              )}
            >
              <Eye className="h-4 w-4" />
              {t("profile.visibility_public")}
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all",
                !isPublic
                  ? "bg-[#FF5370]/15 border-[#FF5370] text-[#FF5370] shadow-[0_0_12px_rgba(255,83,112,0.2)]"
                  : "bg-[#070B25] border-[rgba(255,255,255,0.1)] text-[#B8C3E0] hover:border-[#FF5370]/40 hover:bg-[#161F48]",
              )}
            >
              <EyeOff className="h-4 w-4" />
              {t("profile.visibility_private")}
            </button>
          </div>
        </div>

        {/* Save button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={status === "saving" || isPending}
          disabled={!isDirty || !!nameError || !!bioError}
          className="w-full mt-2"
        >
          <Save className="h-4 w-4" />
          {status === "saving" || isPending ? t("profile.saving") : t("profile.save")}
        </Button>
      </form>
    </div>
  );
}
