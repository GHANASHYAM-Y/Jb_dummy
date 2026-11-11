/**
 * Speed Chess — public server entry point.
 *
 * Server helpers and pure rules used by API routes and server pages. Never import this
 * from a client component. Everything else in features/chess/ is internal.
 */

export { calculateClocks, canClaimDraw, getCapturedPieces, getLegalMoves, handleTimeout, validateAndExecuteMove } from "./engine/engine";
export { type ChessMatchState } from "./types";
