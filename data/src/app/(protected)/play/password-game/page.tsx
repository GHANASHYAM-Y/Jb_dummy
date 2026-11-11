import type { Metadata } from "next";
import PasswordGame from "@/components/password-game/PasswordGame";

export const metadata: Metadata = {
  title: "Password Game — EVOAIQU",
  description: "Build one password that survives 26 rules and chaos events: fire, water, lightning and ice.",
  robots: { index: false },
};

/**
 * Password Game. Public: a solo puzzle that runs entirely in the browser,
 * so guests can play and no server data is needed.
 */
export default function PasswordGamePage() {
  return <PasswordGame />;
}
