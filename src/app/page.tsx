import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "EVOAIQU — Play. Connect. Evolve.",
  description:
    "A next-generation social gaming platform. Challenge friends to Chess or RPS, win, then dare them to dance, sing, or act.",
};

export default function HomePage() {
  return <LandingPage />;
}
