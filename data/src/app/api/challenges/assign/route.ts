import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/core/supabase/server";
import { getChallengeById, isValidVisibility } from "@/lib/challenges";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/challenges/assign
 * Body: {
 *   match_id: string,
 *   challenge_id: string,
 *   visibility?: "private" | "public"
 * }
 *
 * Security:
 *  - Session is verified via getUser().
 *  - Authoritative winner status is verified by the database function.
 *  - Client cannot forge winner, loser, or match outcome.
 *  - Challenge details are retrieved from the curated catalog.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let body: {
      match_id?: string;
      challenge_id?: string;
      visibility?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body.match_id || !UUID_RE.test(body.match_id)) {
      return NextResponse.json(
        { error: "match_id must be a valid UUID." },
        { status: 400 }
      );
    }

    if (!body.challenge_id || typeof body.challenge_id !== "string") {
      return NextResponse.json(
        { error: "challenge_id is required." },
        { status: 400 }
      );
    }

    const catalogItem = getChallengeById(body.challenge_id);
    if (!catalogItem) {
      return NextResponse.json(
        { error: "Invalid challenge_id. Must be an approved challenge from the catalog." },
        { status: 400 }
      );
    }

    const visibility = body.visibility ?? "private";
    if (!isValidVisibility(visibility)) {
      return NextResponse.json(
        { error: "visibility must be 'private' or 'public'." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("assign_challenge", {
      p_match_id:     body.match_id,
      p_challenge_id: catalogItem.id,
      p_category:     catalogItem.category,
      p_title:        catalogItem.title,
      p_description:  catalogItem.description,
      p_instructions: catalogItem.instructions,
      p_visibility:   visibility,
    });

    if (error) {
      console.error("[challenges/assign] RPC error:", error.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    const result = data as {
      ok: boolean;
      code: string;
      message?: string;
      challenge_id?: string;
    };

    if (!result.ok) {
      const status =
        result.code === "not_winner" || result.code === "self_challenge"
          ? 403
          : result.code === "match_not_found"
          ? 404
          : result.code === "already_assigned"
          ? 409
          : 400;

      return NextResponse.json(
        { error: result.message ?? result.code, code: result.code },
        { status }
      );
    }

    // Retrieve full challenge object with profile metadata for client UI
    let challengeData: unknown = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: matchChallengeRes } = await (supabase as any).rpc("get_match_challenge", {
        p_match_id: body.match_id,
      });
      challengeData = matchChallengeRes?.challenge ?? null;
    } catch {
      // Non-critical fallback
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      challenge_id: result.challenge_id,
      challenge: challengeData,
    });
  } catch (err) {
    console.error("[challenges/assign] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
