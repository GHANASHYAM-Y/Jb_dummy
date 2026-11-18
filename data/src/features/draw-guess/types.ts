/** Draw & Guess: shared types. */

export type DrawRoomStatus = "waiting" | "ready" | "drawing" | "round_over" | "finished";

export interface DrawRoom {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  status: DrawRoomStatus;
  rounds_total: number;
  round_number: number;
  drawer_id: string | null;
  /** Only the drawer sees this while drawing; everyone sees it once the round is over. */
  word: string | null;
  word_length: number | null;
  round_deadline: string | null;
  round_solved: boolean;
  host_score: number;
  guest_score: number;
}

export interface DrawGuess {
  user_id: string;
  guess: string;
  is_correct: boolean;
  created_at: string;
}

export interface DrawSnapshot {
  room: DrawRoom;
  guesses: DrawGuess[];
  server_now: string;
}

export interface DrawPlayer {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface DrawPlayers {
  host: DrawPlayer;
  guest: DrawPlayer | null;
}

/** One point of a stroke, as a fraction of the canvas (0 to 1) so any screen size matches. */
export type StrokePoint = [number, number];

export interface Stroke {
  id: string;
  color: string;
  size: number;
  points: StrokePoint[];
}

/** A room the signed-in player can reopen from the lobby. */
export interface DrawOpenRoom {
  id: string;
  code: string;
  status: DrawRoomStatus;
  opponent_name: string | null;
  created_by_me: boolean;
}
