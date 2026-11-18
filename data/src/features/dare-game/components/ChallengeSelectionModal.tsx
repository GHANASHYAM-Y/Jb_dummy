"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/core/i18n/I18nContext";
import { Button, Alert, Badge } from "@/shared/ui";
import {
  CHALLENGE_CATALOG,
  CATEGORY_META,
  type ChallengeItem,
} from "@/features/dare-game/lib/challenges";
import type { ChallengeCategory, ChallengeVisibility, Challenge } from "@/core/supabase/database";
import { cn } from "@/shared/lib/utils";

interface ChallengeSelectionModalProps {
  matchId: string;
  opponentName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (challenge: Challenge) => void;
}

export function ChallengeSelectionModal({
  matchId,
  opponentName,
  isOpen,
  onClose,
  onSuccess,
}: ChallengeSelectionModalProps) {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeItem | null>(
    CHALLENGE_CATALOG[0] ?? null
  );
  const [visibility, setVisibility] = useState<ChallengeVisibility>("private");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const filteredChallenges =
    selectedCategory === "all"
      ? CHALLENGE_CATALOG
      : CHALLENGE_CATALOG.filter((c) => c.category === selectedCategory);

  async function handleAssign() {
    if (!selectedChallenge) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/challenges/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          challenge_id: selectedChallenge.id,
          visibility,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.code === "already_assigned") {
          try {
            const matchRes = await fetch(`/api/challenges/match?match_id=${encodeURIComponent(matchId)}`, {
              cache: "no-store",
            });
            const matchData = await matchRes.json();
            if (matchData.ok && matchData.challenge) {
              onSuccess(matchData.challenge);
              return;
            }
          } catch {
            // Fallback to error display
          }
        }
        setError(data.error ?? "Failed to assign challenge");
        return;
      }

      if (data.challenge) {
        onSuccess(data.challenge);
      } else {
        onSuccess({
          id: data.challenge_id ?? "",
          match_id: matchId,
          winner_id: "",
          loser_id: "",
          challenge_id: selectedChallenge.id,
          category: selectedChallenge.category,
          title: selectedChallenge.title,
          description: selectedChallenge.description,
          instructions: selectedChallenge.instructions,
          visibility,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign challenge";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B24]/60 animate-fade-in"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[32px] border-2 border-[#EADBC8] bg-white shadow-[0_6px_0_#EADBC8] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-[#EADBC8]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#FFC23D] border-2 border-[#E9A912] text-[#1E1B24] flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="challenge-modal-title" className="text-xl font-bold font-display text-[#1E1B24]">
                {t("challenges.assign_dare")}
              </h2>
              <p className="text-xs text-[#6E6878] mt-0.5">
                {t("challenges.assign_dare_desc")} ({opponentName})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-11 h-11 flex items-center justify-center text-[#1E1B24] rounded-full bg-[#F5EADC] hover:bg-[#EADBC8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
              {error}
            </Alert>
          )}

          {/* Category Tabs */}
          <div>
            <label className="text-xs font-semibold text-[#6E6878] uppercase tracking-wider block mb-2">
              {t("challenges.select_category")}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "min-h-[44px] px-4 rounded-full text-sm font-bold transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                  selectedCategory === "all"
                    ? "bg-[#FF5A3C] text-white border-[#FF5A3C] shadow-[0_3px_0_#C9381F]"
                    : "bg-[#F5EADC] text-[#1E1B24] border-transparent hover:border-[#1E1B24]"
                )}
              >
                {t("challenges.all_categories")}
              </button>
              {(Object.keys(CATEGORY_META) as ChallengeCategory[]).map((cat) => {
                const meta = CATEGORY_META[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "min-h-[44px] px-4 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                      selectedCategory === cat
                        ? "bg-[#FF5A3C] text-white border-[#FF5A3C] shadow-[0_3px_0_#C9381F]"
                        : "bg-[#F5EADC] text-[#1E1B24] border-transparent hover:border-[#1E1B24]"
                    )}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catalog grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#6E6878] uppercase tracking-wider block">
              Choose a challenge ({filteredChallenges.length})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {filteredChallenges.map((item) => {
                const isSelected = selectedChallenge?.id === item.id;
                const meta = CATEGORY_META[item.category];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedChallenge(item)}
                    className={cn(
                      "text-left p-4 rounded-[22px] border-2 transition-all duration-150 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                      isSelected
                        ? "border-[#FF5A3C] bg-[#FFF6EC] shadow-[0_3px_0_#FF5A3C]"
                        : "border-[#EADBC8] bg-white hover:bg-[#FFF6EC]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display font-bold text-sm text-[#1E1B24] line-clamp-1">
                        {item.title}
                      </span>
                      <Badge variant="muted" className="text-[11px] py-0.5 px-2 shrink-0 bg-[#F5EADC] text-[#1E1B24]">
                        {meta.emoji} {meta.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6E6878] mt-1.5 line-clamp-2">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Challenge Detail */}
          {selectedChallenge && (
            <div className="p-4 rounded-[22px] border-2 border-[#FFC23D] bg-[#FFC23D]/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-[#1E1B24] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#0B8A6C]" />
                  {selectedChallenge.title}
                </span>
                <span className="text-xs text-[#8E8798] uppercase font-mono">
                  {selectedChallenge.category}
                </span>
              </div>
              <p className="text-xs text-[#6E6878]">
                {selectedChallenge.description}
              </p>
              <div className="pt-2 border-t-2 border-[#E9A912]/50">
                <p className="text-xs font-bold text-[#1E1B24] mb-0.5">
                  {t("challenges.instructions")}:
                </p>
                <p className="text-xs text-[#1E1B24]">
                  {selectedChallenge.instructions}
                </p>
              </div>
            </div>
          )}

          {/* Visibility Choice */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#6E6878] uppercase tracking-wider block">
              {t("challenges.visibility")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={cn(
                  "p-4 min-h-[44px] rounded-[22px] border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                  visibility === "private"
                    ? "border-[#FF5A3C] bg-[#FFF6EC] shadow-[0_3px_0_#FF5A3C]"
                    : "border-[#EADBC8] bg-white hover:bg-[#FFF6EC]"
                )}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-[#1E1B24]">
                  <Shield className="h-4 w-4 text-[#FF5A3C]" />
                  {t("challenges.visibility_private")}
                </div>
                <p className="text-[11px] text-[#6E6878] mt-1">
                  {t("challenges.visibility_private_desc")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "p-4 min-h-[44px] rounded-[22px] border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]",
                  visibility === "public"
                    ? "border-[#FF5A3C] bg-[#FFF6EC] shadow-[0_3px_0_#FF5A3C]"
                    : "border-[#EADBC8] bg-white hover:bg-[#FFF6EC]"
                )}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-[#1E1B24]">
                  <Sparkles className="h-4 w-4 text-[#FF5A3C]" />
                  {t("challenges.visibility_public")}
                </div>
                <p className="text-[11px] text-[#6E6878] mt-1">
                  {t("challenges.visibility_public_desc")}
                </p>
              </button>
            </div>
            <p className="text-[11px] text-[#8E8798] leading-relaxed pt-1">
              <span className="font-bold text-[#C9381F]">Privacy Policy: </span>
              {t("challenges.privacy_bullet3")}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t-2 border-[#EADBC8] bg-[#FFF6EC]">
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting} className="min-h-[44px]">
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleAssign}
            loading={submitting}
            disabled={!selectedChallenge || submitting}
            id="assign-challenge-submit-btn"
            className="min-h-[44px]"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {t("challenges.assign_btn")}
          </Button>
        </div>
      </div>
    </div>
  );
}
