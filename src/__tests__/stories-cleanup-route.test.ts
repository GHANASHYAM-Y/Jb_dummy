/**
 * EVOAIQU — Challenge Story Maintenance Cleanup Authorization Tests (SEC-01)
 *
 * Verifies:
 *  1. Missing CRON_SECRET: Fails closed with HTTP 500 (server misconfiguration).
 *  2. Empty / whitespace CRON_SECRET: Fails closed with HTTP 500.
 *  3. Missing Authorization header: Rejects with HTTP 401.
 *  4. Invalid Bearer token: Rejects with HTTP 401.
 *  5. Valid Bearer token: Executes two-phase cleanup successfully.
 *  6. Authenticated user session cookies without the cron secret: Rejects with HTTP 401.
 *  7. Privileged operations (service-role client, RPCs, storage deletions) are NEVER invoked on rejected requests.
 *  8. Vercel Cron GET method behaves identically to POST.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mocks for privileged database and storage operations
const mockRpc = vi.fn();
const mockRemove = vi.fn();
const mockFrom = vi.fn(() => ({
  remove: mockRemove,
}));
const mockCreateServiceRoleClient = vi.fn(() => ({
  rpc: mockRpc,
  storage: {
    from: mockFrom,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    connection: vi.fn().mockResolvedValue(undefined),
  };
});

// Import route handlers after mocks
import { POST, GET } from "@/app/api/challenges/stories/cleanup/route";

describe("Story Maintenance Cleanup Authorization & Fail-Closed Enforcement (SEC-01)", () => {
  const originalEnv = process.env;
  const TEST_SECRET = "test-cron-secret-launch-readiness-xyz";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("1. fails closed with HTTP 500 when CRON_SECRET is completely missing/unset", async () => {
    delete process.env.CRON_SECRET;

    const req = new Request("http://localhost:3000/api/challenges/stories/cleanup", {
      method: "POST",
      headers: {
        authorization: `Bearer ${TEST_SECRET}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.code).toBe("server_misconfiguration");
    expect(body.error).toBe("Server misconfiguration.");
    expect(JSON.stringify(body)).not.toContain(TEST_SECRET);

    // Privileged cleanup must NOT be invoked
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("2. fails closed with HTTP 500 when CRON_SECRET is an empty string or whitespace", async () => {
    process.env.CRON_SECRET = "   ";

    const req = new Request("http://localhost:3000/api/challenges/stories/cleanup", {
      method: "POST",
      headers: {
        authorization: "Bearer    ",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.code).toBe("server_misconfiguration");

    // Privileged operations must NOT be invoked
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("3. rejects with HTTP 401 when Authorization header is missing", async () => {
    process.env.CRON_SECRET = TEST_SECRET;

    const req = new Request("http://localhost:3000/api/challenges/stories/cleanup", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.code).toBe("unauthorized");
    expect(body.error).toBe("Unauthorized.");

    // Privileged operations must NOT be invoked
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("4. rejects with HTTP 401 when Bearer token is invalid or malformed", async () => {
    process.env.CRON_SECRET = TEST_SECRET;

    const invalidHeaders = [
      "Bearer wrong-secret-token",
      `Bearer ${TEST_SECRET}_tampered`,
      `Basic ${TEST_SECRET}`,
      TEST_SECRET,
      "",
    ];

    for (const authHeader of invalidHeaders) {
      const req = new Request("http://localhost:3000/api/challenges/stories/cleanup", {
        method: "POST",
        headers: {
          authorization: authHeader,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.code).toBe("unauthorized");

      // Verify no privileged leaks
      expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    }
  });

  it("5. rejects authenticated application user sessions that lack the valid cron secret", async () => {
    process.env.CRON_SECRET = TEST_SECRET;

    // Simulate an authenticated user calling the endpoint with session cookies
    const req = new Request("http://localhost:3000/api/challenges/stories/cleanup", {
      method: "POST",
      headers: {
        cookie: "sb-access-token=valid-user-jwt; sb-refresh-token=valid-refresh",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.code).toBe("unauthorized");

    // User session is NEVER accepted as a substitute
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("6. executes authorized two-phase cleanup when valid Bearer token is supplied", async () => {
    process.env.CRON_SECRET = TEST_SECRET;

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === "cleanup_expired_stories") {
        return Promise.resolve({
          data: {
            ok: true,
            expired_paths: ["challenge_1/user_a_video.mp4", "challenge_2/user_b_video.mp4"],
          },
          error: null,
        });
      }
      if (fnName === "confirm_story_media_deleted") {
        return Promise.resolve({
          data: { ok: true, purged_count: 2 },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: new Error(`Unknown RPC: ${fnName}`) });
    });

    mockRemove.mockResolvedValueOnce({
      data: [{ name: "challenge_1/user_a_video.mp4" }, { name: "challenge_2/user_b_video.mp4" }],
      error: null,
    });

    const req = new Request("http://localhost:3000/api/challenges/stories/cleanup", {
      method: "POST",
      headers: {
        authorization: `Bearer ${TEST_SECRET}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.cleaned_records).toBe(2);
    expect(body.deleted_files).toBe(2);

    // Privileged operations were invoked with correct parameters
    expect(mockCreateServiceRoleClient).toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith("cleanup_expired_stories");
    expect(mockFrom).toHaveBeenCalledWith("challenge-stories");
    expect(mockRemove).toHaveBeenCalledWith([
      "challenge_1/user_a_video.mp4",
      "challenge_2/user_b_video.mp4",
    ]);
    expect(mockRpc).toHaveBeenCalledWith("confirm_story_media_deleted", {
      p_storage_paths: ["challenge_1/user_a_video.mp4", "challenge_2/user_b_video.mp4"],
    });

    // CRON_SECRET must never appear in response
    expect(JSON.stringify(body)).not.toContain(TEST_SECRET);
  });

  it("7. supports Vercel Cron via HTTP GET with identical authorization semantics", async () => {
    process.env.CRON_SECRET = TEST_SECRET;

    mockRpc.mockResolvedValueOnce({
      data: { ok: true, expired_paths: [] },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/challenges/stories/cleanup", {
      method: "GET",
      headers: {
        authorization: `Bearer ${TEST_SECRET}`,
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.cleaned_records).toBe(0);
    expect(body.deleted_files).toBe(0);
  });
});
