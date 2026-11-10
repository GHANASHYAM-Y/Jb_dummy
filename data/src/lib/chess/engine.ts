/**
 * EVOAIQU — Server-Authoritative Speed Chess Engine
 * Built with chess.js for complete FIDE compliance, strict clock tracking,
 * and zero client-trust game adjudication.
 */

import { Chess, Square, PieceSymbol } from "chess.js";
import {
  ChessColor,
  ChessGameStatus,
  ChessMatchState,
  ChessMoveInput,
  CapturedPieces,
  LegalMoveTarget,
} from "./types";

export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const DEFAULT_TIME_CONTROL_SECONDS = 300; // 5 minutes
export const DEFAULT_INCREMENT_SECONDS = 3;     // +3 seconds per move

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

/**
 * Initializes a new chess match state.
 */
export function createInitialMatchState(
  matchId: string,
  whitePlayerId: string,
  blackPlayerId: string,
  timeControlSeconds: number = DEFAULT_TIME_CONTROL_SECONDS,
  incrementSeconds: number = DEFAULT_INCREMENT_SECONDS
): ChessMatchState {
  const timeMs = timeControlSeconds * 1000;
  return {
    id: matchId,
    white_player_id: whitePlayerId,
    black_player_id: blackPlayerId,
    fen: STARTING_FEN,
    pgn: "",
    turn: "w",
    ply: 0,
    time_control_seconds: timeControlSeconds,
    increment_seconds: incrementSeconds,
    white_time_remaining_ms: timeMs,
    black_time_remaining_ms: timeMs,
    last_move_at: new Date().toISOString(),
    is_check: false,
    is_checkmate: false,
    is_stalemate: false,
    is_draw: false,
    game_status: "active",
    winner_id: null,
    win_reason: null,
    draw_offered_by: null,
    resigned_by: null,
  };
}

/**
 * Calculates current real-time clocks for both players taking into account
 * in-flight elapsed time for the active player.
 */
export function calculateClocks(
  state: ChessMatchState,
  currentTimeMs: number = Date.now()
): {
  whiteRemainingMs: number;
  blackRemainingMs: number;
  activeColor: ChessColor;
  elapsedSinceLastMoveMs: number;
  isTimedOut: boolean;
  timedOutColor: ChessColor | null;
} {
  const lastMoveMs = new Date(state.last_move_at).getTime();
  const elapsed = Math.max(0, currentTimeMs - lastMoveMs);

  let whiteRemaining = state.white_time_remaining_ms;
  let blackRemaining = state.black_time_remaining_ms;

  // If match is still active, subtract elapsed time from whoever's turn it is
  if (state.game_status === "active" || state.game_status === "check") {
    if (state.turn === "w") {
      whiteRemaining = Math.max(0, state.white_time_remaining_ms - elapsed);
    } else {
      blackRemaining = Math.max(0, state.black_time_remaining_ms - elapsed);
    }
  }

  const whiteTimedOut = whiteRemaining <= 0;
  const blackTimedOut = blackRemaining <= 0;
  const isTimedOut = whiteTimedOut || blackTimedOut;
  const timedOutColor = whiteTimedOut ? "w" : blackTimedOut ? "b" : null;

  return {
    whiteRemainingMs: whiteRemaining,
    blackRemainingMs: blackRemaining,
    activeColor: state.turn,
    elapsedSinceLastMoveMs: elapsed,
    isTimedOut,
    timedOutColor,
  };
}

export interface MoveExecutionResult {
  ok: boolean;
  code: string;
  message?: string;
  nextState?: ChessMatchState;
  san?: string;
  captured?: string | null;
  from?: string;
  to?: string;
  promotion?: string | null;
  timeSpentMs?: number;
}

/**
 * Server-authoritative move validation and state transition.
 * Validates turn, clock time, move legality, applies increments,
 * and detects checkmate, stalemate, draws, and timeout.
 */
export function validateAndExecuteMove(
  state: ChessMatchState,
  callerId: string,
  moveInput: ChessMoveInput,
  currentTimeMs: number = Date.now()
): MoveExecutionResult {
  // 1. Match must be active
  if (state.game_status !== "active" && state.game_status !== "check") {
    return {
      ok: false,
      code: "game_already_over",
      message: `The game is already finished (${state.game_status}).`,
    };
  }

  // 2. Caller must be a participant
  const isWhite = callerId === state.white_player_id;
  const isBlack = callerId === state.black_player_id;
  if (!isWhite && !isBlack) {
    return {
      ok: false,
      code: "not_a_participant",
      message: "You are not a participant in this chess match.",
    };
  }

  // 3. Must be caller's turn
  const expectedColor: ChessColor = isWhite ? "w" : "b";
  if (state.turn !== expectedColor) {
    return {
      ok: false,
      code: "out_of_turn",
      message: "It is not your turn to move.",
    };
  }

  // 4. Calculate clocks and check for timeout
  const clocks = calculateClocks(state, currentTimeMs);
  if (clocks.isTimedOut) {
    // Flag fall! Active player timed out before completing the move.
    return handleTimeout(state, currentTimeMs);
  }

  const timeSpentMs = clocks.elapsedSinceLastMoveMs;
  const incrementMs = state.increment_seconds * 1000;

  // Remaining time after move + increment
  let newWhiteTime = state.white_time_remaining_ms;
  let newBlackTime = state.black_time_remaining_ms;

  if (state.turn === "w") {
    newWhiteTime = Math.max(0, state.white_time_remaining_ms - timeSpentMs) + incrementMs;
  } else {
    newBlackTime = Math.max(0, state.black_time_remaining_ms - timeSpentMs) + incrementMs;
  }

  // 5. Authoritative chess.js validation
  const chess = new Chess();
  if (state.pgn && state.pgn.trim().length > 0) {
    try {
      chess.loadPgn(state.pgn);
    } catch {
      chess.load(state.fen);
    }
  } else {
    chess.load(state.fen);
  }
  let moveResult;
  try {
    moveResult = chess.move({
      from: moveInput.from as Square,
      to: moveInput.to as Square,
      promotion: (moveInput.promotion || "q") as PieceSymbol,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Illegal move.";
    return {
      ok: false,
      code: "illegal_move",
      message: errorMsg,
    };
  }

  if (!moveResult) {
    return {
      ok: false,
      code: "illegal_move",
      message: "The requested move is not legal according to FIDE rules.",
    };
  }

  // 6. Check game-ending conditions
  let gameStatus: ChessGameStatus = "active";
  let winnerId: string | null = null;
  let winReason: string | null = null;
  let isCheck = false;
  let isCheckmate = false;
  let isStalemate = false;
  let isDraw = false;

  const halfMoves = parseInt(chess.fen().split(" ")[4] || "0", 10);
  // Repetition count tracking from chess.js internal _positionCount
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positionCounts = Array.from(((chess as any)._positionCount?.values?.() || []) as number[]);
  const maxRepetition = positionCounts.length > 0 ? Math.max(...positionCounts) : 1;

  if (chess.isCheckmate()) {
    gameStatus = "checkmate";
    isCheckmate = true;
    isCheck = true;
    winnerId = callerId;
    winReason = "checkmate";
  } else if (chess.isStalemate()) {
    gameStatus = "stalemate";
    isStalemate = true;
    isDraw = true;
    winReason = "stalemate";
  } else if (chess.isInsufficientMaterial()) {
    gameStatus = "insufficient_material";
    isDraw = true;
    winReason = "insufficient_material";
  } else if (maxRepetition >= 5) {
    // FIDE Article 9.6.1: Mandatory automatic draw on 5-fold repetition
    gameStatus = "threefold_repetition";
    isDraw = true;
    winReason = "fivefold_repetition";
  } else if (halfMoves >= 150) {
    // FIDE Article 9.6.2: Mandatory automatic draw on 75-move rule
    gameStatus = "fifty_move_rule";
    isDraw = true;
    winReason = "seventy_five_move_rule";
  } else if (chess.isThreefoldRepetition() && moveInput.claim_draw) {
    // FIDE Article 9.2: Claimable draw on 3-fold repetition upon player claim
    gameStatus = "threefold_repetition";
    isDraw = true;
    winReason = "threefold_repetition";
  } else if (chess.isDrawByFiftyMoves() && moveInput.claim_draw) {
    // FIDE Article 9.3: Claimable draw on 50-move rule upon player claim
    gameStatus = "fifty_move_rule";
    isDraw = true;
    winReason = "fifty_move_rule";
  } else if (chess.isCheck()) {
    gameStatus = "check";
    isCheck = true;
  }

  const nextState: ChessMatchState = {
    ...state,
    fen: chess.fen(),
    pgn: chess.pgn(),
    turn: chess.turn() as ChessColor,
    ply: state.ply + 1,
    white_time_remaining_ms: newWhiteTime,
    black_time_remaining_ms: newBlackTime,
    last_move_at: new Date(currentTimeMs).toISOString(),
    is_check: isCheck,
    is_checkmate: isCheckmate,
    is_stalemate: isStalemate,
    is_draw: isDraw,
    game_status: gameStatus,
    winner_id: winnerId,
    win_reason: winReason,
    draw_offered_by: null, // Clear any pending draw offer on move
  };

  return {
    ok: true,
    code: "move_applied",
    nextState,
    san: moveResult.san,
    captured: moveResult.captured || null,
    from: moveResult.from,
    to: moveResult.to,
    promotion: moveResult.promotion || null,
    timeSpentMs,
  };
}

/**
 * Handles resignation by a participant.
 */
export function handleResignation(
  state: ChessMatchState,
  resigningPlayerId: string
): MoveExecutionResult {
  if (state.game_status !== "active" && state.game_status !== "check") {
    return { ok: false, code: "game_already_over", message: "Game is already finished." };
  }

  const isWhite = resigningPlayerId === state.white_player_id;
  const isBlack = resigningPlayerId === state.black_player_id;
  if (!isWhite && !isBlack) {
    return { ok: false, code: "not_a_participant", message: "Only participants can resign." };
  }

  const winnerId = isWhite ? state.black_player_id : state.white_player_id;

  const nextState: ChessMatchState = {
    ...state,
    game_status: "resigned",
    winner_id: winnerId,
    win_reason: "resignation",
    resigned_by: resigningPlayerId,
    draw_offered_by: null,
  };

  return {
    ok: true,
    code: "resigned",
    nextState,
  };
}

/**
 * Handles a draw offer from a participant.
 */
export function handleDrawOffer(
  state: ChessMatchState,
  offeringPlayerId: string
): { ok: boolean; code: string; message?: string; nextState?: ChessMatchState } {
  if (state.game_status !== "active" && state.game_status !== "check") {
    return { ok: false, code: "game_already_over", message: "Game is already finished." };
  }

  const isWhite = offeringPlayerId === state.white_player_id;
  const isBlack = offeringPlayerId === state.black_player_id;
  if (!isWhite && !isBlack) {
    return { ok: false, code: "not_a_participant", message: "Only participants can offer a draw." };
  }

  if (state.draw_offered_by === offeringPlayerId) {
    return { ok: false, code: "already_offered", message: "You have already offered a draw." };
  }

  const nextState: ChessMatchState = {
    ...state,
    draw_offered_by: offeringPlayerId,
  };

  return {
    ok: true,
    code: "draw_offered",
    nextState,
  };
}

/**
 * Handles response to an active draw offer (accept or decline).
 */
export function handleDrawResponse(
  state: ChessMatchState,
  respondingPlayerId: string,
  accept: boolean
): { ok: boolean; code: string; message?: string; nextState?: ChessMatchState } {
  if (state.game_status !== "active" && state.game_status !== "check") {
    return { ok: false, code: "game_already_over", message: "Game is already finished." };
  }

  if (!state.draw_offered_by) {
    return { ok: false, code: "no_draw_offered", message: "No draw has been offered." };
  }

  if (state.draw_offered_by === respondingPlayerId) {
    return { ok: false, code: "cannot_respond_to_self", message: "Cannot respond to your own draw offer." };
  }

  const isWhite = respondingPlayerId === state.white_player_id;
  const isBlack = respondingPlayerId === state.black_player_id;
  if (!isWhite && !isBlack) {
    return { ok: false, code: "not_a_participant", message: "Only participants can respond." };
  }

  if (!accept) {
    return {
      ok: true,
      code: "draw_declined",
      nextState: { ...state, draw_offered_by: null },
    };
  }

  const nextState: ChessMatchState = {
    ...state,
    game_status: "draw_agreed",
    is_draw: true,
    winner_id: null,
    win_reason: "mutual_draw_agreement",
    draw_offered_by: null,
  };

  return {
    ok: true,
    code: "draw_agreed",
    nextState,
  };
}

/**
 * Evaluates and handles a player timing out (clock <= 0).
 * Under FIDE Article 6.9: if a player runs out of time, their opponent wins UNLESS
 * the opponent cannot checkmate the player by any possible series of legal moves,
 * in which case the game is a draw.
 */
export function handleTimeout(
  state: ChessMatchState,
  currentTimeMs: number = Date.now()
): MoveExecutionResult {
  const clocks = calculateClocks(state, currentTimeMs);
  if (!clocks.isTimedOut || !clocks.timedOutColor) {
    return {
      ok: false,
      code: "not_timed_out",
      message: "Neither player has exceeded their time limit.",
    };
  }

  const timedOutColor = clocks.timedOutColor;
  const opponentPlayerId = timedOutColor === "w" ? state.black_player_id : state.white_player_id;

  const chess = new Chess(state.fen);
  // Check if opponent has insufficient material to mate
  const opponentHasInsufficient = chess.isInsufficientMaterial();

  let gameStatus: ChessGameStatus = "timeout";
  let winnerId: string | null = opponentPlayerId;
  let isDraw = false;
  let winReason: string | null = "timeout";

  if (opponentHasInsufficient) {
    gameStatus = "insufficient_material";
    winnerId = null;
    isDraw = true;
    winReason = "timeout_with_insufficient_material_draw";
  }

  const nextState: ChessMatchState = {
    ...state,
    white_time_remaining_ms: clocks.whiteRemainingMs,
    black_time_remaining_ms: clocks.blackRemainingMs,
    game_status: gameStatus,
    winner_id: winnerId,
    win_reason: winReason,
    is_draw: isDraw,
    draw_offered_by: null,
  };

  return {
    ok: true,
    code: "timeout",
    message: isDraw
      ? "Player timed out, but opponent has insufficient material to mate. Draw!"
      : `Player (${timedOutColor === "w" ? "White" : "Black"}) timed out. Opponent wins!`,
    nextState,
  };
}

/**
 * Computes captured pieces and material score from current FEN.
 */
export function getCapturedPieces(fen: string): CapturedPieces {
  const initialCounts: Record<string, number> = {
    P: 8, N: 2, B: 2, R: 2, Q: 1,
    p: 8, n: 2, b: 2, r: 2, q: 1,
  };

  const currentCounts: Record<string, number> = {
    P: 0, N: 0, B: 0, R: 0, Q: 0,
    p: 0, n: 0, b: 0, r: 0, q: 0,
  };

  const boardPart = fen.split(" ")[0];
  for (const ch of boardPart) {
    if (currentCounts[ch] !== undefined) {
      currentCounts[ch]++;
    }
  }

  const whiteCaptured: string[] = []; // black pieces taken by white
  const blackCaptured: string[] = []; // white pieces taken by black
  let whiteMaterial = 0;
  let blackMaterial = 0;

  // Black pieces (lowercase) missing = captured by White
  for (const piece of ["q", "r", "b", "n", "p"]) {
    const missing = initialCounts[piece] - currentCounts[piece];
    for (let i = 0; i < missing; i++) {
      whiteCaptured.push(piece);
    }
    blackMaterial += currentCounts[piece] * (PIECE_VALUES[piece] || 0);
  }

  // White pieces (uppercase) missing = captured by Black
  for (const piece of ["Q", "R", "B", "N", "P"]) {
    const missing = initialCounts[piece] - currentCounts[piece];
    for (let i = 0; i < missing; i++) {
      blackCaptured.push(piece);
    }
    const lower = piece.toLowerCase();
    whiteMaterial += currentCounts[piece] * (PIECE_VALUES[lower] || 0);
  }

  return {
    white: whiteCaptured,
    black: blackCaptured,
    whiteScore: whiteMaterial,
    blackScore: blackMaterial,
    advantage: whiteMaterial - blackMaterial,
  };
}

/**
 * Retrieves all legal moves from current FEN, optionally filtered by `from` square.
 */
export function getLegalMoves(fen: string, square?: string): LegalMoveTarget[] {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });

  return moves
    .filter((m) => (!square ? true : m.from === square))
    .map((m) => ({
      from: m.from,
      to: m.to,
      promotion: m.promotion,
      san: m.san,
      isCapture: m.captured !== undefined,
    }));
}

/**
 * Checks whether the active player can claim a draw by threefold repetition (FIDE 9.2)
 * or 50-move rule (FIDE 9.3).
 */
export function canClaimDraw(
  fen: string,
  pgn?: string
): { canClaim: boolean; reason: "threefold_repetition" | "fifty_move_rule" | null } {
  try {
    const chess = new Chess();
    if (pgn && pgn.trim().length > 0) {
      chess.loadPgn(pgn);
    } else {
      chess.load(fen);
    }

    if (chess.isThreefoldRepetition()) {
      return { canClaim: true, reason: "threefold_repetition" };
    }
    if (chess.isDrawByFiftyMoves()) {
      return { canClaim: true, reason: "fifty_move_rule" };
    }
    return { canClaim: false, reason: null };
  } catch {
    return { canClaim: false, reason: null };
  }
}

