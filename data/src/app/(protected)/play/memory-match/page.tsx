import type { Metadata } from "next";
import { MemoryMatch } from "@/features/memory-match";

export const metadata: Metadata = {
  title: "Memory Match — EVOAIQU",
  description: "Flip cards and find every matching pair. Solo with a personal best, or two players on one device.",
  robots: { index: false },
};

/**
 * Memory Match. Public: it runs entirely in the browser, so guests can play
 * and no server data is needed.
 */
export default function MemoryMatchPage() {
  return <MemoryMatch />;
}
