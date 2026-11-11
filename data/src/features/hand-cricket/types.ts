/**
 * EVOAIQU — Hand Cricket friend-match types
 *
 * Shapes returned by get_hand_cricket_state() (0015_hand_cricket.sql) and the
 * /api/hand-cricket routes. Field names follow the database (snake_case).
 */

import type { GameEndReason, MatchPhase } from "@/core/supabase/database";

export type HandCricketGameStatus = "toss" | "in_play" | "finished";
export type TossDecision = "bat" | "bowl";

export interface HandCricketMatchInfo {
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

export interface HandCricketGameInfo {
  status: HandCricketGameStatus;
  /** 11 player names each, in batting order */
  player1_squad: string[];
  player2_squad: string[];
  player1_joined: boolean;
  player2_joined: boolean;
  toss_winner_id: string;
  toss_decision: TossDecision | null;
  toss_deadline: string | null;
  balls_per_innings: number;
  innings: 1 | 2;
  batting_player_id: string | null;
  bowling_player_id: string | null;
  ball_number: number;
  innings1_runs: number;
  innings1_balls: number;
  innings1_wickets: number;
  innings2_runs: number;
  innings2_balls: number;
  innings2_wickets: number;
  target: number | null;
  ball_opens_at: string | null;
  ball_deadline: string | null;
}

export interface HandCricketBallRow {
  innings: 1 | 2;
  ball_number: number;
  batter_id: string;
  bowler_id: string;
  batter_throw: number | null;
  bowler_throw: number | null;
  runs: number;
  is_out: boolean;
  created_at: string;
}

/** Everything one player is allowed to see about a match right now. */
export interface HandCricketSnapshot {
  match: HandCricketMatchInfo;
  game: HandCricketGameInfo;
  balls: HandCricketBallRow[];
  /** The viewer's own throw for the current ball, if they have thrown */
  my_throw: number | null;
  /** Only whether the opponent has thrown, never the value */
  opponent_has_thrown: boolean;
  server_now: string;
}

export interface HandCricketPlayer {
  id: string;
  display_name: string;
  evoora_id: string | null;
  avatar_url: string | null;
}

export interface HandCricketPlayers {
  player1: HandCricketPlayer;
  player2: HandCricketPlayer;
}

/** An unfinished friend match, as listed in the lobby. */
export interface HandCricketOpenMatch {
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

export const TERMINAL_PHASES: MatchPhase[] = ["completed", "aborted", "forfeited", "cancelled"];
export const LIVE_PHASES: MatchPhase[] = ["active", "reconnecting"];

export function isTerminalPhase(phase: MatchPhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}

export function isLivePhase(phase: MatchPhase): boolean {
  return LIVE_PHASES.includes(phase);
}
