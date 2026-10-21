"use client";

import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";

// Evaluated at module load time — stable during prerender (Next.js 16 requirement).
const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  const { t } = useI18n();
  const year = CURRENT_YEAR;

  return (
    <footer className="border-t border-[#E2E8E2] bg-white mt-auto">
      <div className="evo-container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] flex items-center justify-center">
                <span className="text-[#167D78] font-display font-extrabold text-[10px] tracking-wider">EQ</span>
              </div>
              <span className="font-display font-extrabold text-[#203331]">EVOAIQU</span>
            </div>
            <p className="text-[#65736F] text-xs">
              {t("brand.company")}
            </p>
            <p className="text-[#8E9B97] text-xs">
              {t("brand.tagline")}
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {[
                { href: "/games",       label: t("nav.games") !== "nav.games" ? t("nav.games") : "Game" },
                { href: "/how-to-play", label: "How to Play" },
                { href: "/about",       label: "About" },
                { href: "/privacy",     label: t("footer.privacy") },
                { href: "/terms",       label: t("footer.terms") },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[#65736F] hover:text-[#167D78] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <hr className="evo-divider mt-6 mb-4 border-[#E2E8E2]" />

        <p className="text-center text-xs text-[#8E9B97]">
          {t("footer.rights", { year })}
        </p>
      </div>
    </footer>
  );
}
