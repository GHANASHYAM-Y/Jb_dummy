"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/shared/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  ta: "த",
};

const LOCALE_FULL: Record<Locale, string> = {
  en: "English",
  ta: "தமிழ்",
};

export function LanguageSelector({
  compact = false,
  variant = "dark",
}: {
  compact?: boolean;
  variant?: "default" | "dark";
}) {
  const { locale, setLocale, t } = useI18n();
  const isDark = variant === "dark";

  return (
    <div className="relative group">
      <button
        aria-label={t("lang.select")}
        className={cn(
          "evo-btn evo-btn-ghost evo-btn-sm flex items-center gap-2 min-h-[38px] px-3 py-1.5",
          isDark
            ? "text-[#B8C3E0] hover:text-[#F5F7FF] border border-[#315BFF]/35 bg-[#101638]/90 hover:bg-[#182352] rounded-xl"
            : "text-[#65736F] hover:text-[#203331] border border-[#E2E8E2] bg-white hover:bg-[#F7F8F4]"
        )}
      >
        <Globe
          className={cn("h-4 w-4 shrink-0", isDark ? "text-[#39DFFF]" : "text-[#167D78]")}
          aria-hidden="true"
        />
        {!compact && (
          <span className="font-mono text-xs font-semibold">{LOCALE_LABELS[locale]}</span>
        )}
      </button>

      {/* Dropdown */}
      <div
        className={cn(
          "absolute right-0 top-full mt-1 z-50",
          isDark
            ? "bg-[#101638] rounded-xl p-1.5 shadow-2xl border border-[#315BFF]/35 backdrop-blur-xl"
            : "bg-white rounded-lg p-1 shadow-lg border border-[#E2E8E2]",
          "opacity-0 invisible group-hover:opacity-100 group-hover:visible",
          "translate-y-1 group-hover:translate-y-0",
          "transition-all duration-150",
          "min-w-[130px]"
        )}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
              locale === loc
                ? isDark
                  ? "bg-[#315BFF]/30 text-[#39DFFF] font-semibold"
                  : "bg-[#DDF2EB] text-[#167D78] font-semibold"
                : isDark
                ? "text-[#B8C3E0] hover:text-[#F5F7FF] hover:bg-[#070B25]"
                : "text-[#65736F] hover:text-[#203331] hover:bg-[#F7F8F4]"
            )}
            lang={loc}
            aria-current={locale === loc ? "true" : undefined}
          >
            <span className="font-mono font-bold text-xs w-5">{LOCALE_LABELS[loc]}</span>
            <span className={loc === "ta" ? "font-tamil" : ""}>{LOCALE_FULL[loc]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
