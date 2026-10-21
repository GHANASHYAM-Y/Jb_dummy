"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  ta: "த",
};

const LOCALE_FULL: Record<Locale, string> = {
  en: "English",
  ta: "தமிழ்",
};

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="relative group">
      <button
        aria-label={t("lang.select")}
        className={cn(
          "evo-btn evo-btn-ghost evo-btn-sm flex items-center gap-2 min-h-[38px] px-3 py-1.5",
          "text-[#65736F] hover:text-[#203331] border border-[#E2E8E2] bg-white hover:bg-[#F7F8F4]",
        )}
      >
        <Globe className="h-4 w-4 shrink-0 text-[#167D78]" aria-hidden="true" />
        {!compact && (
          <span className="font-mono text-xs font-semibold">{LOCALE_LABELS[locale]}</span>
        )}
      </button>

      {/* Dropdown */}
      <div className={cn(
        "absolute right-0 top-full mt-1 z-50",
        "bg-white rounded-lg p-1 shadow-lg border border-[#E2E8E2]",
        "opacity-0 invisible group-hover:opacity-100 group-hover:visible",
        "translate-y-1 group-hover:translate-y-0",
        "transition-all duration-150",
        "min-w-[130px]",
      )}>
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              locale === loc
                ? "bg-[#DDF2EB] text-[#167D78] font-semibold"
                : "text-[#65736F] hover:text-[#203331] hover:bg-[#F7F8F4]",
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
