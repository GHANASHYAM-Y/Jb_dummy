"use client";

import React, { useState, useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus, Clock, Check, X, RefreshCw, AlertCircle,
  ChevronRight, Trophy, Users,
} from "lucide-react";
import { useI18n } from "@/core/i18n/I18nContext";
import { Button, Avatar, Alert, Spinner, EvoIdBadge } from "@/shared/ui";
import { cn, timeAgo } from "@/shared/lib/utils";
import type { FriendEntry } from "@/core/supabase/database";
import { RandomMatchmakingCard } from "@/features/rock-paper-scissors/matchmaking/RandomMatchmakingCard";
import {
  LobbyFrame, LobbyBackLink, PickWhoRow, NumberedRules, InviteRailCard, RecordRailCard,
  type PickFriend,
} from "@/shared/game/LobbyChrome";

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

  const challengeLabel = (name: string) => `${t("rps.challenge")} ${name}`;

  return (
    <LobbyFrame
      rail={
        <>
          <InviteRailCard
            label={
              incoming.length > 0
                ? `${incoming.length} ${t("rps.incoming_invites")}`
                : t("rps.challenge_friend")
            }
          />
          <RecordRailCard />
        </>
      }
    >
      <LobbyBackLink />

      {msg && (
        <Alert
          variant={msg.type === "success" ? "success" : "error"}
          icon={msg.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        >
          {msg.text}
        </Alert>
      )}

      {/* ── Random Matchmaking (Milestone 5) — doubles as the lobby hero ── */}
      <RandomMatchmakingCard
        hero={{
          emoji: "✊",
          eyebrow: "Synchronous 1v1 Arena",
          title: "Rock, Paper, Scissors",
          tagline: "First to 5 wins. 10-second rounds, and the loser owes a dare.",
          chips: ["1v1", "First to 5", "10s rounds"],
        }}
      />

      {/* ── Incoming invites ── */}
      {incoming.length > 0 && (
        <section aria-labelledby="incoming-heading" className="space-y-3">
          <h2 id="incoming-heading" className="font-display font-bold text-xl text-[#1E1B24] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5A3C] animate-pulse" />
            {t("rps.incoming_invites")}
          </h2>
          <div className="space-y-3">
            {incoming.map(inv => (
              <div key={inv.invite_id} className="b-card b-card-lilac flex items-center gap-4 animate-fade-in text-[#1E1B24]">
                <Avatar src={inv.other_avatar} name={inv.other_name} size="md" className="border-2 border-white" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-[#1E1B24] truncate">{inv.other_name}</p>
                  <EvoIdBadge id={inv.other_evoora_id} className="mt-0.5" />
                  <p className="text-xs text-[#6E6878] mt-1">
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
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t("rps.accept")}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleRespond(inv.invite_id, "decline")}
                    disabled={busyIds.has(inv.invite_id)}
                    aria-label={t("rps.decline")}
                    className="min-w-[44px] min-h-[44px] text-[#E5484D] hover:bg-[#E5484D]/15 border-2 border-[#E5484D]/30"
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
          <h2 id="outgoing-heading" className="font-display font-bold text-xl text-[#1E1B24] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8E8798]" />
            {t("rps.sent_invites")}
          </h2>
          <div className="space-y-3">
            {outgoing.map(inv => (
              <div key={inv.invite_id} className="b-card flex items-center gap-4 animate-fade-in text-[#1E1B24]">
                <Avatar src={inv.other_avatar} name={inv.other_name} size="md" className="border-2 border-[#EADBC8]" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-[#1E1B24] truncate">{inv.other_name}</p>
                  <EvoIdBadge id={inv.other_evoora_id} className="mt-0.5" />
                  <p className="text-xs text-[#6E6878] mt-1 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-[#FF5A3C]" />
                    {t("rps.waiting_response")}
                  </p>
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => handleCancel(inv.invite_id)}
                  disabled={busyIds.has(inv.invite_id)}
                  loading={busyIds.has(inv.invite_id)}
                  aria-label={t("rps.cancel_invite")}
                  className="min-w-[44px] min-h-[44px] text-[#6E6878] hover:text-[#E5484D] hover:bg-[#E5484D]/15 border-2 border-[#EADBC8] flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Pick who to play ── */}
      <section aria-labelledby="friends-heading" className="b-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="friends-heading" className="font-display font-bold text-xl text-[#1E1B24]">
            {t("rps.challenge_friend")}
          </h2>
          <Button
            variant="ghost" size="sm"
            onClick={() => { setLoading(true); void loadInvites(); }}
            aria-label={t("common.retry")}
            className="min-w-[44px] text-[#FF5A3C] hover:bg-[#FF5A3C]/10"
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
            <Spinner className="text-[#FF5A3C]" />
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-[22px] bg-[#FFF6EC] border-2 border-dashed border-[#EADBC8] p-8 flex flex-col items-center text-center gap-3 text-[#1E1B24]">
            <Users className="h-10 w-10 text-[#8E8798]" />
            <p className="text-[#6E6878] text-sm leading-relaxed">{t("rps.no_friends")}</p>
            <Button variant="secondary" size="sm" onClick={() => router.push("/friends")}>
              <UserPlus className="h-4 w-4 mr-2 text-[#FF5A3C]" />
              {t("rps.add_friends")}
            </Button>
          </div>
        ) : (
          <PickWhoRow
            title={t("rps.challenge")}
            friends={friends.map((f): PickFriend => {
              const invited = outgoing.some(o => o.other_id === f.friend_id);
              return {
                id: f.friend_id,
                name: f.display_name,
                avatar: f.avatar_url,
                buttonId: `challenge-${f.friend_id}`,
                ariaLabel: challengeLabel(f.display_name),
                disabled: sendingTo !== null || invited,
                busy: sendingTo === f.friend_id,
                tag: invited ? t("rps.invited") : undefined,
              };
            })}
            onPick={handleSendInvite}
          />
        )}
      </section>

      {/* ── How it works ── */}
      <section className="b-card space-y-3">
        <h2 className="font-display font-bold text-xl text-[#1E1B24]">How it works</h2>
        <NumberedRules
          rules={[
            "Throw Rock, Paper or Scissors within 10 seconds each round.",
            "Rock beats Scissors, Scissors beats Paper, Paper beats Rock.",
            "First to win 5 rounds takes the match.",
            "The loser owes a dare, so play to win.",
          ]}
        />
      </section>

      {/* History link */}
      <div className="flex justify-center pt-1">
        <Button
          variant="ghost" size="sm"
          onClick={() => router.push("/history")}
          className="text-[#FF5A3C] hover:bg-[#FF5A3C]/10 gap-2 font-semibold"
        >
          <Trophy className="h-4 w-4" />
          {t("rps.view_history")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </LobbyFrame>
  );
}
