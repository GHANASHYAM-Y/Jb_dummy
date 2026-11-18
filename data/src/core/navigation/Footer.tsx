"use client";

import Link from "next/link";
import { useI18n } from "@/core/i18n/I18nContext";

// Evaluated at module load time — stable during prerender (Next.js 16 requirement).
const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  const { t } = useI18n();
  const year = CURRENT_YEAR;

  const links = [
    { href: "/games", label: t("nav.games") !== "nav.games" ? t("nav.games") : "Game" },
    { href: "/how-to-play", label: "How to Play" },
    { href: "/about", label: "About" },
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/terms", label: t("footer.terms") },
  ];

  return (
    <footer className="bg-[#FFF6EC] text-[#6E6878] mt-auto relative">
      <div className="evo-container pb-8 pt-4">
        <div className="rounded-[26px] bg-white border-2 border-[#EADBC8] shadow-[0_4px_0_#EADBC8] px-6 py-7 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-1.5 text-center md:text-left">
              <Link
                href="/"
                className="flex items-center gap-2.5 group rounded-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
              >
                <span className="b-logo-mark" aria-hidden="true">EQ</span>
                <span className="font-display font-bold text-2xl leading-none tracking-tight text-[#1E1B24] group-hover:text-[#FF5A3C] transition-colors">
                  EVOAIQU
                </span>
              </Link>
              <p className="text-[#6E6878] text-xs font-semibold">{t("brand.company")}</p>
              <p className="text-[#6E6878] text-xs">{t("brand.tagline")}</p>
            </div>

            {/* Links */}
            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap items-center justify-center gap-2">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex items-center min-h-[44px] px-4 rounded-full text-sm font-bold text-[#1E1B24] bg-[#F5EADC] hover:bg-[#FFE4DD] hover:text-[#C9381F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A3C]"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <p className="text-center text-xs text-[#6E6878] mt-6 pt-5 border-t-2 border-[#EADBC8]">
            {t("footer.rights", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
