"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Alert, Badge } from "@/shared/ui";
import {
  CHALLENGE_CATALOG,
  CATEGORY_META,
  type ChallengeItem,
} from "@/lib/challenges";
import type { ChallengeCategory, ChallengeVisibility, Challenge } from "@/types/database";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[#E2E8E2] bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8E2]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FCE6DE] text-[#D95F49]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="challenge-modal-title" className="text-xl font-bold font-display text-[#203331]">
                {t("challenges.assign_dare")}
              </h2>
              <p className="text-xs text-[#65736F] mt-0.5">
                {t("challenges.assign_dare_desc")} ({opponentName})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 text-[#65736F] hover:text-[#203331] rounded-lg hover:bg-[#EEF1ED] transition-colors"
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
            <label className="text-xs font-semibold text-[#65736F] uppercase tracking-wider block mb-2">
              {t("challenges.select_category")}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border",
                  selectedCategory === "all"
                    ? "bg-[#167D78] text-white border-[#167D78] shadow-xs"
                    : "bg-[#EEF1ED] text-[#65736F] border-[#E2E8E2] hover:text-[#203331] hover:bg-[#E2E8E2]"
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
                      "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-150 border",
                      selectedCategory === cat
                        ? "bg-[#167D78] text-white border-[#167D78] shadow-xs"
                        : "bg-[#EEF1ED] text-[#65736F] border-[#E2E8E2] hover:text-[#203331] hover:bg-[#E2E8E2]"
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
            <label className="text-xs font-semibold text-[#65736F] uppercase tracking-wider block">
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
                      "text-left p-3.5 rounded-xl border transition-all duration-150 flex flex-col justify-between",
                      isSelected
                        ? "border-[#167D78] bg-[#DDF2EB]/50 shadow-xs"
                        : "border-[#E2E8E2] bg-white hover:border-[#CBD4CB] hover:bg-[#F7F8F4]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm text-[#203331] line-clamp-1">
                        {item.title}
                      </span>
                      <Badge variant="teal" className="text-[10px] py-0 px-1.5 shrink-0">
                        {meta.emoji} {meta.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#65736F] mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Challenge Detail */}
          {selectedChallenge && (
            <div className="p-4 rounded-xl border border-[#E2E8E2] bg-[#F7F8F4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#203331] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#167D78]" />
                  {selectedChallenge.title}
                </span>
                <span className="text-xs text-[#8E9B97] uppercase font-mono">
                  {selectedChallenge.category}
                </span>
              </div>
              <p className="text-xs text-[#65736F]">
                {selectedChallenge.description}
              </p>
              <div className="pt-2 border-t border-[#E2E8E2]">
                <p className="text-xs font-semibold text-[#167D78] mb-0.5">
                  {t("challenges.instructions")}:
                </p>
                <p className="text-xs text-[#65736F]">
                  {selectedChallenge.instructions}
                </p>
              </div>
            </div>
          )}

          {/* Visibility Choice */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#65736F] uppercase tracking-wider block">
              {t("challenges.visibility")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  visibility === "private"
                    ? "border-[#167D78] bg-[#DDF2EB]/40 shadow-xs"
                    : "border-[#E2E8E2] bg-white opacity-70 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-[#203331]">
                  <Shield className="h-4 w-4 text-[#167D78]" />
                  {t("challenges.visibility_private")}
                </div>
                <p className="text-[11px] text-[#65736F] mt-1">
                  {t("challenges.visibility_private_desc")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  visibility === "public"
                    ? "border-[#D95F49] bg-[#FCE6DE]/40 shadow-xs"
                    : "border-[#E2E8E2] bg-white opacity-70 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-[#203331]">
                  <Sparkles className="h-4 w-4 text-[#D95F49]" />
                  {t("challenges.visibility_public")}
                </div>
                <p className="text-[11px] text-[#65736F] mt-1">
                  {t("challenges.visibility_public_desc")}
                </p>
              </button>
            </div>
            <p className="text-[11px] text-[#8E9B97] leading-relaxed pt-1">
              <span className="font-semibold text-[#167D78]">Privacy Policy: </span>
              {t("challenges.privacy_bullet3")}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E2E8E2] bg-[#F7F8F4]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAssign}
            loading={submitting}
            disabled={!selectedChallenge || submitting}
            id="assign-challenge-submit-btn"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {t("challenges.assign_btn")}
          </Button>
        </div>
      </div>
    </div>
  );
}
