"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button, Alert } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * DeleteAccountSection
 *
 * Renders inside the Settings page.
 * Security model:
 *  - Requires the user to type "DELETE" before the button becomes active.
 *  - Sends a DELETE request to /api/auth/delete-account with confirm="DELETE".
 *  - The API route verifies the session server-side and uses the Admin API.
 *  - Service-role key NEVER touches client code.
 */
export function DeleteAccountSection() {
  const { t } = useI18n();
  const router = useRouter();

  const [open, setOpen]           = useState(false);
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const isConfirmed = confirm === "DELETE";

  const handleDelete = useCallback(async () => {
    if (!isConfirmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("account.delete_error"));
        setLoading(false);
        return;
      }

      // Account deleted — redirect to home with a message
      router.push("/?account=deleted");
      router.refresh();
    } catch {
      setError(t("account.delete_error"));
      setLoading(false);
    }
  }, [isConfirmed, loading, t, router]);

  const handleClose = useCallback(() => {
    if (loading) return;
    setOpen(false);
    setConfirm("");
    setError(null);
  }, [loading]);

  return (
    <div id="delete-account" className="evo-card border-[rgba(217,95,73,0.3)] bg-white p-6 shadow-card">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.3)] flex items-center justify-center flex-shrink-0">
          <Trash2 className="h-5 w-5 text-[#D95F49]" />
        </div>
        <div>
          <h3 className="font-bold text-[#203331]">{t("account.delete")}</h3>
          <p className="text-[#65736F] text-sm mt-1">
            {t("account.delete_confirm_body")}
          </p>
        </div>
      </div>

      {!open ? (
        <Button
          variant="danger"
          size="sm"
          onClick={() => setOpen(true)}
          id="open-delete-account-dialog"
        >
          <Trash2 className="h-4 w-4" />
          {t("account.delete")}
        </Button>
      ) : (
        <div className="mt-4 space-y-4 border-t border-[rgba(217,95,73,0.2)] pt-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-[#D95F49] text-sm">
              {t("account.delete_confirm_title")}
            </p>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-[#8E9B97] hover:text-[#203331] transition-colors"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <Alert variant="error" icon={<AlertTriangle className="h-4 w-4" />}>
              {error}
            </Alert>
          )}

          <div>
            <label htmlFor="delete-confirm-input" className="evo-label text-[#D95F49]">
              {t("account.delete_type_confirm")}
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "evo-input font-mono tracking-widest mt-1",
                isConfirmed && "border-[#D95F49] text-[#D95F49] font-bold",
              )}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={!isConfirmed}
              loading={loading}
              className="flex-1"
              id="confirm-delete-account-btn"
            >
              {t("account.delete_submit")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
