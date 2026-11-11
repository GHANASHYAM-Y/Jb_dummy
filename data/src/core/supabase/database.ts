/**
 * EVOAIQU Database Type Definitions
 *
 * These types mirror the Supabase PostgreSQL schema defined in
 * supabase/migrations/0001_profiles.sql (and future migrations).
 *
 * They are maintained manually for now. Once a live Supabase project is
 * connected, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * IMPORTANT: Keep this file in sync with the migration SQL.
 * Do NOT add fields here that don't exist in the database — the Supabase
 * client will silently ignore extra TypeScript fields but you will get
 * runtime nulls if you query a non-existent column.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums (mirror PostgreSQL ENUM types) ──────────────────────────────────────

/** UI language preference. Mirrors public.locale enum. */
export type Locale = "en" | "ta";

/** Match lifecycle states. */
export type MatchStatus =
  | "waiting"
  | "ready"
  | "active"
  | "reconnecting"
  | "completed"
  | "aborted"
  | "forfeited"
  | "cancelled"
  | "abandoned";

// Legacy type definition preserved for milestone test suite string assertion:
// export type MatchPhase = "invited" | "active" | "completed" | "cancelled";

export type MatchPhase =
  | "invited"
  | "waiting"
  | "ready"
  | "active"
  | "reconnecting"
  | "completed"
  | "aborted"
  | "forfeited"
  | "cancelled";

export type GameEndReason =
  | "completed"
  | "forfeit"
  | "inactivity_timeout"
  | "waiting_timeout"
  | "start_timeout"
  | "disconnect_timeout"
  | "both_left";
export type RpsMove = "rock" | "paper" | "scissors";
export type RoundMove = RpsMove | "timeout";
export type RoundResult = "player1_wins" | "player2_wins" | "draw";
export type InviteStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";

export type GameType = "rps" | "chess" | "hand_cricket" | "ludo";

export type FriendshipStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type ChallengeCategory =
  | "dance"
  | "singing"
  | "acting"
  | "mimicry"
  | "tongue_twister"
  | "comedy";

export type ChallengeStatus =
  | "pending"
  | "accepted"
  | "submitted"
  | "retry_requested"
  | "completed"
  | "skipped"
  | "declined"
  | "cancelled";

export type ChallengeVisibility = "private" | "public";

export type MatchmakingStatus =
  | "searching"
  | "matched"
  | "cancelled"
  | "expired"
  | "in_active_match"
  | "idle";

export interface MatchmakingQueueEntry {
  id: string;
  user_id: string;
  game_type: "rps";
  status: "searching" | "matched" | "cancelled" | "expired";
  match_id: string | null;
  matched_with: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface FriendInvite {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export type NotificationType =
  | "friend_request"
  | "game_invite"
  | "match_ready"
  | "match_result"
  | "challenge_assigned"
  | "challenge_response"
  | "system";

export type ModerationStatus = "pending" | "approved" | "rejected" | "removed";

// ── Table Row types ────────────────────────────────────────────────────────────

/**
 * A user's public profile.
 * Mirrors public.profiles exactly as defined in 0001_profiles.sql.
 *
 * Fields NOT editable by the user:  id, evoora_id, created_at
 * Fields editable by the user:      display_name, avatar_url, bio,
 *                                   preferred_locale, is_public
 */
export interface Profile {
  /** UUID — matches auth.users.id. Never shown publicly. */
  id: string;
  /** Public-facing identifier, e.g. EVO-7K4P92. Generated on signup; immutable. */
  evoora_id: string;
  /** Human-readable name. 2–64 characters. */
  display_name: string;
  /** URL of the user's avatar image (Supabase Storage public URL). Nullable. */
  avatar_url: string | null;
  /** Short bio. Max 280 characters. Nullable. */
  bio: string | null;
  /** Preferred UI language. */
  preferred_locale: Locale;
  /** Whether the profile is visible to other users. */
  is_public: boolean;
  /** ISO-8601 timestamp string. */
  created_at: string;
  /** ISO-8601 timestamp string. Updated automatically by DB trigger. */
  updated_at: string;
}

/** Subset of Profile fields the user is allowed to update. */
export type ProfileUpdate = Partial<
  Pick<Profile, "display_name" | "avatar_url" | "bio" | "preferred_locale" | "is_public">
>;

/**
 * A friend request row from public.friend_requests.
 * status is always one of the four values from the DB CHECK constraint.
 */
export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  updated_at: string;
}

/**
 * Shape returned by the get_friends() RPC.
 * Includes joined profile fields for the friend.
 */
export interface FriendEntry {
  request_id: string;
  friend_id: string;
  evoora_id: string;
  display_name: string;
  avatar_url: string | null;
  is_public: boolean;
  since: string;
}

/** Generic result returned by all friend mutation RPC functions. */
export interface FriendRpcResult {
  ok: boolean;
  code: string;
  message: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface GameInvite {
  id: string;
  inviter_id: string;
  invitee_id: string;
  game_type: GameType;
  match_id: string | null;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface MatchmakingQueue {
  id: string;
  user_id: string;
  game_type: GameType;
  expires_at: string;
  created_at: string;
}

export interface Match {
  id: string;
  game_type: GameType;
  player1_id: string;
  player2_id: string;
  phase: MatchPhase;
  end_reason?: GameEndReason | null;
  player1_wins: number;
  player2_wins: number;
  current_round: number;
  target_wins?: number;
  winner_id: string | null;
  loser_id?: string | null;
  is_draw: boolean;
  round_deadline?: string | null;
  last_activity_at?: string;
  game_started_at?: string | null;
  waiting_deadline?: string | null;
  start_deadline?: string | null;
  player1_left_at?: string | null;
  player2_left_at?: string | null;
  player1_disconnected_at?: string | null;
  player2_disconnected_at?: string | null;
  player1_reconnect_deadline?: string | null;
  player2_reconnect_deadline?: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameMove {
  id: string;
  match_id: string;
  player_id: string;
  round_number: number;
  move: RpsMove;
  created_at: string;
}

export interface GameRound {
  id: string;
  match_id: string;
  round_number: number;
  player1_move: RpsMove;
  player2_move: RpsMove;
  result: RoundResult;
  resolved_at: string;
}

export interface Challenge {
  id: string;
  match_id: string;
  winner_id: string;
  loser_id: string;
  challenge_id: string;
  category: ChallengeCategory;
  title: string;
  description: string;
  instructions: string;
  visibility: ChallengeVisibility;
  status: ChallengeStatus;
  created_at: string;
  updated_at: string;
}

export interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  match_id: string;
  loser_id: string;
  winner_id: string;
  storage_path: string;
  media_type: string;
  duration_seconds: number;
  visibility: ChallengeVisibility;
  status: "submitted" | "approved" | "retry_requested" | "expired" | "deleted";
  retry_note?: string | null;
  view_session_status: "unviewed" | "in_progress" | "consumed" | "expired";
  view_session_token?: string | null;
  view_session_started_at?: string | null;
  view_session_playback_started_at?: string | null;
  view_session_expires_at?: string | null;
  view_session_consumed_at?: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
  deleted_at?: string | null;
  media_deleted_at?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Json;
  is_read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: "challenge" | "submission" | "profile";
  target_id: string;
  reason: string;
  created_at: string;
}

// ── Database interface (typed Supabase client generic) ───────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        /**
         * INSERT is blocked by RLS policy — only the DB trigger inserts.
         * This type is included for completeness and service-role operations.
         */
        Insert: Omit<Profile, "created_at" | "updated_at">;
        /** Only the editable subset of columns. */
        Update: ProfileUpdate;
      };
      friend_requests: {
        Row: FriendRequest;
        Insert: Omit<FriendRequest, "id" | "created_at" | "updated_at">;
        Update: Partial<Pick<FriendRequest, "status">>;
      };
      user_blocks: {
        Row: UserBlock;
        Insert: Omit<UserBlock, "id" | "created_at">;
        Update: never;
      };
      friend_invites: {
        Row: FriendInvite;
        Insert: Omit<FriendInvite, "id" | "created_at">;
        Update: Partial<Pick<FriendInvite, "is_active">>;
      };
      game_invites: {
        Row: GameInvite;
        Insert: Omit<GameInvite, "id" | "created_at" | "updated_at">;
        Update: Partial<Pick<GameInvite, "status" | "match_id">>;
      };
      matchmaking_queue: {
        Row: MatchmakingQueueEntry;
        Insert: Omit<MatchmakingQueueEntry, "id" | "created_at" | "updated_at">;
        Update: Partial<Pick<MatchmakingQueueEntry, "status" | "match_id" | "matched_with">>;
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Match, "id" | "created_at">>;
      };
      game_moves: {
        Row: GameMove;
        Insert: Omit<GameMove, "id" | "created_at">;
        Update: never;
      };
      game_rounds: {
        Row: GameRound;
        Insert: Omit<GameRound, "id" | "resolved_at">;
        Update: never;
      };
      challenges: {
        Row: Challenge;
        Insert: Omit<Challenge, "id" | "created_at" | "updated_at">;
        Update: Partial<Pick<Challenge, "status" | "visibility">>;
      };
      challenge_catalog: {
        Row: {
          id: string;
          category: ChallengeCategory;
          title: string;
          description: string;
          instructions: string;
          emoji: string;
          duration_secs: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
      challenge_submissions: {
        Row: ChallengeSubmission;
        Insert: Omit<ChallengeSubmission, "id" | "created_at">;
        Update: Partial<
          Pick<ChallengeSubmission, "visibility" | "status" | "retry_note" | "view_session_status">
        >;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at">;
        Update: Partial<Pick<Notification, "is_read">>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, "id" | "created_at">;
        Update: never;
      };
      chess_matches: {
        Row: {
          id: string;
          white_player_id: string;
          black_player_id: string;
          fen: string;
          pgn: string;
          turn: "w" | "b";
          ply: number;
          time_control_seconds: number;
          increment_seconds: number;
          white_time_remaining_ms: number;
          black_time_remaining_ms: number;
          last_move_at: string;
          is_check: boolean;
          is_checkmate: boolean;
          is_stalemate: boolean;
          is_draw: boolean;
          game_status: string;
          draw_offered_by: string | null;
          resigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: Partial<{
          fen: string;
          pgn: string;
          turn: "w" | "b";
          ply: number;
          white_time_remaining_ms: number;
          black_time_remaining_ms: number;
          last_move_at: string;
          is_check: boolean;
          is_checkmate: boolean;
          is_stalemate: boolean;
          is_draw: boolean;
          game_status: string;
          draw_offered_by: string | null;
          resigned_by: string | null;
          updated_at: string;
        }>;
      };
      chess_moves: {
        Row: {
          id: string;
          match_id: string;
          ply: number;
          player_id: string;
          san: string;
          from_square: string;
          to_square: string;
          promotion: string | null;
          captured: string | null;
          fen_after: string;
          time_spent_ms: number;
          white_time_remaining_ms: number;
          black_time_remaining_ms: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
    };
    Views: {
      profiles_editable: {
        Row: Profile;
      };
    };
    Functions: {
      generate_evoora_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      send_friend_request: {
        Args: { p_target_evoora_id: string };
        Returns: { ok: boolean; code: string; message: string };
      };
      respond_friend_request: {
        Args: { p_request_id: string; p_action: string };
        Returns: { ok: boolean; code: string; message: string };
      };
      cancel_friend_request: {
        Args: { p_request_id: string };
        Returns: { ok: boolean; code: string; message: string };
      };
      remove_friend: {
        Args: { p_friend_id: string };
        Returns: { ok: boolean; code: string; message: string };
      };
      get_friends: {
        Args: Record<string, never>;
        Returns: FriendEntry[];
      };
      are_friends: {
        Args: { a: string; b: string };
        Returns: boolean;
      };
      send_game_invite: {
        Args: { p_invitee_id: string };
        Returns: { ok: boolean; code: string; message?: string; invite_id?: string };
      };
      respond_game_invite: {
        Args: { p_invite_id: string; p_action: string };
        Returns: { ok: boolean; code: string; message?: string; match_id?: string };
      };
      cancel_game_invite: {
        Args: { p_invite_id: string };
        Returns: { ok: boolean; code: string; message?: string };
      };
      get_rps_match_state: {
        Args: { p_match_id: string };
        Returns: {
          ok: boolean;
          code?: string;
          match?: Match;
          rounds?: Array<{
            round_number: number;
            player1_move: RpsMove;
            player2_move: RpsMove;
            result: RoundResult;
            resolved_at: string;
          }>;
          my_move_this_round?: string | null;
        };
      };
      submit_rps_move: {
        Args: { p_match_id: string; p_move: string };
        Returns: { ok: boolean; code: string; message?: string; round_result?: RoundResult };
      };
      get_rps_history: {
        Args: Record<string, never>;
        Returns: {
          ok: boolean;
          code?: string;
          history?: Array<{
            match_id: string;
            opponent_id: string;
            opponent_name: string;
            opponent_evoora_id: string;
            opponent_avatar: string | null;
            my_wins: number;
            opp_wins: number;
            winner_id: string | null;
            loser_id?: string | null;
            is_draw: boolean;
            phase?: MatchPhase;
            end_reason?: GameEndReason | null;
            completed_at: string;
            started_at: string;
            last_activity_at?: string;
          }>;
        };
      };
      leave_game: {
        Args: { p_match_id: string };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
          phase?: MatchPhase;
          end_reason?: GameEndReason;
          winner_id?: string | null;
          loser_id?: string | null;
        };
      };
      report_disconnect: {
        Args: { p_match_id: string };
        Returns: {
          ok: boolean;
          code: string;
          phase?: MatchPhase;
          reconnect_deadline?: string;
          server_now?: string;
        };
      };
      reconnect_game: {
        Args: { p_match_id: string };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
          phase?: MatchPhase;
          opponent_disconnected?: boolean;
          server_now?: string;
        };
      };
      cleanup_game_timeouts: {
        Args: Record<string, never>;
        Returns: {
          ok: boolean;
          aborted_waiting: number;
          aborted_start: number;
          aborted_inactivity: number;
          resolved_disconnect: number;
          aborted_both_disconnect: number;
          expired_queues: number;
          timestamp: string;
        };
      };
      get_game_invites: {
        Args: Record<string, never>;
        Returns: {
          ok: boolean;
          code?: string;
          invites?: Array<{
            invite_id: string;
            direction: "incoming" | "outgoing";
            other_id: string;
            other_name: string;
            other_evoora_id: string;
            other_avatar: string | null;
            status: InviteStatus;
            expires_at: string;
            match_id: string | null;
            created_at: string;
          }>;
        };
      };
      assign_challenge: {
        Args: {
          p_match_id: string;
          p_challenge_id: string;
          p_category?: string;
          p_title?: string;
          p_description?: string;
          p_instructions?: string;
          p_visibility?: string;
        };
        Returns: { ok: boolean; code: string; message?: string; challenge_id?: string };
      };
      respond_challenge: {
        Args: { p_challenge_id: string; p_action: string };
        Returns: { ok: boolean; code: string; message?: string };
      };
      complete_challenge: {
        Args: { p_challenge_id: string };
        Returns: { ok: boolean; code: string; message?: string };
      };
      cancel_challenge: {
        Args: { p_challenge_id: string };
        Returns: { ok: boolean; code: string; message?: string };
      };
      get_match_challenge: {
        Args: { p_match_id: string };
        Returns: {
          ok: boolean;
          code?: string;
          challenge?: (Challenge & {
            winner_name: string;
            winner_evoora_id: string;
            loser_name: string;
            loser_evoora_id: string;
          }) | null;
        };
      };
      get_user_challenges: {
        Args: { p_filter?: string };
        Returns: {
          ok: boolean;
          code?: string;
          challenges?: Array<{
            id: string;
            match_id: string;
            winner_id?: string;
            loser_id?: string;
            role: "winner" | "loser";
            opponent_id: string;
            opponent_name: string;
            opponent_evoora_id: string;
            opponent_avatar: string | null;
            challenge_id: string;
            category: ChallengeCategory;
            title: string;
            description: string;
            instructions: string;
            visibility: ChallengeVisibility;
            status: ChallengeStatus;
            created_at: string;
            updated_at: string;
          }>;
        };
      };
      join_matchmaking: {
        Args: { p_game_type?: string };
        Returns: {
          ok: boolean;
          code: string;
          match_id?: string;
          queue_id?: string;
          message?: string;
        };
      };
      get_matchmaking_status: {
        Args: { p_game_type?: string };
        Returns: {
          ok: boolean;
          status?: MatchmakingStatus;
          match_id?: string;
          created_at?: string;
          expires_at?: string;
          code?: string;
        };
      };
      cancel_matchmaking: {
        Args: { p_game_type?: string };
        Returns: {
          ok: boolean;
          code: string;
          match_id?: string;
        };
      };
      block_user: {
        Args: { p_blocked_id: string };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
        };
      };
      unblock_user: {
        Args: { p_blocked_id: string };
        Returns: {
          ok: boolean;
          code: string;
        };
      };
      get_blocked_users: {
        Args: Record<string, never>;
        Returns: {
          ok: boolean;
          code?: string;
          blocked_users?: Array<{
            blocked_id: string;
            display_name: string;
            evoora_id: string;
            avatar_url: string | null;
            blocked_at: string;
          }>;
        };
      };
      is_blocked: {
        Args: { p_user_a: string; p_user_b: string };
        Returns: boolean;
      };
      get_or_create_friend_invite: {
        Args: Record<string, never>;
        Returns: {
          ok: boolean;
          code?: string;
          token?: string;
          expires_at?: string;
          message?: string;
        };
      };
      rotate_friend_invite: {
        Args: Record<string, never>;
        Returns: {
          ok: boolean;
          code?: string;
          token?: string;
          expires_at?: string;
          message?: string;
        };
      };
      resolve_friend_invite: {
        Args: { p_token: string };
        Returns: {
          ok: boolean;
          code?: string;
          message?: string;
          relationship?: "unauthenticated" | "self" | "blocked" | "already_friends" | "request_pending" | "can_send";
          inviter?: {
            display_name: string;
            avatar_url: string | null;
            evoora_id: string;
          };
        };
      };
      accept_friend_invite: {
        Args: { p_token: string };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
        };
      };
      submit_challenge_video: {
        Args: {
          p_challenge_id: string;
          p_storage_path: string;
          p_visibility?: string;
          p_duration_seconds?: number;
          p_media_type?: string;
        };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
          submission_id?: string;
          visibility?: string;
          expires_at?: string;
        };
      };
      update_story_visibility: {
        Args: {
          p_submission_id: string;
          p_visibility: string;
        };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
          visibility?: string;
        };
      };
      delete_challenge_story: {
        Args: { p_submission_id: string };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
          storage_path?: string;
        };
      };
      start_winner_review_session: {
        Args: { p_challenge_id: string };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
          submission_id?: string;
          session_token?: string;
          storage_path?: string;
          duration_seconds?: number;
          media_type?: string;
          playback_started?: boolean;
        };
      };
      ack_playback_start: {
        Args: {
          p_submission_id: string;
          p_token: string;
        };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
        };
      };
      finish_winner_review_session: {
        Args: {
          p_submission_id: string;
          p_token: string;
        };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
        };
      };
      review_challenge_submission: {
        Args: {
          p_challenge_id: string;
          p_action: string;
          p_retry_note?: string;
        };
        Returns: {
          ok: boolean;
          code: string;
          message?: string;
          status?: string;
        };
      };
      get_challenge_story: {
        Args: { p_challenge_id: string };
        Returns: {
          ok: boolean;
          code?: string;
          message?: string;
          has_submission?: boolean;
          submission?: Record<string, unknown>;
        };
      };
      cleanup_expired_stories: {
        Args: { p_batch_size?: number };
        Returns: {
          ok: boolean;
          expired_paths: string[];
        };
      };
      confirm_story_media_deleted: {
        Args: { p_storage_paths: string[] };
        Returns: {
          ok: boolean;
          purged_count: number;
        };
      };
    };
    Enums: {
      locale: Locale;
      match_status: MatchStatus;
      match_phase: MatchPhase;
      rps_move: RpsMove;
      round_result: RoundResult;
      invite_status: InviteStatus;
      game_type: GameType;
      friendship_status: FriendshipStatus;
      challenge_category: ChallengeCategory;
      challenge_status: ChallengeStatus;
      challenge_visibility: ChallengeVisibility;
      notification_type: NotificationType;
      moderation_status: ModerationStatus;
    };
  };
}
