"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/core/supabase/client";
import { Button, Input, Alert } from "@/shared/ui";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { AuthShell, authLabelClass } from "@/core/auth/AuthShell";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      if (!password || password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });

        if (updateError) {
          setError(updateError.message);
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          router.push("/login?message=password_updated");
        }, 2000);
      } catch {
        setError("An unexpected error occurred while resetting your password.");
      } finally {
        setLoading(false);
      }
    },
    [password, confirmPassword, loading, router],
  );

  return (
    <AuthShell sticker="🔐" language={<LanguageSelector compact variant="dark" />}>
          <div className="mb-6">
            <h1 className="font-display font-bold text-3xl text-[#1E1B24] tracking-tight">
              Reset Password
            </h1>
            <p className="text-[#6E6878] text-sm mt-1.5 leading-relaxed">
              Pick a fresh password and you&apos;re back in the game. Enter your new account password below.
            </p>
          </div>

          {error && (
            <Alert
              variant="error"
              icon={<AlertCircle className="w-4 h-4 text-[#E5484D]" />}
              className="mb-5"
            >
              {error}
            </Alert>
          )}

          {success ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#E3FAF3] border-2 border-[#B7EEDD] text-[#0B8F70] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="font-bold text-[#1E1B24] text-base">
                Password updated successfully!
              </p>
              <p className="text-xs text-[#6E6878]">
                Redirecting you to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="new-password"
                  className={`block mb-2 ${authLabelClass}`}
                >
                  New Password <span className="text-[#E5484D]">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pr-12"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full text-[#6E6878] hover:text-[#1E1B24] hover:bg-[#F5EADC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] transition-colors"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className={`block mb-2 ${authLabelClass}`}
                >
                  Confirm Password <span className="text-[#E5484D]">*</span>
                </label>
                <Input
                  id="confirm-password"
                  type={showPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  className=""
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2 font-bold text-base"
                id="reset-password-submit-btn"
              >
                <Lock className="w-4 h-4 mr-2" />
                Update Password
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center min-h-[44px] px-3 text-xs font-bold text-[#C9381F] hover:underline"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
    </AuthShell>
  );
}
