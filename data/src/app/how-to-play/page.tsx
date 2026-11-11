import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/core/navigation/Navbar";
import { Footer } from "@/core/navigation/Footer";
import { Button } from "@/shared/ui";
import {
  Gamepad2,
  Trophy,
  Film,
  Camera,
  Clock,
  ArrowRight,
  HelpCircle,
  Eye,
  Lock,
  Globe,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How to Play — EVOAIQU Rules & Dare System",
  description:
    "Learn the rules of EVOAIQU: From 10-second Rock Paper Scissors matches to creative video dares and 24-hour Story reels.",
};

export default function HowToPlayPage() {
  const steps = [
    {
      num: "01",
      icon: Gamepad2,
      badge: "The Battle",
      badgeColor: "bg-[#DDF2EB] text-[#167D78]",
      title: "Choose a Game & Match Up",
      desc: "Jump into Quick Play for instant random matchmaking, or invite a friend directly through chat or private link. Enter a First-to-5 Rock Paper Scissors duel with intense 10-second move rounds.",
    },
    {
      num: "02",
      icon: Trophy,
      badge: "The Victory",
      badgeColor: "bg-[#DDF2EB] text-[#167D78]",
      title: "Win the Match & Pick a Dare",
      desc: "Reach 5 round wins first to claim victory. The winner instantly unlocks the Dare Studio to assign a fun challenge: Dance, Singing, Acting, Mimicry, Tongue Twister, Comedy, or a Custom dare.",
    },
    {
      num: "03",
      icon: Camera,
      badge: "The Dare",
      badgeColor: "bg-[#FCE6DE] text-[#D95F49]",
      title: "Record & Submit the Video",
      desc: "The loser has 24 hours to record or upload a short, authentic 10-second video dare. The performer chooses Public visibility (shared with all friends and discoverable) or Private (only between participants).",
    },
    {
      num: "04",
      icon: Eye,
      badge: "The Review",
      badgeColor: "bg-[#EEF1ED] text-[#203331]",
      title: "One-Time Winner Review",
      desc: "Only the verified match winner receives access to a single-use review session. The winner watches the submission once and either approves it or requests a one-time retry.",
    },
    {
      num: "05",
      icon: Film,
      badge: "The Story",
      badgeColor: "bg-[#DDF2EB] text-[#167D78]",
      title: "24-Hour Ephemeral Stories Reel",
      desc: "Approved dares join the dynamic 24-hour Stories reel in Chat & Stories. Friends can cheer and react before the media is permanently deleted by our automated retention cleanup engine.",
    },
  ];

  const dareCategories = [
    { title: "Dance", desc: "Show off a signature dance move or viral groove.", icon: "💃" },
    { title: "Singing", desc: "Sing a chorus or perform an operatic high note.", icon: "🎤" },
    { title: "Acting", desc: "Deliver a dramatic movie monologue with passion.", icon: "🎭" },
    { title: "Mimicry", desc: "Impersonate a famous celebrity or cartoon character.", icon: "🦜" },
    { title: "Tongue Twister", desc: "Recite an impossible tongue twister 3 times fast.", icon: "⚡" },
    { title: "Comedy", desc: "Deliver a punchline or hilarious quick skit.", icon: "😂" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#070B25] text-[#F5F7FF] relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-radial from-[#315BFF]/15 via-[#8B2CFF]/10 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-0 w-[500px] h-[500px] bg-radial from-[#39DFFF]/10 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <Navbar />

      <main className="flex-1 relative z-10">
        {/* ── Hero Section ──────────────────────────────────────────────── */}
        <section className="py-20 sm:py-28 relative">
          <div className="evo-container max-w-4xl text-center space-y-7 animate-fade-in px-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#101638] border border-[#39DFFF]/30 text-[#39DFFF] text-xs font-bold tracking-wide uppercase shadow-[0_0_16px_rgba(57,223,255,0.2)]">
              <HelpCircle className="h-3.5 w-3.5" />
              Game Guide & Rules • How to Play
            </div>

            <h1 className="font-display font-black text-4xl sm:text-6xl text-[#F5F7FF] tracking-tight leading-[1.12]">
              How EVOAIQU Works: <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#39DFFF] via-[#7B61FF] to-[#8B2CFF]">
                5 Simple Steps to Fun
              </span>
            </h1>

            <p className="text-[#B8C3E0] text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
              From the opening Rock Paper Scissors move to the viral dare video, here is everything you need to know
              about how matches, challenges, and 24-hour stories work.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link href="/games">
                <Button
                  variant="primary"
                  size="lg"
                  className="font-bold shadow-[0_0_24px_rgba(49,91,255,0.45)] hover:shadow-[0_0_32px_rgba(57,223,255,0.6)] px-8 py-3.5 text-base"
                >
                  Enter Game Arena
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="secondary"
                  size="lg"
                  className="font-semibold bg-[#101638] hover:bg-[#151D48] text-[#F5F7FF] border border-[#1C2758] hover:border-[#39DFFF]/40 px-8 py-3.5 text-base"
                >
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <hr className="border-t border-[#1C2758] max-w-5xl mx-auto my-4 opacity-60" />

        {/* ── Step-by-Step Flow ─────────────────────────────────────────── */}
        <section className="py-20 sm:py-24">
          <div className="evo-container max-w-4xl flex flex-col gap-14 px-4">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight">
                The Complete Gameplay Loop
              </h2>
              <p className="text-[#B8C3E0] text-base leading-relaxed">
                Fast, fair, and authoritatively verified on the server from start to finish.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.num}
                    className="flex flex-col sm:flex-row items-start gap-6 p-7 sm:p-8 rounded-2xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-[#39DFFF]/50 hover:shadow-[0_12px_40px_rgba(57,223,255,0.15)] transition-all group"
                  >
                    <div className="flex items-center gap-4 sm:flex-col sm:items-center shrink-0">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#39DFFF]/20 to-[#315BFF]/30 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] group-hover:scale-105 transition-transform shadow-[0_0_16px_rgba(57,223,255,0.25)]">
                        <Icon className="h-8 w-8" />
                      </div>
                      <span className="font-mono font-bold text-xs text-[#39DFFF] tracking-wider uppercase">
                        Step {step.num}
                      </span>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#39DFFF]/15 text-[#39DFFF] border border-[#39DFFF]/30">
                          {step.badge}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-2xl text-[#F5F7FF]">
                        {step.title}
                      </h3>
                      <p className="text-[#B8C3E0] text-base leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <hr className="border-t border-[#1C2758] max-w-5xl mx-auto my-4 opacity-60" />

        {/* ── Dare Catalog Categories ───────────────────────────────────── */}
        <section className="py-20 sm:py-24">
          <div className="evo-container max-w-5xl flex flex-col gap-14 px-4">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight">
                Dare Categories
              </h2>
              <p className="text-[#B8C3E0] text-base leading-relaxed">
                Pick from our curated catalog of lighthearted, creative dares or invent your own.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {dareCategories.map((cat) => (
                <div
                  key={cat.title}
                  className="p-6 rounded-2xl bg-[#101638]/90 border border-[#1C2758] hover:border-[#8B2CFF]/50 transition-all hover:shadow-[0_8px_24px_rgba(139,44,255,0.2)] space-y-3"
                >
                  <span className="text-4xl block">{cat.icon}</span>
                  <h4 className="font-display font-bold text-lg text-[#F5F7FF]">
                    {cat.title}
                  </h4>
                  <p className="text-sm text-[#B8C3E0] leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <hr className="border-t border-[#1C2758] max-w-5xl mx-auto my-4 opacity-60" />

        {/* ── Fair Play & Privacy Rules ─────────────────────────────────── */}
        <section className="py-20 sm:py-24">
          <div className="evo-container max-w-4xl flex flex-col gap-12 px-4">
            <div className="text-center space-y-3">
              <h2 className="font-display font-extrabold text-3xl text-[#F5F7FF] tracking-tight">
                Rules & Fair Play Guidelines
              </h2>
              <p className="text-[#B8C3E0] text-base leading-relaxed">
                Keeping the community fun, safe, and positive for everyone.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-[#101638]/80 border border-[#1C2758] hover:border-[#39DFFF]/30 transition-colors space-y-2.5">
                <p className="font-bold text-base text-[#F5F7FF] flex items-center gap-2.5">
                  <Clock className="h-5 w-5 text-[#39DFFF]" />
                  10-Second Move Timer
                </p>
                <p className="text-sm text-[#B8C3E0] leading-relaxed">
                  Rounds auto-resolve if a player runs out of time. Consistent timeouts result in round concessions.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101638]/80 border border-[#1C2758] hover:border-[#39DFFF]/30 transition-colors space-y-2.5">
                <p className="font-bold text-base text-[#F5F7FF] flex items-center gap-2.5">
                  <Lock className="h-5 w-5 text-[#39DFFF]" />
                  Keep It Safe & Respectful
                </p>
                <p className="text-sm text-[#B8C3E0] leading-relaxed">
                  Dares must never involve danger, harm, harassment, or illegal activities. Respect your friends boundaries.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101638]/80 border border-[#1C2758] hover:border-[#39DFFF]/30 transition-colors space-y-2.5">
                <p className="font-bold text-base text-[#F5F7FF] flex items-center gap-2.5">
                  <Globe className="h-5 w-5 text-[#39DFFF]" />
                  Public vs. Private Control
                </p>
                <p className="text-sm text-[#B8C3E0] leading-relaxed">
                  Only the challenge recipient chooses visibility. Match winners cannot force private videos to become public.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101638]/80 border border-[#1C2758] hover:border-[#39DFFF]/30 transition-colors space-y-2.5">
                <p className="font-bold text-base text-[#F5F7FF] flex items-center gap-2.5">
                  <Sparkles className="h-5 w-5 text-[#39DFFF]" />
                  Strict 24-Hour Expiry
                </p>
                <p className="text-sm text-[#B8C3E0] leading-relaxed">
                  All story media is ephemerally retained for 24 hours. Once expired, media cannot be re-streamed or recovered.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-t border-[#1C2758] max-w-5xl mx-auto my-4 opacity-60" />

        {/* ── Bottom CTA ────────────────────────────────────────────────── */}
        <section className="py-24 text-center">
          <div className="evo-container max-w-xl space-y-6 px-4">
            <h2 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight">
              Ready to take your first move?
            </h2>
            <p className="text-[#B8C3E0] text-base leading-relaxed">
              Challenge an online opponent in Quick Play or invite a friend right now.
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Link href="/games">
                <Button
                  variant="primary"
                  size="lg"
                  className="font-bold shadow-[0_0_24px_rgba(49,91,255,0.45)] hover:shadow-[0_0_32px_rgba(57,223,255,0.6)] px-8 py-3.5 text-base"
                >
                  Play Quick Play Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
