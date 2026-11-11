"use client";

/**
 * EVOAIQU — match connection handling shared by the friend-match boards.
 *
 * - When the browser goes offline during a live match, report a disconnect
 *   (sent with keepalive so it survives the page closing).
 * - When it comes back online, report a reconnect, then refresh the board.
 * - If the server still has us marked as disconnected (for example after a
 *   page refresh), send one reconnect per disconnect timestamp.
 *
 * Used by Ludo and Hand Cricket. Chess and Rock Paper Scissors have their own
 * variants with slightly different behaviour, so they do not use this hook.
 */

import { useEffect, useRef, type RefObject } from "react";
import type { MatchPhase } from "@/core/supabase/database";
import { postJson } from "@/shared/lib/http";

const LIVE_PHASES: MatchPhase[] = ["active", "reconnecting"];

export interface MatchConnectionOptions {
  matchId: string;
  /** Always holds the latest phase, so the event handlers never go stale. */
  phaseRef: RefObject<MatchPhase>;
  /** Whether the match is live right now (active or reconnecting). */
  live: boolean;
  /** Our own `playerN_disconnected_at` from the server, or null. */
  myDisconnectedAt: string | null;
  /** Reloads the match from the server. */
  refresh: () => unknown;
}

export function useMatchConnection({ matchId, phaseRef, live, myDisconnectedAt, refresh }: MatchConnectionOptions) {
  const reconnectedForRef = useRef<string | null>(null);

  // Network drops: report a disconnect, and reconnect when back online
  useEffect(() => {
    const handleOffline = () => {
      if (LIVE_PHASES.includes(phaseRef.current)) {
        void postJson("/api/games/disconnect", { match_id: matchId }, true).catch(() => null);
      }
    };
    const handleOnline = () => {
      const request = LIVE_PHASES.includes(phaseRef.current)
        ? postJson("/api/games/reconnect", { match_id: matchId }).catch(() => null)
        : Promise.resolve(null);
      void request.finally(() => {
        void refresh();
      });
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [matchId, refresh, phaseRef]);

  // If the server still thinks *we* are disconnected (e.g. after a refresh), reconnect
  useEffect(() => {
    if (!live || !myDisconnectedAt || reconnectedForRef.current === myDisconnectedAt) return;
    reconnectedForRef.current = myDisconnectedAt;
    postJson("/api/games/reconnect", { match_id: matchId })
      .catch(() => null)
      .finally(() => {
        void refresh();
      });
  }, [live, myDisconnectedAt, matchId, refresh]);
}
