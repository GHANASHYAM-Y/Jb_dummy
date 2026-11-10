/**
 * Evoora â€” Milestone 2 Security & Integration Tests
 *
 * Tests that can run without live Supabase credentials (pure unit / logic).
 * Tests requiring a real database are clearly marked MANUAL.
 *
 * Run: npm test
 */

import { describe, it, expect } from "vitest";

// â”€â”€ 1. safeRedirectPath â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { safeRedirectPath, isValidEvoId } from "@/lib/utils";

describe("safeRedirectPath â€” open redirect prevention", () => {
  it("returns /dashboard when input is null", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
  });

  it("returns /dashboard when input is undefined", () => {
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
  });

  it("returns /dashboard when input is empty string", () => {
    expect(safeRedirectPath("")).toBe("/dashboard");
  });

  it("allows a normal relative path", () => {
    expect(safeRedirectPath("/profile")).toBe("/profile");
  });

  it("allows deeply nested relative paths", () => {
    expect(safeRedirectPath("/settings/security")).toBe("/settings/security");
  });

  it("allows the root path", () => {
    expect(safeRedirectPath("/")).toBe("/");
  });

  it("blocks protocol-relative URLs (//evil.com)", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
  });

  it("blocks absolute external URLs (https://evil.com)", () => {
    expect(safeRedirectPath("https://evil.com/steal")).toBe("/dashboard");
  });

  it("blocks http external URLs", () => {
    expect(safeRedirectPath("http://phishing.example/login")).toBe("/dashboard");
  });

  it("blocks javascript: URIs", () => {
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("blocks data: URIs", () => {
    expect(safeRedirectPath("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
  });

  it("blocks paths that are too long (> 200 chars)", () => {
    const longPath = "/" + "a".repeat(201);
    expect(safeRedirectPath(longPath)).toBe("/dashboard");
  });

  it("allows a path of exactly 200 characters", () => {
    const path = "/" + "a".repeat(199);
    expect(path.length).toBe(200);
    expect(safeRedirectPath(path)).toBe(path);
  });

  it("uses custom fallback when specified", () => {
    expect(safeRedirectPath(null, "/login")).toBe("/login");
    expect(safeRedirectPath("//evil.com", "/home")).toBe("/home");
  });

  it("blocks path with encoded slash attack (%2F%2Fevil.com)", () => {
    // URL-encoded attacks won't start with / after decoding, so they still
    // fail the startsWith("/") check unless decoded. The function checks the
    // raw string â€” caller is responsible for passing a decoded value.
    // This test documents the current behaviour.
    expect(safeRedirectPath("%2F%2Fevil.com")).toBe("/dashboard");
  });
});

// â”€â”€ 2. isValidEvoId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("isValidEvoId â€” Evoora ID format validation", () => {
  it("accepts a valid EVO-XXXXXX id", () => {
    expect(isValidEvoId("EVO-A1B2C3")).toBe(true);
  });

  it("accepts lowercase input (case-insensitive)", () => {
    expect(isValidEvoId("evo-a1b2c3")).toBe(true);
  });

  it("rejects wrong prefix", () => {
    expect(isValidEvoId("ABC-123456")).toBe(false);
  });

  it("rejects too-short suffix", () => {
    expect(isValidEvoId("EVO-12345")).toBe(false);
  });

  it("rejects too-long suffix", () => {
    expect(isValidEvoId("EVO-1234567")).toBe(false);
  });

  it("rejects special characters in suffix", () => {
    expect(isValidEvoId("EVO-AB!D3F")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEvoId("")).toBe(false);
  });

  it("rejects bare numbers only", () => {
    expect(isValidEvoId("123456")).toBe(false);
  });
});

// â”€â”€ 3. SQL Migration validation (structure / logic checks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import * as fs from "fs";
import * as path from "path";

const migration = fs.readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/0001_profiles.sql"),
  "utf-8",
);

describe("Migration SQL â€” structural checks (no live DB needed)", () => {
  it("enables pgcrypto extension", () => {
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  });

  it("creates profiles table with IF NOT EXISTS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.profiles");
  });

  it("references auth.users with ON DELETE CASCADE", () => {
    expect(migration).toContain("REFERENCES auth.users(id) ON DELETE CASCADE");
  });

  it("enforces NOT NULL and UNIQUE on evoora_id", () => {
    expect(migration).toContain("evoora_id       TEXT        NOT NULL UNIQUE");
  });

  it("has display_name length constraint (2â€“64 chars)", () => {
    expect(migration).toContain("BETWEEN 2 AND 64");
  });

  it("has bio length constraint (max 280 chars)", () => {
    expect(migration).toContain("char_length(bio) <= 280");
  });

  it("enables Row Level Security", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
  });

  it("has INSERT policy that denies client inserts (WITH CHECK (FALSE))", () => {
    expect(migration).toContain("WITH CHECK (FALSE)");
  });

  it("has DELETE policy that denies client deletes (USING (FALSE))", () => {
    // The DELETE policy uses USING (FALSE)
    expect(migration).toMatch(/FOR DELETE[\s\S]*?USING \(FALSE\)/);
  });

  it("UPDATE policy requires auth.uid() = id", () => {
    expect(migration).toContain("USING (auth.uid() = id)");
  });

  it("column-level GRANT only permits editable fields", () => {
    expect(migration).toContain(
      "GRANT UPDATE (display_name, avatar_url, bio, preferred_locale, is_public)",
    );
    // evoora_id MUST NOT appear in the GRANT UPDATE
    const grantLine = migration
      .split("\n")
      .find((l) => l.includes("GRANT UPDATE ("));
    expect(grantLine).toBeDefined();
    expect(grantLine).not.toContain("evoora_id");
    expect(grantLine).not.toContain("id,");
  });

  it("generate_evoora_id is SECURITY DEFINER", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.generate_evoora_id()");
    // SECURITY DEFINER must appear after the function signature
    const fnIdx = migration.indexOf("CREATE OR REPLACE FUNCTION public.generate_evoora_id()");
    const definerIdx = migration.indexOf("SECURITY DEFINER", fnIdx);
    expect(definerIdx).toBeGreaterThan(fnIdx);
  });

  it("handle_new_user trigger is SECURITY DEFINER", () => {
    const fnIdx = migration.indexOf("CREATE OR REPLACE FUNCTION public.handle_new_user()");
    const definerIdx = migration.indexOf("SECURITY DEFINER", fnIdx);
    expect(definerIdx).toBeGreaterThan(fnIdx);
  });

  it("trigger uses ON CONFLICT DO NOTHING (idempotent profile creation)", () => {
    expect(migration).toContain("ON CONFLICT (id) DO NOTHING");
  });

  it("revokes execute on generate_evoora_id from PUBLIC", () => {
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.generate_evoora_id() FROM PUBLIC",
    );
  });

  it("revokes execute on handle_new_user from PUBLIC", () => {
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.handle_new_user()    FROM PUBLIC",
    );
  });

  it("ID generator has a bounded retry loop (max 10 attempts)", () => {
    expect(migration).toContain("attempt > 10");
    expect(migration).toContain("Failed to generate a unique Evoora ID after 10 attempts");
  });

  it("ID generator uses gen_random_bytes (cryptographic entropy)", () => {
    expect(migration).toContain("gen_random_bytes");
  });

  it("ID format prefix is EVO-", () => {
    expect(migration).toContain("'EVO-' || id");
  });

  it("rejects IDs starting with a digit", () => {
    // The CONTINUE WHEN line prevents digit-starting IDs
    expect(migration).toContain("CONTINUE WHEN substr(id, 1, 1) ~ '^[0-9]$'");
  });

  it("profiles_editable view has security_barrier = TRUE", () => {
    expect(migration).toContain("security_barrier = TRUE");
  });

  it("view filters to only the current user's row", () => {
    expect(migration).toContain("WHERE auth.uid() = id");
  });

  it("trigger fires AFTER INSERT on auth.users", () => {
    expect(migration).toContain("AFTER INSERT ON auth.users");
  });
});

// â”€â”€ 4. Service-role key containment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("Service-role key containment â€” static analysis", () => {
  // __dirname = src/__tests__  â†’  one level up = src/
  const srcDir = path.resolve(__dirname, "../");

  function readTsFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch {
      return "";
    }
  }

  it("server.ts has 'server-only' import", () => {
    const serverTs = readTsFile(path.join(srcDir, "lib/supabase/server.ts"));
    expect(serverTs).toContain('import "server-only"');
  });

  it("browser client.ts does NOT reference SUPABASE_SERVICE_ROLE_KEY", () => {
    const clientTs = readTsFile(path.join(srcDir, "lib/supabase/client.ts"));
    expect(clientTs).not.toContain("SERVICE_ROLE");
    expect(clientTs).not.toContain("service_role");
  });

  it("browser client.ts does NOT import from server.ts", () => {
    const clientTs = readTsFile(path.join(srcDir, "lib/supabase/client.ts"));
    expect(clientTs).not.toContain("supabase/server");
    expect(clientTs).not.toContain("./server");
  });

  it("ProfileEditForm does NOT import from server.ts", () => {
    const form = readTsFile(
      path.join(srcDir, "components/profile/ProfileEditForm.tsx"),
    );
    expect(form).not.toContain("supabase/server");
    expect(form).not.toContain("createServiceRoleClient");
    expect(form).not.toContain("SERVICE_ROLE");
  });

  it("DashboardClient does NOT import from server.ts", () => {
    const dash = readTsFile(
      path.join(srcDir, "components/dashboard/DashboardClient.tsx"),
    );
    expect(dash).not.toContain("supabase/server");
    expect(dash).not.toContain("createServiceRoleClient");
    expect(dash).not.toContain("SERVICE_ROLE");
  });

  it("DeleteAccountSection does NOT use service-role key (only POST to API route)", () => {
    const del = readTsFile(
      path.join(srcDir, "components/settings/DeleteAccountSection.tsx"),
    );
    expect(del).not.toContain("SERVICE_ROLE");
    expect(del).not.toContain("createServiceRoleClient");
    // Should use a fetch call to the API route
    expect(del).toContain("/api/auth/delete-account");
  });

  it("createServiceRoleClient is ONLY used in server-side API route", () => {
    const deleteRoute = readTsFile(
      path.join(srcDir, "app/api/auth/delete-account/route.ts"),
    );
    expect(deleteRoute).toContain("createServiceRoleClient");
    // Verify it only uses the server import (not a NEXT_PUBLIC env)
    expect(deleteRoute).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE");
  });
});

// â”€â”€ 5. Delete-account API â€” logic checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("Delete-account API â€” static logic checks", () => {
  const routeSrc = fs.readFileSync(
    path.resolve(__dirname, "../app/api/auth/delete-account/route.ts"),
    "utf-8",
  );

  it("verifies session via getUser() before deleting", () => {
    // getUser() must be called before admin.deleteUser()
    const getUserIdx = routeSrc.indexOf("getUser()");
    const deleteUserIdx = routeSrc.indexOf("deleteUser(");
    expect(getUserIdx).toBeGreaterThan(0);
    expect(deleteUserIdx).toBeGreaterThan(getUserIdx);
  });

  it("requires confirm === 'DELETE' in request body", () => {
    expect(routeSrc).toContain('body.confirm !== "DELETE"');
  });

  it("returns 401 when user is not authenticated", () => {
    expect(routeSrc).toContain("status: 401");
  });

  it("returns 400 for invalid body", () => {
    expect(routeSrc).toContain("status: 400");
  });

  it("uses admin.auth.admin.deleteUser (Admin API)", () => {
    expect(routeSrc).toContain("admin.auth.admin.deleteUser");
  });

  it("exported handler is DELETE method only", () => {
    expect(routeSrc).toContain("export async function DELETE");
    expect(routeSrc).not.toContain("export async function GET");
    expect(routeSrc).not.toContain("export async function POST");
  });
});

// â”€â”€ 6. Auth callback â€” open redirect check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("Auth callback â€” open redirect prevention", () => {
  const callbackSrc = fs.readFileSync(
    path.resolve(__dirname, "../app/auth/callback/route.ts"),
    "utf-8",
  );

  it("imports safeRedirectPath from @/lib/utils", () => {
    expect(callbackSrc).toContain('from "@/lib/utils"');
    expect(callbackSrc).toContain("safeRedirectPath");
  });

  it("does not use raw searchParams.get('next') directly in redirect", () => {
    // The raw get() call should only be passed through safeRedirectPath
    const lines = callbackSrc.split("\n");
    const redirectLine = lines.find(
      (l) => l.includes("NextResponse.redirect") && l.includes("next"),
    );
    // The variable 'next' must be the sanitised one (assigned from safeRedirectPath)
    // It should NOT contain searchParams.get directly in the redirect call
    if (redirectLine) {
      expect(redirectLine).not.toContain("searchParams.get");
    }
  });

  it("uses safeRedirectPath to process the next param", () => {
    expect(callbackSrc).toContain("safeRedirectPath(searchParams.get");
  });
});

// â”€â”€ 7. Evoora ID immutability â€” form level â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("ProfileEditForm â€” evoora_id immutability", () => {
  const formSrc = fs.readFileSync(
    path.resolve(
      __dirname,
      "../components/profile/ProfileEditForm.tsx",
    ),
    "utf-8",
  );

  it("does NOT include evoora_id in the ProfileUpdate object sent to Supabase", () => {
    // The update object in the form should only include editable fields
    const updateObjMatch = formSrc.match(
      /const update: ProfileUpdate = \{([\s\S]*?)\};/,
    );
    expect(updateObjMatch).not.toBeNull();
    const updateObj = updateObjMatch![1];
    expect(updateObj).not.toContain("evoora_id");
    expect(updateObj).not.toContain("id:");
    expect(updateObj).not.toContain("created_at");
  });

  it("evoora_id is displayed read-only (not in an input element)", () => {
    // evoora_id should appear in a span or p, not in an input or textarea
    const lines = formSrc.split("\n");
    const idLines = lines.filter(
      (l) => l.includes("evoora_id") && !l.includes("//"),
    );
    // None of the evoora_id display lines should be inside an input
    const inputLines = idLines.filter(
      (l) => l.includes("<input") || l.includes("onChange"),
    );
    expect(inputLines).toHaveLength(0);
  });

  it("only editable fields are in the ProfileUpdate type", () => {
    // Verify database.ts ProfileUpdate does not include evoora_id
    const dbTypes = fs.readFileSync(
      path.resolve(__dirname, "../types/database.ts"),
      "utf-8",
    );
    const profileUpdateMatch = dbTypes.match(
      /export type ProfileUpdate = Partial<([\s\S]*?)>;/,
    );
    expect(profileUpdateMatch).not.toBeNull();
    expect(profileUpdateMatch![1]).not.toContain("evoora_id");
    expect(profileUpdateMatch![1]).not.toContain('"id"');
    expect(profileUpdateMatch![1]).not.toContain("created_at");
  });
});

// â”€â”€ 8. Logout route â€” checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("Logout route â€” static checks", () => {
  const logoutSrc = fs.readFileSync(
    path.resolve(__dirname, "../app/api/auth/logout/route.ts"),
    "utf-8",
  );

  it("verifies session before signing out", () => {
    // Search from the actual function body, skipping the JSDoc that mentions
    // signOut() before getUser() in the comment.
    const fnStart = logoutSrc.indexOf("export async function POST");
    const getUserIdx = logoutSrc.indexOf("getUser()", fnStart);
    const signOutIdx = logoutSrc.indexOf("signOut()", fnStart);
    expect(getUserIdx).toBeGreaterThan(fnStart);
    expect(signOutIdx).toBeGreaterThan(getUserIdx);
  });

  it("returns 401 if user is not authenticated", () => {
    expect(logoutSrc).toContain("status: 401");
  });

  it("exported handler is POST only", () => {
    expect(logoutSrc).toContain("export async function POST");
    expect(logoutSrc).not.toContain("export async function GET");
    expect(logoutSrc).not.toContain("export async function DELETE");
  });

  it("does NOT expose any keys in response body", () => {
    expect(logoutSrc).not.toContain("SERVICE_ROLE");
    expect(logoutSrc).not.toContain("ANON_KEY");
  });
});

// â”€â”€ 9. Middleware protection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("Middleware â€” protected route checks", () => {
  const middlewareSrc = fs.readFileSync(
    path.resolve(__dirname, "../middleware.ts"),
    "utf-8",
  );

  it("redirects unauthenticated users away from /dashboard", () => {
    expect(middlewareSrc).toContain("/dashboard");
    expect(middlewareSrc).toContain("login");
  });

  it("does not import createServiceRoleClient", () => {
    expect(middlewareSrc).not.toContain("createServiceRoleClient");
    expect(middlewareSrc).not.toContain("SERVICE_ROLE");
  });

  it("does not expose user data in middleware response headers", () => {
    expect(middlewareSrc).not.toContain("x-user-id");
    expect(middlewareSrc).not.toContain("x-user-email");
  });
});
