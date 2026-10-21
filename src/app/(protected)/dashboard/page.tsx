import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Dashboard — EVOAIQU",
  description: "Your EVOAIQU gaming hub.",
  robots: { index: false },
};

/**
 * /dashboard — Maintained for compatibility.
 * Redirects seamlessly to the primary Game section at /games.
 */
export default async function DashboardPage() {
  await connection();
  redirect("/games");
}
