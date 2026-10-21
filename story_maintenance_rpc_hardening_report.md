# EVOAIQU — Story Maintenance RPC Security Hardening Report

**Date:** October 20, 2026  
**Auditor:** Antigravity AI  
**Target Environment:** Staging Supabase PostgreSQL 17.11 (`ciceoulihowlkugofugv`) via IPv4 Pooler (`aws-0-ap-northeast-1.pooler.supabase.com:5432`)  
**Scope:** Hardening and authoritative access enforcement for `cleanup_expired_stories` and `confirm_story_media_deleted` RPCs.

---

## 1. Executive Summary

Following the post-remediation release gate audit, the two remaining public-schema maintenance RPCs—`cleanup_expired_stories` and `confirm_story_media_deleted`—were audited, hardened, applied to the staging database via migration `0013_story_maintenance_rpc_security.sql`, and verified against adversarial attack simulations.

### Threat Model & Risks Prior to Hardening:
1. **Unnecessary Privilege Grants:** Both functions granted `EXECUTE` to `anon` and `authenticated` under default Supabase privileges.
2. **Arbitrary Story Deletion Vulnerability:** `confirm_story_media_deleted(p_storage_paths TEXT[])` previously executed an `UPDATE` setting `media_deleted_at = NOW()` and `deleted_at = NOW()` on any matching `storage_path` without checking if the story was expired or deleted. Any authenticated user or anonymous caller could craft a payload with an opponent's active story path and prematurely erase their challenge submission from the database.
3. **Data Harvesting & Resource Exhaustion:** Direct invocation of `cleanup_expired_stories` by unauthenticated callers could expose expired file paths and trigger batch database writes.

**Status:** Fully remediated on staging database. Anonymous and authenticated execution is revoked; functions are restricted exclusively to `service_role`; independent authorization checks are enforced in PL/pgSQL; and `confirm_story_media_deleted` now verifies that a story is genuinely expired or deleted before permitting any media purge.

---

## 2. Live Function Definitions & Application Caller Analysis

### Live System Catalog Audit on Staging PostgreSQL 17.11:
```sql
SELECT 
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS args,
    p.prosecdef AS is_secdef,
    p.proconfig AS search_path_config,
    p.proacl::text AS acls
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('cleanup_expired_stories', 'confirm_story_media_deleted')
ORDER BY p.proname;
```

**Live Catalog Output (Verified October 20, 2026):**
1. `public.cleanup_expired_stories(p_batch_size integer)`
   - **Ownership:** `postgres`
   - **SECURITY DEFINER:** `True`
   - **Configuration (`search_path`):** `['search_path=public, pg_catalog']`
   - **`proacl` Privileges:** `{postgres=X/postgres,service_role=X/postgres}` (`anon` & `authenticated` = REVOKED)
   - **Internal Auth Guard:** `IF COALESCE(auth.role(), '') <> 'service_role' ... RETURN forbidden`

2. `public.confirm_story_media_deleted(p_storage_paths text[])`
   - **Ownership:** `postgres`
   - **SECURITY DEFINER:** `True`
   - **Configuration (`search_path`):** `['search_path=public, pg_catalog']`
   - **`proacl` Privileges:** `{postgres=X/postgres,service_role=X/postgres}` (`anon` & `authenticated` = REVOKED)
   - **Internal Auth Guard:** `IF COALESCE(auth.role(), '') <> 'service_role' ... RETURN forbidden`
   - **Authoritative Eligibility Guard:** `WHERE storage_path = ANY(p_storage_paths) AND media_deleted_at IS NULL AND (expires_at <= NOW() OR status IN ('expired', 'deleted') OR deleted_at IS NOT NULL)`

### Application Caller Tracing Matrix
A complete scan of the EVOAIQU codebase revealed that **zero client components or frontend pages** call either RPC directly. All invocations originate from trusted server-side Next.js route handlers:

| RPC Function | Application Caller | Client Type | Authentication Context |
| :--- | :--- | :--- | :--- |
| `cleanup_expired_stories` | `src/app/api/challenges/stories/cleanup/route.ts` (line 37) | Next.js Server Handler | Scheduled cron runner with `CRON_SECRET` or authenticated admin session. Uses `createServiceRoleClient()`. |
| `confirm_story_media_deleted` | `src/app/api/challenges/stories/cleanup/route.ts` (line 66) | Next.js Server Handler | Internal cleanup worker only after Supabase Storage confirms object deletion. Uses `createServiceRoleClient()`. |
| `confirm_story_media_deleted` | `src/app/api/challenges/submission/[id]/route.ts` (line 120) | Next.js Server Handler | Creator self-deletion of dare story only after Supabase Storage confirms object deletion. Uses `adminStorage` (`createServiceRoleClient()`). |

---

## 3. Changes Designed vs. Changes Actually Deployed & Verified

### A. Database Migration: `0013_story_maintenance_rpc_security.sql`
*Deployed directly to Staging PostgreSQL 17.11 (`ciceoulihowlkugofugv`):*

1. **Role Privilege Revocation & Service-Role Restriction:**
   ```sql
   REVOKE ALL ON FUNCTION public.cleanup_expired_stories(INT) FROM PUBLIC, anon, authenticated;
   REVOKE ALL ON FUNCTION public.confirm_story_media_deleted(TEXT[]) FROM PUBLIC, anon, authenticated;

   GRANT EXECUTE ON FUNCTION public.cleanup_expired_stories(INT) TO service_role;
   GRANT EXECUTE ON FUNCTION public.confirm_story_media_deleted(TEXT[]) TO service_role;
   ```
2. **PL/pgSQL Defense-in-Depth Authorization Guard:**
   Both functions now verify caller role in SQL:
   ```sql
   IF COALESCE(auth.role(), '') <> 'service_role' AND (auth.role() IS NOT NULL OR SESSION_USER NOT LIKE 'postgres%') THEN
     RETURN jsonb_build_object(
       'ok', FALSE,
       'code', 'forbidden',
       'message', 'This maintenance function can only be executed by the authoritative server (service_role).'
     );
   END IF;
   ```
3. **Authoritative Eligibility Verification in `confirm_story_media_deleted`:**
   Prevents arbitrary or premature purging of active stories by enforcing eligibility conditions:
   ```sql
   UPDATE public.challenge_submissions
   SET media_deleted_at = NOW(),
       deleted_at = COALESCE(deleted_at, NOW()),
       updated_at = NOW()
   WHERE storage_path = ANY(p_storage_paths)
     AND media_deleted_at IS NULL
     AND (expires_at <= NOW() OR status IN ('expired', 'deleted') OR deleted_at IS NOT NULL);
   ```
4. **Safe Search Path:**
   Configured to `SET search_path = public, pg_catalog`.

### B. Application Route Updates
1. **[submission/[id]/route.ts](file:///c:/Users/HP/OneDrive/Desktop/Evoora/website/src/app/api/challenges/submission/%5Bid%5D/route.ts):** Updated line 120 to use `adminStorage` (`createServiceRoleClient()`) instead of the user client when confirming media deletion after Storage removal.
2. **[cleanup/route.ts](file:///c:/Users/HP/OneDrive/Desktop/Evoora/website/src/app/api/challenges/stories/cleanup/route.ts):** Configured to unconditionally use `createServiceRoleClient()` for both `cleanup_expired_stories` and `confirm_story_media_deleted`.

---

## 4. Adversarial & Behavioral Verification Evidence

Executed live against staging database via `scratch/test_story_maintenance_security.py` (Exit Code 0):

```text
==================================================================
STORY MAINTENANCE RPC SECURITY & ADVERSARIAL SUITE
==================================================================

[TEST 1] Testing Anonymous Calls (Simulated PostgREST anon role)...
 -> cleanup_expired_stories as anon: Correctly rejected at SQL level: permission denied for function cleanup_expired_stories
 -> confirm_story_media_deleted as anon: Correctly rejected at SQL level: permission denied for function confirm_story_media_deleted
 -> TEST 1 RESULT: PASS (All anon calls blocked at SQL level)

[TEST 2] Testing Authenticated Calls (Simulated PostgREST authenticated role)...
 -> cleanup_expired_stories as authenticated: Correctly rejected at SQL level: permission denied for function cleanup_expired_stories
 -> confirm_story_media_deleted as authenticated: Correctly rejected at SQL level: permission denied for function confirm_story_media_deleted
 -> TEST 2 RESULT: PASS (Authenticated clients strictly blocked from maintenance RPCs)

[TEST 3] Testing Arbitrary Media Deletion Prevention on Active Stories...
 -> Attempt to purge active story stories/active_4903132d.mp4: response = {'ok': True, 'purged_count': 0}
 -> Database record for active story: status=submitted, deleted_at=None, media_deleted_at=None
 -> TEST 3 RESULT: PASS (Active, unexpired stories CANNOT be purged)

[TEST 4] Testing Expired Story Cleanup and Two-Phase Deletion...
 -> cleanup_expired_stories response: {'ok': True, 'expired_paths': ['stories/expired_a8aaecfe.mp4']}
 -> Expired submission status after cleanup: status=expired, media_deleted_at=None
 -> Re-running cleanup prior to confirm (retry check): True
 -> confirm_story_media_deleted response: {'ok': True, 'purged_count': 1}
 -> Database record after confirmation: media_deleted_at=2026-10-20 05:30:54.758145+00:00, deleted_at=2026-10-20 05:30:54.758145+00:00
 -> Running cleanup after confirmation: path present? = False
 -> TEST 4 RESULT: PASS (Two-phase cleanup & retry resilience verified)

Cleaning up test fixtures...
Test fixtures cleaned up successfully.

==================================================================
ALL STORY MAINTENANCE SECURITY TESTS PASSED WITH 100% SUCCESS!
==================================================================
```

---

## 5. System-Wide Quality & Regression Verification

| Test Suite / Quality Gate | Execution Command | Result | Evidence Details |
| :--- | :--- | :--- | :--- |
| **Story Maintenance Security** | `python scratch/test_story_maintenance_security.py` | **Exit Code 0** | 4/4 scenarios passed: anon rejected, authenticated rejected, active story protection verified, two-phase retry verified. |
| **Chess RPC Security Suite** | `python scratch/test_chess_rpc_security_suite.py` | **Exit Code 0** | 6/6 scenarios passed: anon rejection, move fabrication block, outsider block, stale ply block, timeout override, FIDE 6.9 draw. |
| **Chess Gameplay Flow** | `python scratch/test_legitimate_flow.py` | **Exit Code 0** | Full match creation, service-role moves, draw negotiation, and resignation verified. |
| **Vitest Unit Test Suite** | `npm test` | **Exit Code 0** | 14 test files passed, **547 / 547 tests passed** (Duration: 1.84s). |
| **TypeScript Static Check** | `npx tsc --noEmit` | **Exit Code 0** | Zero type errors across all files. |
| **ESLint Quality Check** | `npm run lint` | **Exit Code 0** | Zero lint errors, zero warnings. |
| **Turbopack Build** | `npm run build` | **Exit Code 0** | Successfully compiled all **61 static, dynamic, and partial prerender routes**. |

---

## 6. Distinguishing Proposed vs. Deployed & Verified Changes

| Component / Artifact | Status | Actual Deployment / Verification State |
| :--- | :--- | :--- |
| **Migration `0013_story_maintenance_rpc_security.sql`** | **DEPLOYED & ACTIVE (STAGING)** | Applied to remote staging PostgreSQL instance (`ciceoulihowlkugofugv`); privileges verified via `has_function_privilege` and catalog inspection. |
| **`confirm_story_media_deleted` Hardening** | **DEPLOYED & ACTIVE (STAGING)** | Deployed with eligibility check; verified that active story paths yield `purged_count = 0`. |
| **`cleanup_expired_stories` Hardening** | **DEPLOYED & ACTIVE (STAGING)** | Deployed with `service_role` check; verified that `anon` and `authenticated` receive permission denied. |
| **Route Handler Updates** | **COMMITTED** | `submission/[id]/route.ts` and `cleanup/route.ts` updated to use `createServiceRoleClient()`. |
| **Rollback Considerations** | **PREPARED (NOT APPLIED)** | Emergency rollback script documented in migration comments; broad permissions were **NOT** regranted. |
| **Production Deployment** | **WITHHELD** | Changes applied strictly to staging. No changes applied directly to production. |
| **Production Readiness Status** | **CONDITIONAL GO** | Backend, RPC, database, and automated test gates are 100% complete. **Public production release remains gated on completing interactive two-browser manual/browser UAT.** |
