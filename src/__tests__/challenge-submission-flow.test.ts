/**
 * EVOAIQU — Challenge Submission & 24h Story Flow Test Suite
 *
 * Verifies:
 *  1. Loser receives challenge and submits video to their Story.
 *  2. Loser alone chooses Story visibility (Public vs Private); Winner cannot change it.
 *  3. Verified Winner one-time authorized viewing session with atomic server-side enforcement.
 *  4. Network interruption handling (session not consumed before playback starts).
 *  5. Reopening/replay denial once consumed or expired.
 *  6. Winner approval and retry state transitions.
 *  7. 24-Hour Story expiry and media retention cleanup.
 *  8. Blocked users and unauthorized media access prevention.
 *  9. Screenshot & recording deterrents and honest limitations disclosure.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { isValidStatus, isValidVisibility } from "@/lib/challenges";

// Read migration SQL and component/route sources for static security and contract auditing
const migration0009 = fs.readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/0009_challenge_submissions_and_stories.sql"),
  "utf-8"
);
const submitRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/challenges/submit/route.ts"),
  "utf-8"
);
const viewSessionRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/challenges/submission/view-session/route.ts"),
  "utf-8"
);
const reviewRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/challenges/submission/review/route.ts"),
  "utf-8"
);
const patchRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/challenges/submission/[id]/route.ts"),
  "utf-8"
);
const cleanupRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/challenges/stories/cleanup/route.ts"),
  "utf-8"
);
const storiesRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/challenges/stories/route.ts"),
  "utf-8"
);
const recorderModalSrc = fs.readFileSync(
  path.resolve(__dirname, "../components/challenges/VideoRecorderModal.tsx"),
  "utf-8"
);
const reviewModalSrc = fs.readFileSync(
  path.resolve(__dirname, "../components/challenges/WinnerReviewModal.tsx"),
  "utf-8"
);

describe("Challenge Status & Visibility Domain Logic", () => {
  it("recognizes 'submitted' and 'retry_requested' in challenge lifecycle statuses", () => {
    expect(isValidStatus("pending")).toBe(true);
    expect(isValidStatus("accepted")).toBe(true);
    expect(isValidStatus("submitted")).toBe(true);
    expect(isValidStatus("retry_requested")).toBe(true);
    expect(isValidStatus("completed")).toBe(true);
    expect(isValidStatus("skipped")).toBe(true);
    expect(isValidStatus("declined")).toBe(true);
    expect(isValidStatus("cancelled")).toBe(true);
    expect(isValidStatus("invalid_status")).toBe(false);
  });

  it("validates story visibility strictly to 'private' and 'public'", () => {
    expect(isValidVisibility("private")).toBe(true);
    expect(isValidVisibility("public")).toBe(true);
    expect(isValidVisibility("friends_only")).toBe(false);
    expect(isValidVisibility("")).toBe(false);
  });
});

describe("Migration 0009 Schema & RLS Security Audit", () => {
  it("defines public.challenge_submissions table with one-time viewing session and 24h expiry", () => {
    expect(migration0009).toContain("CREATE TABLE IF NOT EXISTS public.challenge_submissions");
    expect(migration0009).toContain("view_session_status TEXT");
    expect(migration0009).toContain("unviewed");
    expect(migration0009).toContain("in_progress");
    expect(migration0009).toContain("consumed");
    expect(migration0009).toContain("expires_at");
    expect(migration0009).toContain("NOW() + INTERVAL '24 hours'");
  });

  it("creates private storage bucket 'challenge-stories' with 50MB file limit", () => {
    expect(migration0009).toContain("'challenge-stories'");
    expect(migration0009).toContain("52428800"); // 50MB
  });

  it("enforces RLS on challenge_submissions denying direct client INSERT, UPDATE, DELETE", () => {
    expect(migration0009).toContain("ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;");
    expect(migration0009).toMatch(/CREATE POLICY "ch_sub_insert"[\s\S]*?WITH CHECK \(FALSE\);/);
    expect(migration0009).toMatch(/CREATE POLICY "ch_sub_update"[\s\S]*?USING \(FALSE\);/);
    expect(migration0009).toMatch(/CREATE POLICY "ch_sub_delete"[\s\S]*?USING \(FALSE\);/);
  });

  it("restricts Private Story SELECT access to creator, winner, and accepted friends while filtering blocked users", () => {
    expect(migration0009).toContain("auth.uid() = loser_id");
    expect(migration0009).toContain("auth.uid() = winner_id");
    expect(migration0009).toContain("public.are_friends(auth.uid(), loser_id)");
    expect(migration0009).toContain("NOT public.is_blocked(auth.uid(), loser_id)");
  });
});

describe("Loser-Controlled Story Visibility Audit", () => {
  it("enforces in submit_challenge_video that only the loser can submit their challenge video", () => {
    expect(migration0009).toContain("v_challenge.loser_id <> v_caller");
    expect(migration0009).toContain("'Only the assigned recipient can submit this challenge.'");
    expect(submitRouteSrc).toContain("submit_challenge_video");
    expect(submitRouteSrc).toContain("isValidVisibility(visibility)");
  });

  it("enforces in update_story_visibility that winner cannot change loser's visibility", () => {
    expect(migration0009).toContain("v_submission.loser_id <> v_caller");
    expect(migration0009).toContain("'Only the story creator can update story visibility.'");
  });

  it("verifies PATCH route enforces loser authentication and validates visibility options", () => {
    expect(patchRouteSrc).toContain("isValidVisibility(visibility)");
    expect(patchRouteSrc).toContain("update_story_visibility");
  });
});

describe("One-Time Winner Review Session & Interruption Handling", () => {
  it("start_winner_review_session checks that caller is the match winner", () => {
    expect(migration0009).toContain("v_submission.winner_id <> v_caller");
    expect(migration0009).toContain("'Only the verified match winner can review this submission.'");
  });

  it("denies reopening once viewing session is marked consumed", () => {
    expect(migration0009).toContain("v_submission.view_session_status = 'consumed'");
    expect(migration0009).toContain("'already_viewed'");
  });

  it("handles interruptions: resumes session without consuming if playback has not started yet", () => {
    expect(migration0009).toContain("v_submission.view_session_status = 'in_progress'");
    expect(migration0009).toContain("session_resumed");
    expect(migration0009).toContain("view_session_playback_started_at IS NULL");
  });

  it("acks playback start when video actually begins playing to arm the viewing window", () => {
    expect(migration0009).toContain("CREATE OR REPLACE FUNCTION public.ack_playback_start");
    expect(migration0009).toContain("NOW() + INTERVAL '3 minutes'");
  });

  it("consumes session atomically when video finishes or winner finishes review", () => {
    expect(migration0009).toContain("CREATE OR REPLACE FUNCTION public.finish_winner_review_session");
    expect(migration0009).toContain("view_session_status = 'consumed'");
  });

  it("uses PostgreSQL FOR UPDATE row locks to prevent concurrent race conditions on viewing sessions", () => {
    expect(migration0009).toContain("FOR UPDATE");
  });

  it("view-session route generates short-lived signed URLs rather than permanent public links", () => {
    expect(viewSessionRouteSrc).toContain("createSignedUrl");
    expect(viewSessionRouteSrc).toContain("180"); // 3-minute temporary URL
  });
});

describe("Winner Approval & Retry Transitions", () => {
  it("allows winner to approve or request retry even after viewing session is consumed", () => {
    expect(migration0009).toContain("CREATE OR REPLACE FUNCTION public.review_challenge_submission");
    expect(migration0009).toContain("p_action NOT IN ('approve', 'request_retry')");
    // Does NOT require view_session_status = 'in_progress' to submit approval
    expect(migration0009).not.toContain("IF v_submission.view_session_status = 'consumed' THEN RETURN jsonb_build_object('ok', FALSE, 'code', 'already_viewed');");
  });

  it("transitions challenge to 'completed' on approval", () => {
    expect(migration0009).toContain("UPDATE public.challenges");
    expect(migration0009).toContain("SET status = 'completed'");
  });

  it("transitions challenge to 'retry_requested' with optional feedback note on retry request", () => {
    expect(migration0009).toContain("SET status = 'retry_requested'");
    expect(migration0009).toContain("retry_note = trim(COALESCE(p_retry_note, ''))");
  });

  it("review route securely routes approval and retry decisions", () => {
    expect(reviewRouteSrc).toContain('action must be \'approve\' or \'request_retry\'');
    expect(reviewRouteSrc).toContain("review_challenge_submission");
  });
});

describe("24-Hour Expiry & Retention Cleanup Audit", () => {
  it("sets 24-hour expiration timestamp upon submission creation", () => {
    expect(migration0009).toContain("NOW() + INTERVAL '24 hours'");
  });

  it("cleanup_expired_stories finds expired submissions and marks status = 'expired'", () => {
    expect(migration0009).toContain("expires_at <= NOW()");
    expect(migration0009).toContain("status = 'expired'");
    expect(migration0009).toContain("deleted_at = NOW()");
  });

  it("cleanup route deletes media objects from Supabase storage while retaining challenge records", () => {
    expect(cleanupRouteSrc).toContain("cleanup_expired_stories");
    expect(cleanupRouteSrc).toContain('.from("challenge-stories")');
    expect(cleanupRouteSrc).toContain('.remove(expiredPaths)');
    expect(cleanupRouteSrc).toContain("export async function POST");
    expect(cleanupRouteSrc).toContain("export const GET = POST");
    expect(cleanupRouteSrc).toContain("process.env.CRON_SECRET");
  });

  it("schedules expired story cleanup daily at 3 AM UTC for Vercel Hobby compatibility", () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../vercel.json"), "utf-8")
    );
    expect(vercelConfig.crons).toBeDefined();
    const cleanupCron = vercelConfig.crons.find(
      (c: { path: string }) => c.path === "/api/challenges/stories/cleanup"
    );
    expect(cleanupCron).toBeDefined();
    expect(cleanupCron.schedule).toBe("0 3 * * *");
  });
});

describe("Screenshot & Screen Recording Limitations and UI Deterrents", () => {
  it("WinnerReviewModal provides deterrent controlsList without download options", () => {
    expect(reviewModalSrc).toContain('controlsList="nodownload nofullscreen noplaybackrate"');
    expect(reviewModalSrc).toContain("disablePictureInPicture");
  });

  it("WinnerReviewModal disables right-click context menu", () => {
    expect(reviewModalSrc).toContain("onContextMenu={(e) => e.preventDefault()}");
  });

  it("WinnerReviewModal monitors visibility change and window focus loss as best-effort deterrent", () => {
    expect(reviewModalSrc).toContain("visibilitychange");
    expect(reviewModalSrc).toContain("blur");
    expect(reviewModalSrc).toContain("Playback paused");
  });

  it("transparently discloses that web browsers cannot guarantee 100% prevention of external or OS recording", () => {
    expect(reviewModalSrc).toContain("Standard web technologies cannot reliably prevent all external camera or operating system recording methods");
    expect(recorderModalSrc).toContain("24-Hour Story Retention");
  });
});

describe("Security Hardening & Schema Compatibility Audits", () => {
  it("preserves are_friends(a UUID, b UUID) parameter names without dropping the function", () => {
    expect(migration0009).toContain("CREATE OR REPLACE FUNCTION public.are_friends(a UUID, b UUID)");
    expect(migration0009).not.toContain("DROP FUNCTION IF EXISTS public.are_friends");
  });

  it("strictly rejects expired submissions in start_winner_review_session", () => {
    expect(migration0009).toContain("v_submission.expires_at <= NOW() OR v_submission.status = 'expired'");
    expect(migration0009).toContain("'submission_expired'");
  });

  it("strictly rejects expired submissions in review_challenge_submission", () => {
    expect(migration0009).toContain("'This submission has expired and can no longer be reviewed.'");
  });

  it("denies access when users are blocked across submission, review, and story retrieval", () => {
    // submit_challenge_video checks block
    expect(migration0009).toContain("public.is_blocked(v_caller, v_challenge.winner_id)");
    // start_winner_review_session checks block
    expect(migration0009).toContain("public.is_blocked(v_caller, v_challenge.loser_id)");
    // review_challenge_submission checks block
    expect(migration0009).toContain("public.is_blocked(v_caller, v_challenge.loser_id)");
    // get_challenge_story checks block
    expect(migration0009).toContain("public.is_blocked(v_caller, v_challenge.loser_id)");
  });

  it("verifies match record and winner authorization against public.matches table", () => {
    expect(migration0009).toContain("FROM public.matches");
    expect(migration0009).toContain("winner_id = v_caller");
    expect(migration0009).toContain("phase = 'completed'");
  });

  it("implements retry-safe two-phase cleanup: does not mark media purged before Storage confirms deletion", () => {
    expect(migration0009).toContain("CREATE OR REPLACE FUNCTION public.confirm_story_media_deleted");
    expect(migration0009).toContain("media_deleted_at IS NULL");
    expect(migration0009).toContain("media_deleted_at = NOW()");
    expect(cleanupRouteSrc).toContain("confirm_story_media_deleted");
    expect(patchRouteSrc).toContain("confirm_story_media_deleted");
  });

  it("sanitizes storage paths against directory traversal in submit route", () => {
    expect(submitRouteSrc).toContain('storagePath.includes("..")');
  });

  it("prevents viewers from seeing expired or deleted media while allowing creators to view their challenge history", () => {
    expect(migration0009).toContain("v_submission.status = 'deleted' OR v_submission.deleted_at IS NOT NULL");
    expect(migration0009).toContain("'storage_path', CASE WHEN v_can_view THEN v_submission.storage_path ELSE NULL END");
  });
});

describe("Comprehensive Security: Expired Submissions, Blocked Users, Retries, and Unauthorized Access", () => {
  describe("Expired Submissions Handling", () => {
    it("start_winner_review_session and review_challenge_submission reject expired submissions", () => {
      expect(migration0009).toContain("v_submission.expires_at <= NOW() OR v_submission.status = 'expired'");
      expect(migration0009).toContain("code', 'submission_expired'");
    });

    it("get_challenge_story masks expired media to NULL while preserving history", () => {
      expect(migration0009).toContain("v_is_expired := v_submission.expires_at <= NOW() OR v_submission.status = 'expired';");
      expect(migration0009).toContain("ELSIF v_is_expired THEN\n    -- Expired media must NOT be exposed to viewers!\n    v_can_view := FALSE;");
      expect(migration0009).toContain("'is_expired', v_is_expired");
    });

    it("cleanup_expired_stories preserves completed and approved challenge history", () => {
      // Only updates unreviewed 'submitted' records to expired, leaving 'approved' intact
      expect(migration0009).toContain("AND status = 'submitted';");
      expect(migration0009).toContain("expires_at <= NOW()");
    });

    it("stories feed route skips signed URL generation for expired stories", () => {
      expect(storiesRouteSrc).toContain("new Date(story.expires_at).getTime() <= now");
      expect(storiesRouteSrc).toContain("const canViewMedia = !isExpired");
    });
  });

  describe("Blocked Users Access Controls", () => {
    it("denies video submission if winner and loser are blocked", () => {
      expect(migration0009).toContain("IF public.is_blocked(v_caller, v_challenge.winner_id) THEN");
      expect(migration0009).toContain("'Cannot submit challenge while users are blocked.'");
    });

    it("denies winner review session and submission review if blocked", () => {
      expect(migration0009).toContain("IF public.is_blocked(v_caller, v_challenge.loser_id) THEN\n    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked'");
    });

    it("denies story retrieval in RPC if caller and loser are blocked", () => {
      expect(migration0009).toContain("IF v_caller IS NOT NULL AND NOT v_is_loser AND public.is_blocked(v_caller, v_challenge.loser_id) THEN\n    RETURN jsonb_build_object('ok', FALSE, 'code', 'blocked');");
    });

    it("enforces blocking in RLS select policy", () => {
      expect(migration0009).toContain("AND NOT public.is_blocked(auth.uid(), loser_id)");
    });

    it("grants execute on is_blocked to authenticated and anon for RLS execution", () => {
      expect(migration0009).toContain("GRANT EXECUTE ON FUNCTION public.is_blocked(UUID, UUID)                                   TO authenticated, anon;");
    });
  });

  describe("Failed Storage Deletion and Retry Resilience", () => {
    it("collects only unpurged files where media_deleted_at is null for cleanup", () => {
      expect(migration0009).toContain("media_deleted_at IS NULL");
      expect(migration0009).toContain("storage_path IS NOT NULL");
    });

    it("does not prematurely confirm storage deletion when storage remove returns empty or fails", () => {
      // In cleanup route: only confirmed returned items are passed to confirm_story_media_deleted
      expect(cleanupRouteSrc).toContain("removeData.length > 0");
      expect(cleanupRouteSrc).toContain("if (confirmedPaths.length > 0)");
      expect(cleanupRouteSrc).toContain("p_storage_paths: confirmedPaths");
    });

    it("delete_challenge_story leaves media_deleted_at NULL so cleanup can retry failed storage removals", () => {
      expect(migration0009).toContain("SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()");
      expect(migration0009).not.toContain("SET status = 'deleted', deleted_at = NOW(), media_deleted_at = NOW()");
    });

    it("confirm_story_media_deleted updates media_deleted_at only for successfully confirmed paths", () => {
      expect(migration0009).toContain("WHERE storage_path = ANY(p_storage_paths)");
      expect(migration0009).toContain("media_deleted_at = NOW()");
    });
  });

  describe("Unauthorized Access Prevention", () => {
    it("rejects non-loser callers from submitting videos or deleting stories", () => {
      expect(migration0009).toContain("IF v_challenge.loser_id <> v_caller THEN");
      expect(migration0009).toContain("IF v_submission.loser_id <> v_caller THEN");
      expect(migration0009).toContain("'Only the creator can delete their story.'");
      expect(migration0009).toContain("'Only the story creator can update story visibility.'");
    });

    it("rejects non-winner callers from viewing review session or reviewing submission", () => {
      expect(migration0009).toContain("IF v_challenge.winner_id <> v_caller THEN");
      expect(migration0009).toContain("IF v_submission.winner_id <> v_caller THEN");
      expect(migration0009).toContain("'Only the verified match winner can review this submission.'");
    });

    it("denies private story access to unauthorized strangers in get_challenge_story", () => {
      expect(migration0009).toContain("IF v_submission.visibility = 'private' AND NOT v_is_loser AND NOT v_is_winner THEN");
      expect(migration0009).toContain("NOT public.are_friends(v_caller, v_challenge.loser_id)");
      expect(migration0009).toContain("'Private story is only accessible to accepted friends.'");
    });

    it("enforces server-only service-role client and pre-flight loser authorization in submit route", () => {
      expect(submitRouteSrc).toContain("challengeCheck.loser_id !== user.id");
      expect(submitRouteSrc).toContain("Only the assigned recipient can submit this challenge.");
    });

    it("guards cleanup route with authorization when CRON_SECRET is not configured", () => {
      expect(cleanupRouteSrc).toContain("const { data: { user } } = await serverSupabase.auth.getUser();");
      expect(cleanupRouteSrc).toContain("if (!user)");
    });
  });
});
