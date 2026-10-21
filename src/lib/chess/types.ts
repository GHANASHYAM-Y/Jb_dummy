/**
 * EVOAIQU — Speed Chess Engine Types & Interfaces
 * Milestone 6: Server-Authoritative FIDE Chess with chess.js
 */

export type ChessColor = "w" | "b";

export type ChessGameStatus =
  | "active"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw_agreed"
  | "timeout"
  | "resigned"
  | "insufficient_material"
  | "threefold_repetition"
  | "fifty_move_rule"
  | "abandoned";

export interface ChessMoveInput {
  from: string;      // e.g. "e2"
  to: string;        // e.g. "e4"
  promotion?: string; // "q" | "r" | "b" | "n"
  claim_draw?: boolean; // Claim draw on threefold repetition or 50-move rule
}

export interface ChessMoveRecord {
  ply: number;
  player_id: string;
  san: string;
  from_square: string;
  to_square: string;
  promotion?: string | null;
  captured?: string | null;
  fen_after: string;
  time_spent_ms: number;
  white_time_remaining_ms: number;
  black_time_remaining_ms: number;
  created_at: string;
}

export interface ChessMatchState {
  id: string; // match_id
  white_player_id: string;
  black_player_id: string;
  fen: string;
  pgn: string;
  turn: ChessColor;
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
  game_status: ChessGameStatus;
  winner_id: string | null;
  win_reason: string | null;
  draw_offered_by: string | null;
  resigned_by: string | null;
}

export interface CapturedPieces {
  white: string[]; // pieces captured BY white (black pieces captured: 'p', 'n', 'b', 'r', 'q')
  black: string[]; // pieces captured BY black (white pieces captured: 'P', 'N', 'B', 'R', 'Q')
  whiteScore: number;
  blackScore: number;
  advantage: number; // positive = white advantage, negative = black advantage
}

export interface LegalMoveTarget {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  isCapture: boolean;
}
