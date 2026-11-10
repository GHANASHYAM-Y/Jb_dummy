import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely, deduplicating conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a relative timestamp (e.g., "2 hours ago"). */
export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const delta = Math.floor((now - then) / 1000);

  if (delta < 60)   return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

/** Truncate a string to a maximum length with ellipsis. */
export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : `${str.slice(0, maxLen - 3)}…`;
}

/** Generate a display-safe avatar initial from a display name. */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Validate an EVOAIQU public ID format: EVO-XXXXXX */
export function isValidEvoId(id: string): boolean {
  return /^EVO-[A-Z0-9]{6}$/.test(id.toUpperCase());
}

/** Sleep for n milliseconds (for use in server code/tests). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate a redirect path to prevent open-redirect attacks.
 *
 * Rules:
 *  - Must start with exactly "/" (not "//", which is protocol-relative)
 *  - Must not start with "//" (protocol-relative — browsers treat as URL)
 *  - Max 200 characters
 *  - Falls back to `fallback` (default: "/dashboard") if invalid
 */
export function safeRedirectPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.length > 200) return fallback;
  return raw;
}
