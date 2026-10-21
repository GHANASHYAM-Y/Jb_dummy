"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  startTransition,
} from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, t, type Locale } from "@/lib/i18n";

// ── Context ───────────────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a key with optional variable substitution. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "evoora_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Load persisted locale on mount (client only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && SUPPORTED_LOCALES.includes(saved)) {
        startTransition(() => setLocaleState(saved));
      } else {
        // Auto-detect from browser
        const browser = navigator.language.split("-")[0] as Locale;
        if (SUPPORTED_LOCALES.includes(browser)) {
          startTransition(() => setLocaleState(browser));
        }
      }
    } catch {
      // localStorage not available — use default
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    // Update <html lang> attribute
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
  }, []);

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>) => t(key, locale, vars),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translate }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
