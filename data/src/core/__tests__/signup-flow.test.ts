/**
 * Evoora — Signup Flow & Auth Client Regression Tests
 *
 * Verifies:
 * 1. Supabase browser and server client environment resolution (supporting both anon and publishable keys).
 * 2. Safe error message handling for signup failure cases (rate limiting, duplicate emails, server errors, network failures).
 * 3. Database migration 0001_profiles.sql fixes (search_path = public, extensions and get_byte 2-argument signature).
 * 4. Security containment (no service role key in client components).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

const mockCreateBrowserClient = vi.fn((url: string, key: string) => ({ url, key }));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (url: string, key: string) => mockCreateBrowserClient(url, key),
}));

describe("Supabase Client Environment Variable Resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("createClient initializes when NEXT_PUBLIC_SUPABASE_ANON_KEY is provided", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-12345";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const { createClient } = await import("@/core/supabase/client");
    const client = createClient();
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key-12345",
    );
    expect(client).toBeDefined();
  });

  it("createClient falls back to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY when anon key is unset", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key";

    const { createClient } = await import("@/core/supabase/client");
    const client = createClient();
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test_key",
    );
    expect(client).toBeDefined();
  });

  it("createClient throws an informative error when both keys are missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const { createClient } = await import("@/core/supabase/client");
    expect(() => createClient()).toThrow(/Missing Supabase environment variables/);
  });

  it("createClient throws an informative error when URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-12345";

    const { createClient } = await import("@/core/supabase/client");
    expect(() => createClient()).toThrow(/Missing Supabase environment variables/);
  });
});

describe("Migration 0001_profiles.sql — Trigger & Search Path Fixes", () => {
  const migrationPath = path.resolve(
    __dirname,
    "../../../supabase/migrations/0001_profiles.sql",
  );
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  it("sets search_path = public, extensions on generate_evoora_id", () => {
    const fnIdx = migrationSql.indexOf(
      "CREATE OR REPLACE FUNCTION public.generate_evoora_id()",
    );
    expect(fnIdx).toBeGreaterThan(-1);

    const snippet = migrationSql.slice(fnIdx, fnIdx + 300);
    expect(snippet).toContain("SET search_path = public, extensions");
  });

  it("calls get_byte with offset 0 and gen_random_bytes(1)", () => {
    expect(migrationSql).toMatch(
      /get_byte\(\s*gen_random_bytes\(1\)\s*,\s*0\s*\)/,
    );
  });

  it("sets search_path = public, extensions on handle_new_user trigger function", () => {
    const fnIdx = migrationSql.indexOf(
      "CREATE OR REPLACE FUNCTION public.handle_new_user()",
    );
    expect(fnIdx).toBeGreaterThan(-1);

    const snippet = migrationSql.slice(fnIdx, fnIdx + 300);
    expect(snippet).toContain("SET search_path = public, extensions");
  });

  it("resolves column reference 'id' ambiguity using variable_conflict and qualified column comparison", () => {
    const fnIdx = migrationSql.indexOf(
      "CREATE OR REPLACE FUNCTION public.generate_evoora_id()",
    );
    const fnBody = migrationSql.slice(fnIdx, fnIdx + 1200);
    expect(fnBody).toContain("#variable_conflict use_variable");
    expect(fnBody).toMatch(/p\.evoora_id\s*=\s*generate_evoora_id\.id/);
  });
});

describe("SignupForm — Static Security & Error Handling Analysis", () => {
  const formPath = path.resolve(
    __dirname,
    "../auth/SignupForm.tsx",
  );
  const formCode = fs.readFileSync(formPath, "utf-8");

  it("does not import or reference SUPABASE_SERVICE_ROLE_KEY", () => {
    expect(formCode).not.toContain("SERVICE_ROLE");
    expect(formCode).not.toContain("service_role");
    expect(formCode).not.toContain("createServiceRoleClient");
  });

  it("handles duplicate email registrations with helpful guidance", () => {
    expect(formCode).toContain("already registered");
    expect(formCode).toContain(
      "This email is already registered. Try logging in instead.",
    );
  });

  it("handles rate limiting (429) gracefully without exposing server internals", () => {
    expect(formCode).toContain("rate limit");
    expect(formCode).toContain(
      "Too many signup attempts. Please wait a few moments and try again.",
    );
  });

  it("masks 500 / database errors to prevent leaking database details to end users", () => {
    expect(formCode).toContain("database error");
    expect(formCode).toContain(
      "Unable to complete account registration due to a server error. Please try again later.",
    );
  });

  it("handles network connection dropouts gracefully", () => {
    expect(formCode).toContain("failed to fetch");
    expect(formCode).toContain(
      "Unable to connect to the authentication server. Please check your connection and try again.",
    );
  });

  it("invokes supabase.auth.verifyOtp with email, token, and type 'signup'", () => {
    expect(formCode).toContain("supabase.auth.verifyOtp");
    expect(formCode).toMatch(/email:\s*normalizedEmail/);
    expect(formCode).toMatch(/token:\s*code/);
    expect(formCode).toMatch(/type:\s*["']signup["']/);
  });

  it("invokes supabase.auth.resend with type 'signup' and email", () => {
    expect(formCode).toContain("supabase.auth.resend");
    expect(formCode).toMatch(/type:\s*["']signup["']/);
    expect(formCode).toMatch(/email:\s*normalizedEmail/);
  });

  it("enforces 6-digit length and numeric validation before submission", () => {
    expect(formCode).toContain("code.length !== 6");
    expect(formCode).toMatch(/\^\\d\{6\}\$/);
    expect(formCode).toContain("Please enter the complete 6-digit code.");
  });

  it("implements a 60-second cooldown timer for resend requests", () => {
    expect(formCode).toContain("setResendCooldown(60)");
    expect(formCode).toContain("resendCooldown > 0");
    expect(formCode).toContain("auth.otp.resend_in");
  });

  it("supports pasting a 6-digit code with non-digit stripping", () => {
    expect(formCode).toContain("handlePaste");
    expect(formCode).toMatch(/replace\(\/\\D\/g,\s*["']["']\)\.slice\(0,\s*6\)/);
  });

  it("supports keyboard navigation with Backspace and Arrow keys across inputs", () => {
    expect(formCode).toContain("handleDigitKeyDown");
    expect(formCode).toContain("Backspace");
    expect(formCode).toContain("ArrowLeft");
    expect(formCode).toContain("ArrowRight");
  });

  it("handles invalid or expired OTP error responses safely", () => {
    expect(formCode).toContain("auth.otp.invalid");
    expect(formCode).toContain("auth.otp.rate_limit");
  });

  it("provides an option to return to form and correct email typos", () => {
    expect(formCode).toContain("auth.otp.change_email");
    expect(formCode).toMatch(/setStep\(["']form["']\)/);
  });
});

describe("Middleware — Email Verification Guard Analysis", () => {
  const middlewarePath = path.resolve(__dirname, "../../middleware.ts");
  const middlewareCode = fs.readFileSync(middlewarePath, "utf-8");

  it("checks user.email_confirmed_at to distinguish verified from unconfirmed accounts", () => {
    expect(middlewareCode).toContain("user.email_confirmed_at");
    expect(middlewareCode).toContain("isUnconfirmed");
  });

  it("redirects unconfirmed accounts away from protected routes to login with error parameter", () => {
    expect(middlewareCode).toMatch(/loginUrl\.searchParams\.set\(["']error["'],\s*["']unverified_email["']\)/);
  });

  it("prevents unconfirmed accounts from being redirected to /dashboard on auth pages", () => {
    expect(middlewareCode).toMatch(/user\s*&&\s*!isUnconfirmed\s*&&\s*\(pathname === ["']\/login["']/);
  });
});

describe("i18n — OTP Verification Localization", () => {
  it("translates OTP title, subtitle, buttons, and errors in English and Tamil", async () => {
    const { t } = await import("@/core/i18n/translations");

    // English
    expect(t("auth.otp.title", "en")).toBe("Verify your email");
    expect(t("auth.otp.subtitle", "en", { email: "test@example.com" })).toContain("test@example.com");
    expect(t("auth.otp.submit", "en")).toBe("Verify & Continue");
    expect(t("auth.otp.resend", "en")).toBe("Resend Code");
    expect(t("auth.otp.resend_in", "en", { seconds: 45 })).toContain("45s");
    expect(t("auth.otp.invalid", "en")).toContain("Invalid or expired");
    expect(t("auth.otp.change_email", "en")).toContain("Wrong email?");

    // Tamil
    expect(t("auth.otp.title", "ta")).toBe("உங்கள் மின்னஞ்சலை சரிபார்க்கவும்");
    expect(t("auth.otp.subtitle", "ta", { email: "test@example.com" })).toContain("test@example.com");
    expect(t("auth.otp.submit", "ta")).toBe("சரிபார்த்து தொடரவும்");
    expect(t("auth.otp.resend", "ta")).toBe("குறியீட்டை மீண்டும் அனுப்பு");
    expect(t("auth.otp.resend_in", "ta", { seconds: 45 })).toContain("45 வினாடிகளில்");
    expect(t("auth.otp.invalid", "ta")).toContain("தவறான அல்லது காலாவதியான");
    expect(t("auth.otp.change_email", "ta")).toContain("மின்னஞ்சலை மாற்றவும்");
  });
});
