"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Input, Alert, Divider } from "@/components/ui";
import { LanguageSelector } from "@/components/LanguageSelector";
import { safeRedirectPath } from "@/lib/utils";

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

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Mini header */}
      <div className="w-full max-w-sm mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center">
            <span className="text-[#167D78] font-extrabold text-[10px] tracking-wider">EQ</span>
          </div>
          <span className="font-display font-extrabold text-lg text-[#203331]">EVOAIQU</span>
        </Link>
        <LanguageSelector compact />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm animate-scale-in">
        <div className="evo-card p-8 bg-white border border-[#E2E8E2] shadow-card">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-2xl text-[#203331] mb-1">
              {t("auth.login.title")}
            </h1>
            <p className="text-[#65736F] text-sm">
              {t("auth.login.subtitle")}
            </p>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />} className="mb-5">
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              id="login-email"
              label={t("auth.login.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              leftIcon={<Mail className="h-4 w-4" />}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="evo-label mb-0">
                  {t("auth.login.password")}
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-[#167D78] hover:underline transition-colors font-medium"
                >
                  {t("auth.login.forgot")}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9B97] pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="login-password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="evo-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9B97] hover:text-[#203331] transition-colors"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-1 font-bold"
            >
              {t("auth.login.submit")}
            </Button>
          </form>

          <Divider label={t("auth.login.or")} className="my-5" />

          {/* Sign up link */}
          <p className="text-center text-sm text-[#65736F]">
            {t("auth.login.no_account")}{" "}
            <Link
              href={`/signup${next !== "/games" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-[#167D78] font-semibold hover:underline transition-colors"
            >
              {t("auth.login.signup_link")}
            </Link>
          </p>
        </div>

        <p className="text-center mt-4 text-xs text-[#8E9B97]">
          {t("brand.company")} · {t("brand.tagline")}
        </p>
      </div>
    </div>
  );
}
