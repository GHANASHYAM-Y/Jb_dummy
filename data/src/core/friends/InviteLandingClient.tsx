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
import { Button, Alert, Avatar, EvoIdBadge } from "@/shared/ui";

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
        <div className="rounded-2xl p-8 text-center space-y-6 bg-[#101638]/90 backdrop-blur-xl border border-[rgba(255,83,112,0.3)] shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(255,83,112,0.15)]">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(255,83,112,0.15)] border border-[#FF5370]/40 flex items-center justify-center mx-auto text-[#FF5370] shadow-[0_0_20px_rgba(255,83,112,0.3)]">
            <UserX className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-[#F5F7FF] mb-2 tracking-tight">
              {t("invite.invalid_title")}
            </h1>
            <p className="text-[#B8C3E0] text-sm leading-relaxed">
              {t("invite.invalid_desc")}
            </p>
          </div>
          <Link href="/">
            <Button variant="secondary" className="w-full bg-[#070B25] hover:bg-[#151D48] text-[#F5F7FF] border-[#1C2758]">
              {t("invite.back_home")}
            </Button>
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
      <div className="rounded-2xl p-8 space-y-7 bg-[#101638]/90 backdrop-blur-xl border border-[rgba(57,223,255,0.2)] shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(49,91,255,0.15)]">
        {/* Inviter Profile Card */}
        <div className="text-center space-y-4">
          <div className="relative inline-block mx-auto">
            <Avatar
              src={inviter.avatar_url}
              name={inviter.display_name}
              size="xl"
              className="border-2 border-[#39DFFF] shadow-[0_0_20px_rgba(57,223,255,0.4)]"
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-[#39DFFF] to-[#315BFF] flex items-center justify-center text-[#070B25] border-2 border-[#101638] shadow-md">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>

          <div>
            <h1 className="font-display font-black text-2xl text-[#F5F7FF] tracking-tight">
              {inviter.display_name}
            </h1>
            <div className="flex justify-center mt-2">
              <EvoIdBadge id={inviter.evoora_id} />
            </div>
          </div>

          <p className="text-[#B8C3E0] text-sm leading-relaxed">
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
            <div className="w-14 h-14 rounded-2xl bg-[rgba(57,223,255,0.15)] border border-[#39DFFF]/40 flex items-center justify-center mx-auto text-[#39DFFF] shadow-[0_0_24px_rgba(57,223,255,0.3)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="font-bold text-[#F5F7FF] text-lg">
                {t("invite.request_sent")}
              </p>
              <p className="text-[#B8C3E0] text-xs mt-1.5 leading-relaxed">
                {t("invite.request_sent_desc", { name: inviter.display_name })}
              </p>
            </div>
            <Link href="/friends">
              <Button variant="primary" className="w-full shadow-[0_0_24px_rgba(49,91,255,0.4)]">
                {t("invite.view_friends")}
              </Button>
            </Link>
          </div>
        ) : relationship === "self" ? (
          /* State 2: Self invitation */
          <div className="space-y-4 text-center">
            <Alert variant="info" icon={<AlertCircle className="h-4 w-4" />}>
              {t("invite.self_invite")}
            </Alert>
            <Link href="/friends">
              <Button variant="secondary" className="w-full bg-[#070B25] text-[#F5F7FF] border-[#1C2758]">
                {t("invite.view_friends")}
              </Button>
            </Link>
          </div>
        ) : relationship === "already_friends" ? (
          /* State 3: Already friends */
          <div className="space-y-4 text-center">
            <Alert variant="success" icon={<UserCheck className="h-4 w-4" />}>
              {t("invite.already_friends", { name: inviter.display_name })}
            </Alert>
            <Link href="/play/rps">
              <Button variant="primary" className="w-full shadow-[0_0_24px_rgba(49,91,255,0.4)]">
                {t("invite.play_games")}
              </Button>
            </Link>
          </div>
        ) : relationship === "request_pending" ? (
          /* State 4: Friend request already pending */
          <div className="space-y-4 text-center">
            <Alert variant="info" icon={<AlertCircle className="h-4 w-4" />}>
              {t("invite.pending_request", { name: inviter.display_name })}
            </Alert>
            <Link href="/friends">
              <Button variant="secondary" className="w-full bg-[#070B25] text-[#F5F7FF] border-[#1C2758]">
                {t("invite.view_friends")}
              </Button>
            </Link>
          </div>
        ) : relationship === "blocked" ? (
          /* State 5: Blocked relation */
          <div className="space-y-4 text-center">
            <Alert variant="error" icon={<ShieldAlert className="h-4 w-4" />}>
              {t("invite.blocked")}
            </Alert>
            <Link href="/">
              <Button variant="ghost" className="w-full text-[#B8C3E0]">
                {t("invite.back_home")}
              </Button>
            </Link>
          </div>
        ) : !isAuthenticated ? (
          /* State 6: Unauthenticated visitor — preserved return flow */
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-[#070B25]/80 border border-[#1C2758] space-y-3.5">
              <div className="flex items-center gap-3 text-xs text-[#B8C3E0]">
                <Gamepad2 className="h-4 w-4 text-[#39DFFF] flex-shrink-0" />
                <span>Play real-time multiplayer Rock, Paper, Scissors & Chess</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#B8C3E0]">
                <Sparkles className="h-4 w-4 text-[#FF5370] flex-shrink-0" />
                <span>Win matches and assign fun, safe video dares</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#B8C3E0]">
                <Trophy className="h-4 w-4 text-[#39DFFF] flex-shrink-0" />
                <span>Track head-to-head match histories with friends</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}>
                <Button variant="primary" size="lg" className="w-full justify-center shadow-[0_0_24px_rgba(49,91,255,0.45)] font-bold text-base">
                  {t("invite.signup_to_connect")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
                <Button variant="secondary" size="md" className="w-full justify-center bg-[#070B25] hover:bg-[#151D48] text-[#F5F7FF] border-[#1C2758]">
                  {t("invite.login_to_connect")}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* State 7: Authenticated user — can send friend request */
          <div className="space-y-4">
            <Button
              variant="primary"
              size="lg"
              loading={sending}
              onClick={handleSendFriendRequest}
              className="w-full shadow-[0_0_24px_rgba(49,91,255,0.45)] font-bold text-base"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t("invite.send_request")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
