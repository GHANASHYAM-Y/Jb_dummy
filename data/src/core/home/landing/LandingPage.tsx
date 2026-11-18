"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Share2, Shield, Clock, Crown, Trophy, Users } from "lucide-react";
import { FuturisticLandingNav } from "@/core/home/landing/FuturisticLandingNav";
import { FuturisticHeroArtwork } from "@/core/home/landing/FuturisticHeroArtwork";
import { FuturisticFooter } from "@/core/home/landing/FuturisticFooter";

interface LandingPageProps {
  initialUser?: { id: string; email?: string } | null;
}

const wrap = "max-w-[1180px] mx-auto px-4 sm:px-7";

export function LandingPage({ initialUser }: LandingPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopy = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const featurePills = [
    { emoji: "⚡", label: "Instant Matchmaking" },
    { emoji: "⏱️", label: "Real-Time 10s Blitz" },
    { emoji: "🤝", label: "Consensual & Safe Dares" },
  ];

  const games = [
    {
      id: "rps",
      emoji: "✊",
      tone: "b-card-hot",
      title: "Rock Paper Scissors",
      tag: "10s Blitz Arena",
      desc: "First to 5 wins. Ten seconds a round, zero stalling, pure nerve.",
      href: "/play/rps",
      cta: "Play RPS",
      hot: true,
    },
    {
      id: "chess",
      emoji: "♟️",
      tone: "b-card-lilac",
      title: "Speed Chess",
      tag: "Live Clock Battles",
      desc: "Real-time chess with a ticking clock. Think fast, move faster.",
      href: "/play/chess",
      cta: "Play Chess",
      hot: false,
    },
    {
      id: "dares",
      emoji: "🎬",
      tone: "b-card-sun",
      title: "Creative Video Dares",
      tag: "24h Stories",
      desc: "Win and pick a dare. Lose and record it. Everyone cheers in Stories.",
      href: "/challenges",
      cta: "Explore Dares",
      hot: false,
    },
  ];

  const steps = [
    {
      n: "1",
      emoji: "🎮",
      title: "Play",
      desc: "Jump into a quick match or challenge a friend with one tap. Matches are fast, fair and server-verified.",
    },
    {
      n: "2",
      emoji: "🏆",
      title: "Win",
      desc: "Take the match and unlock the Dare Studio. You choose the challenge: dance, sing, mimic, act and more.",
    },
    {
      n: "3",
      emoji: "😂",
      title: "Dare",
      desc: "Your rival records a short video. You review it once, approve it, and it lands in the 24-hour Stories reel.",
    },
  ];

  const features = [
    { icon: Share2, tone: "bg-[#FF5A3C] text-white", title: "Instant One-Click Invites", desc: "Share a link and your friend is in your lobby in seconds." },
    { icon: Clock, tone: "bg-[#FFC23D] text-[#1E1B24]", title: "Zero-Stall Matches", desc: "Move timers keep every round snappy so nobody waits around." },
    { icon: Shield, tone: "bg-[#14C49A] text-white", title: "Safe & Consensual", desc: "Creator-controlled visibility, blocking, and 24-hour video expiry." },
    { icon: Crown, tone: "bg-[#8C7BFF] text-white", title: "Bragging Rights", desc: "Track your record, streaks and rematches against your crew." },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF6EC] text-[#1E1B24] selection:bg-[#FF5A3C]/30 relative overflow-x-hidden">
      <FuturisticLandingNav user={initialUser} />

      <main className="flex-1 relative z-10">
        {/* ═══ HERO ═══ */}
        <section id="hero" className="pt-8 sm:pt-12 pb-14 sm:pb-20" aria-labelledby="hero-title">
          <div className={wrap}>
            <div className="relative rounded-[32px] bg-[#FFC23D] border-2 border-[#E9A912] shadow-[0_5px_0_#E9A912] overflow-hidden px-6 sm:px-12 lg:px-16 py-12 sm:py-16">
              <span aria-hidden="true" className="absolute -top-14 -left-12 w-48 h-48 rounded-full bg-white/40" />
              <span aria-hidden="true" className="absolute -bottom-16 left-1/3 w-56 h-56 rounded-full bg-[#14C49A]/35" />
              <span aria-hidden="true" className="absolute -top-10 right-1/3 w-36 h-36 rounded-full bg-[#8C7BFF]/35" />

              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-[#1E1B24] text-xs font-extrabold uppercase tracking-wide -rotate-2">
                    <span aria-hidden="true">🎉</span> Play with friends, dare the loser
                  </span>
                  <h1
                    id="hero-title"
                    className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.02] text-[#1E1B24]"
                  >
                    Win the match.{" "}
                    <span className="text-white [text-shadow:0_4px_0_#1E1B24]">Dare your friend.</span>
                  </h1>
                  <p className="text-[#1E1B24] text-lg sm:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                    EVOAIQU turns quick multiplayer games into big laughs. Beat your friends at Rock Paper Scissors or Speed Chess, then watch them pay up with a video dare.
                  </p>

                  <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                    {featurePills.map((p) => (
                      <span key={p.label} className="b-chip !bg-white !border-[#1E1B24]/15">
                        <span aria-hidden="true">{p.emoji}</span>
                        {p.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-1">
                    <Link
                      href={initialUser ? "/games" : "/signup"}
                      className="evo-btn evo-btn-primary evo-btn-xl font-bold"
                    >
                      {initialUser ? "Open the arena" : "Sign up free"}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                    <a
                      href="#games"
                      className="evo-btn evo-btn-xl font-bold bg-white text-[#1E1B24] border-2 border-[#1E1B24] shadow-[0_4px_0_#1E1B24]"
                    >
                      Play now
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-5 w-full flex items-center justify-center">
                  <FuturisticHeroArtwork />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ GAMES ═══ */}
        <section id="games" className="pb-16 sm:pb-24" aria-labelledby="games-title">
          <div className={wrap}>
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
              <span className="b-chip">🕹️ Pick your game</span>
              <h2 id="games-title" className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-[#1E1B24]">
                What are we playing tonight?
              </h2>
              <p className="text-[#6E6878] text-base sm:text-lg leading-relaxed">
                Fast games, real stakes, zero downloads. Pick one and call in your crew.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {games.map((g) => (
                <article key={g.id} className={`b-card ${g.tone} !p-7 flex flex-col gap-4`}>
                  <div className="flex items-start justify-between">
                    <span className="text-6xl -rotate-6" aria-hidden="true">{g.emoji}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border-2 ${g.hot ? "bg-white/20 border-white/60 text-white" : "bg-white border-[#1E1B24]/15 text-[#1E1B24]"}`}>
                      {g.tag}
                    </span>
                  </div>
                  <h3 className={`font-display font-bold text-2xl sm:text-[1.65rem] ${g.hot ? "text-white" : "text-[#1E1B24]"}`}>
                    {g.title}
                  </h3>
                  <p className={`text-sm sm:text-base leading-relaxed flex-1 ${g.hot ? "text-white" : "text-[#1E1B24]/80"}`}>
                    {g.desc}
                  </p>
                  <Link
                    href={g.href}
                    className={`evo-btn evo-btn-lg font-bold w-full ${g.hot ? "bg-white text-[#C9381F] shadow-[0_4px_0_#C9381F]" : "evo-btn-primary"}`}
                  >
                    {g.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS + FEED PREVIEW ═══ */}
        <section id="how-it-works" className="pb-16 sm:pb-24" aria-labelledby="how-it-works-title">
          <div className={wrap}>
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
              <span className="b-chip">📖 Play, win, dare</span>
              <h2 id="how-it-works-title" className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-[#1E1B24]">
                How the fun works
              </h2>
              <p className="text-[#6E6878] text-base sm:text-lg leading-relaxed">
                Three steps from the first move to the story everyone is talking about.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Steps */}
              <ol className="lg:col-span-7 flex flex-col gap-4">
                {steps.map((s, i) => (
                  <li key={s.n} className={`b-card flex items-start gap-5 !p-6 ${i === 0 ? "b-card-mint" : i === 1 ? "b-card-sun" : "b-card-lilac"}`}>
                    <span className="w-12 h-12 shrink-0 rounded-full bg-white border-2 border-[#1E1B24]/15 grid place-items-center font-display font-bold text-xl">
                      {s.n}
                    </span>
                    <div className="space-y-1.5">
                      <h3 className="font-display font-bold text-2xl text-[#1E1B24]">
                        <span aria-hidden="true">{s.emoji}</span> {s.title}
                      </h3>
                      <p className="text-[#1E1B24]/80 text-base leading-relaxed">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Stories / feed preview */}
              <div className="lg:col-span-5 space-y-4" aria-label="Preview of the EVOAIQU feed">
                <div className="flex gap-4 overflow-hidden px-1 pt-1">
                  {[
                    { n: "You", e: "➕", plain: true },
                    { n: "Maya", e: "💃" },
                    { n: "Arjun", e: "🎤" },
                    { n: "Zoe", e: "😂" },
                  ].map((st) => (
                    <div key={st.n} className="w-[72px] shrink-0 text-center">
                      <div className={st.plain ? "p-[3px] rounded-full border-2 border-dashed border-[#8E8798]" : "b-story-ring"}>
                        <div className="w-[62px] h-[62px] rounded-full bg-[#F5EADC] border-[3px] border-[#FFF6EC] grid place-items-center text-2xl">
                          {st.e}
                        </div>
                      </div>
                      <p className="text-xs font-bold text-[#1E1B24] mt-1.5 truncate">{st.n}</p>
                    </div>
                  ))}
                </div>

                <div className="b-card b-card-hot space-y-3">
                  <p className="text-xs font-extrabold uppercase tracking-wider">Dare owed</p>
                  <p className="font-display font-bold text-2xl leading-snug">🕺 You lost to Maya. Dance like nobody&apos;s watching!</p>
                  <span className="inline-flex items-center min-h-[44px] px-5 rounded-full bg-white text-[#C9381F] font-bold text-sm">
                    Record now
                  </span>
                </div>

                <div className="b-card flex items-center gap-4">
                  <span className="w-12 h-12 rounded-full bg-[#E3FAF3] grid place-items-center text-2xl" aria-hidden="true">🏆</span>
                  <div className="min-w-0">
                    <p className="font-bold text-[#1E1B24]">You beat Arjun 5–3</p>
                    <p className="text-sm text-[#6E6878]">Pick a dare for the loser. 👀</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section id="features" className="pb-16 sm:pb-24" aria-labelledby="features-title">
          <div className={wrap}>
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
              <h2 id="features-title" className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-[#1E1B24]">
                Built for friends who love a rematch
              </h2>
              <p className="text-[#6E6878] text-base sm:text-lg leading-relaxed">
                Fair play, zero stalling, and maximum fun.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map(({ icon: Icon, tone, title, desc }) => (
                <div key={title} className="b-card !p-6 space-y-3">
                  <span className={`w-12 h-12 rounded-[18px] grid place-items-center ${tone}`}>
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="font-display font-bold text-xl text-[#1E1B24]">{title}</h3>
                  <p className="text-sm text-[#6E6878] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="pb-16 sm:pb-24" aria-labelledby="cta-heading">
          <div className={wrap}>
            <div className="b-card b-card-hot !rounded-[32px] !p-8 sm:!p-14 text-center space-y-5 relative overflow-hidden">
              <span aria-hidden="true" className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#FFC23D]/60" />
              <span aria-hidden="true" className="absolute -bottom-12 -right-8 w-44 h-44 rounded-full bg-[#8C7BFF]/50" />
              <div className="relative space-y-5">
                <div className="flex justify-center gap-3 text-5xl" aria-hidden="true">
                  <span className="-rotate-6">🎮</span>
                  <span>🏆</span>
                  <span className="rotate-6">🎬</span>
                </div>
                <h2 id="cta-heading" className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight">
                  Ready for your first dare?
                </h2>
                <p className="text-white text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                  Sign up in seconds, invite your friends, and find out who plays and who pays.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Link
                    href={initialUser ? "/games" : "/signup"}
                    className="evo-btn evo-btn-xl font-bold bg-white text-[#C9381F] shadow-[0_4px_0_#C9381F]"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    {initialUser ? "Open the arena" : "Sign up free"}
                  </Link>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="evo-btn evo-btn-xl font-bold bg-white/20 text-white border-2 border-white/60 cursor-pointer"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    {copiedLink ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FuturisticFooter />
    </div>
  );
}
