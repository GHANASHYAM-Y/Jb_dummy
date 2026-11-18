"use client";

import React, { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Globe, Eye, EyeOff, Save, Check, AlertCircle, Copy } from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { useI18n } from "@/core/i18n/I18nContext";
import { Button, Alert, Avatar } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import type { Profile, ProfileUpdate, Locale } from "@/core/supabase/database";

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
      <div className="rounded-[26px] p-5 bg-[#EEEBFF] border-2 border-[#D7D0FF] shadow-[0_4px_0_#D7D0FF]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0 text-[#4B3FC4]">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#6E6878] text-xs font-semibold uppercase tracking-wider mb-1">
              {t("profile.evoora_id")}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-xl sm:text-2xl text-[#1E1B24] tracking-widest">
                {profile.evoora_id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className={cn(
                  "flex items-center gap-1.5 px-4 min-h-[44px] rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                  copied
                    ? "bg-[#E3FAF3] border-2 border-[#B7EEDD] text-[#0B7D63]"
                    : "bg-white border-2 border-[#EADBC8] text-[#1E1B24] hover:bg-[#F5EADC]",
                )}
                aria-label="Copy EVOAIQU ID"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#0B7D63]" /> : <Copy className="h-3.5 w-3.5 text-[#6E6878]" />}
                <span>{copied ? t("common.copied") : t("common.copy")}</span>
              </button>
            </div>
            <p className="text-[#6E6878] text-xs mt-2 leading-relaxed">
              {t("profile.evoora_id_hint")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Avatar area ── */}
      <div className="b-card !p-5">
        <p className="font-display font-semibold text-[#1E1B24] text-lg mb-4">Avatar</p>
        <div className="flex items-center gap-5">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name}
            size="xl"
            className="border-4 !border-[#FFF6EC] ring-2 ring-[#EADBC8]"
          />
          <div>
            <p className="text-[#6E6878] text-sm">
              {t("profile.avatar_fallback")}
            </p>
            <p className="text-[#6E6878] text-xs mt-1">
              Avatar storage via Supabase Storage is available in Milestone 3.
            </p>
          </div>
        </div>
      </div>

      {/* ── Edit form ── */}
      <form onSubmit={handleSave} noValidate className="b-card !p-5 space-y-6">
        <p className="font-display font-semibold text-[#1E1B24] text-lg">{t("profile.edit")}</p>

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
            {t("profile.display_name")} <span className="text-[#E5484D]">*</span>
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
              <p className="text-[#E5484D] text-xs">{nameError}</p>
            ) : (
              <span />
            )}
            <p className="text-[#6E6878] text-xs">{displayName.length}/64</p>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="prof-bio" className="evo-label">
            {t("profile.bio")}{" "}
            <span className="text-[#6E6878] font-normal text-xs">
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
              <p className="text-[#E5484D] text-xs">{bioError}</p>
            ) : (
              <span />
            )}
            <p className="text-[#6E6878] text-xs">{bio.length}/280</p>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="evo-label flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#FF5A3C]" />
            {t("profile.language")}
          </label>
          <div className="flex gap-3 mt-2">
            {(["en", "ta"] as Locale[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={cn(
                  "flex-1 min-h-[44px] px-4 rounded-full border-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                  locale === l
                    ? "bg-[#FFE4DD] border-[#FF5A3C] text-[#C9381F] shadow-[0_3px_0_#FFC9BC]"
                    : "bg-white border-[#EADBC8] text-[#6E6878] hover:border-[#FF5A3C]/60 hover:bg-[#FFF6EC]",
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
                "flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full border-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                isPublic
                  ? "bg-[#FFE4DD] border-[#FF5A3C] text-[#C9381F] shadow-[0_3px_0_#FFC9BC]"
                  : "bg-white border-[#EADBC8] text-[#6E6878] hover:border-[#FF5A3C]/60 hover:bg-[#FFF6EC]",
              )}
            >
              <Eye className="h-4 w-4" />
              {t("profile.visibility_public")}
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full border-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                !isPublic
                  ? "bg-[#FDECEC] border-[#E5484D] text-[#B3262B] shadow-[0_3px_0_#F6C9CB]"
                  : "bg-white border-[#EADBC8] text-[#6E6878] hover:border-[#E5484D]/60 hover:bg-[#FFF6EC]",
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
