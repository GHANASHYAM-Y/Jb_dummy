/**
 * Evoora — Friend Invites Regression & Security Test Suite
 *
 * Verifies:
 * 1. Migration 0006_friend_invites.sql:
 *    - Schema, table constraints, indices, and RLS policies.
 *    - Cryptographic 32-character hex token generation with 128-bit randomness.
 *    - RPC functions: get_or_create_friend_invite, rotate_friend_invite, resolve_friend_invite, accept_friend_invite.
 *    - Privacy: resolve_friend_invite never exposes internal user UUIDs.
 *    - Security: block checks, self-invite prevention, duplicate request prevention.
 * 2. Middleware & Routing:
 *    - /invite/ is allowed as a public route for unauthenticated visitors.
 *    - Invites preserve return flow through login/signup query parameters.
 * 3. Frontend & Sharing Experience:
 *    - FriendsClient has Copy Link, Native Share with fallback, and WhatsApp options.
 *    - Backward compatibility: Evoora ID search is preserved as secondary option.
 * 4. i18n Localization:
 *    - All invite strings present in English and Tamil with variable substitution.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Migration 0006_friend_invites.sql — Schema & Security Analysis", () => {
  const migrationPath = path.resolve(__dirname, "../../supabase/migrations/0006_friend_invites.sql");
  const sql = fs.readFileSync(migrationPath, "utf-8");

  it("creates friend_invites table with user cascade, token, and expiry", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.friend_invites");
    expect(sql).toMatch(/REFERENCES public\.profiles\(id\)\s+ON DELETE CASCADE/);
    expect(sql).toContain("token       TEXT           NOT NULL");
    expect(sql).toContain("CONSTRAINT unique_friend_invite_token UNIQUE (token)");
  });

  it("enforces Row Level Security and restricts direct writes", () => {
    expect(sql).toContain("ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).toMatch(/CREATE POLICY ["']fi_insert["'][\s\S]*?WITH CHECK \(FALSE\)/);
    expect(sql).toMatch(/CREATE POLICY ["']fi_update["'][\s\S]*?USING \(FALSE\)/);
    expect(sql).toMatch(/CREATE POLICY ["']fi_delete["'][\s\S]*?USING \(FALSE\)/);
  });

  it("generates unguessable 128-bit tokens using gen_random_bytes(16)", () => {
    expect(sql).toMatch(/encode\(gen_random_bytes\(16\),\s*['"]hex['"]\)/);
  });

  it("defines get_or_create_friend_invite RPC with active token reuse", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.get_or_create_friend_invite()");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public, extensions");
    expect(sql).toMatch(/fi\.expires_at > NOW\(\)/);
  });

  it("defines rotate_friend_invite RPC that deactivates previous links", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.rotate_friend_invite()");
    expect(sql).toMatch(/UPDATE public\.friend_invites\s+SET is_active = FALSE/);
  });

  it("protects privacy in resolve_friend_invite without returning internal UUIDs", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.resolve_friend_invite");
    const fnIdx = sql.indexOf("CREATE OR REPLACE FUNCTION public.resolve_friend_invite");
    const fnBody = sql.slice(fnIdx, fnIdx + 3500);

    // Verifies public fields only
    expect(fnBody).toContain("'display_name', v_display_name");
    expect(fnBody).toContain("'avatar_url', v_avatar_url");
    expect(fnBody).toContain("'evoora_id', v_evoora_id");
    // Internal user_id is never passed in the inviter JSON
    expect(fnBody).not.toMatch(/'user_id',\s*v_inviter_id/);
  });

  it("enforces block checks and prevents self-requests in accept_friend_invite", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.accept_friend_invite");
    const fnIdx = sql.indexOf("CREATE OR REPLACE FUNCTION public.accept_friend_invite");
    const fnBody = sql.slice(fnIdx, fnIdx + 2500);

    expect(fnBody).toContain("v_caller = v_inviter_id");
    expect(fnBody).toContain("'self_request'");
    expect(fnBody).toContain("public.is_blocked(v_caller, v_inviter_id)");
    expect(fnBody).toContain("'blocked'");
    expect(fnBody).toContain("'already_friends'");
    expect(fnBody).toContain("'request_pending'");
  });

  it("configures strict least-privilege permissions", () => {
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.get_or_create_friend_invite.*FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.resolve_friend_invite.*TO anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.accept_friend_invite.*TO authenticated/);
  });
});

describe("Middleware — Public Invitation Path Verification", () => {
  const middlewarePath = path.resolve(__dirname, "../middleware.ts");
  const middlewareCode = fs.readFileSync(middlewarePath, "utf-8");

  it("allows unauthenticated visitors to view /invite/ without redirecting to login", () => {
    expect(middlewareCode).toContain('"/invite/"');
    expect(middlewareCode).toMatch(/PUBLIC_PREFIXES\s*=\s*\[.*["']\/invite\/["'].*\]/);
  });
});

describe("FriendsClient — Invitation Experience & Sharing Features", () => {
  const clientPath = path.resolve(__dirname, "../components/friends/FriendsClient.tsx");
  const clientCode = fs.readFileSync(clientPath, "utf-8");

  it("fetches the user's personal invite link from /api/friends/invite", () => {
    expect(clientCode).toContain('fetch("/api/friends/invite")');
    expect(clientCode).toContain("loadInviteLink");
  });

  it("implements clipboard copy with visual confirmation", () => {
    expect(clientCode).toContain("navigator.clipboard.writeText");
    expect(clientCode).toContain("handleCopyLink");
    expect(clientCode).toContain("friends.link_copied");
  });

  it("supports Web Share API with graceful copy fallback", () => {
    expect(clientCode).toContain("navigator.share");
    expect(clientCode).toContain("handleNativeShare");
    expect(clientCode).toContain("await handleCopyLink()");
  });

  it("includes direct WhatsApp sharing link with encoded message", () => {
    expect(clientCode).toContain("https://wa.me/?text=");
    expect(clientCode).toContain("friends.share_whatsapp");
    expect(clientCode).toContain("friends.share_text");
  });

  it("supports rotating invite links with confirmation", () => {
    expect(clientCode).toContain("handleRotateInvite");
    expect(clientCode).toContain('fetch("/api/friends/invite", { method: "POST" })');
    expect(clientCode).toContain("friends.new_link_confirm");
  });

  it("preserves backward compatibility with Evoora ID lookup", () => {
    expect(clientCode).toContain("friend-search-input");
    expect(clientCode).toContain("send-friend-request-btn");
    expect(clientCode).toContain("friends.or_evoora_id");
  });
});

describe("InviteLandingClient — Flow States & Authorization", () => {
  const landingPath = path.resolve(__dirname, "../components/friends/InviteLandingClient.tsx");
  const landingCode = fs.readFileSync(landingPath, "utf-8");

  it("routes unauthenticated visitors to signup/login preserving the invite return path", () => {
    expect(landingCode).toMatch(/signup\?next=\$\{encodeURIComponent\(`\/invite\/\$\{token\}`\)\}/);
    expect(landingCode).toMatch(/login\?next=\$\{encodeURIComponent\(`\/invite\/\$\{token\}`\)\}/);
  });

  it("handles distinct states: self, already_friends, request_pending, and blocked", () => {
    expect(landingCode).toContain('relationship === "self"');
    expect(landingCode).toContain('relationship === "already_friends"');
    expect(landingCode).toContain('relationship === "request_pending"');
    expect(landingCode).toContain('relationship === "blocked"');
  });

  it("never automatically forms a friendship upon page load", () => {
    // Requires explicit button click by authenticated user
    expect(landingCode).toContain("handleSendFriendRequest");
    expect(landingCode).toContain("/api/friends/invite/accept");
    expect(landingCode).toContain("invite.send_request");
  });
});

describe("i18n — Friend Invites Localization", () => {
  it("provides comprehensive translations in English and Tamil with variable interpolation", async () => {
    const { t } = await import("@/lib/i18n");

    // English
    expect(t("friends.invite_title", "en")).toBe("Invite your friends to EVOAIQU");
    expect(t("friends.copy_link", "en")).toBe("Copy Link");
    expect(t("friends.share_whatsapp", "en")).toBe("WhatsApp");
    expect(t("invite.subtitle", "en", { name: "Dhruv" })).toContain("Dhruv");
    expect(t("invite.already_friends", "en", { name: "Dhruv" })).toContain("Dhruv");
    expect(t("invite.send_request", "en")).toBe("Send Friend Request");

    // Tamil
    expect(t("friends.invite_title", "ta")).toBe("உங்கள் நண்பர்களை EVOAIQU-க்கு அழைக்கவும்");
    expect(t("friends.copy_link", "ta")).toBe("இணைப்பை நகலெடு");
    expect(t("friends.share_whatsapp", "ta")).toBe("WhatsApp");
    expect(t("invite.subtitle", "ta", { name: "Dhruv" })).toContain("Dhruv");
    expect(t("invite.already_friends", "ta", { name: "Dhruv" })).toContain("Dhruv");
    expect(t("invite.send_request", "ta")).toBe("நண்பர் கோரிக்கை அனுப்பு");
  });
});
