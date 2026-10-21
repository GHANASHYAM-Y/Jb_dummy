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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, Button, EvoIdBadge, Spinner } from "@/components/ui";
import { VideoRecorderModal } from "@/components/challenges/VideoRecorderModal";
import { WinnerReviewModal } from "@/components/challenges/WinnerReviewModal";
import type { Challenge, FriendEntry } from "@/types/database";

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

  // 1. Fetch Stories for user interactions
  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges/stories");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.stories) {
          setStories(data.stories);
        }
      }
    } catch {
      // Quiet fallback
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  // 2. Fetch Challenges for user interactions
  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges?filter=all");
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges || []);
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
        setTimeout(() => setInviteFeedback(null), 3000);
      } else {
        setInviteFeedback(data.error || "Could not send challenge.");
      }
    } catch {
      setInviteFeedback("Error sending challenge.");
    } finally {
      setSendingInvite(false);
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
    <div className="py-6 sm:py-8 evo-container max-w-6xl space-y-6">

      {/* ── 1. Top Section: Active 24h Story Reel ────────────────────────────── */}
      <section aria-labelledby="stories-reel-heading" className="rounded-3xl border border-[#E2E8E2] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-[#167D78]" />
            <h2 id="stories-reel-heading" className="font-display font-bold text-base sm:text-lg text-[#203331]">
              24-Hour Dare Stories
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#65736F]">
            {stories.length} Active {stories.length === 1 ? "Story" : "Stories"}
          </span>
        </div>

        {/* Stories Horizontal Reel */}
        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
          {/* Post/Submit Dare CTA */}
          <div
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
            className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#167D78] bg-[#DDF2EB] flex items-center justify-center text-[#167D78] group-hover:scale-105 transition-all shadow-xs">
              <Plus className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold text-[#167D78] max-w-[72px] text-center truncate">
              Post Dare
            </span>
          </div>

          {/* Active Story Bubbles */}
          {storiesLoading ? (
            <div className="flex items-center gap-3 py-4 px-2">
              <Spinner size="sm" className="text-[#167D78]" />
              <span className="text-xs text-[#65736F]">Loading active stories...</span>
            </div>
          ) : stories.length === 0 ? (
            <div className="py-3 px-2 text-xs text-[#65736F] italic">
              No active stories right now. Win a match to dare your friends!
            </div>
          ) : (
            stories.map((s) => {
              const creatorName = s.creator?.display_name || "Player";
              const isPrivate = s.visibility === "private";

              return (
                <div
                  key={s.id}
                  onClick={() => setActiveStoryViewer(s)}
                  className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl ring-2 ring-[#167D78] p-0.5 group-hover:scale-105 transition-all overflow-hidden bg-white shadow-xs flex items-center justify-center">
                      <Avatar
                        src={s.creator?.avatar_url}
                        name={creatorName}
                        size="md"
                        className="w-full h-full rounded-xl"
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-xs">
                      {isPrivate ? (
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#EEF1ED] text-[#65736F]" title="Private (Friends only)">
                          <Lock className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#DDF2EB] text-[#167D78]" title="Public">
                          <Globe className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#203331] max-w-[68px] truncate text-center">
                    {creatorName}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── 2. Main Section: Conversations & Messaging Hub ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[580px]">

        {/* ── Left Column: Friends & Conversations List ── */}
        <div className="md:col-span-4 rounded-3xl border border-[#E2E8E2] bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-base text-[#203331]">
                Conversations
              </h2>
              <Link href="/friends" className="text-xs font-bold text-[#167D78] hover:underline">
                Find Friends
              </Link>
            </div>

            {/* Search Friends */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search friends..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F7F8F4] border border-[#E2E8E2] text-[#203331] focus:outline-hidden focus:border-[#167D78]"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8E9B97]" />
            </div>

            {/* Friend List */}
            <div className="space-y-1.5 overflow-y-auto max-h-[460px] pr-1">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#65736F]">
                  <p className="mb-2">No conversations found.</p>
                  <Link href="/friends">
                    <Button variant="secondary" size="sm" className="text-xs font-bold">
                      Add Friends
                    </Button>
                  </Link>
                </div>
              ) : (
                filteredFriends.map((f) => {
                  const isSelected = selectedFriend?.friend_id === f.friend_id;
                  const friendMessages = messages[f.friend_id] || [];
                  const lastMessage = friendMessages[friendMessages.length - 1];

                  return (
                    <button
                      key={f.friend_id}
                      type="button"
                      onClick={() => setSelectedFriend(f)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all",
                        isSelected
                          ? "bg-[#DDF2EB] text-[#167D78] border border-[rgba(22,125,120,0.2)] shadow-xs"
                          : "hover:bg-[#F7F8F4] text-[#203331]",
                      )}
                    >
                      <Avatar src={f.avatar_url} name={f.display_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs truncate">{f.display_name}</p>
                          <span className="font-mono text-[10px] text-[#8E9B97]">{f.evoora_id}</span>
                        </div>
                        <p className="text-[11px] text-[#65736F] truncate mt-0.5">
                          {lastMessage ? lastMessage.text : "Tap to open chat & challenges"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column: Active Conversation Thread ── */}
        <div className="md:col-span-8 rounded-3xl border border-[#E2E8E2] bg-white flex flex-col justify-between shadow-xs overflow-hidden">
          {selectedFriend ? (
            <>
              {/* Chat Header */}
              <div className="p-4 sm:p-5 border-b border-[#E2E8E2] flex items-center justify-between gap-4 bg-[#F7F8F4]/50">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={selectedFriend.avatar_url} name={selectedFriend.display_name} size="sm" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-[#203331] truncate">{selectedFriend.display_name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <EvoIdBadge id={selectedFriend.evoora_id} />
                      <span className="text-[10px] text-[#167D78] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#167D78] animate-pulse" />
                        Connected
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSendGameInvite}
                    disabled={sendingInvite}
                    className="text-xs font-bold shadow-xs"
                  >
                    <Gamepad2 className="h-3.5 w-3.5 mr-1" />
                    Challenge to RPS
                  </Button>
                </div>
              </div>

              {/* Chat Thread Area */}
              <div
                ref={chatScrollRef}
                className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[420px] bg-white"
              >
                {/* Active Dare Notification Banner inside Thread */}
                {activeChallengeWithFriend && (
                  <div className="p-4 rounded-2xl border border-[rgba(217,95,73,0.3)] bg-[#FCE6DE] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#D95F49] shrink-0">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#203331]">
                          Active Dare: {activeChallengeWithFriend.title}
                        </p>
                        <p className="text-[11px] text-[#65736F]">
                          Status: <span className="font-semibold uppercase text-[#D95F49]">{activeChallengeWithFriend.status}</span>
                        </p>
                      </div>
                    </div>

                    {activeChallengeWithFriend.loser_id === userId && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setRecordModalChallenge(activeChallengeWithFriend)}
                        className="text-xs font-bold shrink-0 bg-[#D95F49] hover:bg-[#C34E39]"
                      >
                        <Video className="h-3.5 w-3.5 mr-1" />
                        Record Dare Video
                      </Button>
                    )}

                    {activeChallengeWithFriend.winner_id === userId &&
                      activeChallengeWithFriend.status === "submitted" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setReviewModalChallenge(activeChallengeWithFriend)}
                          className="text-xs font-bold shrink-0"
                        >
                          Review Dare Video
                        </Button>
                      )}
                  </div>
                )}

                {inviteFeedback && (
                  <div className="p-2.5 rounded-xl bg-[#DDF2EB] text-[#167D78] text-xs font-bold text-center">
                    {inviteFeedback}
                  </div>
                )}

                {/* Message Bubbles */}
                {(messages[selectedFriend.friend_id] || []).length === 0 ? (
                  <div className="text-center py-16 text-xs text-[#65736F]">
                    <MessageCircle className="h-8 w-8 text-[#8E9B97] mx-auto mb-2 opacity-50" />
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
                            "max-w-md rounded-2xl p-3 text-xs leading-relaxed shadow-xs",
                            isSelf
                              ? "bg-[#167D78] text-white rounded-br-none"
                              : "bg-[#F7F8F4] text-[#203331] border border-[#E2E8E2] rounded-bl-none",
                          )}
                        >
                          {msg.type === "game_invite" ? (
                            <div className="space-y-2">
                              <p className="font-bold flex items-center gap-1.5">
                                <Gamepad2 className="h-4 w-4" />
                                {msg.text}
                              </p>
                              <div className="pt-2 border-t border-white/20 flex gap-2">
                                <Link href="/play/rps">
                                  <span className="px-3 py-1 rounded-lg bg-white text-[#167D78] text-[11px] font-bold">
                                    Open Game
                                  </span>
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <p>{msg.text}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-[#8E9B97] mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-[#E2E8E2] bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Message ${selectedFriend.display_name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-xl bg-[#F7F8F4] border border-[#E2E8E2] text-[#203331] focus:outline-hidden focus:border-[#167D78]"
                />
                <Button type="submit" variant="primary" size="sm" disabled={!inputText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#65736F]">
              <MessageCircle className="h-12 w-12 text-[#8E9B97] mb-3 opacity-40" />
              <h3 className="font-bold text-base text-[#203331] mb-1">Select a Friend</h3>
              <p className="text-xs max-w-sm">
                Choose a friend from the left to start messaging, share game invites, or review challenge dares.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Modals: Story Viewer, Video Recorder, Winner Review ──────────── */}
      {activeStoryViewer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#203331] text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-white/10 relative">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <Avatar
                  src={activeStoryViewer.creator?.avatar_url}
                  name={activeStoryViewer.creator?.display_name || "P"}
                  size="sm"
                />
                <div>
                  <p className="font-bold text-sm">{activeStoryViewer.creator?.display_name}</p>
                  <p className="text-[11px] text-white/60">{activeStoryViewer.challenge?.title || "Dare Submission"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveStoryViewer(null)}
                className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-[9/16] max-h-[60vh] w-full bg-black flex items-center justify-center">
              {activeStoryViewer.media_url ? (
                <video
                  src={activeStoryViewer.media_url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 text-white/60 text-xs">
                  <Film className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Video processing or media expired.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                {activeStoryViewer.visibility === "private" ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {activeStoryViewer.visibility === "private" ? "Friends Only" : "Public Story"}
              </span>
              <span>Expires in 24 hours</span>
            </div>
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
