"use client";

import React, {
  useState,
  useCallback,
  useTransition,
  useEffect,
} from "react";
import Link from "next/link";
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
import { createClient } from "@/core/supabase/client";
import { useI18n } from "@/core/i18n/I18nContext";
import {
  Button,
  Input,
  Alert,
  Avatar,
  Spinner,
} from "@/shared/ui";
import { cn, isValidEvoId } from "@/shared/lib/utils";
import type { FriendRequest } from "@/core/supabase/database";

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

// ── Shared style bits ─────────────────────────────────────────────────────────

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]";
const PILL_BASE = cn(
  "inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full text-sm font-bold border-2 transition-colors disabled:opacity-50 disabled:pointer-events-none",
  FOCUS,
);
const PILL_PRIMARY = cn(PILL_BASE, "bg-[#FF5A3C] border-[#FF5A3C] text-white shadow-[0_3px_0_#C9381F] hover:bg-[#FF6B4F]");
const PILL_GHOST = cn(PILL_BASE, "bg-white border-[#EADBC8] text-[#1E1B24] hover:border-[#1E1B24]");
const PILL_DANGER_GHOST = cn(PILL_BASE, "bg-white border-[#EADBC8] text-[#E5484D] hover:border-[#E5484D]");
const ICON_PILL = cn(
  "inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border-2 border-[#EADBC8] bg-white text-[#6E6878] transition-colors disabled:opacity-50 disabled:pointer-events-none",
  FOCUS,
);
const CARD = "bg-white border-2 border-[#EADBC8] rounded-[26px] shadow-[0_4px_0_#EADBC8]";

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
    <div className="px-4 py-3 flex items-center gap-3 animate-fade-in">
      <Avatar src={friend.avatar_url} name={friend.display_name} size="lg" className="border-2 border-[#EADBC8]" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#1E1B24] truncate">{friend.display_name}</p>
        <p className="text-xs text-[#6E6878] font-mono truncate">{friend.evoora_id}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Link href="/chat" aria-label={`Chat with ${friend.display_name}`} className={ICON_PILL}>
          <MessageCircle className="h-4 w-4" />
        </Link>
        <Link href="/games" className={cn(PILL_PRIMARY, "hidden sm:inline-flex")}>
          Play
        </Link>
        <button
          type="button"
          onClick={() => onRemove(friend.friend_id, friend.request_id)}
          disabled={busy}
          aria-label={t("friends.remove")}
          title={t("friends.remove")}
          className={cn(ICON_PILL, "hover:text-[#E5484D] hover:border-[#E5484D]")}
        >
          {busy ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => onBlock(friend.friend_id, friend.display_name)}
          disabled={busy}
          aria-label={t("blocks.block")}
          title={t("blocks.block")}
          className={cn(ICON_PILL, "hover:text-[#E5484D] hover:border-[#E5484D]")}
        >
          <Ban className="h-4 w-4" />
        </button>
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
    <div className="px-4 py-3 flex items-center gap-3 animate-fade-in">
      <Avatar src={user.avatar_url} name={user.display_name} size="lg" className="border-2 border-[#EADBC8]" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#1E1B24] truncate">{user.display_name}</p>
        <p className="text-xs text-[#6E6878] font-mono truncate">{user.evoora_id}</p>
      </div>
      <button
        type="button"
        onClick={() => onUnblock(user.blocked_id, user.display_name)}
        disabled={busy}
        className={cn(PILL_DANGER_GHOST, "flex-shrink-0")}
      >
        {busy ? <Spinner size="sm" /> : t("blocks.unblock")}
      </button>
    </div>
  );
}

// ── UserPreviewCard (search results, vertical rows) ───────────────────────────

interface UserCardProps {
  user: UserSearchResult;
  onSendRequest: (evoId: string) => void;
  onAccept: (reqId: string) => void;
  onCancel: (reqId: string) => void;
  busy: boolean;
}

function UserActionPill({ user, onSendRequest, onAccept, onCancel, busy }: UserCardProps) {
  return (
    <>
      {user.friendship_status === "friend" && (
        <span className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full bg-[#E3FAF3] border-2 border-[#B7EEDD] text-[#0B7A60] text-sm font-bold">
          Friends ✓
        </span>
      )}
      {user.friendship_status === "pending_sent" && (
        <button
          type="button"
          onClick={() => user.request_id && onCancel(user.request_id)}
          disabled={busy || !user.request_id}
          className={PILL_GHOST}
        >
          Requested (Cancel)
        </button>
      )}
      {user.friendship_status === "pending_received" && (
        <button
          type="button"
          onClick={() => user.request_id && onAccept(user.request_id)}
          disabled={busy || !user.request_id}
          className={PILL_PRIMARY}
        >
          Accept
        </button>
      )}
      {user.friendship_status === "none" && (
        <button
          type="button"
          onClick={() => onSendRequest(user.evoora_id)}
          disabled={busy}
          className={PILL_PRIMARY}
        >
          <UserPlus className="h-4 w-4" />
          Add Friend
        </button>
      )}
    </>
  );
}

function UserPreviewCard(props: UserCardProps) {
  const { user } = props;
  return (
    <div className="px-4 py-3 flex items-center gap-3 animate-fade-in">
      <Avatar src={user.avatar_url} name={user.display_name} size="lg" className="border-2 border-[#EADBC8]" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#1E1B24] truncate">{user.display_name}</p>
        <p className="text-xs text-[#6E6878] truncate">
          <span className="font-mono">{user.evoora_id}</span>
          {user.bio ? ` · ${user.bio}` : ""}
        </p>
      </div>
      <div className="shrink-0">
        <UserActionPill {...props} />
      </div>
    </div>
  );
}

// ── SuggestedCard (horizontal "People you may know") ──────────────────────────

function SuggestedCard(props: UserCardProps) {
  const { user } = props;
  return (
    <div className="w-[168px] shrink-0 snap-start bg-[#FFF6EC] border-2 border-[#EADBC8] rounded-[22px] p-4 flex flex-col items-center text-center gap-2 animate-fade-in">
      <Avatar src={user.avatar_url} name={user.display_name} size="lg" className="border-2 border-white" />
      <div className="min-w-0 w-full">
        <p className="font-bold text-[#1E1B24] text-sm truncate">{user.display_name}</p>
        <p className="text-xs text-[#6E6878] font-mono truncate">{user.evoora_id}</p>
      </div>
      <UserActionPill {...props} />
    </div>
  );
}

// ── RequestCard (row inside a card) ───────────────────────────────────────────

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
    <div className="px-4 py-3 flex items-center gap-3 animate-fade-in">
      <Avatar
        src={profile?.avatar_url ?? null}
        name={profile?.display_name ?? "?"}
        size="lg"
        className="border-2 border-[#EADBC8]"
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#1E1B24] truncate">
          {profile?.display_name ?? "Unknown"}
        </p>
        {profile?.evoora_id && (
          <p className="text-xs text-[#6E6878] font-mono truncate">{profile.evoora_id}</p>
        )}
      </div>

      {isIncoming ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onRespond(req.id, "accept")}
            disabled={busy}
            aria-label={t("friends.accept")}
            className={PILL_PRIMARY}
          >
            {busy ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
            <span className="hidden sm:inline">{t("friends.accept")}</span>
          </button>
          <button
            type="button"
            onClick={() => onRespond(req.id, "reject")}
            disabled={busy}
            aria-label={t("friends.reject")}
            className={PILL_GHOST}
          >
            <X className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Not now</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onCancel(req.id)}
          disabled={busy}
          aria-label={t("friends.cancel")}
          className={cn(ICON_PILL, "hover:text-[#E5484D] hover:border-[#E5484D] flex-shrink-0")}
        >
          {busy ? <Spinner size="sm" /> : <X className="h-4 w-4" />}
        </button>
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
  const [activeTab, setActiveTab] = useState<Tab>("friends");

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
  const visibleSearch = searchResults.length > 0 ? searchResults : suggestedUsers;
  const userBusy = (u: UserSearchResult) =>
    busyIds.has(u.id) || (u.request_id ? busyIds.has(u.request_id) : false);

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,640px)_300px] lg:justify-center">
      {/* ── Main column ── */}
      <div className="space-y-5 min-w-0">
        {/* Pill search */}
        <div className="space-y-3">
          {searchMsg && (
            <Alert
              variant={searchMsg.type === "success" ? "success" : searchMsg.type === "info" ? "info" : "error"}
              icon={searchMsg.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            >
              {searchMsg.text}
            </Alert>
          )}
          <div className="flex gap-2.5">
            <div className="flex-1 min-w-0">
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
                className="text-sm rounded-full"
                aria-label="Search players by display name or unique EVOAIQU ID"
              />
              <span className="sr-only">{t("friends.or_evoora_id")}</span>
            </div>
            <Button
              variant="primary"
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
              className="font-bold"
            >
              <Search className="h-4 w-4 mr-1 sm:inline hidden" />
              <span>Search</span>
            </Button>
          </div>
        </div>

        {loadError && (
          <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
            {loadError}
          </Alert>
        )}

        {/* Wants to be friends */}
        {!loading && incoming.length > 0 && activeTab !== "incoming" && (
          <section className={cn(CARD, "overflow-hidden")} aria-label={t("friends.tab_incoming")}>
            <h2 className="font-display text-lg text-[#1E1B24] px-5 pt-4 pb-1 flex items-center gap-2">
              Wants to be friends
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#FF5A3C] text-white text-xs font-bold">
                {incoming.length}
              </span>
            </h2>
            <div className="divide-y-2 divide-[#F5EADC]">
              {incoming.map((req) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  currentUserId={userId}
                  onRespond={handleRespond}
                  onCancel={handleCancel}
                  busy={busyIds.has(req.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Tabs + panels */}
        <div className={cn(CARD, "p-3 sm:p-4")}>
          <div
            role="tablist"
            aria-label={t("friends.sections")}
            className="flex gap-1 p-1.5 bg-[#F5EADC] rounded-full mb-3 overflow-x-auto"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap",
                  FOCUS,
                  activeTab === tab.id
                    ? "bg-white text-[#1E1B24] shadow-[0_2px_0_#EADBC8]"
                    : "text-[#6E6878] hover:text-[#1E1B24]",
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-1.5 min-w-[1.25rem] text-center rounded-full font-bold",
                      activeTab === tab.id ? "bg-[#FF5A3C] text-white" : "bg-white text-[#6E6878]",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" className="text-[#FF5A3C]" />
            </div>
          ) : (
            <>
              {/* Find / People you may know panel */}
              <div
                role="tabpanel"
                id="tabpanel-find"
                aria-labelledby="tab-find"
                hidden={activeTab !== "find"}
                className="space-y-3"
              >
                <div className="flex items-center justify-between px-2">
                  <h2 className="font-display text-lg text-[#1E1B24]">
                    {searchResults.length > 0
                      ? `Search Results (${searchResults.length})`
                      : searchId.trim()
                      ? "No players found matching your search"
                      : "People you may know"}
                  </h2>
                  {searchId.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchId("");
                        setSearchResults([]);
                      }}
                      className={cn("text-sm text-[#C9381F] font-bold hover:underline min-h-[44px] px-2 rounded-full", FOCUS)}
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                {visibleSearch.length === 0 ? (
                  <EmptyState
                    icon={<Search className="h-10 w-10" />}
                    title="No players found"
                    description="Try searching with a different display name or unique EVOAIQU ID."
                  />
                ) : searchResults.length > 0 ? (
                  <div className="divide-y-2 divide-[#F5EADC]">
                    {searchResults.map((u) => (
                      <UserPreviewCard
                        key={u.id}
                        user={u}
                        onSendRequest={(evoId) => handleSend(evoId)}
                        onAccept={(reqId) => handleRespond(reqId, "accept")}
                        onCancel={handleCancel}
                        busy={userBusy(u)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto snap-x pb-2 px-1">
                    {suggestedUsers.map((u) => (
                      <SuggestedCard
                        key={u.id}
                        user={u}
                        onSendRequest={(evoId) => handleSend(evoId)}
                        onAccept={(reqId) => handleRespond(reqId, "accept")}
                        onCancel={handleCancel}
                        busy={userBusy(u)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Friends panel */}
              <div
                role="tabpanel"
                id="tabpanel-friends"
                aria-labelledby="tab-friends"
                hidden={activeTab !== "friends"}
                className="divide-y-2 divide-[#F5EADC]"
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
                className="divide-y-2 divide-[#F5EADC]"
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
                className="divide-y-2 divide-[#F5EADC]"
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
                className="divide-y-2 divide-[#F5EADC]"
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

      {/* ── Right rail (stacks below on mobile) ── */}
      <aside className="space-y-5 min-w-0" aria-label={t("friends.invite_title")}>
        {/* Invite a friend: lilac */}
        <div className="b-card-lilac border-2 rounded-[26px] p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-xl text-[#1E1B24] leading-tight">{t("friends.invite_title")}</h2>
              <p className="text-[#4B4560] text-sm mt-1">{t("friends.invite_subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={handleRotateInvite}
              disabled={rotating || inviteLoading}
              title={t("friends.new_link")}
              aria-label={t("friends.new_link")}
              className={cn(
                "shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full bg-white border-2 border-[#D7D0FF] text-[#4B4560] hover:text-[#C9381F] disabled:opacity-50",
                FOCUS,
              )}
            >
              <RefreshCw className={cn("h-4 w-4", rotating && "animate-spin")} />
            </button>
          </div>

          {inviteError && (
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
              {inviteError}
            </Alert>
          )}

          <div className="relative">
            <input
              type="text"
              readOnly
              value={inviteLoading ? t("friends.invite_loading") : inviteUrl || ""}
              className="evo-input text-xs font-mono truncate select-all bg-white text-[#1E1B24] border-[#D7D0FF] font-medium"
              aria-label="Your personal invite link"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            {copied && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0B7A60] bg-white pl-1 animate-fade-in flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                {t("friends.link_copied")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={inviteLoading || !inviteUrl}
              className={cn(PILL_BASE, "flex-1 bg-white border-[#1E1B24] text-[#1E1B24] hover:bg-[#FFF6EC]")}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? t("friends.link_copied") : t("friends.copy_link")}</span>
            </button>
            <a
              href={inviteUrl ? `https://wa.me/?text=${encodeURIComponent(`${t("friends.share_text")} ${inviteUrl}`)}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                PILL_BASE,
                "flex-1 bg-[#14C49A] border-[#14C49A] text-[#0A2E26] shadow-[0_3px_0_#0E9A78] hover:bg-[#2AD3AA]",
                (!inviteUrl || inviteLoading) && "pointer-events-none opacity-50",
              )}
              title={t("friends.share_whatsapp")}
              aria-label={t("friends.share_whatsapp")}
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t("friends.share_whatsapp")}</span>
            </a>
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={inviteLoading || !inviteUrl}
              className={cn(ICON_PILL, "bg-white border-[#D7D0FF] text-[#4B4560]")}
              title={t("friends.share")}
              aria-label={t("friends.share")}
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* EVO-ID card */}
        <div className={cn(CARD, "p-5")}>
          <h2 className="font-display text-lg text-[#1E1B24]">Find friends by EVO-ID</h2>
          <p className="text-sm text-[#6E6878] mt-1">
            Every player has a unique ID like <span className="font-mono font-bold text-[#1E1B24]">EVO-A1B2C3</span>.
            Paste one into the search box to send a request.
          </p>
        </div>
      </aside>
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
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-[22px] bg-[#FFF6EC] border-2 border-[#EADBC8] flex items-center justify-center text-[#FF5A3C] mb-4">
        {icon}
      </div>
      <p className="font-display text-lg text-[#1E1B24] mb-1">{title}</p>
      <p className="text-[#6E6878] text-sm max-w-sm">{description}</p>
    </div>
  );
}
