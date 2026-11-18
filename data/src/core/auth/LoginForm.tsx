"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { useI18n } from "@/core/i18n/I18nContext";
import { Spinner } from "@/shared/ui";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { AuthShell, authLabelClass } from "@/core/auth/AuthShell";
import { safeRedirectPath } from "@/shared/lib/utils";

export function LoginForm() {
  const { t } = useI18n();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = safeRedirectPath(searchParams.get("next"), "/games");

  const searchError = searchParams.get("error");
  const initialError =
    searchError === "verification_failed"
      ? "Email verification link was invalid or has expired. Please sign in or register."
      : searchError === "unverified_email"
      ? "Please verify your email address to access protected areas."
      : null;

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(initialError);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      setError(null);
      setLoading(true);

      try {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (authError) {
          // Map Supabase error messages to user-friendly text
          if (authError.message.includes("Invalid login credentials")) {
            setError("Invalid email or password. Please try again.");
          } else if (authError.message.includes("Email not confirmed")) {
            setError("Please verify your email before signing in.");
          } else {
            setError(authError.message);
          }
          return;
        }

        // Successful login — redirect to intended destination
        router.push(next);
        router.refresh();
      } catch {
        setError(t("common.error"));
      } finally {
        setLoading(false);
      }
    },
    [email, password, loading, next, router, t],
  );

  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) {
      setError("Enter your email address first, then click Forgot Password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/auth/reset-password` },
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setError(null);
        alert(t("auth.reset.sent"));
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [email, t]);

  const chips = [
    { emoji: "✊", label: "Rock Paper Scissors" },
    { emoji: "♟️", label: "Speed Chess" },
    { emoji: "🎬", label: "Video dares" },
  ];

  return (
    <AuthShell
      sticker="👋"
      language={<LanguageSelector compact variant="dark" />}
      footer={
        <span className="break-words">
          {t("brand.company")} · {t("brand.tagline")}
        </span>
      }
    >
      {/* Card Title & Subtitle */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl text-[#1E1B24] tracking-tight mb-2">
          {t("auth.login.title")}
        </h1>
        <p className="text-[#6E6878] text-sm leading-relaxed">
          {t("auth.login.subtitle")}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {chips.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5EADC] text-xs font-bold text-[#1E1B24]">
              <span aria-hidden="true">{c.emoji}</span>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Inline Error Alert */}
      {error && (
        <div
          role="alert"
          className="mb-5 p-4 rounded-[18px] bg-[#FFE4E5] border-2 border-[#E5484D]/40 text-[#9B1C21] text-sm flex items-start gap-3 animate-fade-in"
        >
          <AlertCircle className="w-5 h-5 text-[#E5484D] shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{error}</div>
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* Email Field */}
        <div className="flex flex-col gap-2">
          <label htmlFor="login-email" className={authLabelClass}>
            {t("auth.login.email")}{" "}
            <span className="text-[#FF5A3C]">*</span>
          </label>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8798] group-focus-within:text-[#FF5A3C] transition-colors pointer-events-none">
              <Mail className="w-4 h-4" />
            </span>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="evo-input cyber-autofill pl-11"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1">
            <label htmlFor="login-password" className={authLabelClass}>
              {t("auth.login.password")}{" "}
              <span className="text-[#FF5A3C]">*</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-[#C9381F] hover:text-[#1E1B24] hover:underline transition-colors font-bold cursor-pointer min-h-[44px] px-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            >
              {t("auth.login.forgot")}
            </button>
          </div>

          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8798] group-focus-within:text-[#FF5A3C] transition-colors pointer-events-none">
              <Lock className="w-4 h-4" />
            </span>
            <input
              id="login-password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="evo-input cyber-autofill pl-11 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#6E6878] hover:text-[#1E1B24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] transition-colors cursor-pointer rounded-full hover:bg-[#F5EADC]"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="evo-btn evo-btn-primary evo-btn-lg w-full mt-1 font-extrabold text-base disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2"
        >
          {loading ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>{t("auth.login.submit")}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </form>

      {/* Divider. No "or continue with" label: there are no social sign-in
          buttons yet (Google sign-in is on the to-do list). */}
      <div className="my-6 h-0.5 bg-[#EADBC8]" aria-hidden="true" />

      {/* Sign Up Navigation Link */}
      <p className="text-center text-sm text-[#6E6878]">
        {t("auth.login.no_account")}{" "}
        <Link
          href={`/signup${next !== "/games" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-[#C9381F] font-extrabold hover:text-[#1E1B24] hover:underline transition-colors"
        >
          {t("auth.login.signup_link")}
        </Link>
      </p>
    </AuthShell>
  );
}
