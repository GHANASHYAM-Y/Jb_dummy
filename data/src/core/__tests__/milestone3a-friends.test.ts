/**
 * Evoora — Milestone 3A Friend System Tests
 *
 * Tests that can run without live Supabase credentials (pure unit / logic).
 * Tests requiring a real database are clearly marked [MANUAL].
 *
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ── Helpers ───────────────────────────────────────────────────────────────────

const migrationPath = path.resolve(
  __dirname,
  "../../../supabase/migrations/0002_friends.sql",
);
const migration = fs.readFileSync(migrationPath, "utf-8");

const sendRoutePath = path.resolve(
  __dirname,
  "../../app/api/friends/send/route.ts",
);
const sendRoute = fs.readFileSync(sendRoutePath, "utf-8");

const respondRoutePath = path.resolve(
  __dirname,
  "../../app/api/friends/respond/route.ts",
);
const respondRoute = fs.readFileSync(respondRoutePath, "utf-8");

const cancelRoutePath = path.resolve(
  __dirname,
  "../../app/api/friends/cancel/route.ts",
);
const cancelRoute = fs.readFileSync(cancelRoutePath, "utf-8");

const removeRoutePath = path.resolve(
  __dirname,
  "../../app/api/friends/remove/route.ts",
);
const removeRoute = fs.readFileSync(removeRoutePath, "utf-8");

const clientPath = path.resolve(
  __dirname,
  "../friends/FriendsClient.tsx",
);
const clientSrc = fs.readFileSync(clientPath, "utf-8");

const dbTypesPath = path.resolve(__dirname, "../supabase/database.ts");
const dbTypes = fs.readFileSync(dbTypesPath, "utf-8");

// ── 1. Migration SQL structure checks ─────────────────────────────────────────

describe("Migration 0002 — structural checks", () => {
  it("creates friend_requests table with IF NOT EXISTS", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.friend_requests",
    );
  });

  it("references profiles.id ON DELETE CASCADE", () => {
    expect(migration).toContain("REFERENCES public.profiles(id) ON DELETE CASCADE");
  });

  it("prevents self-friendship via CHECK constraint", () => {
    expect(migration).toContain("sender_id <> receiver_id");
  });

  it("normalises the pair with LEAST/GREATEST unique index", () => {
    expect(migration).toContain("LEAST(sender_id, receiver_id)");
    expect(migration).toContain("GREATEST(sender_id, receiver_id)");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS unique_friend_pair");
  });

  it("status CHECK restricts to four valid values", () => {
    expect(migration).toContain(
      "CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'))",
    );
  });

  it("enables RLS on friend_requests", () => {
    expect(migration).toContain(
      "ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY",
    );
  });

  it("SELECT policy limits to both participants only", () => {
    const selectPolicy = migration.match(
      /CREATE POLICY "fr_select"[\s\S]*?;/,
    );
    expect(selectPolicy).not.toBeNull();
    const policyText = selectPolicy![0];
    expect(policyText).toContain("auth.uid() = sender_id");
    expect(policyText).toContain("auth.uid() = receiver_id");
  });

  it("INSERT policy has WITH CHECK (FALSE)", () => {
    const insertPolicy = migration.match(
      /CREATE POLICY "fr_insert"[\s\S]*?;/,
    );
    expect(insertPolicy).not.toBeNull();
    expect(insertPolicy![0]).toContain("WITH CHECK (FALSE)");
  });

  it("UPDATE policy has USING (FALSE)", () => {
    const updatePolicy = migration.match(
      /CREATE POLICY "fr_update"[\s\S]*?;/,
    );
    expect(updatePolicy).not.toBeNull();
    expect(updatePolicy![0]).toContain("USING (FALSE)");
  });

  it("DELETE policy has USING (FALSE)", () => {
    const deletePolicy = migration.match(
      /CREATE POLICY "fr_delete"[\s\S]*?;/,
    );
    expect(deletePolicy).not.toBeNull();
    expect(deletePolicy![0]).toContain("USING (FALSE)");
  });

  it("has sender and receiver indexes for performance", () => {
    expect(migration).toContain("friend_requests_sender_idx");
    expect(migration).toContain("friend_requests_receiver_idx");
  });
});

// ── 2. DB function security checks ───────────────────────────────────────────

describe("Migration 0002 — DB function security", () => {
  it("send_friend_request is SECURITY DEFINER", () => {
    const fnIdx = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.send_friend_request",
    );
    const defIdx = migration.indexOf("SECURITY DEFINER", fnIdx);
    expect(defIdx).toBeGreaterThan(fnIdx);
  });

  it("respond_friend_request is SECURITY DEFINER", () => {
    const fnIdx = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.respond_friend_request",
    );
    const defIdx = migration.indexOf("SECURITY DEFINER", fnIdx);
    expect(defIdx).toBeGreaterThan(fnIdx);
  });

  it("cancel_friend_request is SECURITY DEFINER", () => {
    const fnIdx = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.cancel_friend_request",
    );
    const defIdx = migration.indexOf("SECURITY DEFINER", fnIdx);
    expect(defIdx).toBeGreaterThan(fnIdx);
  });

  it("remove_friend is SECURITY DEFINER", () => {
    const fnIdx = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.remove_friend",
    );
    const defIdx = migration.indexOf("SECURITY DEFINER", fnIdx);
    expect(defIdx).toBeGreaterThan(fnIdx);
  });

  it("get_friends is SECURITY DEFINER", () => {
    const fnIdx = migration.indexOf("CREATE OR REPLACE FUNCTION public.get_friends");
    const defIdx = migration.indexOf("SECURITY DEFINER", fnIdx);
    expect(defIdx).toBeGreaterThan(fnIdx);
  });

  it("revokes PUBLIC execution on all five functions", () => {
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.send_friend_request",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.respond_friend_request",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.cancel_friend_request",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.remove_friend",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.get_friends",
    );
  });

  it("grants execution to authenticated role only", () => {
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.send_friend_request",
    );
    const grantLine = migration
      .split("\n")
      .filter(
        (l) =>
          l.includes("GRANT EXECUTE ON FUNCTION") &&
          l.includes("TO authenticated"),
      );
    expect(grantLine.length).toBeGreaterThanOrEqual(5);
  });

  it("send_friend_request checks for NULL auth.uid() (unauthenticated guard)", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.send_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("v_caller_id IS NULL");
    expect(fnBody).toContain("unauthenticated");
  });

  it("respond_friend_request verifies receiver_id = caller", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.respond_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("v_req.receiver_id <> v_caller_id");
    expect(fnBody).toContain("forbidden");
  });

  it("cancel_friend_request verifies sender_id = caller", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.cancel_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("v_req.sender_id <> v_caller_id");
    expect(fnBody).toContain("forbidden");
  });

  it("send_friend_request prevents self-requests at function level", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.send_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("v_caller_id = v_target_id");
    expect(fnBody).toContain("self_request");
  });

  it("send_friend_request handles already_friends case", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.send_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("already_friends");
  });

  it("send_friend_request handles request_pending case", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.send_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("request_pending");
  });

  it("send_friend_request allows re-send after rejection/cancellation", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.send_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("UPDATE public.friend_requests");
    expect(fnBody).toContain("status = 'pending'");
  });

  it("send_friend_request handles unique_violation race condition", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.send_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("unique_violation");
  });

  it("respond_friend_request only accepts 'accept' or 'reject' actions", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.respond_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("p_action NOT IN ('accept', 'reject')");
  });

  it("respond_friend_request only acts on pending requests", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.respond_friend_request");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("v_req.status <> 'pending'");
  });

  it("remove_friend uses normalised LEAST/GREATEST pair to find the row", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.remove_friend");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("LEAST(sender_id, receiver_id)");
    expect(fnBody).toContain("GREATEST(sender_id, receiver_id)");
    expect(fnBody).toContain("status = 'accepted'");
  });

  it("get_friends queries from both sender and receiver positions", () => {
    const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.get_friends");
    const fnEnd = migration.indexOf("$$;", fnStart);
    const fnBody = migration.slice(fnStart, fnEnd);
    expect(fnBody).toContain("fr.sender_id = v_caller_id");
    expect(fnBody).toContain("fr.receiver_id = v_caller_id");
    expect(fnBody).toContain("status = 'accepted'");
  });
});

// ── 3. API route security checks ─────────────────────────────────────────────

describe("POST /api/friends/send — static checks", () => {
  it("verifies session via getUser() before acting", () => {
    const getUserIdx = sendRoute.indexOf("getUser()");
    const rpcIdx = sendRoute.indexOf("rpc(");
    expect(getUserIdx).toBeGreaterThan(0);
    expect(rpcIdx).toBeGreaterThan(getUserIdx);
  });

  it("returns 401 if user is not authenticated", () => {
    expect(sendRoute).toContain("status: 401");
  });

  it("validates evoora_id format with regex before hitting DB", () => {
    expect(sendRoute).toMatch(/\/\^EVO-\[A-Z0-9\]\{6\}\$\/i/);
  });

  it("uses RPC (DB function), not direct table INSERT", () => {
    expect(sendRoute).toContain('rpc("send_friend_request"');
    expect(sendRoute).not.toContain(".insert(");
  });

  it("does not expose raw DB errors in response", () => {
    expect(sendRoute).not.toContain("error.details");
    expect(sendRoute).not.toContain("error.hint");
  });

  it("exported handler is POST only", () => {
    expect(sendRoute).toContain("export async function POST");
    expect(sendRoute).not.toContain("export async function GET");
    expect(sendRoute).not.toContain("export async function DELETE");
  });
});

describe("POST /api/friends/respond — static checks", () => {
  it("verifies session before acting", () => {
    const getUserIdx = respondRoute.indexOf("getUser()");
    const rpcIdx = respondRoute.indexOf("rpc(");
    expect(getUserIdx).toBeGreaterThan(0);
    expect(rpcIdx).toBeGreaterThan(getUserIdx);
  });

  it("validates action is 'accept' or 'reject'", () => {
    expect(respondRoute).toContain('"accept", "reject"');
  });

  it("validates request_id is UUID format", () => {
    expect(respondRoute).toMatch(/UUID_RE/);
  });

  it("returns 401 if not authenticated", () => {
    expect(respondRoute).toContain("status: 401");
  });

  it("returns 403 for forbidden actions", () => {
    expect(respondRoute).toContain("status },");
    expect(respondRoute).toContain('"forbidden" ? 403');
  });

  it("uses respond_friend_request RPC", () => {
    expect(respondRoute).toContain('rpc("respond_friend_request"');
  });
});

describe("POST /api/friends/cancel — static checks", () => {
  it("verifies session before acting", () => {
    expect(cancelRoute).toContain("getUser()");
    expect(cancelRoute).toContain('rpc("cancel_friend_request"');
  });

  it("validates UUID format", () => {
    expect(cancelRoute).toContain("UUID_RE");
  });

  it("returns 401 if not authenticated", () => {
    expect(cancelRoute).toContain("status: 401");
  });

  it("returns 403 if caller is not the sender", () => {
    expect(cancelRoute).toContain('"forbidden" ? 403');
  });
});

describe("DELETE /api/friends/remove — static checks", () => {
  it("verifies session before acting", () => {
    expect(removeRoute).toContain("getUser()");
    expect(removeRoute).toContain('rpc("remove_friend"');
  });

  it("exported handler is DELETE only", () => {
    expect(removeRoute).toContain("export async function DELETE");
    expect(removeRoute).not.toContain("export async function GET");
    expect(removeRoute).not.toContain("export async function POST");
  });

  it("validates friend_id UUID format", () => {
    expect(removeRoute).toContain("UUID_RE");
  });

  it("returns 401 if not authenticated", () => {
    expect(removeRoute).toContain("status: 401");
  });
});

// ── 4. FriendsClient component checks ────────────────────────────────────────

describe("FriendsClient component — static checks", () => {
  it("uses client-side Supabase client (never server.ts)", () => {
    expect(clientSrc).toContain("@/core/supabase/client");
    expect(clientSrc).not.toContain("supabase/server");
    expect(clientSrc).not.toContain("createServiceRoleClient");
  });

  it("validates Evoora ID with isValidEvoId before sending", () => {
    expect(clientSrc).toContain("isValidEvoId");
  });

  it("sends requests to API routes, not direct DB calls for mutations", () => {
    expect(clientSrc).toContain("/api/friends/send");
    expect(clientSrc).toContain("/api/friends/respond");
    expect(clientSrc).toContain("/api/friends/cancel");
    expect(clientSrc).toContain("/api/friends/remove");
  });

  it("does not include email addresses in rendered output", () => {
    // The component should never render .email from user objects
    // (it receives userId as a string, not the full user object with email)
    expect(clientSrc).not.toMatch(/user\.email/);
  });

  it("does not expose SERVICE_ROLE key", () => {
    expect(clientSrc).not.toContain("SERVICE_ROLE");
    expect(clientSrc).not.toContain("service_role");
  });

  it("has accessible tab roles (role=tablist, role=tab, role=tabpanel)", () => {
    expect(clientSrc).toContain('role="tablist"');
    expect(clientSrc).toContain('role="tab"');
    expect(clientSrc).toContain('role="tabpanel"');
  });

  it("has aria-selected on tab buttons", () => {
    expect(clientSrc).toContain("aria-selected");
  });

  it("renders empty states for all three tabs", () => {
    expect(clientSrc).toContain("friends.empty_friends");
    expect(clientSrc).toContain("friends.empty_incoming");
    expect(clientSrc).toContain("friends.empty_sent");
  });

  it("has unique IDs for testable interactive elements", () => {
    expect(clientSrc).toContain("id=\"friend-search-input\"");
    expect(clientSrc).toContain("id=\"send-friend-request-btn\"");
  });
});

// ── 5. Database type checks ───────────────────────────────────────────────────

describe("database.ts — friend system types", () => {
  it("exports FriendEntry type for get_friends() RPC result", () => {
    expect(dbTypes).toContain("export interface FriendEntry");
    expect(dbTypes).toContain("request_id: string");
    expect(dbTypes).toContain("friend_id: string");
    expect(dbTypes).toContain("evoora_id: string");
  });

  it("exports FriendRpcResult type", () => {
    expect(dbTypes).toContain("export interface FriendRpcResult");
    expect(dbTypes).toContain("ok: boolean");
    expect(dbTypes).toContain("code: string");
  });

  it("FriendRequest status type uses string literals from DB constraint", () => {
    // Must exactly match the DB CHECK: pending, accepted, rejected, cancelled
    expect(dbTypes).toContain(
      '"pending" | "accepted" | "rejected" | "cancelled"',
    );
  });

  it("Database.Functions includes all five friend RPCs", () => {
    expect(dbTypes).toContain("send_friend_request:");
    expect(dbTypes).toContain("respond_friend_request:");
    expect(dbTypes).toContain("cancel_friend_request:");
    expect(dbTypes).toContain("remove_friend:");
    expect(dbTypes).toContain("get_friends:");
  });
});

// ── 6. safeRedirectPath — still passing after refactor ────────────────────────

import { safeRedirectPath, isValidEvoId } from "@/shared/lib/utils";

describe("isValidEvoId — Evoora ID validation for friend search", () => {
  it("accepts EVO-A1B2C3", () => expect(isValidEvoId("EVO-A1B2C3")).toBe(true));
  it("accepts lowercase evo-a1b2c3", () => expect(isValidEvoId("evo-a1b2c3")).toBe(true));
  it("rejects wrong prefix", () => expect(isValidEvoId("ABC-123456")).toBe(false));
  it("rejects 5-char suffix", () => expect(isValidEvoId("EVO-12345")).toBe(false));
  it("rejects 7-char suffix", () => expect(isValidEvoId("EVO-1234567")).toBe(false));
  it("rejects special chars", () => expect(isValidEvoId("EVO-AB!D3F")).toBe(false));
  it("rejects empty string", () => expect(isValidEvoId("")).toBe(false));
  it("rejects self (same as current user) — format still valid", () => {
    // The self-check is a DB/API concern, not a format concern
    expect(isValidEvoId("EVO-MYSELF")).toBe(true);
  });
});

describe("safeRedirectPath — /friends redirect safety", () => {
  it("allows /friends", () => expect(safeRedirectPath("/friends")).toBe("/friends"));
  it("falls back from null to /dashboard", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
  });
  it("blocks external URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
  });
});

// ── 7. Migration idempotency checks ──────────────────────────────────────────

describe("Migration 0002 — idempotency", () => {
  it("uses CREATE TABLE IF NOT EXISTS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.friend_requests");
  });

  it("uses CREATE INDEX IF NOT EXISTS for both indexes", () => {
    const matches = migration.match(/CREATE INDEX IF NOT EXISTS/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("uses DROP TRIGGER IF EXISTS before creating trigger", () => {
    expect(migration).toContain(
      "DROP TRIGGER IF EXISTS friend_requests_set_updated_at",
    );
  });

  it("uses DROP POLICY IF EXISTS for all four policies", () => {
    const matches = migration.match(/DROP POLICY IF EXISTS/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(4);
  });

  it("uses CREATE OR REPLACE FUNCTION for all functions", () => {
    const matches = migration.match(/CREATE OR REPLACE FUNCTION/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(5);
  });
});
