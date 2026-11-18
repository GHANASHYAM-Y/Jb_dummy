"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useI18n } from "@/core/i18n/I18nContext";
import { Button, Alert } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";

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
    <div id="delete-account" className="rounded-[26px] border-2 border-[#F6C9CB] bg-white p-5 sm:p-6 shadow-[0_4px_0_#F6C9CB]">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-11 h-11 rounded-full bg-[#FDECEC] flex items-center justify-center flex-shrink-0 text-[#E5484D]">
          <Trash2 className="h-6 w-6 text-[#E5484D]" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-[#1E1B24]">{t("account.delete")}</h3>
          <p className="text-[#6E6878] text-sm mt-1 leading-relaxed">
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
          className="mt-2"
        >
          <Trash2 className="h-4 w-4" />
          {t("account.delete")}
        </Button>
      ) : (
        <div className="mt-5 space-y-4 border-t-2 border-[#F6C9CB] pt-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-[#E5484D] text-sm">
              {t("account.delete_confirm_title")}
            </p>
            <button
              onClick={handleClose}
              disabled={loading}
              className="inline-flex items-center justify-center w-11 h-11 text-[#6E6878] hover:text-[#1E1B24] hover:bg-[#F5EADC] transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
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
            <label htmlFor="delete-confirm-input" className="evo-label text-[#E5484D]">
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
                "evo-input font-mono tracking-widest mt-2",
                isConfirmed && "border-[#E5484D] text-[#E5484D] font-bold shadow-[0_3px_0_#F6C9CB]",
              )}
            />
          </div>

          <div className="flex gap-3 pt-2">
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
