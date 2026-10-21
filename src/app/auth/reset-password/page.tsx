"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Alert } from "@/components/ui";
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
    <div className="min-h-screen bg-[#F7F8F4] flex flex-col items-center justify-center px-4 py-12">
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
        <div className="evo-card p-6 sm:p-8 bg-white border border-[#E2E8E2] shadow-card">
          <div className="mb-6">
            <h1 className="font-display font-black text-2xl text-[#203331] tracking-tight">
              Reset Password
            </h1>
            <p className="text-[#65736F] text-xs mt-1">
              Enter your new account password below.
            </p>
          </div>

          {error && (
            <Alert
              variant="error"
              icon={<AlertCircle className="w-4 h-4" />}
              className="mb-4"
            >
              {error}
            </Alert>
          )}

          {success ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#DDF2EB] text-[#167D78] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="font-bold text-[#203331] text-sm">
                Password updated successfully!
              </p>
              <p className="text-xs text-[#65736F]">
                Redirecting you to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-bold text-[#203331] uppercase tracking-wider mb-1.5"
                >
                  New Password <span className="text-[#D95F49]">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9B97] hover:text-[#203331] transition-colors"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-bold text-[#203331] uppercase tracking-wider mb-1.5"
                >
                  Confirm Password <span className="text-[#D95F49]">*</span>
                </label>
                <Input
                  id="confirm-password"
                  type={showPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full mt-2"
                id="reset-password-submit-btn"
              >
                <Lock className="w-4 h-4 mr-1.5" />
                Update Password
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-[#167D78] hover:underline"
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
