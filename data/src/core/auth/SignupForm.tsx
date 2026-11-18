"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { useI18n } from "@/core/i18n/I18nContext";
import { Button, Input, Alert, Divider } from "@/shared/ui";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { AuthShell } from "@/core/auth/AuthShell";
import { safeRedirectPath, cn } from "@/shared/lib/utils";

// Password strength helper
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "Weak", color: "#FF5A3C" };
  if (score === 2) return { score, label: "Fair", color: "#D97706" };
  if (score === 3) return { score, label: "Good", color: "#0D9488" };
  return { score, label: "Strong", color: "#FF5A3C" };
}

export function SignupForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const next = safeRedirectPath(searchParams.get("next"), "/games");

  // Flow step: "form" for account details, "otp" for 6-digit email OTP verification
  const [step, setStep] = useState<"form" | "otp">("form");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP states
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pwStrength = passwordStrength(password);

  // ── Cooldown timer for resend OTP ──────────────────────────────────────────
  useEffect(() => {
    if (step !== "otp" || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

  // ── Auto-focus first OTP input when entering OTP step ─────────────────────
  useEffect(() => {
    if (step === "otp") {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Form validation
  const validate = useCallback((): string | null => {
    if (!name.trim()) return "Display name is required.";
    if (name.trim().length < 2) return "Display name must be at least 2 characters.";
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  }, [name, email, password, confirm]);

  // Handle initial signup form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const supabase = createClient();
        const normalizedEmail = email.trim().toLowerCase();

        const { data: signUpData, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              display_name: name.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });

        if (authError) {
          const rawMsg = authError.message || "";
          const lowerMsg = rawMsg.toLowerCase();

          if (lowerMsg.includes("already registered") || lowerMsg.includes("already in use")) {
            setError("This email is already registered. Try logging in instead.");
          } else if (lowerMsg.includes("rate limit") || authError.status === 429) {
            setError("Too many signup attempts. Please wait a few moments and try again.");
          } else if (lowerMsg.includes("database error") || authError.status === 500) {
            console.error("[Signup] Server error during registration:", rawMsg);
            setError("Unable to complete account registration due to a server error. Please try again later.");
          } else if (lowerMsg.includes("password")) {
            setError(rawMsg);
          } else {
            setError(rawMsg || "Unable to complete registration. Please check your information and try again.");
          }
          return;
        }

        // If email confirmation is disabled or session was directly established:
        if (signUpData?.session) {
          window.location.assign(next);
          return;
        }

        // Otherwise transition to 6-digit OTP verification screen
        setStep("otp");
        setOtp(["", "", "", "", "", ""]);
        setResendCooldown(60);
        setResendSuccess(null);
        setError(null);
      } catch (err: unknown) {
        console.error("[Signup] Unexpected submission error:", err);
        if (err instanceof Error) {
          const lower = err.message.toLowerCase();
          if (lower.includes("failed to fetch") || lower.includes("network")) {
            setError("Unable to connect to the authentication server. Please check your connection and try again.");
            return;
          }
          if (lower.includes("missing supabase") || lower.includes("api key are required")) {
            setError("Authentication service is temporarily unconfigured. Please contact support.");
            return;
          }
        }
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, name, loading, next, validate],
  );

  // ── OTP Verification ───────────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(
    async (codeToVerify?: string) => {
      const code = (codeToVerify ?? otp.join("")).trim();
      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        setError("Please enter the complete 6-digit code.");
        return;
      }
      if (otpLoading) return;

      setOtpLoading(true);
      setError(null);
      setResendSuccess(null);

      try {
        const supabase = createClient();
        const normalizedEmail = email.trim().toLowerCase();

        const { data, error: otpError } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: code,
          type: "signup",
        });

        if (otpError) {
          const rawMsg = otpError.message || "";
          const lower = rawMsg.toLowerCase();

          if (lower.includes("expired") || lower.includes("invalid") || lower.includes("token")) {
            setError(t("auth.otp.invalid"));
          } else if (lower.includes("rate limit") || otpError.status === 429) {
            setError(t("auth.otp.rate_limit"));
          } else {
            setError(rawMsg || t("auth.otp.invalid"));
          }
          return;
        }

        if (data?.session || data?.user) {
          // Full browser navigation ensures refreshed SSR session cookies on /dashboard
          window.location.assign(next);
        }
      } catch (err: unknown) {
        console.error("[Signup] OTP verification error:", err);
        if (err instanceof Error && (err.message.includes("fetch") || err.message.includes("network"))) {
          setError(t("auth.otp.network_error"));
        } else {
          setError(t("common.error"));
        }
      } finally {
        setOtpLoading(false);
      }
    },
    [email, next, otp, otpLoading, t],
  );

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setError(null);
    setResendSuccess(null);

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });

      if (resendError) {
        const rawMsg = resendError.message || "";
        const lower = rawMsg.toLowerCase();
        if (lower.includes("rate limit") || resendError.status === 429) {
          setError(t("auth.otp.rate_limit"));
        } else {
          setError(rawMsg || "Unable to resend code. Please try again.");
        }
        return;
      }

      setResendSuccess(t("auth.otp.resend_success"));
      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } catch (err: unknown) {
      console.error("[Signup] Resend error:", err);
      setError(t("common.error"));
    } finally {
      setResending(false);
    }
  }, [email, resendCooldown, resending, t]);

  // ── Input key and paste handlers for OTP digits ────────────────────────────
  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const nextOtp = [...otp];
      nextOtp[index] = "";
      setOtp(nextOtp);
      return;
    }

    if (cleaned.length > 1) {
      // Multiple digits entered (e.g. autofill)
      const nextOtp = [...otp];
      for (let i = 0; i < cleaned.length && index + i < 6; i++) {
        nextOtp[index + i] = cleaned[i];
      }
      setOtp(nextOtp);
      const nextFocus = Math.min(index + cleaned.length, 5);
      inputRefs.current[nextFocus]?.focus();
      const fullCode = nextOtp.join("");
      if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
        handleVerifyOtp(fullCode);
      }
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = cleaned[0];
    setOtp(nextOtp);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = nextOtp.join("");
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        e.preventDefault();
        const nextOtp = [...otp];
        nextOtp[index - 1] = "";
        setOtp(nextOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const digits = pasted.replace(/\D/g, "").slice(0, 6);
    if (!digits) return;

    const nextOtp = ["", "", "", "", "", ""];
    for (let i = 0; i < digits.length; i++) {
      nextOtp[i] = digits[i];
    }
    setOtp(nextOtp);

    const focusIdx = Math.min(digits.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (digits.length === 6) {
      handleVerifyOtp(digits);
    }
  };

  // ── Step 2: 6-Digit Email OTP Entry Screen ──────────────────────────────────
  if (step === "otp") {
    const isCodeComplete = otp.join("").length === 6;

    return (
      <AuthShell sticker="🔑" language={<LanguageSelector compact variant="dark" />}>
            {/* Header with icon */}
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-[18px] bg-[#FFE4DD] border-2 border-[#FF5A3C]/40 flex items-center justify-center mx-auto mb-4 text-[#C9381F] -rotate-6">
                <KeyRound className="h-7 w-7" />
              </div>
              <h1 className="font-display font-bold text-3xl text-[#1E1B24] mb-2 tracking-tight">
                {t("auth.otp.title")}
              </h1>
              <p className="text-[#6E6878] text-sm leading-relaxed max-w-xs mx-auto">
                {t("auth.otp.subtitle", { email })}
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />} className="mb-5">
                {error}
              </Alert>
            )}
            {resendSuccess && (
              <Alert variant="success" icon={<CheckCircle2 className="h-4 w-4" />} className="mb-5">
                {resendSuccess}
              </Alert>
            )}

            {/* 6 Digit Inputs */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyOtp();
              }}
              noValidate
            >
              <div
                className="flex items-center justify-center gap-2 sm:gap-3 my-6 sm:my-8"
                role="group"
                aria-label={t("auth.otp.code_label")}
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    id={`otp-digit-${idx}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete={idx === 0 ? "one-time-code" : "off"}
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    disabled={otpLoading}
                    className={cn(
                      "w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold font-display rounded-[18px]",
                      "bg-white border-2 text-[#1E1B24] transition-all duration-150 outline-none",
                      digit
                        ? "border-[#FF5A3C] bg-[#FFF1EC] shadow-[0_3px_0_#FF5A3C]"
                        : "border-[#EADBC8] shadow-[0_3px_0_#EADBC8]",
                      "focus:border-[#FF5A3C] focus:ring-2 focus:ring-[#FF5A3C]/30",
                      error && "border-[#E5484D] text-[#E5484D]",
                    )}
                    aria-label={`Digit ${idx + 1} of 6`}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={otpLoading}
                disabled={!isCodeComplete || otpLoading}
                className="w-full font-bold text-base"
              >
                {t("auth.otp.submit")}
              </Button>
            </form>

            {/* Resend Cooldown Section */}
            <div className="mt-6 text-center">
              {resendCooldown > 0 ? (
                <p className="text-xs text-[#8E8798]">
                  {t("auth.otp.resend_in", { seconds: resendCooldown })}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-[#C9381F] hover:text-[#1E1B24] transition-colors font-bold underline underline-offset-4 disabled:opacity-50 cursor-pointer min-h-[44px] px-3"
                >
                  {resending ? t("auth.otp.resending") : t("auth.otp.resend")}
                </button>
              )}
            </div>

            {/* Back / Edit Email */}
            <div className="mt-6 pt-5 border-t-2 border-[#EADBC8] text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError(null);
                  setResendSuccess(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6E6878] hover:text-[#1E1B24] transition-colors cursor-pointer min-h-[44px] px-3 rounded-full"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("auth.otp.change_email")}
              </button>
            </div>
      </AuthShell>
    );
  }

  // ── Step 1: Account Creation Form ──────────────────────────────────────────
  return (
    <AuthShell sticker="🚀" language={<LanguageSelector compact variant="dark" />}>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-3xl text-[#1E1B24] mb-2 tracking-tight">
              {t("auth.signup.title")}
            </h1>
            <div className="flex justify-center gap-2 mb-3 text-2xl" aria-hidden="true">
              <span className="-rotate-6">🎉</span><span>🕹️</span><span className="rotate-6">🎬</span>
            </div>
            <p className="text-[#6E6878] text-sm leading-relaxed max-w-xs mx-auto">
              {t("auth.signup.subtitle")}
            </p>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />} className="mb-6">
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              id="signup-name"
              label={t("auth.signup.name")}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
              leftIcon={<User className="h-4 w-4" />}
              hint="This is how others will see you in arenas."
            />

            <Input
              id="signup-email"
              label={t("auth.signup.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              leftIcon={<Mail className="h-4 w-4" />}
            />

            {/* Password with strength indicator */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-password" className="evo-label">
                {t("auth.signup.password")} <span className="text-[#E5484D]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8798] pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="signup-password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  required
                  className="evo-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8798] hover:text-[#1E1B24] transition-colors cursor-pointer"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1.5 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: i <= pwStrength.score ? pwStrength.color : "rgba(30,27,36,0.1)",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: pwStrength.color }}>
                    {pwStrength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-confirm" className="evo-label">
                {t("auth.signup.confirm")} <span className="text-[#E5484D]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8798] pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="signup-confirm"
                  type={showConf ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                  className="evo-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConf((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8798] hover:text-[#1E1B24] transition-colors cursor-pointer"
                  aria-label={showConf ? "Hide password" : "Show password"}
                >
                  {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm && password !== confirm && (
                <p className="text-[#E5484D] text-xs font-semibold mt-0.5" role="alert">
                  Passwords do not match.
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-3 font-bold text-base"
            >
              {t("auth.signup.submit")}
            </Button>
          </form>

          {/* Terms */}
          <p className="text-center text-xs text-[#8E8798] mt-5 leading-relaxed">
            {t("auth.signup.terms")}{" "}
            <Link href="/terms" className="text-[#C9381F] font-bold hover:underline">
              {t("auth.signup.terms_link")}
            </Link>{" "}
            {t("auth.signup.and")}{" "}
            <Link href="/privacy" className="text-[#C9381F] font-bold hover:underline">
              {t("auth.signup.privacy_link")}
            </Link>.
          </p>

          <Divider className="my-6" />

          {/* Login link */}
          <p className="text-center text-sm text-[#6E6878]">
            {t("auth.signup.have_account")}{" "}
            <Link
              href="/login"
              className="text-[#C9381F] font-extrabold hover:text-[#1E1B24] transition-colors underline underline-offset-4"
            >
              {t("auth.signup.login_link")}
            </Link>
          </p>
    </AuthShell>
  );
}
