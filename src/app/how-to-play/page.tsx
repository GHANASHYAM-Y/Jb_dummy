import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui";
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
    <div className="flex flex-col min-h-screen bg-[#F7F8F4] text-[#203331]">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero Section ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-16 sm:py-24 border-b border-[#E2E8E2] bg-white">
          <div className="evo-container max-w-4xl text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-[#167D78] text-xs font-bold tracking-wide uppercase">
              <HelpCircle className="h-3.5 w-3.5" />
              Game Guide & Rules
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-[#203331] tracking-tight leading-[1.15]">
              How EVOAIQU Works: <br className="hidden sm:inline" />
              <span className="text-[#167D78]">5 Simple Steps to Fun</span>
            </h1>

            <p className="text-[#65736F] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              From the opening move to the viral dare video, here is everything you need to know
              about how matches, challenges, and 24-hour stories work.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link href="/games">
                <Button variant="primary" size="lg" className="font-bold shadow-md">
                  Enter Game Arena
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary" size="lg" className="font-semibold">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Step-by-Step Flow ─────────────────────────────────────────── */}
        <section className="py-16 sm:py-20">
          <div className="evo-container max-w-4xl flex flex-col gap-10">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#203331]">
                The Complete Gameplay Loop
              </h2>
              <p className="text-[#65736F] text-sm mt-2">
                Fast, fair, and authoritatively verified on the server from start to finish.
              </p>
            </div>

            <div className="flex flex-col gap-5 sm:gap-6">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.num}
                    className="flex flex-col sm:flex-row items-start gap-6 p-6 sm:p-8 rounded-3xl border border-[#E2E8E2] bg-white shadow-xs hover:border-[#167D78] transition-all group"
                  >
                    <div className="flex items-center gap-4 sm:flex-col sm:items-center shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-[#DDF2EB] flex items-center justify-center text-[#167D78] group-hover:scale-105 transition-transform">
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="font-mono font-bold text-sm text-[#8E9B97]">
                        Step {step.num}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${step.badgeColor}`}>
                          {step.badge}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-xl text-[#203331]">
                        {step.title}
                      </h3>
                      <p className="text-[#65736F] text-sm sm:text-base leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Dare Catalog Categories ───────────────────────────────────── */}
        <section className="py-16 bg-white border-t border-b border-[#E2E8E2]">
          <div className="evo-container max-w-5xl flex flex-col gap-10">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#203331]">
                Dare Categories
              </h2>
              <p className="text-[#65736F] text-sm">
                Pick from our curated catalog of lighthearted, creative dares or invent your own.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {dareCategories.map((cat) => (
                <div
                  key={cat.title}
                  className="p-5 rounded-2xl bg-[#F7F8F4] border border-[#E2E8E2] hover:border-[#167D78] transition-colors space-y-2"
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <h4 className="font-display font-bold text-base text-[#203331]">
                    {cat.title}
                  </h4>
                  <p className="text-xs text-[#65736F] leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Fair Play & Privacy Rules ─────────────────────────────────── */}
        <section className="py-16 sm:py-20">
          <div className="evo-container max-w-4xl flex flex-col gap-8">
            <div className="text-center space-y-2">
              <h2 className="font-display font-bold text-2xl text-[#203331]">
                Rules & Fair Play Guidelines
              </h2>
              <p className="text-[#65736F] text-sm">
                Keeping the community fun, safe, and positive for everyone.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#E2E8E2] space-y-2">
                <p className="font-bold text-sm text-[#203331] flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#167D78]" />
                  10-Second Move Timer
                </p>
                <p className="text-xs text-[#65736F]">
                  Rounds auto-resolve if a player runs out of time. Consistent timeouts result in round concessions.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E2E8E2] space-y-2">
                <p className="font-bold text-sm text-[#203331] flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#167D78]" />
                  Keep It Safe & Respectful
                </p>
                <p className="text-xs text-[#65736F]">
                  Dares must never involve danger, harm, harassment, or illegal activities. Respect your friends boundaries.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E2E8E2] space-y-2">
                <p className="font-bold text-sm text-[#203331] flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#167D78]" />
                  Public vs. Private Control
                </p>
                <p className="text-xs text-[#65736F]">
                  Only the challenge recipient chooses visibility. Match winners cannot force private videos to become public.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E2E8E2] space-y-2">
                <p className="font-bold text-sm text-[#203331] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#167D78]" />
                  Strict 24-Hour Expiry
                </p>
                <p className="text-xs text-[#65736F]">
                  All story media is ephemerally retained for 24 hours. Once expired, media cannot be re-streamed or recovered.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ────────────────────────────────────────────────── */}
        <section className="py-16 text-center border-t border-[#E2E8E2] bg-white">
          <div className="evo-container max-w-xl space-y-5">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#203331]">
              Ready to take your first move?
            </h2>
            <p className="text-[#65736F] text-sm">
              Challenge an online opponent in Quick Play or invite a friend right now.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/games">
                <Button variant="primary" size="lg" className="font-bold shadow-md">
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
