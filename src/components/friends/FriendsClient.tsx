"use client";

import React, {
  useState,
  useCallback,
  useTransition,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Search,
  AlertCircle,
  Check,
  X,
  Trash2,
  Ban,
  Share2,
  Copy,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import {
  Button,
  Input,
  Alert,
  Avatar,
  Badge,
  EvoIdBadge,
  Spinner,
} from "@/components/ui";
import { cn, isValidEvoId } from "@/lib/utils";
import type { FriendRequest } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FriendEntry {
  request_id: string;
  friend_id: string;
  evoora_id: string;
  display_name: string;
  avatar_url: string | null;
  is_public: boolean;
  since: string;
}

interface BlockedEntry {
  blocked_id: string;
  display_name: string;
  evoora_id: string;
  avatar_url: string | null;
  blocked_at: string;
}

export interface UserSearchResult {
  id: string;
  display_name: string;
  evoora_id: string;
  avatar_url: string | null;
  bio: string | null;
  friendship_status: "friend" | "pending_sent" | "pending_received" | "none";
  request_id?: string;
}

type Tab = "find" | "friends" | "incoming" | "sent" | "blocked";

interface FriendsClientProps {
  userId: string;
}

// ── FriendCard ────────────────────────────────────────────────────────────────

function FriendCard({
  friend,
  onRemove,
  onBlock,
  busy,
}: {
  friend: FriendEntry;
  onRemove: (friendId: string, requestId: string) => void;
  onBlock: (friendId: string, name: string) => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="evo-card p-4 flex items-center gap-4 bg-white border border-[#E2E8E2] animate-fade-in shadow-xs">
      <Avatar src={friend.avatar_url} name={friend.display_name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#203331] truncate">{friend.display_name}</p>
        <EvoIdBadge id={friend.evoora_id} className="mt-0.5" />
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(friend.friend_id, friend.request_id)}
          disabled={busy}
          aria-label={t("friends.remove")}
          className="text-[#8E9B97] hover:text-[#D95F49] flex-shrink-0"
        >
          {busy ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBlock(friend.friend_id, friend.display_name)}
          disabled={busy}
          aria-label={t("blocks.block")}
          title={t("blocks.block")}
          className="text-[#8E9B97] hover:text-[#D95F49] flex-shrink-0"
        >
          <Ban className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── BlockedCard ───────────────────────────────────────────────────────────────

function BlockedCard({
  user,
  onUnblock,
  busy,
}: {
  user: BlockedEntry;
  onUnblock: (id: string, name: string) => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="evo-card p-4 flex items-center gap-4 bg-white border border-[#E2E8E2] animate-fade-in shadow-xs">
      <Avatar src={user.avatar_url} name={user.display_name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#203331] truncate">{user.display_name}</p>
        <EvoIdBadge id={user.evoora_id} className="mt-0.5" />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onUnblock(user.blocked_id, user.display_name)}
        disabled={busy}
        className="text-[#D95F49] hover:bg-[#FCE6DE] flex-shrink-0"
      >
        {busy ? <Spinner size="sm" /> : t("blocks.unblock")}
      </Button>
    </div>
  );
}

// ── UserPreviewCard ───────────────────────────────────────────────────────────

function UserPreviewCard({
  user,
  onSendRequest,
  onAccept,
  onCancel,
  busy,
}: {
  user: UserSearchResult;
  onSendRequest: (evoId: string) => void;
  onAccept: (reqId: string) => void;
  onCancel: (reqId: string) => void;
  busy: boolean;
}) {
  return (
    <div className="evo-card p-4 flex items-center gap-4 bg-white border border-[#E2E8E2] rounded-2xl shadow-xs animate-fade-in">
      <Avatar src={user.avatar_url} name={user.display_name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#203331] truncate text-sm">{user.display_name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <EvoIdBadge id={user.evoora_id} />
          {user.bio && (
            <span className="text-xs text-[#65736F] truncate max-w-[220px]">
              {user.bio}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {user.friendship_status === "friend" && (
          <span className="px-3 py-1 rounded-xl bg-[#DDF2EB] text-[#167D78] text-xs font-bold border border-[rgba(22,125,120,0.2)]">
            Friends ✓
          </span>
        )}
        {user.friendship_status === "pending_sent" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => user.request_id && onCancel(user.request_id)}
            disabled={busy || !user.request_id}
            className="text-xs text-[#65736F] hover:text-[#D95F49]"
          >
            Requested (Cancel)
          </Button>
        )}
        {user.friendship_status === "pending_received" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => user.request_id && onAccept(user.request_id)}
            disabled={busy || !user.request_id}
            className="text-xs font-bold"
          >
            Accept
          </Button>
        )}
        {user.friendship_status === "none" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSendRequest(user.evoora_id)}
            disabled={busy}
            className="text-xs font-bold"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Add Friend
          </Button>
        )}
      </div>
    </div>
  );
}

// ── RequestCard ───────────────────────────────────────────────────────────────

function RequestCard({
  req,
  currentUserId,
  onRespond,
  onCancel,
  busy,
}: {
  req: FriendRequest & { sender_profile?: { display_name: string; evoora_id: string; avatar_url: string | null } };
  currentUserId: string;
  onRespond: (requestId: string, action: "accept" | "reject") => void;
  onCancel: (requestId: string) => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  const isIncoming = req.receiver_id === currentUserId;
  const profile = req.sender_profile;

  return (
    <div className="evo-card p-4 flex items-center gap-4 bg-white border border-[#E2E8E2] animate-fade-in shadow-xs">
      <Avatar
        src={profile?.avatar_url ?? null}
        name={profile?.display_name ?? "?"}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#203331] truncate">
          {profile?.display_name ?? "Unknown"}
        </p>
        {profile?.evoora_id && <EvoIdBadge id={profile.evoora_id} className="mt-0.5" />}
      </div>

      {isIncoming ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onRespond(req.id, "accept")}
            disabled={busy}
            aria-label={t("friends.accept")}
          >
            {busy ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRespond(req.id, "reject")}
            disabled={busy}
            aria-label={t("friends.reject")}
            className="text-[#D95F49]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCancel(req.id)}
          disabled={busy}
          aria-label={t("friends.cancel")}
          className="text-[#8E9B97] hover:text-[#D95F49] flex-shrink-0"
        >
          {busy ? <Spinner size="sm" /> : <X className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}

// ── Main FriendsClient Component ──────────────────────────────────────────────

export function FriendsClient({ userId }: FriendsClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("find");

  // ── Data state ─────────────────────────────────────────────────────────────
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<
    (FriendRequest & { sender_profile?: { display_name: string; evoora_id: string; avatar_url: string | null } })[]
  >([]);
  const [sent, setSent] = useState<
    (FriendRequest & { receiver_profile?: { display_name: string; evoora_id: string; avatar_url: string | null } })[]
  >([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Search & Suggested state ────────────────────────────────────────────────
  const [searchId, setSearchId] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserSearchResult[]>([]);
  const [searchMsg, setSearchMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // ── Invite link state ──────────────────────────────────────────────────────
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  // ── Action busy state ──────────────────────────────────────────────────────
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const setBusy = (id: string) => setBusyIds((s) => new Set(s).add(id));
  const clearBusy = (id: string) =>
    setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });

  // ── Load personal invite link ──────────────────────────────────────────────
  const loadInviteLink = useCallback(async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/friends/invite");
      if (res.ok) {
        const data = await res.json();
        if (data.invite_url) {
          setInviteUrl(data.invite_url);
        }
      } else {
        setInviteError(t("friends.invite_error"));
      }
    } catch (err) {
      console.error("[FriendsClient] loadInviteLink:", err);
      setInviteError(t("friends.invite_error"));
    } finally {
      setInviteLoading(false);
    }
  }, [t]);

  // ── Load suggested users ──────────────────────────────────────────────────
  const loadSuggestedUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/search");
      if (res.ok) {
        const data = await res.json();
        setSuggestedUsers((data.users as UserSearchResult[]) || []);
      }
    } catch (err) {
      console.warn("[FriendsClient] loadSuggestedUsers:", err);
    }
  }, []);

  // ── Search players by name or ID ──────────────────────────────────────────
  const handleSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchMsg(null);
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults((data.users as UserSearchResult[]) || []);
      }
    } catch {
      setSearchMsg({ type: "error", text: "Search failed. Please try again." });
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const supabase = createClient();

      // Load accepted friends via RPC
      const { data: friendData, error: friendError } = await supabase.rpc(
        "get_friends",
      );
      if (friendError) throw friendError;
      setFriends((friendData as FriendEntry[]) ?? []);

      // Load pending incoming requests (receiver = me)
      const { data: incomingData, error: incomingError } = await supabase
        .from("friend_requests")
        .select(
          "*, sender_profile:profiles!friend_requests_sender_id_fkey(display_name, evoora_id, avatar_url)",
        )
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (incomingError) throw incomingError;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIncoming((incomingData as any[]) ?? []);

      // Load pending sent requests (sender = me)
      const { data: sentData, error: sentError } = await supabase
        .from("friend_requests")
        .select(
          "*, receiver_profile:profiles!friend_requests_receiver_id_fkey(display_name, evoora_id, avatar_url)",
        )
        .eq("sender_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSent((sentData as any[]) ?? []);

      // Load blocked users
      try {
        const blockRes = await fetch("/api/blocks");
        if (blockRes.ok) {
          const blockData = await blockRes.json();
          setBlockedUsers((blockData.blocked_users as BlockedEntry[]) ?? []);
        }
      } catch {
        // Non-critical fallback
      }

      // Load suggested users
      await loadSuggestedUsers();

      // Load invite link
      await loadInviteLink();
    } catch (err) {
      console.error("[FriendsClient] loadData:", err);
      setLoadError(t("friends.load_error"));
    } finally {
      setLoading(false);
    }
  }, [userId, t, loadInviteLink, loadSuggestedUsers]);

  useEffect(() => {
    void (async () => { await loadData(); })();
  }, [loadData]);

  const handleCopyLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  }, [inviteUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!inviteUrl) return;
    const shareData = {
      title: "Connect with me on EVOAIQU",
      text: t("friends.share_text"),
      url: inviteUrl,
    };
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }
    await handleCopyLink();
  }, [inviteUrl, t, handleCopyLink]);

  const handleRotateInvite = useCallback(async () => {
    if (!confirm(t("friends.new_link_confirm"))) return;
    setRotating(true);
    try {
      const res = await fetch("/api/friends/invite", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.invite_url) {
          setInviteUrl(data.invite_url);
          setCopied(false);
        }
      }
    } catch (err) {
      console.error("[FriendsClient] rotateInvite:", err);
    } finally {
      setRotating(false);
    }
  }, [t]);

  // ── Send request ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async (customEvoId?: string) => {
    const raw = (customEvoId || searchId).trim().toUpperCase();
    if (!raw) return;

    if (!isValidEvoId(raw)) {
      setSearchMsg({ type: "error", text: t("friends.invalid_id") });
      return;
    }

    setSearchLoading(true);
    setSearchMsg(null);

    try {
      const res = await fetch("/api/friends/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evoora_id: raw }),
      });
      const data = await res.json();

      if (!res.ok) {
        const code = data.code as string | undefined;
        const msg =
          code === "self_request" ? t("friends.self_request")
          : code === "already_friends" ? t("friends.already_friends")
          : code === "request_pending" ? t("friends.request_pending")
          : code === "not_found" ? t("friends.not_found")
          : data.error ?? t("common.error");
        setSearchMsg({ type: "error", text: msg });
        return;
      }

      setSearchMsg({ type: "success", text: t("friends.sent") });
      if (!customEvoId) setSearchId("");
      startTransition(() => {
        loadData();
        router.refresh();
      });
    } catch {
      setSearchMsg({ type: "error", text: t("common.error") });
    } finally {
      setSearchLoading(false);
    }
  }, [searchId, t, loadData, router]);

  // ── Respond (accept / reject) ──────────────────────────────────────────────
  const handleRespond = useCallback(
    async (requestId: string, action: "accept" | "reject") => {
      setBusy(requestId);
      try {
        const res = await fetch("/api/friends/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: requestId, action }),
        });
        if (res.ok) {
          startTransition(() => {
            loadData();
            router.refresh();
          });
        }
      } finally {
        clearBusy(requestId);
      }
    },
    [loadData, router],
  );

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = useCallback(
    async (requestId: string) => {
      setBusy(requestId);
      try {
        const res = await fetch("/api/friends/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: requestId }),
        });
        if (res.ok) {
          startTransition(() => {
            loadData();
            router.refresh();
          });
        }
      } finally {
        clearBusy(requestId);
      }
    },
    [loadData, router],
  );

  // ── Remove ─────────────────────────────────────────────────────────────────
  const handleRemove = useCallback(
    async (friendId: string, requestId: string) => {
      setBusy(requestId);
      try {
        const res = await fetch("/api/friends/remove", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friend_id: friendId }),
        });
        if (res.ok) {
          startTransition(() => {
            loadData();
            router.refresh();
          });
        }
      } finally {
        clearBusy(requestId);
      }
    },
    [loadData, router],
  );

  // ── Block / Unblock actions ───────────────────────────────────────────────
  const handleBlockUser = useCallback(
    async (targetId: string, name: string) => {
      if (!confirm(`${t("blocks.block")} (${name})?`)) return;
      setBusy(targetId);
      try {
        const res = await fetch("/api/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocked_id: targetId }),
        });
        if (res.ok) {
          setSearchMsg({ type: "success", text: t("blocks.blocked_success") });
          await loadData();
        }
      } catch (err) {
        console.error("[FriendsClient] handleBlockUser:", err);
      } finally {
        clearBusy(targetId);
      }
    },
    [loadData, t],
  );

  const handleUnblockUser = useCallback(
    async (targetId: string, name: string) => {
      if (!confirm(t("blocks.unblock_confirm", { name }))) return;
      setBusy(targetId);
      try {
        const res = await fetch(`/api/blocks?blocked_id=${targetId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== targetId));
          setSearchMsg({ type: "success", text: t("blocks.unblocked_success") });
        }
      } catch (err) {
        console.error("[FriendsClient] handleUnblockUser:", err);
      } finally {
        clearBusy(targetId);
      }
    },
    [t],
  );

  // ── Tab config ─────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: "find",
      label: "Find Players",
      icon: <Search className="h-4 w-4" />,
      count: searchResults.length > 0 ? searchResults.length : suggestedUsers.length,
    },
    {
      id: "friends",
      label: t("friends.tab_friends"),
      icon: <Users className="h-4 w-4" />,
      count: friends.length,
    },
    {
      id: "incoming",
      label: t("friends.tab_incoming"),
      icon: <UserCheck className="h-4 w-4" />,
      count: incoming.length,
    },
    {
      id: "sent",
      label: t("friends.tab_sent"),
      icon: <Clock className="h-4 w-4" />,
      count: sent.length,
    },
    {
      id: "blocked",
      label: t("blocks.tab"),
      icon: <Ban className="h-4 w-4" />,
      count: blockedUsers.length,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── 1. Primary: Invite Friends via Personal Link ── */}
      <div className="evo-card p-6 space-y-4 border border-[#E2E8E2] bg-white shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78]">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[#203331] text-base">{t("friends.invite_title")}</p>
              <p className="text-[#65736F] text-xs sm:text-sm">
                {t("friends.invite_subtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRotateInvite}
            disabled={rotating || inviteLoading}
            title={t("friends.new_link")}
            className="text-[#8E9B97] hover:text-[#203331] transition-colors p-1.5 rounded-lg hover:bg-[#EEF1ED] text-xs flex items-center gap-1"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", rotating && "animate-spin")} />
            <span className="hidden md:inline">{t("friends.new_link")}</span>
          </button>
        </div>

        {inviteError && (
          <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
            {inviteError}
          </Alert>
        )}

        {/* Link display & quick actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={inviteLoading ? t("friends.invite_loading") : inviteUrl || ""}
              className="evo-input pr-10 text-xs sm:text-sm font-mono truncate select-all bg-[#F7F8F4] text-[#167D78] font-medium"
              aria-label="Your personal invite link"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            {copied && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#167D78] animate-fade-in flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                {t("friends.link_copied")}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {/* Copy Button */}
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleCopyLink}
              disabled={inviteLoading || !inviteUrl}
              className="flex-1 sm:flex-none justify-center"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? t("friends.link_copied") : t("friends.copy_link")}</span>
            </Button>

            {/* Native Device Share */}
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleNativeShare}
              disabled={inviteLoading || !inviteUrl}
              className="px-3"
              title={t("friends.share")}
              aria-label={t("friends.share")}
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("friends.share")}</span>
            </Button>

            {/* WhatsApp Share */}
            <a
              href={inviteUrl ? `https://wa.me/?text=${encodeURIComponent(`${t("friends.share_text")} ${inviteUrl}`)}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "evo-btn evo-btn-ghost px-3 text-[#1B8340] bg-[#E8F8EE] hover:bg-[#d6f4df] border border-[rgba(37,211,102,0.3)] flex items-center gap-1.5 font-semibold",
                (!inviteUrl || inviteLoading) && "pointer-events-none opacity-50",
              )}
              title={t("friends.share_whatsapp")}
              aria-label={t("friends.share_whatsapp")}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{t("friends.share_whatsapp")}</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── 2. Player Search Bar ── */}
      <div className="evo-card p-5 space-y-3 bg-white border border-[#E2E8E2] rounded-3xl shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#167D78]" />
            <p className="font-bold text-[#203331] text-sm">Find & Add Players</p>
          </div>
          <span className="text-xs text-[#8E9B97]">{t("friends.or_evoora_id")}</span>
        </div>

        {searchMsg && (
          <Alert
            variant={searchMsg.type === "success" ? "success" : searchMsg.type === "info" ? "info" : "error"}
            icon={searchMsg.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          >
            {searchMsg.text}
          </Alert>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              id="friend-search-input"
              placeholder="Search by display name or EVO-A1B2C3..."
              value={searchId}
              onChange={(e) => {
                const val = e.target.value;
                setSearchId(val);
                setSearchMsg(null);
                handleSearch(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setActiveTab("find");
                  if (isValidEvoId(searchId.trim())) {
                    handleSend();
                  } else {
                    handleSearch(searchId);
                  }
                }
              }}
              leftIcon={<Search className="h-4 w-4" />}
              autoComplete="off"
              spellCheck={false}
              className="text-sm"
              aria-label="Search players by display name or unique EVOAIQU ID"
            />
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setActiveTab("find");
              if (isValidEvoId(searchId.trim())) {
                handleSend();
              } else {
                handleSearch(searchId);
              }
            }}
            loading={searchLoading}
            disabled={!searchId.trim()}
            id="send-friend-request-btn"
          >
            <Search className="h-4 w-4 mr-1 sm:inline hidden" />
            <span>Search</span>
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div>
        {/* Tab nav */}
        <div
          role="tablist"
          aria-label={t("friends.sections")}
          className="flex gap-1 p-1 bg-[#EEF1ED] rounded-xl border border-[#E2E8E2] mb-4"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white text-[#167D78] shadow-sm font-semibold border border-[#E2E8E2]"
                  : "text-[#65736F] hover:text-[#203331] hover:bg-white/60",
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <Badge
                  variant={activeTab === tab.id ? "teal" : "muted"}
                  className="text-xs px-1.5 py-0.5 min-w-[1.25rem] text-center"
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {loadError && (
          <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
            {loadError}
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-[#167D78]" />
          </div>
        ) : (
          <>
            {/* Find / Suggested panel */}
            <div
              role="tabpanel"
              id="tabpanel-find"
              aria-labelledby="tab-find"
              hidden={activeTab !== "find"}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-[#65736F] uppercase tracking-wider">
                  {searchResults.length > 0
                    ? `Search Results (${searchResults.length})`
                    : searchId.trim()
                    ? "No players found matching your search"
                    : `Suggested Players (${suggestedUsers.length})`}
                </p>
                {searchId.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchId("");
                      setSearchResults([]);
                    }}
                    className="text-xs text-[#167D78] font-bold hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>

              {(searchResults.length > 0 ? searchResults : suggestedUsers).length === 0 ? (
                <EmptyState
                  icon={<Search className="h-10 w-10" />}
                  title="No players found"
                  description="Try searching with a different display name or unique EVOAIQU ID."
                />
              ) : (
                (searchResults.length > 0 ? searchResults : suggestedUsers).map((u) => (
                  <UserPreviewCard
                    key={u.id}
                    user={u}
                    onSendRequest={(evoId) => handleSend(evoId)}
                    onAccept={(reqId) => handleRespond(reqId, "accept")}
                    onCancel={handleCancel}
                    busy={busyIds.has(u.id) || (u.request_id ? busyIds.has(u.request_id) : false)}
                  />
                ))
              )}
            </div>

            {/* Friends panel */}
            <div
              role="tabpanel"
              id="tabpanel-friends"
              aria-labelledby="tab-friends"
              hidden={activeTab !== "friends"}
              className="space-y-3"
            >
              {friends.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-10 w-10" />}
                  title={t("friends.empty_friends")}
                  description={t("friends.empty_friends_desc")}
                />
              ) : (
                friends.map((f) => (
                  <FriendCard
                    key={f.request_id}
                    friend={f}
                    onRemove={handleRemove}
                    onBlock={handleBlockUser}
                    busy={busyIds.has(f.request_id)}
                  />
                ))
              )}
            </div>

            {/* Incoming panel */}
            <div
              role="tabpanel"
              id="tabpanel-incoming"
              aria-labelledby="tab-incoming"
              hidden={activeTab !== "incoming"}
              className="space-y-3"
            >
              {incoming.length === 0 ? (
                <EmptyState
                  icon={<UserCheck className="h-10 w-10" />}
                  title={t("friends.empty_incoming")}
                  description={t("friends.empty_incoming_desc")}
                />
              ) : (
                incoming.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    currentUserId={userId}
                    onRespond={handleRespond}
                    onCancel={handleCancel}
                    busy={busyIds.has(req.id)}
                  />
                ))
              )}
            </div>

            {/* Sent panel */}
            <div
              role="tabpanel"
              id="tabpanel-sent"
              aria-labelledby="tab-sent"
              hidden={activeTab !== "sent"}
              className="space-y-3"
            >
              {sent.length === 0 ? (
                <EmptyState
                  icon={<UserX className="h-10 w-10" />}
                  title={t("friends.empty_sent")}
                  description={t("friends.empty_sent_desc")}
                />
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sent.map((req: any) => (
                  <RequestCard
                    key={req.id}
                    req={{
                      ...req,
                      // Map receiver_profile → sender_profile for RequestCard display
                      sender_profile: req.receiver_profile,
                    }}
                    currentUserId={userId}
                    onRespond={handleRespond}
                    onCancel={handleCancel}
                    busy={busyIds.has(req.id)}
                  />
                ))
              )}
            </div>

            {/* Blocked panel */}
            <div
              role="tabpanel"
              id="tabpanel-blocked"
              aria-labelledby="tab-blocked"
              hidden={activeTab !== "blocked"}
              className="space-y-3"
            >
              {blockedUsers.length === 0 ? (
                <EmptyState
                  icon={<Ban className="h-10 w-10" />}
                  title={t("blocks.empty")}
                  description={t("blocks.empty_desc")}
                />
              ) : (
                blockedUsers.map((b) => (
                  <BlockedCard
                    key={b.blocked_id}
                    user={b}
                    onUnblock={handleUnblockUser}
                    busy={busyIds.has(b.blocked_id)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.2)] flex items-center justify-center text-[#167D78] mb-4">
        {icon}
      </div>
      <p className="font-semibold text-[#203331] mb-1">{title}</p>
      <p className="text-[#65736F] text-sm max-w-xs">{description}</p>
    </div>
  );
}
