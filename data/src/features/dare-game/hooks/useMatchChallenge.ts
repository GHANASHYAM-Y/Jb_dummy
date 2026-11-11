"use client";

/**
 * EVOAIQU — load the dare attached to a finished match.
 *
 * Once the match is decided, fetch its challenge. The loser keeps checking
 * every 5 seconds, because the winner may pick a dare after the game ends.
 *
 * Used by the Ludo and Hand Cricket boards. Rock Paper Scissors loads its dare
 * slightly differently (no polling), so it keeps its own code.
 */

import { useEffect, useState } from "react";
import type { Challenge } from "@/core/supabase/database";

const LOSER_POLL_MS = 5_000;

export interface MatchChallengeOptions {
  matchId: string;
  /** True once the match has a winner and a loser (completed, not a draw). */
  decided: boolean;
  /** Keep re-checking for a dare (the loser waits for the winner's pick). */
  pollWhileWaiting: boolean;
}

export function useMatchChallenge({ matchId, decided, pollWhileWaiting }: MatchChallengeOptions) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    if (!decided) return;
    let active = true;
    const load = () =>
      fetch(`/api/challenges/match?match_id=${encodeURIComponent(matchId)}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active && data?.ok) setChallenge(data.challenge ?? null);
        })
        .catch(() => {});
    void load();
    const id = pollWhileWaiting ? setInterval(load, LOSER_POLL_MS) : null;
    return () => {
      active = false;
      if (id) clearInterval(id);
    };
  }, [decided, matchId, pollWhileWaiting]);

  return [challenge, setChallenge] as const;
}
