"use client";

import React, { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Globe, Eye, EyeOff, Save, Check, AlertCircle, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Alert, Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
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
    <div className="space-y-8">
      {/* ── Evoora ID card (read-only, prominent) ── */}
      <div className="evo-card p-6 bg-white border border-[#E2E8E2] shadow-card">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center flex-shrink-0 text-[#167D78]">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#65736F] text-xs font-semibold uppercase tracking-wider mb-1">
              {t("profile.evoora_id")}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-2xl text-[#203331] tracking-widest">
                {profile.evoora_id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs",
                  copied
                    ? "bg-[#DDF2EB] border border-[rgba(22,125,120,0.3)] text-[#167D78]"
                    : "bg-white border border-[#E2E8E2] text-[#203331] hover:bg-[#EEF1ED]",
                )}
                aria-label="Copy EVOAIQU ID"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#167D78]" /> : <Copy className="h-3.5 w-3.5 text-[#65736F]" />}
                <span>{copied ? t("common.copied") : t("common.copy")}</span>
              </button>
            </div>
            <p className="text-[#8E9B97] text-xs mt-2 leading-relaxed">
              {t("profile.evoora_id_hint")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Avatar area ── */}
      <div className="evo-card p-6 bg-white border border-[#E2E8E2] shadow-card">
        <p className="text-[#203331] font-semibold text-base mb-4">Avatar</p>
        <div className="flex items-center gap-5">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name}
            size="xl"
            className="ring-2 ring-[#DDF2EB]"
          />
          <div>
            <p className="text-[#65736F] text-sm">
              {t("profile.avatar_fallback")}
            </p>
            <p className="text-[#8E9B97] text-xs mt-1">
              Avatar storage via Supabase Storage is available in Milestone 3.
            </p>
          </div>
        </div>
      </div>

      {/* ── Edit form ── */}
      <form onSubmit={handleSave} noValidate className="evo-card p-6 space-y-6 bg-white border border-[#E2E8E2] shadow-card">
        <p className="text-[#203331] font-bold text-lg">{t("profile.edit")}</p>

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
            {t("profile.display_name")} <span className="text-[#D95F49]">*</span>
          </label>
          <input
            id="prof-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={cn("evo-input", nameError && displayName.length > 0 && "error")}
            maxLength={64}
            required
            autoComplete="name"
          />
          <div className="flex justify-between mt-1">
            {nameError && displayName.length > 0 ? (
              <p className="text-[#D95F49] text-xs">{nameError}</p>
            ) : (
              <span />
            )}
            <p className="text-[#8E9B97] text-xs">{displayName.length}/64</p>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="prof-bio" className="evo-label">
            {t("profile.bio")}{" "}
            <span className="text-[#8E9B97] font-normal text-xs">
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
              "evo-input resize-none",
              bioError && "error",
            )}
          />
          <div className="flex justify-between mt-1">
            {bioError ? (
              <p className="text-[#D95F49] text-xs">{bioError}</p>
            ) : (
              <span />
            )}
            <p className="text-[#8E9B97] text-xs">{bio.length}/280</p>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="evo-label flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#8E9B97]" />
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
                    ? "bg-[#DDF2EB] border-[#167D78] text-[#167D78] shadow-xs"
                    : "bg-white border-[#E2E8E2] text-[#65736F] hover:border-[#CBD4CB] hover:bg-[#F7F8F4]",
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
                  ? "bg-[#DDF2EB] border-[#167D78] text-[#167D78] shadow-xs"
                  : "bg-white border-[#E2E8E2] text-[#65736F] hover:border-[#CBD4CB] hover:bg-[#F7F8F4]",
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
                  ? "bg-[#FCE6DE] border-[#D95F49] text-[#D95F49] shadow-xs"
                  : "bg-white border-[#E2E8E2] text-[#65736F] hover:border-[#CBD4CB] hover:bg-[#F7F8F4]",
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
          className="w-full"
        >
          <Save className="h-4 w-4" />
          {status === "saving" || isPending ? t("profile.saving") : t("profile.save")}
        </Button>
      </form>
    </div>
  );
}
