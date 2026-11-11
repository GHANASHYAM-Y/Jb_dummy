import type { Metadata } from "next";
import { LandingPage } from "@/core/home/landing/LandingPage";

export const metadata: Metadata = {
  title: "EVOAIQU — Futuristic Multiplayer Social Gaming Arena",
  description:
    "Challenge your friends to Rock-Paper-Scissors and Speed Chess. Fast-paced multiplayer battles, 10-second blitz rounds, and hilarious post-match dares.",
};

export default function HomePage() {
  return <LandingPage />;
}
