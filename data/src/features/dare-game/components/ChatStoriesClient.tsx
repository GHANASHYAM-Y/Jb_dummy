"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Film,
  Gamepad2,
  Trophy,
  Send,
  X,
  Globe,
  Lock,
  Plus,
  Search,
  Video,
  Clock,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Avatar, Button, EvoIdBadge, Spinner } from "@/shared/ui";
import { VideoRecorderModal } from "@/features/dare-game/components/VideoRecorderModal";
import { WinnerReviewModal } from "@/features/dare-game/components/WinnerReviewModal";
import type { Challenge, FriendEntry } from "@/core/supabase/database";

interface StoryItem {
  id: string;
  challenge_id: string;
  match_id: string;
  loser_id: string;
  winner_id: string;
  storage_path: string;
  media_type: string;
  duration_seconds: number;
  visibility: "private" | "public";
  status: string;
  created_at: string;
  expires_at: string;
  media_url?: string;
  creator?: {
    id: string;
    display_name: string;
    evoora_id: string;
    avatar_url: string | null;
  };
  challenge?: {
    title: string;
    category: string;
    description: string;
  };
}

interface ChatMessage {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  type?: "text" | "game_invite";
  invite_id?: string;
}

interface ChatStoriesClientProps {
  userId: string;
  initialFriends?: FriendEntry[];
}

export function ChatStoriesClient({
  userId,
  initialFriends = [],
}: ChatStoriesClientProps) {
  const router = useRouter();

  // Friends & conversations
  const [friends] = useState<FriendEntry[]>(initialFriends);
  const [selectedFriend, setSelectedFriend] = useState<FriendEntry | null>(
    initialFriends[0] || null,
  );
  const [friendSearch, setFriendSearch] = useState("");

  // Stories
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [activeStoryViewer, setActiveStoryViewer] = useState<StoryItem | null>(null);

  // Challenges (dares between users)
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [recordModalChallenge, setRecordModalChallenge] = useState<Challenge | null>(null);
  const [reviewModalChallenge, setReviewModalChallenge] = useState<Challenge | null>(null);

  // Chat messages per friend
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Fetch Stories for user interactions
  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges/stories");
      if (res.ok) {
        const data = await res.json();
        if (isMountedRef.current && data.ok && data.stories) {
          setStories(data.stories);
        }
      }
    } catch {
      // Quiet fallback
    } finally {
      if (isMountedRef.current) {
        setStoriesLoading(false);
      }
    }
  }, []);

  // 2. Fetch Challenges for user interactions
  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges?filter=all");
      if (res.ok) {
        const data = await res.json();
        if (isMountedRef.current && data.challenges) {
          setChallenges(data.challenges || []);
        }
      }
    } catch {
      // Quiet fallback
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function initStoriesAndChallenges() {
      try {
        const [storiesRes, challengesRes] = await Promise.all([
          fetch("/api/challenges/stories"),
          fetch("/api/challenges?filter=all"),
        ]);
        if (storiesRes.ok) {
          const sData = await storiesRes.json();
          if (!ignore && sData.ok && sData.stories) {
            setStories(sData.stories);
          }
        }
        if (challengesRes.ok) {
          const cData = await challengesRes.json();
          if (!ignore && cData.challenges) {
            setChallenges(cData.challenges || []);
          }
        }
      } catch {
        // Quiet fallback
      } finally {
        if (!ignore) {
          setStoriesLoading(false);
        }
      }
    }
    void initStoriesAndChallenges();
    return () => {
      ignore = true;
    };
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, selectedFriend]);

  // Send a friendly message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend || !inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender_id: userId,
      text: inputText.trim(),
      created_at: new Date().toISOString(),
      type: "text",
    };

    setMessages((prev) => ({
      ...prev,
      [selectedFriend.friend_id]: [...(prev[selectedFriend.friend_id] || []), newMsg],
    }));

    setInputText("");
  };

  // Send an in-chat Game Challenge
  const handleSendGameInvite = async () => {
    if (!selectedFriend || sendingInvite) return;
    setSendingInvite(true);
    setInviteFeedback(null);

    try {
      const res = await fetch("/api/rps/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitee_id: selectedFriend.friend_id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const inviteMsg: ChatMessage = {
          id: `inv_${Date.now()}`,
          sender_id: userId,
          text: "I challenged you to a First-to-5 Rock, Paper, Scissors match!",
          created_at: new Date().toISOString(),
          type: "game_invite",
          invite_id: data.invite_id,
        };

        setMessages((prev) => ({
          ...prev,
          [selectedFriend.friend_id]: [...(prev[selectedFriend.friend_id] || []), inviteMsg],
        }));

        setInviteFeedback("Game challenge sent!");
        setTimeout(() => {
          if (isMountedRef.current) {
            setInviteFeedback(null);
          }
        }, 3000);
      } else {
        if (isMountedRef.current) {
          setInviteFeedback(data.error || "Could not send challenge.");
        }
      }
    } catch {
      if (isMountedRef.current) {
        setInviteFeedback("Error sending challenge.");
      }
    } finally {
      if (isMountedRef.current) {
        setSendingInvite(false);
      }
    }
  };

  // Find active challenge between user and selected friend
  const activeChallengeWithFriend = selectedFriend
    ? challenges.find(
        (c) =>
          ((c.winner_id === userId && c.loser_id === selectedFriend.friend_id) ||
            (c.loser_id === userId && c.winner_id === selectedFriend.friend_id)) &&
          ["accepted", "submitted", "retry_requested"].includes(c.status),
      )
    : null;

  // Filtered friends
  const filteredFriends = friends.filter(
    (f) =>
      f.display_name.toLowerCase().includes(friendSearch.toLowerCase()) ||
      f.evoora_id.toLowerCase().includes(friendSearch.toLowerCase()),
  );

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-7 py-6 space-y-5">
      {/* ── 1. Stories row ───────────────────────────────────────────────────── */}
      <section aria-labelledby="stories-reel-heading">
        <div className="flex items-end justify-between mb-3 px-1">
          <h2 id="stories-reel-heading" className="font-display text-[22px] font-bold text-[#1E1B24] leading-none">
            24-Hour Dare Stories
          </h2>
          <span className="text-xs font-bold text-[#6E6878]">
            {stories.length} Active {stories.length === 1 ? "Story" : "Stories"}
          </span>
        </div>

        <div className="flex items-start gap-4 overflow-x-auto pb-2 pt-1 px-1 scrollbar-none">
          {/* Post/Submit Dare CTA */}
          <button
            type="button"
            onClick={() => {
              const pendingUserDare = challenges.find(
                (c) => c.loser_id === userId && ["accepted", "retry_requested"].includes(c.status),
              );
              if (pendingUserDare) {
                setRecordModalChallenge(pendingUserDare);
              } else {
                router.push("/games");
              }
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 w-[72px] min-h-[44px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] rounded-2xl"
          >
            <span className="w-[68px] h-[68px] rounded-full border-2 border-dashed border-[#FF5A3C] bg-[#FFFFFF] flex items-center justify-center text-[#FF5A3C] transition-transform group-hover:scale-105">
              <Plus className="h-6 w-6" />
            </span>
            <span className="text-xs font-bold text-[#C9381F] max-w-[72px] text-center truncate">
              Post Dare
            </span>
          </button>

          {/* Active Story Bubbles */}
          {storiesLoading ? (
            <div className="flex items-center gap-3 py-5 px-2">
              <Spinner size="sm" className="text-[#FF5A3C]" />
              <span className="text-xs text-[#6E6878]">Loading active stories...</span>
            </div>
          ) : stories.length === 0 ? (
            <div className="py-5 px-2 text-sm text-[#6E6878]">
              No active stories right now. Win a match to dare your friends!
            </div>
          ) : (
            stories.map((s) => {
              const creatorName = s.creator?.display_name || "Player";
              const isPrivate = s.visibility === "private";

              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setActiveStoryViewer(s)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-[72px] min-h-[44px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] rounded-2xl"
                >
                  <span className="relative">
                    <span className="b-story-ring block">
                      <span className="block rounded-full border-[3px] border-[#FFF6EC] bg-[#FFF6EC] overflow-hidden w-[62px] h-[62px]">
                        <Avatar
                          src={s.creator?.avatar_url}
                          name={creatorName}
                          size="md"
                          className="w-full h-full rounded-full"
                        />
                      </span>
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-[#FFFFFF] border-2 border-[#EADBC8] text-[#6E6878]">
                      {isPrivate ? (
                        <span title="Private (Friends only)" className="flex">
                          <Lock className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span title="Public" className="flex text-[#FF5A3C]">
                          <Globe className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#1E1B24] max-w-[72px] truncate text-center">
                    {creatorName}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ── 2. Two-pane chat ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-5 md:min-h-[600px]">
        {/* ── Left: conversation list ── */}
        <div
          className="b-card !p-4 flex flex-col min-w-0"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-xl text-[#1E1B24]">Conversations</h2>
            <Link
              href="/friends"
              className="inline-flex items-center min-h-[44px] px-2 text-sm font-bold text-[#C9381F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C] rounded-full"
            >
              Find Friends
            </Link>
          </div>

          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search friends..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-4 text-sm rounded-full bg-[#FFF6EC] border-2 border-[#EADBC8] text-[#1E1B24] placeholder:text-[#6E6878] focus:outline-none focus:border-[#FF5A3C] focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6878]" />
          </div>

          <div className="space-y-1.5 overflow-y-auto md:max-h-[480px] pr-1 flex-1">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#6E6878]">
                <p className="mb-3">No conversations found.</p>
                <Link href="/friends">
                  <Button variant="secondary" size="sm" className="font-bold">
                    Add Friends
                  </Button>
                </Link>
              </div>
            ) : (
              filteredFriends.map((f) => {
                const isSelected = selectedFriend?.friend_id === f.friend_id;
                const friendMessages = messages[f.friend_id] || [];
                const lastMessage = friendMessages[friendMessages.length - 1];
                const unread = isSelected
                  ? 0
                  : friendMessages.filter((m) => m.sender_id !== userId).length;

                return (
                  <button
                    key={f.friend_id}
                    type="button"
                    onClick={() => setSelectedFriend(f)}
                    className={cn(
                      "w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 rounded-[18px] text-left transition-colors border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                      isSelected
                        ? "bg-[#FFF6EC] border-[#FF5A3C] text-[#1E1B24]"
                        : "border-transparent hover:bg-[#FFF6EC] text-[#1E1B24]",
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar src={f.avatar_url} name={f.display_name} size="sm" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#14C49A] border-2 border-[#FFFFFF]" aria-hidden="true" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm truncate text-[#1E1B24]">{f.display_name}</p>
                        <span className="font-mono text-[10px] text-[#8E8798] shrink-0">{f.evoora_id}</span>
                      </div>
                      <p className="text-xs text-[#6E6878] truncate mt-0.5">
                        {lastMessage ? lastMessage.text : "Tap to open chat & challenges"}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FF5A3C] text-white text-[11px] font-bold flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: active thread ── */}
        <div
          className="b-card !p-0 flex flex-col overflow-hidden min-w-0"
        >
          {selectedFriend ? (
            <>
              {/* Thread header */}
              <div className="p-3 sm:p-4 border-b-2 border-[#EADBC8] flex items-center justify-between gap-3 bg-[#FFFFFF]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative shrink-0">
                    <Avatar src={selectedFriend.avatar_url} name={selectedFriend.display_name} size="sm" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#14C49A] border-2 border-[#FFFFFF]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-base text-[#1E1B24] truncate">{selectedFriend.display_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <EvoIdBadge id={selectedFriend.evoora_id} />
                      <span className="text-[11px] text-[#0B8A6C] font-bold">Connected</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendGameInvite}
                  disabled={sendingInvite}
                  className="font-bold shrink-0 min-h-[44px]"
                >
                  <Gamepad2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Challenge to RPS</span>
                  <span className="sm:hidden">Play</span>
                </Button>
              </div>

              {/* Thread area */}
              <div
                ref={chatScrollRef}
                className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 min-h-[320px] max-h-[60vh] md:max-h-[440px] bg-[#FFF6EC]"
              >
                {activeChallengeWithFriend && (
                  <div className="p-4 rounded-[22px] border-2 border-[#E9A912] bg-[#FFC23D] shadow-[0_4px_0_#E9A912] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#FFFFFF] flex items-center justify-center text-[#1E1B24] shrink-0">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-[#1E1B24]">
                          Active Dare: {activeChallengeWithFriend.title}
                        </p>
                        <p className="text-xs text-[#1E1B24]/80">
                          Status: <span className="font-bold uppercase text-[#1E1B24]">{activeChallengeWithFriend.status}</span>
                        </p>
                      </div>
                    </div>

                    {activeChallengeWithFriend.loser_id === userId && (
                      <button
                        type="button"
                        onClick={() => setRecordModalChallenge(activeChallengeWithFriend)}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 rounded-full bg-[#1E1B24] text-white text-sm font-bold shrink-0 shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
                      >
                        <Video className="h-4 w-4" />
                        Record Dare Video
                      </button>
                    )}

                    {activeChallengeWithFriend.winner_id === userId &&
                      activeChallengeWithFriend.status === "submitted" && (
                        <button
                          type="button"
                          onClick={() => setReviewModalChallenge(activeChallengeWithFriend)}
                          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 rounded-full bg-[#1E1B24] text-white text-sm font-bold shrink-0 shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
                        >
                          Review Dare Video
                        </button>
                      )}
                  </div>
                )}

                {inviteFeedback && (
                  <div className="py-2 px-4 rounded-full bg-[#E3FAF3] border-2 border-[#B7EEDD] text-[#0B8A6C] text-sm font-bold text-center">
                    {inviteFeedback}
                  </div>
                )}

                {(messages[selectedFriend.friend_id] || []).length === 0 ? (
                  <div className="text-center py-14 text-sm text-[#6E6878]">
                    <MessageCircle className="h-9 w-9 text-[#8E8798] mx-auto mb-2" />
                    <p>No messages yet. Send a message or challenge {selectedFriend.display_name} to a game!</p>
                  </div>
                ) : (
                  (messages[selectedFriend.friend_id] || []).map((msg) => {
                    const isSelf = msg.sender_id === userId;

                    return (
                      <div
                        key={msg.id}
                        className={cn("flex flex-col", isSelf ? "items-end" : "items-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] sm:max-w-md px-4 py-2.5 text-sm leading-relaxed",
                            isSelf
                              ? "bg-[#FF5A3C] text-white rounded-[20px] rounded-br-[6px]"
                              : "bg-[#FFFFFF] text-[#1E1B24] border-2 border-[#EADBC8] rounded-[20px] rounded-bl-[6px]",
                          )}
                        >
                          {msg.type === "game_invite" ? (
                            <div className="space-y-2">
                              <p className="font-bold flex items-start gap-1.5">
                                <Gamepad2 className="h-4 w-4 mt-0.5 shrink-0" />
                                {msg.text}
                              </p>
                              <div className="pt-1">
                                <Link
                                  href="/play/rps"
                                  className="inline-flex items-center min-h-[44px] px-4 rounded-full bg-[#FFFFFF] text-[#C9381F] text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1B24]"
                                >
                                  Open Game
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <p>{msg.text}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-[#6E6878] mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pill composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t-2 border-[#EADBC8] bg-[#FFFFFF] flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Message ${selectedFriend.display_name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 min-w-0 min-h-[48px] px-5 text-sm rounded-full bg-[#FFF6EC] border-2 border-[#EADBC8] text-[#1E1B24] placeholder:text-[#6E6878] focus:outline-none focus:border-[#FF5A3C] focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  aria-label="Send message"
                  className="shrink-0 w-12 h-12 rounded-full bg-[#FF5A3C] text-white flex items-center justify-center shadow-[0_4px_0_#C9381F] active:translate-y-[2px] active:shadow-[0_2px_0_#C9381F] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E1B24]"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#6E6878]">
              <MessageCircle className="h-12 w-12 text-[#8E8798] mb-3" />
              <h3 className="font-display font-bold text-xl text-[#1E1B24] mb-1">Select a Friend</h3>
              <p className="text-sm max-w-sm">
                Choose a friend from the left to start messaging, share game invites, or review challenge dares.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Modals: Story Viewer, Video Recorder, Winner Review ──────────── */}
      {activeStoryViewer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Story viewer"
          className="fixed inset-0 z-50 bg-[#0F0D14] flex flex-col"
        >
          {/* Top bar */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={activeStoryViewer.creator?.avatar_url}
                name={activeStoryViewer.creator?.display_name || "P"}
                size="sm"
              />
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-white truncate">{activeStoryViewer.creator?.display_name}</p>
                <p className="text-xs text-white/70 truncate">{activeStoryViewer.challenge?.title || "Dare Submission"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveStoryViewer(null)}
              aria-label="Close story"
              className="shrink-0 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Video */}
          <div className="flex-1 min-h-0 w-full max-w-[520px] mx-auto bg-black flex items-center justify-center rounded-[26px] overflow-hidden">
            {activeStoryViewer.media_url ? (
              <video
                src={activeStoryViewer.media_url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-6 text-white/70 text-sm">
                <Film className="h-8 w-8 mx-auto mb-2 opacity-60" />
                <p>Video processing or media expired.</p>
              </div>
            )}
          </div>

          {/* Footer pills */}
          <div className="p-4 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-white">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15">
              {activeStoryViewer.visibility === "private" ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              {activeStoryViewer.visibility === "private" ? "Friends Only" : "Public Story"}
            </span>
            {activeStoryViewer.duration_seconds > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 font-mono" title={`Duration: ${activeStoryViewer.duration_seconds}s`}>
                <Clock className="h-3.5 w-3.5 text-[#FFC23D]" />
                {activeStoryViewer.duration_seconds}s
              </span>
            )}
            <span className="inline-flex items-center px-3 py-2 rounded-full bg-white/15">Expires in 24 hours</span>
          </div>
        </div>
      )}

      {recordModalChallenge && (
        <VideoRecorderModal
          isOpen={Boolean(recordModalChallenge)}
          onClose={() => setRecordModalChallenge(null)}
          challengeId={recordModalChallenge.id}
          challengeTitle={recordModalChallenge.title}
          challengeInstructions={recordModalChallenge.instructions}
          onSuccess={() => {
            setRecordModalChallenge(null);
            fetchChallenges();
            fetchStories();
          }}
        />
      )}

      {reviewModalChallenge && (
        <WinnerReviewModal
          isOpen={Boolean(reviewModalChallenge)}
          onClose={() => setReviewModalChallenge(null)}
          challengeId={reviewModalChallenge.id}
          challengeTitle={reviewModalChallenge.title}
          loserName="Opponent"
          loserEvoId="EVO-PARTICIPANT"
          onDecision={() => {
            setReviewModalChallenge(null);
            fetchChallenges();
            fetchStories();
          }}
        />
      )}
    </div>
  );
}
