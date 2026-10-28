/**
 * EVOAIQU — Challenge Submission Route & Storage Path Validation Tests (SEC-06)
 *
 * Verifies:
 *  1. Valid upload path (JSON format with authorized user and challenge IDs).
 *  2. Another user's upload path (mismatched user ID in storage path) is rejected with HTTP 400.
 *  3. A path belonging to a different challenge is rejected with HTTP 400.
 *  4. Path traversal attempts (.., encoded traversal) are rejected with HTTP 400.
 *  5. Unexpected separators or malformed paths (backslashes, double slashes, disallowed extensions) are rejected with HTTP 400.
 *  6. Missing or invalid storage paths are rejected with HTTP 400.
 *  7. An unauthenticated request is rejected with HTTP 401.
 *  8. A valid submission following the existing multipart/form-data workflow succeeds.
 *  9. Pre-flight authorization ensures non-losers cannot submit for challenges (HTTP 403).
 *  10. isValidStoragePath pure helper validation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mocks
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn((table: string) => {
  if (table === "challenges") {
    return { select: mockSelect };
  }
  return { select: mockSelect };
});

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
  rpc: mockRpc,
};

const mockStorageUpload = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  upload: mockStorageUpload,
  remove: mockStorageRemove,
}));

const mockAdminStorage = {
  storage: {
    from: mockStorageFrom,
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
  createServiceRoleClient: vi.fn(() => mockAdminStorage),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    connection: vi.fn().mockResolvedValue(undefined),
  };
});

// Import route and helper after mocks
import { POST, isValidStoragePath } from "@/app/api/challenges/submit/route";

describe("Challenge Submission Storage Path Validation (SEC-06)", () => {
  const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
  const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
  const CHALLENGE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const OTHER_CHALLENGE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const TIMESTAMP = "1710000000000";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: Authenticated as AUTH_USER_ID
    mockGetUser.mockResolvedValue({
      data: { user: { id: AUTH_USER_ID, email: "loser@test.com" } },
      error: null,
    });

    // Default: Challenge exists, assigned to AUTH_USER_ID, status is 'accepted'
    mockSingle.mockResolvedValue({
      data: { id: CHALLENGE_ID, loser_id: AUTH_USER_ID, status: "accepted" },
      error: null,
    });

    // Default: RPC succeeds
    mockRpc.mockResolvedValue({
      data: {
        ok: true,
        code: "submitted",
        submission_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        visibility: "private",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    });

    // Default: Storage upload succeeds
    mockStorageUpload.mockResolvedValue({
      data: { path: `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm` },
      error: null,
    });
  });

  // ── Helper Unit Tests ────────────────────────────────────────────────────────
  describe("isValidStoragePath unit verification", () => {
    it("accepts valid standard and simulated storage paths", () => {
      expect(
        isValidStoragePath(`${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(true);
      expect(
        isValidStoragePath(`simulated/${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.mp4`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(true);
      expect(
        isValidStoragePath(`${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.mov`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(true);
      expect(
        isValidStoragePath(`${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.ogg`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(true);
    });

    it("rejects path when user ID does not match expected user", () => {
      expect(
        isValidStoragePath(`${CHALLENGE_ID}/${OTHER_USER_ID}_${TIMESTAMP}.webm`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
    });

    it("rejects path when challenge ID does not match expected challenge", () => {
      expect(
        isValidStoragePath(`${OTHER_CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
    });

    it("rejects directory traversal attempts", () => {
      expect(
        isValidStoragePath(`../${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
      expect(
        isValidStoragePath(`${CHALLENGE_ID}/../${AUTH_USER_ID}_${TIMESTAMP}.webm`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
      expect(
        isValidStoragePath(`../../etc/passwd`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
    });

    it("rejects unexpected separators, URL encodings, and invalid extensions", () => {
      expect(
        isValidStoragePath(`${CHALLENGE_ID}\\${AUTH_USER_ID}_${TIMESTAMP}.webm`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
      expect(
        isValidStoragePath(`${CHALLENGE_ID}//${AUTH_USER_ID}_${TIMESTAMP}.webm`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
      expect(
        isValidStoragePath(`/${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
      expect(
        isValidStoragePath(`%2e%2e%2f${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
      expect(
        isValidStoragePath(`${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.exe`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
      expect(
        isValidStoragePath(`${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm.exe`, CHALLENGE_ID, AUTH_USER_ID)
      ).toBe(false);
    });
  });

  // ── Scenario 1: Valid upload path (JSON) ───────────────────────────────────
  it("1. accepts a valid upload path belonging to the authenticated user and authorized challenge", async () => {
    const validPath = `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`;

    const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: CHALLENGE_ID,
        storage_path: validPath,
        visibility: "private",
        duration_seconds: 10,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.submission_id).toBeDefined();

    // Authoritative RPC was called with verified path
    expect(mockRpc).toHaveBeenCalledWith("submit_challenge_video", {
      p_challenge_id: CHALLENGE_ID,
      p_storage_path: validPath,
      p_visibility: "private",
      p_duration_seconds: 10,
      p_media_type: "video/webm",
    });
  });

  it("1b. accepts a valid simulated upload path in test/local mode", async () => {
    const validSimulatedPath = `simulated/${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.mp4`;

    const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: CHALLENGE_ID,
        storage_path: validSimulatedPath,
        visibility: "public",
        duration_seconds: 15,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockRpc).toHaveBeenCalledWith("submit_challenge_video", {
      p_challenge_id: CHALLENGE_ID,
      p_storage_path: validSimulatedPath,
      p_visibility: "public",
      p_duration_seconds: 15,
      p_media_type: "video/webm",
    });
  });

  // ── Scenario 2: Another user's upload path ─────────────────────────────────
  it("2. rejects another user's upload path with HTTP 400 without invoking RPC", async () => {
    const victimPath = `${CHALLENGE_ID}/${OTHER_USER_ID}_${TIMESTAMP}.webm`;

    const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: CHALLENGE_ID,
        storage_path: victimPath,
        visibility: "private",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe("invalid_storage_path");
    expect(body.error).toBe("Invalid storage path.");

    // Must NEVER execute database submission or storage deletions
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  // ── Scenario 3: A path belonging to a different challenge ──────────────────
  it("3. rejects a path belonging to a different challenge with HTTP 400", async () => {
    const crossChallengePath = `${OTHER_CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`;

    const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: CHALLENGE_ID,
        storage_path: crossChallengePath,
        visibility: "private",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe("invalid_storage_path");
    expect(body.error).toBe("Invalid storage path.");

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  // ── Scenario 4: Path traversal attempts ────────────────────────────────────
  it("4. rejects path traversal attempts with HTTP 400", async () => {
    const traversalPaths = [
      `../${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`,
      `${CHALLENGE_ID}/../${AUTH_USER_ID}_${TIMESTAMP}.webm`,
      `../../etc/passwd`,
      `..\\..\\passwords.txt`,
      `simulated/../../${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`,
      `%2e%2e%2f${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`,
    ];

    for (const badPath of traversalPaths) {
      const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challenge_id: CHALLENGE_ID,
          storage_path: badPath,
          visibility: "private",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe("invalid_storage_path");
      expect(mockRpc).not.toHaveBeenCalled();
    }
  });

  // ── Scenario 5: Unexpected separators or malformed paths ───────────────────
  it("5. rejects unexpected separators and malformed filenames with HTTP 400", async () => {
    const malformedPaths = [
      `${CHALLENGE_ID}\\${AUTH_USER_ID}_${TIMESTAMP}.webm`, // backslash
      `${CHALLENGE_ID}//${AUTH_USER_ID}_${TIMESTAMP}.webm`, // double slash
      `/${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`, // leading slash
      `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm/`, // trailing slash
      `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.exe`,   // disallowed extension
      `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.sh`,    // executable
      `${CHALLENGE_ID}/${AUTH_USER_ID}_notanumber.webm`,    // non-numeric timestamp
      `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm\0injected`, // null byte
      `simulated//${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`,
    ];

    for (const badPath of malformedPaths) {
      const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challenge_id: CHALLENGE_ID,
          storage_path: badPath,
          visibility: "private",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe("invalid_storage_path");
      expect(mockRpc).not.toHaveBeenCalled();
    }
  });

  // ── Scenario 6: Missing or invalid storage paths ───────────────────────────
  it("6. rejects missing, empty, or non-string storage paths with HTTP 400", async () => {
    const invalidPayloads = [
      { challenge_id: CHALLENGE_ID, storage_path: "" },
      { challenge_id: CHALLENGE_ID, storage_path: "   " },
      { challenge_id: CHALLENGE_ID, storage_path: null },
      { challenge_id: CHALLENGE_ID }, // missing storage_path
      { challenge_id: CHALLENGE_ID, storage_path: "random-non-uuid-path" },
    ];

    for (const payload of invalidPayloads) {
      const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe("invalid_storage_path");
      expect(mockRpc).not.toHaveBeenCalled();
    }
  });

  // ── Scenario 7: Unauthenticated request ────────────────────────────────────
  it("7. rejects unauthenticated requests with HTTP 401", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("No active session"),
    });

    const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: CHALLENGE_ID,
        storage_path: `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.code).toBe("unauthenticated");
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  // ── Scenario 8: Valid submission following multipart existing workflow ────
  it("8. accepts a valid multipart video submission following the existing workflow", async () => {
    const formData = new FormData();
    formData.append("challenge_id", CHALLENGE_ID);
    formData.append("visibility", "public");
    formData.append("duration_seconds", "12");
    const videoFile = new File([Buffer.from("dummy-video-data")], "challenge.webm", {
      type: "video/webm",
    });
    formData.append("video", videoFile);

    const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.submission_id).toBeDefined();

    // Storage upload was called with a server-derived path for AUTH_USER_ID and CHALLENGE_ID
    expect(mockStorageUpload).toHaveBeenCalled();
    const uploadedPath = mockStorageUpload.mock.calls[0][0];
    expect(uploadedPath).toMatch(new RegExp(`^${CHALLENGE_ID}/${AUTH_USER_ID}_\\d+\\.webm$`));

    // RPC was invoked with that path
    expect(mockRpc).toHaveBeenCalledWith("submit_challenge_video", {
      p_challenge_id: CHALLENGE_ID,
      p_storage_path: uploadedPath,
      p_visibility: "public",
      p_duration_seconds: 12,
      p_media_type: "video/webm",
    });
  });

  // ── Scenario 9: Pre-flight authorization enforcement ───────────────────────
  it("9. rejects submission when caller is not the assigned challenge recipient (HTTP 403)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: CHALLENGE_ID, loser_id: OTHER_USER_ID, status: "accepted" },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: CHALLENGE_ID,
        storage_path: `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`,
        visibility: "private",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.code).toBe("forbidden");
    expect(body.error).toBe("Only the assigned recipient can submit this challenge.");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("10. rejects submission when challenge is not found (HTTP 404)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "Row not found" },
    });

    const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: CHALLENGE_ID,
        storage_path: `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`,
        visibility: "private",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.code).toBe("not_found");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("11. rejects submission when challenge status is invalid (HTTP 409)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: CHALLENGE_ID, loser_id: AUTH_USER_ID, status: "completed" },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/challenges/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: CHALLENGE_ID,
        storage_path: `${CHALLENGE_ID}/${AUTH_USER_ID}_${TIMESTAMP}.webm`,
        visibility: "private",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.code).toBe("invalid_status");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
