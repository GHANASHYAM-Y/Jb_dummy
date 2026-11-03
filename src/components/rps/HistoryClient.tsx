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
      <Spinner size="lg" className="text-[#39DFFF]" />
    </div>
  );

  if (error) return (
    <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>{error}</Alert>
  );

  if (history.length === 0) return (
    <div className="rounded-3xl p-10 sm:p-12 flex flex-col items-center justify-center gap-4 text-center bg-[#101638]/90 backdrop-blur-xl border border-[rgba(57,223,255,0.2)] shadow-[0_16px_48px_rgba(0,0,0,0.45)] animate-fade-in text-[#F5F7FF]">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#39DFFF]/20 to-[#315BFF]/30 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] shadow-[0_0_20px_rgba(57,223,255,0.3)]">
        <Gamepad2 className="h-8 w-8" />
      </div>
      <p className="font-display font-black text-[#F5F7FF] text-xl">{t("rps.no_history")}</p>
      <p className="text-[#B8C3E0] text-sm max-w-sm leading-relaxed mb-2">{t("rps.no_history_desc")}</p>
      <button
        onClick={() => router.push("/play/rps")}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#315BFF] to-[#39DFFF] hover:from-[#39DFFF] hover:to-[#315BFF] text-[#070B25] text-sm font-bold transition-all shadow-[0_0_20px_rgba(57,223,255,0.4)] cursor-pointer"
      >
        Play Your First Match
      </button>
    </div>
  );

  return (
    <div className="space-y-3.5">
      {history.map((entry) => {
        const iWon = entry.winner_id === userId;
        const isDraw = entry.is_draw;
        return (
          <button
            key={entry.match_id}
            className="rounded-2xl p-5 flex items-center gap-4 w-full text-left bg-[#101638]/90 backdrop-blur-md border border-[rgba(57,223,255,0.15)] hover:border-[#39DFFF]/50 hover:shadow-[0_8px_32px_rgba(57,223,255,0.15)] transition-all animate-fade-in cursor-pointer text-[#F5F7FF]"
            onClick={() => router.push(`/play/rps/${entry.match_id}`)}
            aria-label={`Match vs ${entry.opponent_name}`}
          >
            <Avatar src={entry.opponent_avatar} name={entry.opponent_name} size="md" className="border border-[#39DFFF]/30" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-base text-[#F5F7FF] truncate">{entry.opponent_name}</p>
                {entry.end_reason && entry.end_reason !== "completed" && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#070B25] text-[#9BA8D7] border border-[#315BFF]/30">
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
              <p className="text-xs text-[#8A98C0] mt-1">{timeAgo(entry.completed_at)}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={cn(
                "font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full border",
                iWon
                  ? "bg-[#39DFFF]/15 text-[#39DFFF] border-[#39DFFF]/40 shadow-[0_0_12px_rgba(57,223,255,0.25)]"
                  : isDraw
                  ? "bg-[#070B25] text-[#B8C3E0] border-[#1C2758]"
                  : "bg-[rgba(255,83,112,0.15)] text-[#FF8599] border-[#FF5370]/30",
              )}>
                {iWon ? t("rps.win") : isDraw ? t("rps.draw") : t("rps.loss")}
              </span>
              <span className="text-[#B8C3E0] text-xs font-mono font-bold">
                {entry.my_wins} – {entry.opp_wins}
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-[#8A98C0] flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
