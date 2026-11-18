"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/core/i18n/I18nContext";
import { SUPPORTED_LOCALES, type Locale } from "@/core/i18n/translations";
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
            ? "text-[#6E6878] hover:text-[#1E1B24] border border-[#EADBC8] bg-[#FFFFFF]/90 hover:bg-[#F5EADC] rounded-xl"
            : "text-[#6E6878] hover:text-[#1E1B24] border border-[#EADBC8] bg-white hover:bg-[#FFF6EC]"
        )}
      >
        <Globe
          className={cn("h-4 w-4 shrink-0", isDark ? "text-[#FF5A3C]" : "text-[#FF5A3C]")}
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
            ? "bg-[#FFFFFF] rounded-xl p-1.5 shadow-2xl border border-[#EADBC8] backdrop-blur-xl"
            : "bg-white rounded-lg p-1 shadow-lg border border-[#EADBC8]",
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
                  ? "bg-[#8C7BFF]/30 text-[#FF5A3C] font-semibold"
                  : "bg-[#FFE4DD] text-[#FF5A3C] font-semibold"
                : isDark
                ? "text-[#6E6878] hover:text-[#1E1B24] hover:bg-[#FFF6EC]"
                : "text-[#6E6878] hover:text-[#1E1B24] hover:bg-[#FFF6EC]"
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
