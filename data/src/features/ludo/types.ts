/**
 * EVOAIQU — Ludo friend-match types
 *
 * Online games are 1 vs 1: player1 is red, player2 is yellow; red moves first.
 */

import type { GameEndReason, MatchPhase } from "@/core/supabase/database";
import type { LudoState } from "./engine/engine";

export interface LudoMatchInfo {
  id: string;
  phase: MatchPhase;
  end_reason: GameEndReason | null;
  player1_id: string;
  player2_id: string;
  winner_id: string | null;
  loser_id: string | null;
  is_draw: boolean;
  last_activity_at: string | null;
  waiting_deadline: string | null;
  completed_at: string | null;
  player1_disconnected_at: string | null;
  player2_disconnected_at: string | null;
  player1_reconnect_deadline: string | null;
  player2_reconnect_deadline: string | null;
}

export interface LudoGameInfo {
  status: "waiting" | "playing" | "finished";
  version: number;
  state: LudoState;
  turn_deadline: string | null;
  player1_joined: boolean;
  player2_joined: boolean;
}

export interface LudoSnapshot {
  match: LudoMatchInfo;
  game: LudoGameInfo;
  server_now: string;
}

export interface LudoPlayerProfile {
  id: string;
  display_name: string;
  evoora_id: string | null;
  avatar_url: string | null;
}

export interface LudoPlayers {
  player1: LudoPlayerProfile;
  player2: LudoPlayerProfile;
}

/** An unfinished friend match, as listed in the lobby. */
export interface LudoOpenMatch {
  id: string;
  phase: MatchPhase;
  opponent_id: string;
  opponent_name: string;
  opponent_avatar: string | null;
  created_by_me: boolean;
  i_joined: boolean;
  opponent_joined: boolean;
  created_at: string;
}

/** Time to roll or move before anyone may claim a timeout */
export const LUDO_TURN_MS = 20_000;
