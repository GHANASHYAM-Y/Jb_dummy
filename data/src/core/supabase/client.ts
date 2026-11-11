import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/core/supabase/database";

/**
 * Supabase browser client — safe for use in React Client Components.
 * Uses NEXT_PUBLIC_ env vars only (never the service-role key).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) must be configured.",
    );
  }

  return createBrowserClient<Database>(url, key);
}
