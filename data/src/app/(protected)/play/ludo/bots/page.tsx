import type { Metadata } from "next";
import { LudoBotGame } from "@/features/ludo/components/LudoBotGame";

export const metadata: Metadata = {
  title: "Ludo: Me vs bots — EVOAIQU",
  description: "Play Ludo against 1 to 3 bots.",
  robots: { index: false },
};

/**
 * Ludo against bots. Public: the whole game runs in the browser, so guests
 * can play, and no server data is needed.
 */
export default function LudoBotsPage() {
  return (
    <div className="min-h-screen bg-[#070B14] py-4 md:py-8 px-3 md:px-4">
      <LudoBotGame />
    </div>
  );
}
