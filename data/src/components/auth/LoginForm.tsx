"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight,
  Sparkles, Swords, Crown, Flame, Shield, CheckCircle2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Spinner } from "@/components/ui";
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

  const gameBadges = [
    {
      icon: Swords,
      title: "Rock, Paper, Scissors",
      subtitle: "10s Blitz Arena",
      color: "from-[#315BFF] to-[#39DFFF]",
    },
    {
      icon: Crown,
      title: "Speed Chess",
      subtitle: "Live Clock Battles",
      color: "from-[#8B2CFF] to-[#315BFF]",
    },
    {
      icon: Flame,
      title: "Post-Match Dares",
      subtitle: "24h Video Reels",
      color: "from-[#39DFFF] to-[#8B2CFF]",
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full flex flex-col justify-between bg-[#070B25] text-[#F5F7FF] selection:bg-[#39DFFF]/30 selection:text-white relative overflow-x-hidden">
      
      {/* ── Background Cyber Ambient Glows ── */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(49,91,255,0.14),transparent_70%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_60%,rgba(139,44,255,0.08),transparent_70%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#101638_1px,transparent_1px),linear-gradient(to_bottom,#101638_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none z-0" />

      {/* ── Top Navigation Bar ── */}
      <header className="w-full max-w-full relative z-10 border-b border-[#315BFF]/20 bg-[#070B25]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-5 flex items-center justify-between w-full min-w-0">
          <Link
            href="/"
            className="flex items-center gap-3.5 group select-none"
            aria-label="EVOAIQU Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] flex items-center justify-center shadow-[0_0_16px_rgba(49,91,255,0.4)] border border-[#39DFFF]/40 group-hover:scale-105 transition-transform">
              <span className="font-display font-black text-sm text-white tracking-wider">
                EQ
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl text-[#F5F7FF] tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#39DFFF] group-hover:to-[#8B2CFF] transition-all">
                EVOAIQU
              </span>
              <span className="text-[10px] font-mono font-semibold text-[#B8C3E0] tracking-[0.15em] uppercase -mt-0.5 hidden sm:block">
                CYBER ARENA
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageSelector compact variant="dark" />
            <Link
              href="/"
              className="text-xs font-semibold text-[#B8C3E0] hover:text-[#39DFFF] transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <span>Explore Arena</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Two-Column Content Shell ── */}
      <main className="flex-1 flex items-center justify-center relative z-10 py-8 sm:py-14 lg:py-16 px-4 sm:px-8 md:px-12 lg:px-16 w-full max-w-7xl mx-auto min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-center w-full min-w-0">
          
          {/* ══════════════════════════════════════════════════════════════════════
              LEFT COLUMN: BRANDING, ENGAGING HEADLINE & GAMING AMBIANCE
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="hidden lg:flex flex-col items-start lg:col-span-6 xl:col-span-7 space-y-7 min-w-0">
            
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#101638] border border-[#315BFF]/35 text-[#39DFFF] text-xs font-mono font-semibold tracking-[0.16em] uppercase shadow-[0_0_16px_rgba(49,91,255,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-[#39DFFF]" />
              <span>YOUR NEXT GAME STARTS HERE</span>
            </div>

            {/* Display Headline */}
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-5xl xl:text-6xl tracking-tight leading-[1.1] !text-[#F5F7FF]">
              Welcome back,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#39DFFF] via-[#5B7BFF] to-[#8B2CFF] drop-shadow-[0_0_30px_rgba(57,223,255,0.35)]">
                player.
              </span>
            </h1>

            {/* Description */}
            <p className="text-[#B8C3E0] text-base sm:text-lg max-w-lg leading-relaxed">
              Reconnect with your friends, jump into a match, and let the fun begin.
            </p>

            {/* Gaming Features Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-xl pt-2">
              {gameBadges.map((badge) => {
                const IconComponent = badge.icon;
                return (
                  <div
                    key={badge.title}
                    className="p-4 rounded-2xl bg-[#101638]/90 border border-[#315BFF]/25 backdrop-blur-md flex flex-col justify-between hover:border-[#39DFFF]/50 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center mb-3 shadow-[0_0_14px_rgba(49,91,255,0.3)]`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-xs !text-[#F5F7FF] leading-snug">
                        {badge.title}
                      </h4>
                      <p className="text-[11px] font-mono text-[#B8C3E0]/70 mt-0.5">
                        {badge.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Arena Status Pill */}
            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#101638]/80 border border-[#315BFF]/30 backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39DFFF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#39DFFF]" />
              </span>
              <span className="text-xs font-mono font-semibold text-[#D6DEFF] tracking-wider uppercase">
                LIVE MULTIPLAYER ARENA • INSTANT MATCHMAKING
              </span>
            </div>

            {/* Safe Community Trust Row */}
            <div className="flex items-center gap-4 text-xs font-mono text-[#B8C3E0]/75 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#39DFFF]" />
                100% Free to Play
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#39DFFF]" />
                Safe &amp; Consensual
              </span>
            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              RIGHT COLUMN: PREMIUM FUTURISTIC LOGIN CARD
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 xl:col-span-5 w-full max-w-md mx-auto lg:max-w-none min-w-0">
            
            {/* Mobile Header Banner (Compact for screens < lg) */}
            <div className="lg:hidden text-center mb-6 w-full min-w-0">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-[#101638] border border-[#315BFF]/30 text-[#39DFFF] text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider uppercase mb-3 max-w-full truncate">
                <Sparkles className="w-3 h-3 text-[#39DFFF] shrink-0" />
                <span className="truncate">YOUR NEXT GAME STARTS HERE</span>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl !text-[#F5F7FF] tracking-tight break-words">
                Welcome back,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#39DFFF] to-[#8B2CFF]">
                  player.
                </span>
              </h1>
            </div>

            {/* ── Main Glassmorphic Login Card ── */}
            <div className="relative rounded-3xl bg-[#101638] border border-[#315BFF]/35 p-5 sm:p-8 lg:p-10 shadow-[0_24px_64px_rgba(7,11,37,0.95)] backdrop-blur-xl overflow-hidden w-full min-w-0">
              
              {/* Subtle Card Top Highlight */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[#39DFFF]/40 to-transparent pointer-events-none" />

              {/* Card Title & Subtitle */}
              <div className="mb-7">
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl !text-[#F5F7FF] tracking-tight mb-2">
                  {t("auth.login.title")}
                </h2>
                <p className="text-[#B8C3E0] text-sm leading-relaxed">
                  {t("auth.login.subtitle")}
                </p>
              </div>

              {/* Inline Error Alert */}
              {error && (
                <div
                  role="alert"
                  className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-sm flex items-start gap-3 animate-fade-in shadow-inner"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">{error}</div>
                </div>
              )}

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                
                {/* Email Field */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="login-email"
                    className="text-xs font-semibold uppercase tracking-wider text-[#B8C3E0]"
                  >
                    {t("auth.login.email")}{" "}
                    <span className="text-[#39DFFF]">*</span>
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B8C3E0]/60 group-focus-within:text-[#39DFFF] transition-colors pointer-events-none">
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
                      className="cyber-autofill w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#070B25] border border-[#315BFF]/30 text-[#F5F7FF] placeholder-[#B8C3E0]/40 text-sm focus:outline-none focus:border-[#39DFFF] focus:ring-2 focus:ring-[#39DFFF]/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1">
                    <label
                      htmlFor="login-password"
                      className="text-xs font-semibold uppercase tracking-wider text-[#B8C3E0]"
                    >
                      {t("auth.login.password")}{" "}
                      <span className="text-[#39DFFF]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-[#39DFFF] hover:text-[#F5F7FF] hover:underline transition-colors font-medium cursor-pointer py-1"
                    >
                      {t("auth.login.forgot")}
                    </button>
                  </div>

                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B8C3E0]/60 group-focus-within:text-[#39DFFF] transition-colors pointer-events-none">
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
                      className="cyber-autofill w-full pl-11 pr-12 py-3.5 rounded-2xl bg-[#070B25] border border-[#315BFF]/30 text-[#F5F7FF] placeholder-[#B8C3E0]/40 text-sm focus:outline-none focus:border-[#39DFFF] focus:ring-2 focus:ring-[#39DFFF]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[#B8C3E0]/60 hover:text-[#F5F7FF] focus:outline-none focus:text-[#39DFFF] transition-colors cursor-pointer rounded-lg hover:bg-[#070B25]/60"
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
                  className="w-full mt-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#315BFF] to-[#8B2CFF] hover:from-[#3d66ff] hover:to-[#993eff] text-white font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(49,91,255,0.45)] hover:shadow-[0_0_36px_rgba(49,91,255,0.7)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
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

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-[#315BFF]/25" />
                <span className="text-xs font-mono text-[#B8C3E0]/60 uppercase tracking-wider">
                  {t("auth.login.or")}
                </span>
                <div className="flex-1 h-px bg-[#315BFF]/25" />
              </div>

              {/* Sign Up Navigation Link */}
              <p className="text-center text-sm text-[#B8C3E0]">
                {t("auth.login.no_account")}{" "}
                <Link
                  href={`/signup${next !== "/games" ? `?next=${encodeURIComponent(next)}` : ""}`}
                  className="text-[#39DFFF] font-bold hover:text-[#F5F7FF] hover:underline transition-colors"
                >
                  {t("auth.login.signup_link")}
                </Link>
              </p>

            </div>
          </div>

        </div>
      </main>

      {/* ── Minimal Cyber Footer ── */}
      <footer className="w-full max-w-full relative z-10 border-t border-[#315BFF]/20 bg-[#070B25]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#B8C3E0]/60 w-full min-w-0 text-center sm:text-left">
          <div className="break-words">
            {t("brand.company")} · {t("brand.tagline")}
          </div>
          <div className="flex items-center gap-4 justify-center">
            <Link href="/privacy" className="hover:text-[#39DFFF] transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#39DFFF] transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
