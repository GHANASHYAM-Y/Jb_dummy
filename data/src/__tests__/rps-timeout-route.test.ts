/**
 * EVOAIQU — RPS Round Timeout Adjudication Route Tests (SEC-02)
 *
 * Verifies:
 *  1. Unauthenticated request: Rejects with HTTP 401.
 *  2. Invalid match_id format: Rejects with HTTP 400.
 *  3. RPC failure / error: Fails closed with HTTP 500 (rpc_error); no fallback executed.
 *  4. Unauthorized caller (forbidden): Rejects with HTTP 403.
 *  5. Match not found: Rejects with HTTP 404.
 *  6. Non-expired deadline (deadline_not_reached): Rejects with HTTP 400 and seconds_remaining.
 *  7. Inactive match (match_not_active): Returns HTTP 200 with code match_not_active.
 *  8. Successful timeout resolution: Authoritatively returns round outcome and scores.
 *  9. Idempotent resolution (already_resolved): Returns HTTP 200.
 *  10. Supports match_id in JSON body and URL search parameters.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockRpc = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  rpc: mockRpc,
};

vi.mock("@/core/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    connection: vi.fn().mockResolvedValue(undefined),
  };
});

// Import route handler after mocks
import { POST } from "@/app/api/rps/timeout/route";

describe("RPS Timeout Route Authoritative Adjudication (SEC-02)", () => {
  const VALID_MATCH_ID = "00000000-0000-4000-8000-000000000001";
  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: "player@test.com" } },
      error: null,
    });
  });

  it("1. rejects unauthenticated callers with HTTP 401", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("No session"),
    });

    const req = new NextRequest("http://localhost:3000/api/rps/timeout", {
      method: "POST",
      body: JSON.stringify({ match_id: VALID_MATCH_ID }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.code).toBe("unauthenticated");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("2. rejects invalid or malformed match_id with HTTP 400", async () => {
    const invalidIds = ["invalid-uuid", "123", "", "0000-not-uuid"];

    for (const matchId of invalidIds) {
      const req = new NextRequest("http://localhost:3000/api/rps/timeout", {
        method: "POST",
        body: JSON.stringify({ match_id: matchId }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe("invalid_id");
      expect(mockRpc).not.toHaveBeenCalled();
    }
  });

  it("3. fails closed with HTTP 500 when resolve_rps_timeout RPC fails, executing NO insecure fallback", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Database connection lost or statement timeout" },
    });

    const req = new NextRequest("http://localhost:3000/api/rps/timeout", {
      method: "POST",
      body: JSON.stringify({ match_id: VALID_MATCH_ID }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.code).toBe("rpc_error");
    expect(body.error).toBe("Internal server error.");

    // Verified: The authoritative RPC was called, and when it errored, NO client-side queries or fallbacks ran
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("resolve_rps_timeout", { p_match_id: VALID_MATCH_ID });
  });

  it("4. returns HTTP 403 when caller is not an authorized participant in the match", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { ok: false, code: "forbidden" },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/rps/timeout", {
      method: "POST",
      body: JSON.stringify({ match_id: VALID_MATCH_ID }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.code).toBe("forbidden");
    expect(body.error).toBe("Forbidden");
  });

  it("5. returns HTTP 404 when match is not found", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { ok: false, code: "not_found" },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/rps/timeout", {
      method: "POST",
      body: JSON.stringify({ match_id: VALID_MATCH_ID }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.code).toBe("not_found");
    expect(body.error).toBe("Match not found");
  });

  it("6. rejects premature timeout resolution with HTTP 400 when round deadline has not expired", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: false,
        code: "deadline_not_reached",
        message: "Round deadline has not expired yet.",
        seconds_remaining: 6,
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/rps/timeout", {
      method: "POST",
      body: JSON.stringify({ match_id: VALID_MATCH_ID }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe("deadline_not_reached");
    expect(body.seconds_remaining).toBe(6);
    expect(body.error).toContain("expired");
  });

  it("7. returns HTTP 200 with code match_not_active when match is not active", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: false,
        code: "match_not_active",
        message: "Match is already completed or inactive.",
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/rps/timeout", {
      method: "POST",
      body: JSON.stringify({ match_id: VALID_MATCH_ID }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("match_not_active");
  });

  it("8. successfully returns authoritative timeout adjudication when deadline expired", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "timeout_resolved",
        result: "player1_wins",
        player1_wins: 2,
        player2_wins: 0,
        is_completed: false,
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/rps/timeout", {
      method: "POST",
      body: JSON.stringify({ match_id: VALID_MATCH_ID }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.code).toBe("timeout_resolved");
    expect(body.result).toBe("player1_wins");
    expect(body.player1_wins).toBe(2);
    expect(body.player2_wins).toBe(0);
    expect(body.is_completed).toBe(false);
  });

  it("9. returns HTTP 200 when round was already resolved (idempotent)", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "already_resolved",
        message: "Round was already resolved.",
      },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/rps/timeout", {
      method: "POST",
      body: JSON.stringify({ match_id: VALID_MATCH_ID }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.code).toBe("already_resolved");
  });

  it("10. supports match_id provided in URL search parameters", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "timeout_resolved",
        result: "draw",
        player1_wins: 1,
        player2_wins: 1,
        is_completed: false,
      },
      error: null,
    });

    const req = new NextRequest(`http://localhost:3000/api/rps/timeout?match_id=${VALID_MATCH_ID}`, {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.code).toBe("timeout_resolved");
    expect(mockRpc).toHaveBeenCalledWith("resolve_rps_timeout", { p_match_id: VALID_MATCH_ID });
  });
});
