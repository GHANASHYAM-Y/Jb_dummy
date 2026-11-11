/**
 * Rock, Paper, Scissors (including random matchmaking) — public client-safe entry point.
 *
 * UI components and types that pages and other features may use. Everything else
 * in features/rock-paper-scissors/ is internal: import from this file, not from its subfolders.
 */

export { HandGraphic } from "./components/HandGraphic";
export { HistoryClient } from "./components/HistoryClient";
export { RpsLobby } from "./components/RpsLobby";
export { RpsMatchBoard } from "./components/RpsMatchBoard";
export { RandomMatchmakingCard } from "./matchmaking/RandomMatchmakingCard";
