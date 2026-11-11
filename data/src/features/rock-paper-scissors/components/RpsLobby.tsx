"use client";

import React, { useState, useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Gamepad2, UserPlus, Clock, Check, X, RefreshCw, AlertCircle,
  ChevronRight, Trophy, Users,
} from "lucide-react";
import { useI18n } from "@/core/i18n/I18nContext";
import { Button, Avatar, Alert, Spinner, EvoIdBadge } from "@/shared/ui";
import { cn, timeAgo } from "@/shared/lib/utils";
import type { FriendEntry } from "@/core/supabase/database";
import { RandomMatchmakingCard } from "@/features/rock-paper-scissors/matchmaking/RandomMatchmakingCard";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameInviteRow {
  invite_id: string;
  direction: "incoming" | "outgoing";
  other_id: string;
  other_name: string;
  other_evoora_id: string;
  other_avatar: string | null;
  status: string;
  expires_at: string;
  match_id: string | null;
  created_at: string;
  is_active?: boolean;
}

// ── RpsLobby ──────────────────────────────────────────────────────────────────

export function RpsLobby({ friends }: { friends: FriendEntry[]; userId?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [invites, setInvites] = useState<GameInviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const setBusy = (id: string) => setBusyIds((s) => new Set(s).add(id));
  const clearBusy = (id: string) => setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/rps/invite");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const rows: GameInviteRow[] = data.invites ?? [];
      setInvites(rows);

      // Only auto-redirect if there is a genuinely active match (phase = 'active').
      // Completed, cancelled, or terminal matches must never be reopened.
      const active = rows.find(r => r.status === "accepted" && r.match_id && r.is_active === true);
      if (active?.match_id) {
        router.replace(`/play/rps/${active.match_id}`);
      }
    } catch {
      setLoadError(t("rps.load_error"));
    } finally {
      setLoading(false);
    }
  }, [t, router]);

  useEffect(() => {
    void (async () => { await loadInvites(); })();
  }, [loadInvites]);

  const handleSendInvite = useCallback(async (friendId: string) => {
    setSendingTo(friendId);
    setMsg(null);
    try {
      const res = await fetch("/api/rps/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitee_id: friendId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = data.code as string;
        setMsg({
          type: "error",
          text: code === "not_friends" ? t("rps.not_friends")
            : code === "invite_pending" ? t("rps.invite_pending")
            : code === "match_active" ? t("rps.match_active")
            : t("common.error"),
        });
      } else {
        setMsg({ type: "success", text: t("rps.invite_sent") });
        startTransition(() => { void loadInvites(); });
      }
    } finally {
      setSendingTo(null);
    }
  }, [t, loadInvites]);

  const handleRespond = useCallback(async (inviteId: string, action: "accept" | "decline") => {
    setBusy(inviteId);
    try {
      const res = await fetch("/api/rps/invite/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId, action }),
      });
      const data = await res.json();
      if (res.ok && action === "accept" && data.match_id) {
        router.push(`/play/rps/${data.match_id}`);
      } else {
        startTransition(() => { void loadInvites(); });
      }
    } finally {
      clearBusy(inviteId);
    }
  }, [router, loadInvites]);

  const handleCancel = useCallback(async (inviteId: string) => {
    setBusy(inviteId);
    try {
      await fetch("/api/rps/invite/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId }),
      });
      startTransition(() => { void loadInvites(); });
    } finally {
      clearBusy(inviteId);
    }
  }, [loadInvites]);

  const incoming = invites.filter(i => i.direction === "incoming" && i.status === "pending");
  const outgoing = invites.filter(i => i.direction === "outgoing" && i.status === "pending");

  return (
    <div className="space-y-8">
      {msg && (
        <Alert
          variant={msg.type === "success" ? "success" : "error"}
          icon={msg.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        >
          {msg.text}
        </Alert>
      )}

      {/* ── Random Matchmaking (Milestone 5) ── */}
      <RandomMatchmakingCard />

      {/* ── Incoming invites ── */}
      {incoming.length > 0 && (
        <section aria-labelledby="incoming-heading" className="space-y-3">
          <h2 id="incoming-heading" className="text-xs font-bold text-[#39DFFF] uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#39DFFF] animate-pulse" />
            {t("rps.incoming_invites")}
          </h2>
          <div className="space-y-3">
            {incoming.map(inv => (
              <div key={inv.invite_id} className="rounded-2xl p-5 flex items-center gap-4 bg-[#101638]/90 backdrop-blur-md border border-[rgba(57,223,255,0.25)] shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-fade-in text-[#F5F7FF]">
                <Avatar src={inv.other_avatar} name={inv.other_name} size="md" className="border border-[#39DFFF]/40" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-[#F5F7FF] truncate">{inv.other_name}</p>
                  <EvoIdBadge id={inv.other_evoora_id} className="mt-0.5" />
                  <p className="text-xs text-[#8A98C0] mt-1">
                    {t("rps.expires_in")}: {timeAgo(inv.expires_at)}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="primary" size="sm"
                    onClick={() => handleRespond(inv.invite_id, "accept")}
                    disabled={busyIds.has(inv.invite_id)}
                    loading={busyIds.has(inv.invite_id)}
                    aria-label={t("rps.accept")}
                    id={`accept-invite-${inv.invite_id}`}
                    className="shadow-[0_0_16px_rgba(49,91,255,0.4)]"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t("rps.accept")}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleRespond(inv.invite_id, "decline")}
                    disabled={busyIds.has(inv.invite_id)}
                    aria-label={t("rps.decline")}
                    className="text-[#FF5370] hover:bg-[#FF5370]/15 border border-[#FF5370]/30"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Outgoing invites ── */}
      {outgoing.length > 0 && (
        <section aria-labelledby="outgoing-heading" className="space-y-3">
          <h2 id="outgoing-heading" className="text-xs font-bold text-[#8A98C0] uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8A98C0]" />
            {t("rps.sent_invites")}
          </h2>
          <div className="space-y-3">
            {outgoing.map(inv => (
              <div key={inv.invite_id} className="rounded-2xl p-5 flex items-center gap-4 bg-[#101638]/90 backdrop-blur-md border border-[#1C2758] shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-fade-in text-[#F5F7FF]">
                <Avatar src={inv.other_avatar} name={inv.other_name} size="md" className="border border-[#1C2758]" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-[#F5F7FF] truncate">{inv.other_name}</p>
                  <EvoIdBadge id={inv.other_evoora_id} className="mt-0.5" />
                  <p className="text-xs text-[#8A98C0] mt-1 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-[#39DFFF]" />
                    {t("rps.waiting_response")}
                  </p>
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => handleCancel(inv.invite_id)}
                  disabled={busyIds.has(inv.invite_id)}
                  loading={busyIds.has(inv.invite_id)}
                  aria-label={t("rps.cancel_invite")}
                  className="text-[#8A98C0] hover:text-[#FF5370] hover:bg-[#FF5370]/15 border border-[#1C2758] flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Challenge a friend ── */}
      <section aria-labelledby="friends-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="friends-heading" className="text-xs font-bold text-[#8A98C0] uppercase tracking-wider">
            {t("rps.challenge_friend")}
          </h2>
          <Button
            variant="ghost" size="sm"
            onClick={() => { setLoading(true); void loadInvites(); }}
            aria-label={t("common.retry")}
            className="text-[#39DFFF] hover:bg-[#39DFFF]/10"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>

        {loadError && (
          <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
            {loadError}
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="text-[#39DFFF]" />
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-3 bg-[#101638]/90 border border-[#1C2758] shadow-sm text-[#F5F7FF]">
            <Users className="h-10 w-10 text-[#8A98C0]" />
            <p className="text-[#B8C3E0] text-sm leading-relaxed">{t("rps.no_friends")}</p>
            <Button variant="secondary" size="sm" onClick={() => router.push("/friends")} className="bg-[#070B25] hover:bg-[#151D48] text-[#F5F7FF] border-[#1C2758]">
              <UserPlus className="h-4 w-4 mr-2 text-[#39DFFF]" />
              {t("rps.add_friends")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map(f => (
              <div key={f.friend_id} className="rounded-2xl p-4 sm:p-5 flex items-center gap-4 bg-[#101638]/90 backdrop-blur-md border border-[rgba(57,223,255,0.15)] hover:border-[#39DFFF]/40 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all animate-fade-in text-[#F5F7FF]">
                <Avatar src={f.avatar_url} name={f.display_name} size="md" className="border border-[#39DFFF]/30" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-[#F5F7FF] truncate">{f.display_name}</p>
                  <EvoIdBadge id={f.evoora_id} className="mt-0.5" />
                </div>
                <Button
                  variant="primary" size="sm"
                  onClick={() => handleSendInvite(f.friend_id)}
                  loading={sendingTo === f.friend_id}
                  disabled={sendingTo !== null || outgoing.some(o => o.other_id === f.friend_id)}
                  id={`challenge-${f.friend_id}`}
                  aria-label={`${t("rps.challenge")} ${f.display_name}`}
                  className="shadow-[0_0_16px_rgba(49,91,255,0.4)]"
                >
                  <Gamepad2 className="h-4 w-4 mr-1.5" />
                  {outgoing.some(o => o.other_id === f.friend_id) ? t("rps.invited") : t("rps.challenge")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History link */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost" size="sm"
          onClick={() => router.push("/history")}
          className="text-[#39DFFF] hover:bg-[#39DFFF]/10 gap-2 font-semibold"
        >
          <Trophy className="h-4 w-4" />
          {t("rps.view_history")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
