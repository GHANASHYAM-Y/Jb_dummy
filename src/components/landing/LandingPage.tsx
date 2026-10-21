"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Gamepad2, Trophy, Users, Zap, ChevronRight,
  Sword, Star, Shield, Laugh, Music, Mic2, Film,
  ArrowRight, CheckCircle2, Share2, Copy, Check, MessageCircle, Sparkles,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button, Badge } from "@/components/ui";

import { cn } from "@/lib/utils";

// ── Step Card ─────────────────────────────────────────────────────────────────

function StepCard({
  step,
  icon: Icon,
  title,
  desc,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative flex flex-col justify-between gap-5 p-6 rounded-2xl border border-[#E2E8E2] bg-white hover:border-[#167D78] hover:shadow-card transition-all duration-200 group h-full min-h-[210px]">
      <div>
        <div className="flex items-center justify-between w-full mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#DDF2EB] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Icon className="h-5 w-5 text-[#167D78]" />
          </div>
          <span className="w-8 h-8 rounded-full bg-[#EEF1ED] border border-[#E2E8E2] flex items-center justify-center text-[#65736F] text-xs font-mono font-bold shrink-0">
            0{step}
          </span>
        </div>
        <h3 className="font-display font-bold text-[#203331] text-[1.125rem] leading-[1.3] mb-2">{title}</h3>
        <p className="text-[#65736F] text-[0.9375rem] leading-[1.6]">{desc}</p>
      </div>
    </div>
  );
}

// ── Game Card ─────────────────────────────────────────────────────────────────

function GameCard({
  icon: Icon,
  title,
  desc,
  badge,
  badgeVariant,
  live = false,
  href,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  badge: string;
  badgeVariant: "teal" | "muted";
  live?: boolean;
  href?: string;
}) {
  const cardContent = (
    <>
      <div>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 shrink-0 ${
              live
                ? "bg-[#DDF2EB] text-[#167D78] group-hover:scale-105"
                : "bg-[#EEF1ED] text-[#8E9B97] border border-[#E2E8E2]"
            }`}
          >
            <Icon className="h-7 w-7" />
          </div>
          <Badge variant={badgeVariant}>{badge}</Badge>
        </div>

        <h3 className="font-display font-bold text-[#203331] text-[1.25rem] sm:text-[1.375rem] leading-[1.25] mb-2.5">
          {title}
        </h3>
        <p className="text-[#65736F] text-[0.9375rem] sm:text-[1rem] leading-[1.6]">
          {desc}
        </p>
      </div>

      <div className="pt-4 mt-6 border-t border-[#E2E8E2] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-[#EEF1ED] border border-[#E2E8E2] text-[#65736F] font-medium">
            2 Players
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#EEF1ED] border border-[#E2E8E2] text-[#65736F] font-medium">
            {live ? "First to 5" : "Turns"}
          </span>
        </div>

        {live ? (
          <span className="inline-flex items-center gap-1.5 text-[#167D78] text-[0.9375rem] font-semibold group-hover:underline transition-colors shrink-0">
            Play now <ArrowRight className="h-4 w-4" />
          </span>
        ) : (
          <span className="text-xs text-[#8E9B97] font-medium shrink-0">In Development</span>
        )}
      </div>
    </>
  );

  const cardClasses = cn(
    "p-6 sm:p-7 rounded-2xl border bg-white shadow-card flex flex-col justify-between gap-6 transition-all duration-200 min-h-[260px] h-full",
    live
      ? "border-[#E2E8E2] hover:border-[#167D78] hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer group"
      : "opacity-75 cursor-not-allowed border-[#E2E8E2]",
  );

  if (live && href) {
    return (
      <Link href={href} className={cardClasses}>
        {cardContent}
      </Link>
    );
  }

  return <div className={cardClasses}>{cardContent}</div>;
}

// ── Challenge Chip ────────────────────────────────────────────────────────────

function ChallengeChip({
  icon: Icon,
  label,
  isCoral = false,
}: {
  icon: React.ElementType;
  label: string;
  isCoral?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl border border-[#E2E8E2] bg-white hover:border-[#CBD4CB] hover:shadow-subtle transition-all cursor-default group min-w-0">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
          isCoral ? "bg-[#FCE6DE] text-[#D95F49]" : "bg-[#DDF2EB] text-[#167D78]"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[0.875rem] font-medium text-[#203331] truncate">{label}</span>
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────

export function LandingPage() {
  const { t } = useI18n();
  const [copiedSample, setCopiedSample] = useState(false);

  const handleCopySample = () => {
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const featurePills = [
    "Instant Invite Links",
    "Real-time Multiplayer",
    "Unique EVOAIQU ID",
    "Consensual & Safe Dares",
    "Tamil & English Support",
    "Free to Play",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8F4] evo-bg-mesh">
      <Navbar />

      <main className="flex-1">
        {/* ── HERO SECTION ── */}
        <section
          id="hero"
          className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24"
          aria-labelledby="hero-heading"
        >
          <div className="evo-container relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

              {/* Left Column: Headlines & Call to Actions */}
              <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
                {/* Brand Eyebrow Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[rgba(22,125,120,0.25)] bg-[#DDF2EB] text-[#167D78] text-[0.8125rem] font-semibold mb-6 animate-fade-in shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-[#167D78]" aria-hidden="true" />
                  <span>{t("brand.company")} • Social Gaming</span>
                </div>

                {/* Primary Headline */}
                <h1
                  id="hero-heading"
                  className="font-display font-extrabold text-[clamp(2.75rem,5vw,4.5rem)] text-[#203331] tracking-[-0.02em] leading-[1.12] mb-6 animate-slide-up"
                >
                  <span>Play.</span>{" "}
                  <span className="text-[#167D78]">
                    Challenge.
                  </span>{" "}
                  <span>Laugh.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-[#65736F] text-base sm:text-lg lg:text-xl max-w-xl mb-8 leading-[1.6] animate-slide-up delay-100">
                  {t("landing.hero.subtitle")}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-8 animate-slide-up delay-200">
                  <Link href="/signup" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto font-bold px-8 shadow-sm"
                    >
                      Play Now
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>

                  <Link href="/how-to-play" className="w-full sm:w-auto">
                    <Button variant="secondary" size="lg" className="w-full sm:w-auto font-semibold">
                      See How It Works
                    </Button>
                  </Link>
                </div>

                {/* Feature checklist */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 max-w-xl text-left animate-fade-in delay-300">
                  {featurePills.map((pill) => (
                    <div key={pill} className="inline-flex items-center gap-2 text-[0.875rem] text-[#65736F]">
                      <CheckCircle2 className="h-4 w-4 text-[#167D78] shrink-0" />
                      <span className="whitespace-nowrap">{pill}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: High-Fidelity Multiplayer Game Preview Card */}
              <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none animate-scale-in delay-200">
                <div className="relative rounded-2xl bg-[#E2E8E2] p-[1px] shadow-card">
                  <div className="rounded-[15px] bg-white p-6 sm:p-7 flex flex-col gap-6 border border-[#E2E8E2]">

                    {/* Match Header */}
                    <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#E2E8E2]">
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#167D78] animate-pulse" />
                        <span className="text-xs font-mono font-bold text-[#203331]">
                          LIVE RPS MATCH
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-[#167D78] text-[0.75rem] font-bold font-mono shrink-0">
                        FIRST TO 5 • ROUND 4
                      </span>
                    </div>

                    {/* Players Battle Arena */}
                    <div className="grid grid-cols-5 items-center gap-2 py-2">
                      {/* Player 1 */}
                      <div className="col-span-2 flex flex-col items-center gap-1.5">
                        <div className="relative w-16 h-16 rounded-2xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.3)] shadow-sm flex items-center justify-center">
                          <span className="text-2xl select-none">✊</span>
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#167D78] text-[10px] font-bold text-white font-mono shadow-xs">
                          READY
                        </span>
                        <div className="text-center mt-0.5">
                          <span className="text-xs font-semibold text-[#203331] block">You</span>
                          <span className="text-xl font-display font-extrabold text-[#167D78]">2</span>
                        </div>
                      </div>

                      {/* VS Divider */}
                      <div className="col-span-1 flex flex-col items-center justify-center gap-1.5">
                        <div className="w-8 h-8 rounded-full bg-[#EEF1ED] border border-[#E2E8E2] flex items-center justify-center">
                          <Sword className="h-4 w-4 text-[#65736F]" />
                        </div>
                        <span className="text-[10px] font-bold text-[#8E9B97]">VS</span>
                      </div>

                      {/* Player 2 */}
                      <div className="col-span-2 flex flex-col items-center gap-1.5">
                        <div className="relative w-16 h-16 rounded-2xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.3)] shadow-sm flex items-center justify-center">
                          <span className="text-2xl select-none">✌️</span>
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#167D78] text-[10px] font-bold text-white font-mono shadow-xs">
                          READY
                        </span>
                        <div className="text-center mt-0.5">
                          <span className="text-xs font-semibold text-[#65736F] block">Arun (Friend)</span>
                          <span className="text-xl font-display font-extrabold text-[#65736F]">1</span>
                        </div>
                      </div>
                    </div>

                    {/* Dare Callout Banner (Selective Coral Accent) */}
                    <div className="p-4 rounded-xl bg-[#FCE6DE] border border-[rgba(217,95,73,0.28)] flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white/80 border border-[rgba(217,95,73,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Star className="h-4 w-4 text-[#D95F49]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-[#D95F49]">WINNER ASSIGNS DARE</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 border border-[rgba(217,95,73,0.2)] text-[#D95F49] shrink-0">
                            Comedy
                          </span>
                        </div>
                        <p className="text-xs sm:text-[0.8125rem] text-[#203331] leading-relaxed">
                          &ldquo;Deliver your favourite dialogue in a comical crying voice!&rdquo;
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 2: HOW IT WORKS ─────────────────────────────────── */}
        <section id="how-it-works" className="evo-section py-16 md:py-24 border-t border-[#E2E8E2] bg-white" aria-labelledby="how-heading">
          <div className="evo-container">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <Badge variant="teal" className="mb-3.5">Quick & Easy</Badge>
              <h2 id="how-heading" className="font-display font-bold text-[clamp(2rem,3.5vw,3rem)] leading-[1.2] text-[#203331] mb-4 tracking-[-0.01em]">
                {t("landing.how.title")}
              </h2>
              <p className="text-[#65736F] text-base sm:text-lg leading-[1.6]">
                Four simple steps from sign-up to your first memorable challenge.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              <StepCard
                step={1}
                icon={Gamepad2}
                title={t("landing.how.step1.title")}
                desc={t("landing.how.step1.desc")}
              />
              <StepCard
                step={2}
                icon={Shield}
                title={t("landing.how.step2.title")}
                desc={t("landing.how.step2.desc")}
              />
              <StepCard
                step={3}
                icon={Trophy}
                title={t("landing.how.step3.title")}
                desc={t("landing.how.step3.desc")}
              />
              <StepCard
                step={4}
                icon={Users}
                title={t("landing.how.step4.title")}
                desc={t("landing.how.step4.desc")}
              />
            </div>
          </div>
        </section>

        {/* ── SECTION 3: GAMES SELECTION ──────────────────────────────── */}
        <section id="games" className="evo-section py-16 md:py-24 border-t border-[#E2E8E2]" aria-labelledby="games-heading">
          <div className="evo-container">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <Badge variant="teal" className="mb-3.5">Live Multiplayer</Badge>
              <h2 id="games-heading" className="font-display font-bold text-[clamp(2rem,3.5vw,3rem)] leading-[1.2] text-[#203331] mb-4 tracking-[-0.01em]">
                {t("landing.games.title")}
              </h2>
              <p className="text-[#65736F] text-base sm:text-lg leading-[1.6]">
                Real-time battles with turn validation, instant rematching, and post-match dares.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-stretch">
              <GameCard
                icon={Gamepad2}
                title={t("landing.games.rps.title")}
                desc={t("landing.games.rps.desc")}
                badge={t("landing.games.badge_live")}
                badgeVariant="teal"
                live={true}
                href="/play/rps"
              />
              <GameCard
                icon={Sword}
                title={t("landing.games.chess.title")}
                desc={t("landing.games.chess.desc")}
                badge={t("landing.games.badge_soon")}
                badgeVariant="muted"
                live={false}
              />
            </div>
          </div>
        </section>

        {/* ── SECTION 4: DEDICATED INVITE FRIENDS SHOWCASE ─────────────── */}
        <section className="evo-section py-16 md:py-24 border-t border-[#E2E8E2] bg-white" aria-labelledby="invite-heading">
          <div className="evo-container">
            <div className="relative overflow-hidden rounded-3xl border border-[#E2E8E2] bg-[#F7F8F4] p-8 sm:p-12 lg:p-16 shadow-subtle">

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-7">
                  <Badge variant="teal" className="mb-4">
                    <Share2 className="h-3.5 w-3.5" /> Instant Connect
                  </Badge>
                  <h2 id="invite-heading" className="font-display font-bold text-[clamp(2rem,3.5vw,2.75rem)] text-[#203331] mb-4 leading-[1.2] tracking-[-0.01em]">
                    Invite friends with a single click.
                  </h2>
                  <p className="text-[#65736F] text-base sm:text-lg mb-8 leading-[1.6]">
                    No complicated lobby codes or friend codes required. Every player receives an unguessable, secure invite link. Share it directly on WhatsApp, messages, or anywhere to jump straight into games.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/signup">
                      <Button variant="primary" size="lg" className="font-semibold shadow-sm">
                        Get Your Free Invite Link
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Mock Invite Card */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-[#E2E8E2] bg-white p-6 shadow-card flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E2]">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#167D78]" />
                        <span className="text-xs font-semibold text-[#203331]">Your Personal Invite Link</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#167D78] bg-[#DDF2EB] px-2 py-0.5 rounded-full">ACTIVE</span>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F7F8F4] border border-[#E2E8E2]">
                      <span className="text-xs font-mono text-[#167D78] truncate flex-1 font-medium">
                        https://evoaiqu.app/invite/7f8a9e2c...
                      </span>
                      <button
                        onClick={handleCopySample}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8E2] hover:bg-[#EEF1ED] text-[#203331] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                        aria-label="Copy mock invite link"
                      >
                        {copiedSample ? <Check className="h-3.5 w-3.5 text-[#167D78]" /> : <Copy className="h-3.5 w-3.5 text-[#65736F]" />}
                        <span>{copiedSample ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#E8F8EE] border border-[rgba(37,211,102,0.3)] text-[#1B8340] text-xs font-semibold">
                        <MessageCircle className="h-4 w-4 shrink-0" />
                        <span>WhatsApp</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-[#E2E8E2] text-[#203331] text-xs font-semibold shadow-xs">
                        <Share2 className="h-4 w-4 text-[#167D78]" />
                        <span>Share</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 5: CHALLENGES CATALOG (Restrained Coral Highlights) ── */}
        <section id="challenges" className="evo-section py-16 md:py-24 border-t border-[#E2E8E2]" aria-labelledby="challenges-heading">
          <div className="evo-container">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <Badge variant="coral" className="mb-3.5">Curated Dares</Badge>
              <h2 id="challenges-heading" className="font-display font-bold text-[clamp(2rem,3.5vw,3rem)] leading-[1.2] text-[#203331] mb-4 tracking-[-0.01em]">
                {t("landing.challenges.title")}
              </h2>
              <p className="text-[#65736F] text-base sm:text-lg leading-[1.6]">
                {t("landing.challenges.desc")}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 max-w-5xl mx-auto mb-10">
              <ChallengeChip icon={Music} label="Dance" isCoral={false} />
              <ChallengeChip icon={Mic2} label="Singing" isCoral={true} />
              <ChallengeChip icon={Film} label="Movie Acting" isCoral={false} />
              <ChallengeChip icon={Laugh} label="Mimicry" isCoral={true} />
              <ChallengeChip icon={Zap} label="Funny Voice" isCoral={false} />
              <ChallengeChip icon={Star} label="Custom Dare" isCoral={true} />
            </div>

            {/* Safety policy note */}
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-[#167D78] text-xs sm:text-sm font-medium leading-[1.5]">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <span>EVOAIQU challenges are always safe, consensual, and friendly. Players can decline or keep dares private.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: BOTTOM CALL TO ACTION ────────────────────────── */}
        <section className="evo-section py-20 border-t border-[#E2E8E2] bg-white" aria-labelledby="cta-heading">
          <div className="evo-container">
            <div className="relative overflow-hidden rounded-3xl border border-[#E2E8E2] bg-[#F7F8F4] p-10 md:p-16 text-center shadow-subtle">

              <div className="relative z-10 max-w-2xl mx-auto">
                <Badge variant="teal" className="mb-4">
                  <Zap className="h-3.5 w-3.5" /> Free to Play
                </Badge>
                <h2 id="cta-heading" className="font-display font-bold text-[clamp(2rem,3.5vw,3rem)] text-[#203331] mb-4 leading-[1.2] tracking-[-0.01em]">
                  {t("landing.cta.title")}
                </h2>
                <p className="text-[#65736F] text-base sm:text-lg mb-8 leading-[1.6]">
                  {t("landing.cta.subtitle")}
                </p>
                <Link href="/signup">
                  <Button variant="primary" size="xl" className="font-bold min-w-[220px] shadow-sm">
                    Play Now
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                </Link>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
