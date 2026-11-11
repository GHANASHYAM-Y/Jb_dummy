"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Alert } from "@/shared/ui";
import { LanguageSelector } from "@/components/LanguageSelector";

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
    <div className="min-h-screen bg-[#070B25] text-[#F5F7FF] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-radial from-[#315BFF]/20 via-[#8B2CFF]/15 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-1/4 w-[400px] h-[300px] bg-radial from-[#39DFFF]/15 to-transparent blur-3xl"
        aria-hidden="true"
      />

      {/* Mini header */}
      <div className="w-full max-w-md mb-8 flex items-center justify-between relative z-10 px-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#39DFFF] to-[#315BFF] flex items-center justify-center shadow-[0_0_16px_rgba(57,223,255,0.4)]">
            <span className="text-[#070B25] font-black text-xs tracking-wider">EQ</span>
          </div>
          <span className="font-display font-extrabold text-xl text-[#F5F7FF] tracking-tight group-hover:text-[#39DFFF] transition-colors">
            EVOAIQU
          </span>
        </Link>
        <LanguageSelector compact variant="dark" />
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="rounded-2xl p-6 sm:p-8 bg-[#101638]/90 backdrop-blur-xl border border-[rgba(57,223,255,0.2)] shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(49,91,255,0.15)]">
          <div className="mb-6">
            <h1 className="font-display font-black text-2xl text-[#F5F7FF] tracking-tight">
              Reset Password
            </h1>
            <p className="text-[#B8C3E0] text-sm mt-1.5 leading-relaxed">
              Enter your new account password below.
            </p>
          </div>

          {error && (
            <Alert
              variant="error"
              icon={<AlertCircle className="w-4 h-4 text-[#FF5370]" />}
              className="mb-5 bg-[rgba(255,83,112,0.12)] border-[rgba(255,83,112,0.3)] text-[#FF8599]"
            >
              {error}
            </Alert>
          )}

          {success ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[rgba(57,223,255,0.15)] border border-[#39DFFF]/40 text-[#39DFFF] flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(57,223,255,0.3)]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="font-bold text-[#F5F7FF] text-base">
                Password updated successfully!
              </p>
              <p className="text-xs text-[#B8C3E0]">
                Redirecting you to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-bold text-[#B8C3E0] uppercase tracking-wider mb-2"
                >
                  New Password <span className="text-[#FF5370]">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pr-10 bg-[#070B25]/80 border-[rgba(184,195,224,0.2)] text-[#F5F7FF] focus:border-[#39DFFF] focus:ring-[rgba(57,223,255,0.3)]"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A98C0] hover:text-[#F5F7FF] transition-colors"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-bold text-[#B8C3E0] uppercase tracking-wider mb-2"
                >
                  Confirm Password <span className="text-[#FF5370]">*</span>
                </label>
                <Input
                  id="confirm-password"
                  type={showPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  className="bg-[#070B25]/80 border-[rgba(184,195,224,0.2)] text-[#F5F7FF] focus:border-[#39DFFF] focus:ring-[rgba(57,223,255,0.3)]"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2 shadow-[0_0_24px_rgba(49,91,255,0.45)] hover:shadow-[0_0_32px_rgba(57,223,255,0.6)] font-bold text-base"
                id="reset-password-submit-btn"
              >
                <Lock className="w-4 h-4 mr-2" />
                Update Password
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-[#39DFFF] hover:underline"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
