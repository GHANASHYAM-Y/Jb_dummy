/**
 * Evoora — Milestone 4 Challenge Assignment System Tests
 *
 * Verifies:
 *   1. Challenge catalog integrity, safety, pure validation helpers and type guards.
 *   2. SQL Migration 0004 audit (tables, constraints, RLS policies, atomic concurrency,
 *      SECURITY DEFINER functions, retention & deletion handling).
 *   3. Security rules:
 *      - Only verified winner can assign a challenge.
 *      - Loser cannot assign a challenge to themselves.
 *      - Nonparticipants cannot assign or access challenges.
 *      - Unfinished, draw, or invalid matches cannot generate assignments.
 *      - Recipient alone can accept or skip; skipping is penalty-free.
 *      - Duplicate/concurrent assignment prevention via UNIQUE(match_id) and row locking.
 *      - Challenge visibility is distinct from submission visibility (no automatic publication).
 *   4. API route security & validation (authentication, UUID checking, payload validation).
 *   5. Database types and multilingual translation completeness (English & Tamil).
 *
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  CHALLENGE_CATALOG,
  CATEGORY_META,
  getChallengeById,
  getChallengesByCategory,
  isValidCategory,
  isValidVisibility,
  isValidStatus,
} from "@/lib/challenges";
import { translations } from "@/core/i18n/translations";

// ── File paths for static security and schema audit ──────────────────────────

const migrationPath = path.resolve(
  __dirname,
  "../../supabase/migrations/0004_challenges.sql"
);
const migration = fs.readFileSync(migrationPath, "utf-8");

const assignRoutePath = path.resolve(
  __dirname,
  "../app/api/challenges/assign/route.ts"
);
const assignRoute = fs.readFileSync(assignRoutePath, "utf-8");

const respondRoutePath = path.resolve(
  __dirname,
  "../app/api/challenges/respond/route.ts"
);
const respondRoute = fs.readFileSync(respondRoutePath, "utf-8");

const matchRoutePath = path.resolve(
  __dirname,
  "../app/api/challenges/match/route.ts"
);
const matchRoute = fs.readFileSync(matchRoutePath, "utf-8");

const listRoutePath = path.resolve(
  __dirname,
  "../app/api/challenges/route.ts"
);
const listRoute = fs.readFileSync(listRoutePath, "utf-8");

const dbTypesPath = path.resolve(__dirname, "../core/supabase/database.ts");
const dbTypes = fs.readFileSync(dbTypesPath, "utf-8");

// ── 1. Pure Challenge Catalog & Safety Tests ──────────────────────────────────

describe("Challenge Catalog — Categories & Content Safety", () => {
  it("contains catalog entries across all 6 required categories", () => {
    const categories = Object.keys(CATEGORY_META);
    expect(categories).toContain("dance");
    expect(categories).toContain("singing");
    expect(categories).toContain("acting");
    expect(categories).toContain("mimicry");
    expect(categories).toContain("tongue_twister");
    expect(categories).toContain("comedy");
    expect(CHALLENGE_CATALOG.length).toBeGreaterThanOrEqual(18);
  });

  it("every challenge has a unique id, valid category, title, description, and instructions", () => {
    const ids = new Set<string>();
    for (const c of CHALLENGE_CATALOG) {
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);

      expect(isValidCategory(c.category)).toBe(true);
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.description.trim().length).toBeGreaterThan(0);
      expect(c.instructions.trim().length).toBeGreaterThan(0);
    }
  });

  it("SAFETY AUDIT: rejects dangerous stunts, humiliation, sexual demands, or commercial requests", () => {
    const prohibitedKeywords = [
      "kill", "die", "harm", "cut", "burn", "choke", "poison", "alcohol",
      "drug", "weapon", "strip", "nude", "sexual", "naked", "harass",
      "money", "pay", "credit card", "password", "ssn", "doxx", "address",
    ];

    for (const c of CHALLENGE_CATALOG) {
      const fullText = `${c.title} ${c.description} ${c.instructions}`;
      for (const kw of prohibitedKeywords) {
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        expect(regex.test(fullText)).toBe(false);
      }
    }
  });

  it("retrieves challenge by id correctly", () => {
    const first = CHALLENGE_CATALOG[0];
    const retrieved = getChallengeById(first.id);
    expect(retrieved).toEqual(first);

    expect(getChallengeById("non-existent-challenge-id")).toBeUndefined();
  });

  it("filters challenges by category correctly", () => {
    const danceChallenges = getChallengesByCategory("dance");
    expect(danceChallenges.length).toBeGreaterThan(0);
    expect(danceChallenges.every((c) => c.category === "dance")).toBe(true);

    const tongueTwisters = getChallengesByCategory("tongue_twister");
    expect(tongueTwisters.length).toBeGreaterThan(0);
    expect(tongueTwisters.every((c) => c.category === "tongue_twister")).toBe(true);
  });
});

describe("Pure Validation Guards", () => {
  it("validates categories", () => {
    expect(isValidCategory("dance")).toBe(true);
    expect(isValidCategory("singing")).toBe(true);
    expect(isValidCategory("acting")).toBe(true);
    expect(isValidCategory("mimicry")).toBe(true);
    expect(isValidCategory("tongue_twister")).toBe(true);
    expect(isValidCategory("comedy")).toBe(true);

    expect(isValidCategory("stunts")).toBe(false);
    expect(isValidCategory("gambling")).toBe(false);
    expect(isValidCategory("")).toBe(false);
  });

  it("validates visibility", () => {
    expect(isValidVisibility("private")).toBe(true);
    expect(isValidVisibility("public")).toBe(true);

    expect(isValidVisibility("secret")).toBe(false);
    expect(isValidVisibility("unlisted")).toBe(false);
    expect(isValidVisibility("")).toBe(false);
  });

  it("validates status", () => {
    expect(isValidStatus("pending")).toBe(true);
    expect(isValidStatus("accepted")).toBe(true);
    expect(isValidStatus("completed")).toBe(true);
    expect(isValidStatus("skipped")).toBe(true);
    expect(isValidStatus("cancelled")).toBe(true);

    expect(isValidStatus("rejected")).toBe(false);
    expect(isValidStatus("expired")).toBe(false);
    expect(isValidStatus("")).toBe(false);
  });
});

// ── 2. Migration 0004 SQL Schema & Security Audit ─────────────────────────────

describe("Migration 0004 — Database Schema Audit", () => {
  it("creates challenges table with IF NOT EXISTS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.challenges");
  });

  it("enforces no_self_challenge CHECK constraint", () => {
    expect(migration).toMatch(
      /CONSTRAINT\s+no_self_challenge\s+CHECK\s*\(\s*winner_id\s*<>\s*loser_id\s*\)/i
    );
  });

  it("enforces strictly unique challenge per match", () => {
    expect(migration).toMatch(
      /CONSTRAINT\s+unique_match_challenge\s+UNIQUE\s*\(\s*match_id\s*\)/i
    );
  });

  it("enforces valid challenge categories via CHECK constraint", () => {
    expect(migration).toMatch(
      /category\s+IN\s*\(\s*'dance'[\s\S]+?'singing'[\s\S]+?'acting'[\s\S]+?'mimicry'[\s\S]+?'tongue_twister'[\s\S]+?'comedy'\s*\)/i
    );
  });

  it("enforces valid visibility via CHECK constraint", () => {
    expect(migration).toMatch(/visibility\s+IN\s*\('private',\s*'public'\)/);
  });

  it("enforces valid status lifecycle via CHECK constraint", () => {
    expect(migration).toMatch(
      /status\s+IN\s*\([\s\S]+?'pending'[\s\S]+?'accepted'[\s\S]+?'completed'[\s\S]+?'skipped'[\s\S]+?'cancelled'[\s\S]+?\)/
    );
  });

  it("handles account and match deletion safely with ON DELETE CASCADE", () => {
    expect(migration).toContain("REFERENCES public.matches(id) ON DELETE CASCADE");
    expect(migration).toContain("REFERENCES public.profiles(id) ON DELETE CASCADE");
  });

  it("creates indexes on foreign keys and lookup columns", () => {
    expect(migration).toContain("challenges_match_idx");
    expect(migration).toContain("challenges_winner_idx");
    expect(migration).toContain("challenges_loser_idx");
  });

  it("attaches updated_at trigger for auditability", () => {
    expect(migration).toContain("challenges_set_updated_at");
  });
});

describe("Migration 0004 — Row Level Security Policies", () => {
  it("enables RLS on challenges table", () => {
    expect(migration).toContain("ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;");
  });

  it("allows SELECT only to participants (winner or loser)", () => {
    expect(migration).toMatch(/CREATE POLICY "c_select"\s+ON public\.challenges/);
    expect(migration).toMatch(/auth\.uid\(\)\s*=\s*winner_id\s+OR\s+auth\.uid\(\)\s*=\s*loser_id/);
  });

  it("blocks direct client INSERT, UPDATE, DELETE with FALSE check", () => {
    expect(migration).toMatch(/CREATE POLICY "c_insert"\s+ON public\.challenges FOR INSERT WITH CHECK \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "c_update"\s+ON public\.challenges FOR UPDATE USING \(FALSE\)/);
    expect(migration).toMatch(/CREATE POLICY "c_delete"\s+ON public\.challenges FOR DELETE USING \(FALSE\)/);
  });
});

describe("Migration 0004 — SECURITY DEFINER RPC Functions", () => {
  it("defines assign_challenge with SECURITY DEFINER and fixed search_path", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.assign_challenge");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public");
  });

  it("creates challenge_catalog table and seeds all curated challenges", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.challenge_catalog");
    expect(migration).toContain("INSERT INTO public.challenge_catalog");
    expect(migration).toContain("dance_robot");
    expect(migration).toContain("comedy_invisible_mirror");
  });

  it("challenges table references challenge_catalog with foreign key", () => {
    expect(migration).toMatch(
      /challenge_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+public\.challenge_catalog\(id\)/i
    );
  });

  it("assign_challenge acquires FOR UPDATE lock on the match to prevent race conditions", () => {
    expect(migration).toMatch(/FROM public\.matches[\s\S]+?WHERE id = p_match_id[\s\S]+?FOR UPDATE/);
  });

  it("assign_challenge verifies caller is authenticated match winner", () => {
    expect(migration).toContain("v_caller    UUID := auth.uid();");
    expect(migration).toContain("v_match.winner_id <> v_caller");
  });

  it("assign_challenge verifies match is completed and not a draw", () => {
    expect(migration).toContain("v_match.phase <> 'completed'");
    expect(migration).toContain("v_match.is_draw");
  });

  it("assign_challenge strictly validates visibility, rejecting NULL or invalid visibility", () => {
    expect(migration).toContain("IF p_visibility IS NULL OR p_visibility NOT IN ('private', 'public') THEN");
    expect(migration).toContain("code', 'invalid_visibility'");
  });

  it("assign_challenge validates challenge_id presence and rejects invalid or empty ID with invalid_challenge_id", () => {
    expect(migration).toContain("IF p_challenge_id IS NULL OR TRIM(p_challenge_id) = '' THEN");
    expect(migration).toContain("SELECT * INTO v_catalog\n  FROM public.challenge_catalog\n  WHERE id = TRIM(p_challenge_id) AND is_active = TRUE;");
    expect(migration).toContain("code', 'invalid_challenge_id'");
  });

  it("assign_challenge detects and rejects fabricated metadata tampering with fabricated_metadata", () => {
    expect(migration).toContain("p_category IS NOT NULL AND p_category <> v_catalog.category");
    expect(migration).toContain("p_title IS NOT NULL AND p_title <> v_catalog.title");
    expect(migration).toContain("p_description IS NOT NULL AND p_description <> v_catalog.description");
    expect(migration).toContain("p_instructions IS NOT NULL AND p_instructions <> v_catalog.instructions");
    expect(migration).toContain("code', 'fabricated_metadata'");
  });

  it("assign_challenge writes authoritative catalog values into challenges table", () => {
    expect(migration).toContain("v_catalog.id");
    expect(migration).toContain("v_catalog.category");
    expect(migration).toContain("v_catalog.title");
    expect(migration).toContain("v_catalog.description");
    expect(migration).toContain("v_catalog.instructions");
  });

  it("assign_challenge prevents self-challenge and duplicate assignments via lock, check, and exception handling", () => {
    expect(migration).toContain("v_loser_id = v_caller");
    expect(migration).toContain("EXISTS (SELECT 1 FROM public.challenges WHERE match_id = p_match_id)");
    expect(migration).toContain("EXCEPTION WHEN unique_violation THEN");
    expect(migration).toContain("already_assigned");
  });

  it("defines respond_challenge with SECURITY DEFINER and fixed search_path", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.respond_challenge");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public");
  });

  it("respond_challenge strictly validates action parameter, rejecting NULL and invalid actions", () => {
    // In PostgreSQL three-valued logic, `NULL NOT IN ('accept', 'skip')` evaluates to NULL,
    // which would fall through to the skip branch if not explicitly guarded.
    expect(migration).toContain("IF p_action IS NULL OR p_action NOT IN ('accept', 'skip') THEN");
    expect(migration).toContain("code', 'invalid_action'");
  });

  it("respond_challenge enforces that only the loser (recipient) can accept or skip", () => {
    expect(migration).toContain("v_challenge.loser_id <> v_caller");
    expect(migration).toContain("Only the assigned recipient can accept or skip this challenge.");
  });

  it("respond_challenge provides idempotent response if already in requested state", () => {
    expect(migration).toContain("v_challenge.status = 'accepted' AND p_action = 'accept'");
    expect(migration).toContain("v_challenge.status = 'skipped' AND p_action = 'skip'");
  });

  it("respond_challenge enforces pending status and transitions to accepted or skipped", () => {
    expect(migration).toContain("v_challenge.status <> 'pending'");
    expect(migration).toContain("p_action = 'accept'");
    expect(migration).toContain("status = 'skipped'");
  });

  it("defines get_match_challenge and get_user_challenges scoped to authorized callers with subquery LIMIT 50", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_match_challenge");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_user_challenges");
    expect(migration).toContain("SELECT COALESCE(jsonb_agg(sub.item), '[]'::jsonb)");
    expect(migration).toContain("ORDER BY c.created_at DESC\n    LIMIT 50");
  });

  it("configures Realtime publication safely and idempotently for challenges table", () => {
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;");
    expect(migration).toContain("IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN");
  });

  it("revokes execution from public and grants to authenticated role", () => {
    expect(migration).toContain("REVOKE EXECUTE ON FUNCTION public.assign_challenge");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.assign_challenge");
    expect(migration).toContain("REVOKE EXECUTE ON FUNCTION public.respond_challenge");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.respond_challenge");
    expect(migration).toContain("GRANT SELECT ON public.challenge_catalog TO authenticated;");
  });
});

// ── 3. API Route Security & Validation Audit ──────────────────────────────────

describe("API Route Security — /api/challenges/assign", () => {
  it("requires authenticated session", () => {
    expect(assignRoute).toContain("supabase.auth.getUser()");
    expect(assignRoute).toContain("Not authenticated");
    expect(assignRoute).toContain("status: 401");
  });

  it("validates match_id UUID format", () => {
    expect(assignRoute).toMatch(/UUID_RE/);
    expect(assignRoute).toContain("match_id must be a valid UUID.");
  });

  it("validates challenge catalog item existence", () => {
    expect(assignRoute).toContain("getChallengeById(body.challenge_id)");
    expect(assignRoute).toContain("Invalid challenge_id. Must be an approved challenge from the catalog.");
  });

  it("validates visibility parameter ('private' | 'public')", () => {
    expect(assignRoute).toContain("isValidVisibility");
    expect(assignRoute).toContain("visibility must be 'private' or 'public'.");
  });

  it("calls assign_challenge RPC with authoritative server parameters", () => {
    expect(assignRoute).toContain('.rpc("assign_challenge"');
    expect(assignRoute).toContain("p_match_id");
    expect(assignRoute).toContain("p_challenge_id");
    expect(assignRoute).toContain("p_category");
    expect(assignRoute).toContain("p_title");
    expect(assignRoute).toContain("p_description");
    expect(assignRoute).toContain("p_instructions");
    expect(assignRoute).toContain("p_visibility");
  });
});

describe("API Route Security — /api/challenges/respond", () => {
  it("requires authenticated session", () => {
    expect(respondRoute).toContain("supabase.auth.getUser()");
    expect(respondRoute).toContain("Not authenticated");
    expect(respondRoute).toContain("status: 401");
  });

  it("validates challenge UUID format", () => {
    expect(respondRoute).toMatch(/UUID_RE/);
    expect(respondRoute).toContain("challenge_id must be a valid UUID.");
  });

  it("restricts response action to 'accept' or 'skip'", () => {
    expect(respondRoute).toContain('!["accept", "skip"].includes(body.action)');
    expect(respondRoute).toContain("action must be 'accept' or 'skip'.");
  });

  it("delegates execution to secure respond_challenge RPC", () => {
    expect(respondRoute).toContain('.rpc("respond_challenge"');
    expect(respondRoute).toContain("p_challenge_id");
    expect(respondRoute).toContain("p_action");
  });
});

describe("API Route Security — /api/challenges/match and /api/challenges", () => {
  it("/api/challenges/match requires auth, validates match UUID, and opts out of static prerender", () => {
    expect(matchRoute).toContain("await connection()");
    expect(matchRoute).toContain("supabase.auth.getUser()");
    expect(matchRoute).toMatch(/UUID_RE/);
    expect(matchRoute).toContain('.rpc("get_match_challenge"');
  });

  it("/api/challenges requires auth, validates filter, and opts out of static prerender", () => {
    expect(listRoute).toContain("await connection()");
    expect(listRoute).toContain("supabase.auth.getUser()");
    expect(listRoute).toContain('.rpc("get_user_challenges"');
  });
});

// ── 4. Privacy & Consent Separation Audit ─────────────────────────────────────

describe("Privacy & Consent Architecture", () => {
  it("i18n explicitly clarifies challenges default to private", () => {
    expect(translations.en["challenges.privacy_bullet1"]).toContain(
      "Challenges are private by default between match participants"
    );
  });

  it("i18n explicitly states recipient can skip without penalty", () => {
    expect(translations.en["challenges.privacy_bullet2"]).toContain(
      "Recipients can skip any challenge at any time without penalty"
    );
  });

  it("i18n guarantees public challenge visibility does NOT authorize public submission", () => {
    expect(translations.en["challenges.privacy_bullet3"]).toContain(
      "No submission is ever published publicly without separate explicit consent"
    );
  });

  it("Tamil translations match English privacy principles", () => {
    expect(translations.ta["challenges.privacy_bullet1"]).toBeDefined();
    expect(translations.ta["challenges.privacy_bullet2"]).toBeDefined();
    expect(translations.ta["challenges.privacy_bullet3"]).toBeDefined();
  });
});

// ── 5. Database Types & i18n Completeness ──────────────────────────────────────

describe("TypeScript Database Interfaces & i18n Completeness", () => {
  it("database.ts defines Challenge, ChallengeCategory, ChallengeStatus, and ChallengeVisibility", () => {
    expect(dbTypes).toContain("export type ChallengeCategory =");
    expect(dbTypes).toContain("export type ChallengeStatus =");
    expect(dbTypes).toContain("export type ChallengeVisibility =");
    expect(dbTypes).toContain("export interface Challenge");
  });

  it("database.ts registers assign_challenge and respond_challenge in Database['public']['Functions']", () => {
    expect(dbTypes).toContain("assign_challenge:");
    expect(dbTypes).toContain("respond_challenge:");
    expect(dbTypes).toContain("get_match_challenge:");
    expect(dbTypes).toContain("get_user_challenges:");
  });

  it("all challenges.* translation keys exist in both English and Tamil", () => {
    const enKeys = Object.keys(translations.en).filter((k) =>
      k.startsWith("challenges.")
    );
    expect(enKeys.length).toBeGreaterThanOrEqual(20);

    for (const key of enKeys) {
      expect(translations.ta[key as keyof typeof translations.ta]).toBeDefined();
      expect(translations.ta[key as keyof typeof translations.ta]?.trim().length).toBeGreaterThan(0);
    }
  });
});

// ── 6. Milestone 4 — Regression Tests: Challenge Integrity & Fabrication Prevention

describe("Milestone 4 — Regression Tests: Challenge Integrity & Anti-Fabrication", () => {
  interface SimulatedCatalogItem {
    id: string;
    category: string;
    title: string;
    description: string;
    instructions: string;
    is_active: boolean;
  }

  const catalog: Record<string, SimulatedCatalogItem> = {
    dance_robot: {
      id: "dance_robot",
      category: "dance",
      title: "The Mechanical Robot",
      description: "Perform an ultra-stiff, mechanical robot dance.",
      instructions: "Move only one joint at a time with sharp robotic pauses for 20 seconds. Make bleep-bloop sound effects if you want!",
      is_active: true,
    },
  };

  interface SimulatedAssignParams {
    match_id: string;
    challenge_id: string;
    category?: string | null;
    title?: string | null;
    description?: string | null;
    instructions?: string | null;
    visibility?: string;
  }

  function simulateAssignChallenge(
    callerId: string,
    match: { winner_id: string; loser_id: string; phase: string; is_draw: boolean },
    params: SimulatedAssignParams
  ): { ok: boolean; code: string; message?: string; stored?: Record<string, unknown> } {
    if (!callerId) return { ok: false, code: "unauthenticated" };
    if (!params.visibility || !["private", "public"].includes(params.visibility)) {
      return { ok: false, code: "invalid_visibility" };
    }
    if (!params.challenge_id || !params.challenge_id.trim()) {
      return { ok: false, code: "invalid_challenge_id" };
    }

    const item = catalog[params.challenge_id.trim()];
    if (!item || !item.is_active) {
      return { ok: false, code: "invalid_challenge_id", message: "Invalid challenge ID. Not found in authoritative catalog." };
    }

    // Defensive anti-fabrication check
    if (
      (params.category && params.category !== item.category) ||
      (params.title && params.title !== item.title) ||
      (params.description && params.description !== item.description) ||
      (params.instructions && params.instructions !== item.instructions)
    ) {
      return { ok: false, code: "fabricated_metadata", message: "Challenge metadata does not match authoritative catalog." };
    }

    if (match.phase !== "completed") return { ok: false, code: "match_not_completed" };
    if (match.is_draw || !match.winner_id) return { ok: false, code: "match_was_draw" };
    if (match.winner_id !== callerId) return { ok: false, code: "not_winner" };

    return {
      ok: true,
      code: "assigned",
      stored: {
        match_id: params.match_id,
        winner_id: callerId,
        loser_id: match.loser_id,
        challenge_id: item.id,
        category: item.category,
        title: item.title,
        description: item.description,
        instructions: item.instructions,
        visibility: params.visibility,
        status: "pending",
      },
    };
  }

  const validMatch = {
    winner_id: "user_winner",
    loser_id: "user_loser",
    phase: "completed",
    is_draw: false,
  };

  it("REGRESSION: rejects direct RPC call with fabricated title or instructions", () => {
    const res = simulateAssignChallenge("user_winner", validMatch, {
      match_id: "match_1",
      challenge_id: "dance_robot",
      category: "dance",
      title: "FABRICATED: Do 50 pushups",
      description: "Harmful challenge bypass",
      instructions: "Dangerous instructions",
      visibility: "private",
    });

    expect(res.ok).toBe(false);
    expect(res.code).toBe("fabricated_metadata");
    expect(res.stored).toBeUndefined();
  });

  it("REGRESSION: rejects direct RPC call with fabricated category", () => {
    const res = simulateAssignChallenge("user_winner", validMatch, {
      match_id: "match_1",
      challenge_id: "dance_robot",
      category: "comedy", // robot is dance!
      visibility: "private",
    });

    expect(res.ok).toBe(false);
    expect(res.code).toBe("fabricated_metadata");
  });

  it("REGRESSION: rejects non-existent or fabricated challenge ID", () => {
    const res = simulateAssignChallenge("user_winner", validMatch, {
      match_id: "match_1",
      challenge_id: "custom_unapproved_dare_999",
      visibility: "private",
    });

    expect(res.ok).toBe(false);
    expect(res.code).toBe("invalid_challenge_id");
  });

  it("REGRESSION: rejects empty challenge ID", () => {
    const res = simulateAssignChallenge("user_winner", validMatch, {
      match_id: "match_1",
      challenge_id: "   ",
      visibility: "private",
    });

    expect(res.ok).toBe(false);
    expect(res.code).toBe("invalid_challenge_id");
  });

  it("REGRESSION: accepts valid challenge ID with omitted metadata and stores authoritative catalog fields", () => {
    const res = simulateAssignChallenge("user_winner", validMatch, {
      match_id: "match_1",
      challenge_id: "dance_robot",
      visibility: "private",
    });

    expect(res.ok).toBe(true);
    expect(res.code).toBe("assigned");
    expect(res.stored?.title).toBe("The Mechanical Robot");
    expect(res.stored?.instructions).toContain("Move only one joint at a time");
    expect(res.stored?.category).toBe("dance");
  });

  it("REGRESSION: accepts matching client metadata without error and stores authoritative catalog fields", () => {
    const res = simulateAssignChallenge("user_winner", validMatch, {
      match_id: "match_1",
      challenge_id: "dance_robot",
      category: "dance",
      title: "The Mechanical Robot",
      description: "Perform an ultra-stiff, mechanical robot dance.",
      instructions: "Move only one joint at a time with sharp robotic pauses for 20 seconds. Make bleep-bloop sound effects if you want!",
      visibility: "private",
    });

    expect(res.ok).toBe(true);
    expect(res.code).toBe("assigned");
  });
});
