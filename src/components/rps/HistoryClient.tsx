"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, AlertCircle, Gamepad2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Avatar, Alert, Spinner, EvoIdBadge } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";

interface HistoryEntry {
  match_id: string;
  opponent_id: string;
  opponent_name: string;
  opponent_evoora_id: string;
  opponent_avatar: string | null;
  my_wins: number;
  opp_wins: number;
  winner_id: string | null;
  is_draw: boolean;
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
      <Spinner size="lg" className="text-[#167D78]" />
    </div>
  );

  if (error) return (
    <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>{error}</Alert>
  );

  if (history.length === 0) return (
    <div className="evo-card p-10 flex flex-col items-center justify-center gap-3 text-center bg-white border border-[#E2E8E2] shadow-card animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center text-[#167D78] mb-1">
        <Gamepad2 className="h-7 w-7" />
      </div>
      <p className="font-display font-bold text-[#203331] text-base">{t("rps.no_history")}</p>
      <p className="text-[#65736F] text-xs sm:text-sm max-w-xs mb-3">{t("rps.no_history_desc")}</p>
      <button
        onClick={() => router.push("/play/rps")}
        className="px-4 py-2 rounded-xl bg-[#DDF2EB] hover:bg-[#DDF2EB]/80 border border-[rgba(22,125,120,0.25)] text-[#167D78] text-xs font-semibold transition-colors shadow-xs"
      >
        Play Your First Match
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const iWon = entry.winner_id === userId;
        const isDraw = entry.is_draw;
        return (
          <button
            key={entry.match_id}
            className="evo-card p-4 flex items-center gap-4 w-full text-left bg-white border border-[#E2E8E2] hover:border-[#167D78] hover:shadow-subtle transition-all animate-fade-in"
            onClick={() => router.push(`/play/rps/${entry.match_id}`)}
            aria-label={`Match vs ${entry.opponent_name}`}
          >
            <Avatar src={entry.opponent_avatar} name={entry.opponent_name} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#203331] truncate">{entry.opponent_name}</p>
              <EvoIdBadge id={entry.opponent_evoora_id} className="mt-0.5" />
              <p className="text-xs text-[#8E9B97] mt-0.5">{timeAgo(entry.completed_at)}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={cn(
                "font-bold text-sm uppercase tracking-wider",
                iWon ? "text-[#167D78]" : isDraw ? "text-[#65736F]" : "text-[#D95F49]",
              )}>
                {iWon ? t("rps.win") : isDraw ? t("rps.draw") : t("rps.loss")}
              </span>
              <span className="text-[#65736F] text-xs font-mono font-medium">
                {entry.my_wins} – {entry.opp_wins}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#8E9B97] flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
