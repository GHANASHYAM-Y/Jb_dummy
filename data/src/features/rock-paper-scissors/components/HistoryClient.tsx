"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, AlertCircle, Gamepad2 } from "lucide-react";
import { useI18n } from "@/core/i18n/I18nContext";
import { Avatar, Alert, Spinner, EvoIdBadge } from "@/shared/ui";
import { cn, timeAgo } from "@/shared/lib/utils";

interface HistoryEntry {
  match_id: string;
  opponent_id: string;
  opponent_name: string;
  opponent_evoora_id: string;
  opponent_avatar: string | null;
  my_wins: number;
  opp_wins: number;
  winner_id: string | null;
  loser_id?: string | null;
  is_draw: boolean;
  phase?: string;
  end_reason?: string | null;
  completed_at: string;
  started_at: string;
}

export function HistoryClient({ userId }: { userId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/rps/history");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setHistory(data.history ?? []);
      } catch {
        setError(t("rps.load_error"));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <Spinner size="lg" className="text-[#FF5A3C]" />
    </div>
  );

  if (error) return (
    <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>{error}</Alert>
  );

  if (history.length === 0) return (
    <div className="b-card !p-10 sm:!p-12 flex flex-col items-center justify-center gap-4 text-center animate-fade-in text-[#1E1B24]">
      <div className="w-16 h-16 rounded-full bg-[#FFE4DD] flex items-center justify-center text-[#C9381F]">
        <Gamepad2 className="h-8 w-8" />
      </div>
      <p className="font-display font-semibold text-[#1E1B24] text-xl">{t("rps.no_history")}</p>
      <p className="text-[#6E6878] text-sm max-w-sm leading-relaxed mb-2">{t("rps.no_history_desc")}</p>
      <button
        onClick={() => router.push("/play/rps")}
        className="evo-btn evo-btn-primary cursor-pointer"
      >
        Play Your First Match
      </button>
    </div>
  );

  return (
    <ul className="b-card !p-2 sm:!p-3 divide-y-2 divide-[#F5EADC] list-none">
      {history.map((entry) => {
        const iWon = entry.winner_id === userId;
        const isDraw = entry.is_draw;
        return (
          <li key={entry.match_id}>
          <button
            className="rounded-[20px] p-3 sm:p-3.5 min-h-[64px] flex items-center gap-3.5 w-full text-left hover:bg-[#FFF6EC] transition-colors animate-fade-in cursor-pointer text-[#1E1B24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            onClick={() => router.push(`/play/rps/${entry.match_id}`)}
            aria-label={`Match vs ${entry.opponent_name}`}
          >
            <span
              className={cn(
                "w-11 h-11 rounded-[14px] flex items-center justify-center font-display font-semibold text-lg shrink-0 border-2",
                iWon
                  ? "bg-[#E3FAF3] border-[#B7EEDD] text-[#0B7D63]"
                  : isDraw
                  ? "bg-[#FFF1CC] border-[#FFE29A] text-[#8A5F00]"
                  : "bg-[#F5EADC] border-[#EADBC8] text-[#6E6878]",
              )}
              aria-hidden
            >
              {iWon ? "W" : isDraw ? "D" : "L"}
            </span>
            <Avatar src={entry.opponent_avatar} name={entry.opponent_name} size="md" className="border-2 border-[#EADBC8]" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-base text-[#1E1B24] truncate">{entry.opponent_name}</p>
                {entry.end_reason && entry.end_reason !== "completed" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F5EADC] text-[#6E6878] border-2 border-[#EADBC8]">
                    {entry.end_reason === "forfeit"
                      ? "Forfeit"
                      : entry.end_reason === "disconnect_timeout"
                      ? "DC Timeout"
                      : entry.end_reason === "inactivity_timeout"
                      ? "Inactivity"
                      : entry.end_reason === "both_left"
                      ? "Both Left"
                      : entry.end_reason}
                  </span>
                )}
              </div>
              <EvoIdBadge id={entry.opponent_evoora_id} className="mt-1" />
              <p className="text-xs text-[#8E8798] mt-1">{timeAgo(entry.completed_at)}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="font-display font-semibold text-xl text-[#1E1B24]">
                {entry.my_wins}–{entry.opp_wins}
              </span>
              <span className={cn(
                "font-bold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border-2",
                iWon
                  ? "bg-[#E3FAF3] text-[#0B7D63] border-[#B7EEDD]"
                  : isDraw
                  ? "bg-[#FFF1CC] text-[#8A5F00] border-[#FFE29A]"
                  : "bg-[#F5EADC] text-[#6E6878] border-[#EADBC8]",
              )}>
                {iWon ? t("rps.win") : isDraw ? t("rps.draw") : t("rps.loss")}
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-[#8E8798] flex-shrink-0" />
          </button>
          </li>
        );
      })}
    </ul>
  );
}
