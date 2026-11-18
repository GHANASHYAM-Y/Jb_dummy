import type { Metadata } from "next";
import { TicTacToe } from "@/features/tic-tac-toe";

export const metadata: Metadata = {
  title: "Tic Tac Toe — EVOAIQU",
  description: "Get three in a row. Play the computer on three difficulty levels, or a friend on the same device.",
  robots: { index: false },
};

/**
 * Tic Tac Toe. Public: it runs entirely in the browser, so guests can play
 * and no server data is needed.
 */
export default function TicTacToePage() {
  return <TicTacToe />;
}
