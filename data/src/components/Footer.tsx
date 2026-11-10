"use client";

import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";

// Evaluated at module load time — stable during prerender (Next.js 16 requirement).
const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  const { t } = useI18n();
  const year = CURRENT_YEAR;

  return (
    <footer className="border-t border-[#315BFF]/25 bg-[#070B25] text-[#B8C3E0] mt-auto relative overflow-hidden">
      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-3xl h-px bg-gradient-to-r from-transparent via-[#39DFFF]/30 to-transparent pointer-events-none" />

      <div className="evo-container py-10 sm:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">

          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-1.5 text-center md:text-left">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#315BFF] to-[#8B2CFF] border border-[#39DFFF]/30 flex items-center justify-center">
                <span className="text-white font-display font-black text-[10px] tracking-wider">EQ</span>
              </div>
              <span className="font-display font-black text-[#F5F7FF] tracking-tight group-hover:text-[#39DFFF] transition-colors">
                EVOAIQU
              </span>
            </Link>
            <p className="text-[#8A98C0] text-xs">
              {t("brand.company")}
            </p>
            <p className="text-[#65736F] text-xs">
              {t("brand.tagline")}
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5">
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
                    className="text-sm font-medium text-[#B8C3E0] hover:text-[#39DFFF] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <hr className="evo-divider mt-8 mb-5 border-[#315BFF]/20" />

        <p className="text-center text-xs text-[#8A98C0]">
          {t("footer.rights", { year })}
        </p>
      </div>
    </footer>
  );
}
