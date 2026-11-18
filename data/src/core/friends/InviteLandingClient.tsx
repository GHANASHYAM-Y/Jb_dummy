"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Gamepad2,
  Sparkles,
  Trophy,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useI18n } from "@/core/i18n/I18nContext";
import { Alert, Avatar } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";

const PILL =
  "inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-full text-base font-bold border-2 transition-colors disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] focus-visible:ring-offset-2";
const PILL_PRIMARY =
  "bg-[#FF5A3C] border-[#FF5A3C] text-white shadow-[0_4px_0_#C9381F] hover:bg-[#FF6B4F]";
const PILL_SECONDARY =
  "bg-white border-[#EADBC8] text-[#1E1B24] shadow-[0_4px_0_#EADBC8] hover:border-[#1E1B24]";

interface InviteLandingClientProps {
  token: string;
  initialData: {
    ok: boolean;
    code?: string;
    message?: string;
    relationship?: string;
    inviter?: {
      display_name: string;
      avatar_url: string | null;
      evoora_id: string;
    };
  };
  isAuthenticated: boolean;
}

export function InviteLandingClient({
  token,
  initialData,
  isAuthenticated,
}: InviteLandingClientProps) {
  const { t } = useI18n();

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  // If token is invalid or expired
  if (!initialData.ok || !initialData.inviter) {
    return (
      <div className="w-full max-w-md mx-auto animate-scale-in">
        <div className="rounded-[26px] p-8 text-center space-y-6 bg-white border-2 border-[#EADBC8] shadow-[0_4px_0_#EADBC8]">
          <div className="w-16 h-16 rounded-[22px] bg-[#FFE9EA] border-2 border-[#E5484D]/40 flex items-center justify-center mx-auto text-[#E5484D]">
            <UserX className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-[#1E1B24] mb-2">
              {t("invite.invalid_title")}
            </h1>
            <p className="text-[#6E6878] text-sm leading-relaxed">
              {t("invite.invalid_desc")}
            </p>
          </div>
          <Link href="/" className={cn(PILL, PILL_SECONDARY, "w-full")}>
            {t("invite.back_home")}
          </Link>
        </div>
      </div>
    );
  }

  const { inviter } = initialData;
  const relationship = initialData.relationship || (isAuthenticated ? "can_send" : "unauthenticated");

  const handleSendFriendRequest = async () => {
    if (sending || sentSuccess) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/friends/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "already_friends") {
          setError(t("invite.already_friends", { name: inviter.display_name }));
        } else if (data.code === "request_pending") {
          setError(t("invite.pending_request", { name: inviter.display_name }));
        } else if (data.code === "blocked") {
          setError(t("invite.blocked"));
        } else {
          setError(data.error || t("common.error"));
        }
        return;
      }

      setSentSuccess(true);
    } catch {
      setError(t("common.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-scale-in">
      <div className="rounded-[26px] p-8 space-y-7 bg-white border-2 border-[#EADBC8] shadow-[0_4px_0_#EADBC8]">
        {/* Inviter Profile Card */}
        <div className="text-center space-y-4">
          <div className="relative inline-block mx-auto">
            <Avatar
              src={inviter.avatar_url}
              name={inviter.display_name}
              size="xl"
              className="border-4 border-[#FFC23D]"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#8C7BFF] flex items-center justify-center text-white border-2 border-white">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <div>
            <h1 className="font-display text-2xl text-[#1E1B24]">
              {inviter.display_name}
            </h1>
            <div className="flex justify-center mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFF6EC] border-2 border-[#EADBC8] text-[#1E1B24] text-xs font-mono font-bold tracking-wider">
                {inviter.evoora_id}
              </span>
            </div>
          </div>

          <p className="text-[#6E6878] text-sm leading-relaxed">
            {t("invite.subtitle", { name: inviter.display_name })}
          </p>
        </div>

        {/* Feedback / Alerts */}
        {error && (
          <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
            {error}
          </Alert>
        )}

        {/* State 1: Successfully sent friend request in this session */}
        {sentSuccess ? (
          <div className="space-y-5 text-center pt-2">
            <div className="w-14 h-14 rounded-[22px] bg-[#E3FAF3] border-2 border-[#B7EEDD] flex items-center justify-center mx-auto text-[#0B7A60]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-xl text-[#1E1B24]">
                {t("invite.request_sent")}
              </p>
              <p className="text-[#6E6878] text-sm mt-1.5 leading-relaxed">
                {t("invite.request_sent_desc", { name: inviter.display_name })}
              </p>
            </div>
            <Link href="/friends" className={cn(PILL, PILL_PRIMARY, "w-full")}>
              {t("invite.view_friends")}
            </Link>
          </div>
        ) : relationship === "self" ? (
          /* State 2: Self invitation */
          <div className="space-y-4 text-center">
            <Alert variant="info" icon={<AlertCircle className="h-4 w-4" />}>
              {t("invite.self_invite")}
            </Alert>
            <Link href="/friends" className={cn(PILL, PILL_SECONDARY, "w-full")}>
              {t("invite.view_friends")}
            </Link>
          </div>
        ) : relationship === "already_friends" ? (
          /* State 3: Already friends */
          <div className="space-y-4 text-center">
            <Alert variant="success" icon={<UserCheck className="h-4 w-4" />}>
              {t("invite.already_friends", { name: inviter.display_name })}
            </Alert>
            <Link href="/play/rps" className={cn(PILL, PILL_PRIMARY, "w-full")}>
              {t("invite.play_games")}
            </Link>
          </div>
        ) : relationship === "request_pending" ? (
          /* State 4: Friend request already pending */
          <div className="space-y-4 text-center">
            <Alert variant="info" icon={<AlertCircle className="h-4 w-4" />}>
              {t("invite.pending_request", { name: inviter.display_name })}
            </Alert>
            <Link href="/friends" className={cn(PILL, PILL_SECONDARY, "w-full")}>
              {t("invite.view_friends")}
            </Link>
          </div>
        ) : relationship === "blocked" ? (
          /* State 5: Blocked relation */
          <div className="space-y-4 text-center">
            <Alert variant="error" icon={<ShieldAlert className="h-4 w-4" />}>
              {t("invite.blocked")}
            </Alert>
            <Link href="/" className={cn(PILL, "w-full bg-transparent border-transparent text-[#6E6878] hover:text-[#1E1B24]")}>
              {t("invite.back_home")}
            </Link>
          </div>
        ) : !isAuthenticated ? (
          /* State 6: Unauthenticated visitor — preserved return flow */
          <div className="space-y-6">
            <div className="p-5 rounded-[22px] bg-[#EEEBFF] border-2 border-[#D7D0FF] space-y-3.5">
              <div className="flex items-center gap-3 text-sm text-[#4B4560]">
                <Gamepad2 className="h-5 w-5 text-[#FF5A3C] flex-shrink-0" />
                <span>Play real-time multiplayer Rock, Paper, Scissors &amp; Chess</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#4B4560]">
                <Sparkles className="h-5 w-5 text-[#8C7BFF] flex-shrink-0" />
                <span>Win matches and assign fun, safe video dares</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#4B4560]">
                <Trophy className="h-5 w-5 text-[#E9A912] flex-shrink-0" />
                <span>Track head-to-head match histories with friends</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
                className={cn(PILL, PILL_PRIMARY, "w-full")}
              >
                {t("invite.signup_to_connect")}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                className={cn(PILL, PILL_SECONDARY, "w-full")}
              >
                {t("invite.login_to_connect")}
              </Link>
            </div>
          </div>
        ) : (
          /* State 7: Authenticated user — can send friend request */
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleSendFriendRequest}
              disabled={sending}
              className={cn(PILL, PILL_PRIMARY, "w-full")}
            >
              <UserPlus className="h-4 w-4" />
              {t("invite.send_request")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
