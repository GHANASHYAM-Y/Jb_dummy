// ⚠️ SERVER ONLY — this module must never be imported in Client Components.
// The `server-only` package causes a hard build error if this file is
// accidentally bundled for the browser.
import "server-only";

import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/core/supabase/database";

/**
 * Supabase server client — for use in Server Components, Route Handlers
 * and Server Actions.  Reads/writes cookies through next/headers.
 *
 * IMPORTANT: never import this in client ("use client") components.
 * Never use the service-role key here; we only use the anon key.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) must be configured.",
    );
  }

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
}

/** The fields Server Components read from the signed-in user. */
export interface ServerUser {
  id: string;
  email?: string;
}

/**
 * The signed-in user for the current request.
 *
 * Uses `auth.getClaims()`, which checks the session JWT's signature locally
 * against the project's public signing keys (ES256; the key set is cached in
 * memory). That skips a ~200 ms round trip to Supabase Auth on every page.
 * The middleware has already confirmed the user with the Auth server
 * (`getUser()`) earlier in the same request, so this is not the only check.
 * If the project uses a legacy shared secret, `getClaims()` falls back to a
 * network check by itself.
 *
 * Wrapped in React `cache()`, so the layout and the page share one lookup.
 * Returns the `{ data: { user }, error }` shape of `supabase.auth.getUser()`.
 * Server Components only; Route Handlers should keep calling `auth.getUser()`.
 */
export const getServerUser = cache(
  async (): Promise<{ data: { user: ServerUser | null }; error: Error | null }> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub) {
      return { data: { user: null }, error: error ?? null };
    }
    return {
      data: {
        user: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined },
      },
      error: null,
    };
  },
);

/**
 * Admin/service client — ONLY for trusted server operations (e.g. migrations,
 * cron jobs, webhook handlers).  Never expose to client bundles.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in server-only env.
 */
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  // NOTE: this file is server-only — never import in Client Components.
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
