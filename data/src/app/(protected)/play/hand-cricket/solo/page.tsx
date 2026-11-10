import type { Metadata } from "next";
import { HandCricketSolo } from "@/components/hand-cricket/HandCricketSolo";

export const metadata: Metadata = {
  title: "Hand Cricket: Me vs Bot — EVOAIQU",
  description: "Play hand cricket against the bot.",
  robots: { index: false },
};

/**
 * Solo hand cricket against the bot. Public: the whole game runs in the
 * browser, so guests can play, and no server data is needed.
 */
export default function HandCricketSoloPage() {
  return (
    <div className="min-h-screen bg-[#070B14] py-4 md:py-8 px-3 md:px-4">
      <HandCricketSolo />
    </div>
  );
}
