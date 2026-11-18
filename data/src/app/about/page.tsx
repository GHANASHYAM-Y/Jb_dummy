import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/core/navigation/Navbar";
import { Footer } from "@/core/navigation/Footer";
import {
  Gamepad2,
  Trophy,
  Shield,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Flame,
  Lock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About EVOAIQU — Social Gaming & Creative Dares",
  description:
    "Learn about EVOAIQU: where skill-based multiplayer gaming meets creative real-world video dares and 24-hour Stories.",
};

const pillars = [
  {
    icon: Gamepad2,
    emoji: "🎮",
    tone: "b-card-mint",
    iconTone: "bg-[#14C49A] text-white",
    title: "Pure Skill Gaming",
    desc: "Fast, server-authoritative multiplayer games like First-to-5 Rock Paper Scissors and Speed Chess. No pay-to-win, no rng hacks — pure tactical mastery.",
  },
  {
    icon: Flame,
    emoji: "🎬",
    tone: "b-card-lilac",
    iconTone: "bg-[#8C7BFF] text-white",
    title: "Creative Video Dares",
    desc: "Win the match, and choose a creative dare for your friend: dance, sing, mimic, or act! Losers submit short, authentic video dares to settle the score.",
  },
  {
    icon: Shield,
    emoji: "🛡️",
    tone: "b-card-sun",
    iconTone: "bg-[#1E1B24] text-white",
    title: "Privacy & Safety First",
    desc: "Creator-controlled public or private visibility, single-use winner review, bidirectional blocking, and automated 24-hour permanent video lifecycle deletion.",
  },
];

const commitments = [
  {
    icon: CheckCircle2,
    title: "24-Hour Ephemeral Retention",
    desc: "Stories automatically expire after 24 hours, and actual video files are permanently deleted through our server cleanup engine.",
  },
  {
    icon: Lock,
    title: "Creator Visibility Choice",
    desc: "The dare performer decides whether their submission is shared publicly or kept private strictly between match participants.",
  },
  {
    icon: Shield,
    title: "Bidirectional Blocking",
    desc: "Blocked users cannot view your profile, search for you, send invitations, or interact with your stories in any way.",
  },
  {
    icon: Trophy,
    title: "Server-Authoritative Gameplay",
    desc: "All moves, matchmaking timers, match states, and challenge decisions are verified on secure server APIs to prevent tampering.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFF6EC] text-[#1E1B24] relative overflow-x-hidden">
      <Navbar />

      <main className="flex-1 relative">
        {/* ── Hero ── */}
        <section className="px-4 sm:px-7 pt-8 sm:pt-12">
          <div className="relative max-w-[1100px] mx-auto rounded-[32px] bg-[#FFC23D] border-2 border-[#E9A912] shadow-[0_5px_0_#E9A912] overflow-hidden px-6 sm:px-12 py-12 sm:py-16 text-center">
            <span aria-hidden="true" className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/40" />
            <span aria-hidden="true" className="absolute -bottom-12 right-8 w-44 h-44 rounded-full bg-[#8C7BFF]/35" />
            <span aria-hidden="true" className="absolute top-6 right-[10%] text-5xl rotate-12 hidden sm:block">🎯</span>
            <span aria-hidden="true" className="absolute bottom-6 left-[8%] text-5xl -rotate-12 hidden sm:block">🎬</span>
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-[#1E1B24] text-[#1E1B24] text-xs font-extrabold tracking-wide uppercase -rotate-2">
                <Sparkles className="h-3.5 w-3.5 text-[#FF5A3C]" />
                About EVOAIQU
              </div>
              <h1 className="font-display font-bold text-4xl sm:text-6xl text-[#1E1B24] tracking-tight leading-[1.08]">
                Play the Game. <br className="hidden sm:inline" />
                <span className="text-white [text-shadow:0_3px_0_#1E1B24]">Dare the Moment.</span>
              </h1>
              <p className="text-[#1E1B24] text-base sm:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                EVOAIQU is a next-generation social gaming platform where skill-based multiplayer matches
                unlock real-world creative dares, hilarious video stories, and lasting friendships.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup" className="evo-btn evo-btn-primary evo-btn-lg font-bold">
                  Join EVOAIQU Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
                <Link href="/how-to-play" className="evo-btn evo-btn-lg font-bold bg-white text-[#1E1B24] border-2 border-[#1E1B24]">
                  How It Works
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why ── */}
        <section className="px-4 sm:px-7 py-14 sm:py-20">
          <div className="max-w-[1100px] mx-auto space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#1E1B24] tracking-tight">
                Why We Built EVOAIQU
              </h2>
              <p className="text-[#6E6878] text-base sm:text-lg leading-relaxed">
                Traditional social apps focus on passive scrolling. Standard online games focus only on leaderboards.
                EVOAIQU bridges the gap by turning online competitive victories into genuine, lighthearted social moments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {pillars.map(({ icon: Icon, emoji, tone, iconTone, title, desc }, i) => (
                <div key={title} className={`b-card ${tone} space-y-4 !p-7 ${i === 1 ? "md:-rotate-1" : i === 2 ? "md:rotate-1" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center ${iconTone}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <span className="text-4xl" aria-hidden="true">{emoji}</span>
                  </div>
                  <h3 className="font-display font-bold text-2xl text-[#1E1B24]">{title}</h3>
                  <p className="text-[#1E1B24]/80 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Commitments ── */}
        <section className="px-4 sm:px-7 pb-14 sm:pb-20">
          <div className="max-w-[860px] mx-auto space-y-8">
            <div className="text-center space-y-3">
              <h2 className="font-display font-bold text-3xl text-[#1E1B24] tracking-tight">
                Our Privacy &amp; Community Commitments
              </h2>
              <p className="text-[#6E6878] text-sm sm:text-base leading-relaxed">
                How we protect our players and maintain a respectful social environment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {commitments.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="b-card flex items-start gap-4 !p-6">
                  <span className="w-11 h-11 shrink-0 rounded-full bg-[#FFC23D] text-[#1E1B24] flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display font-bold text-lg text-[#1E1B24]">{title}</p>
                    <p className="text-sm text-[#6E6878] mt-1.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-4 sm:px-7 pb-16">
          <div className="b-card b-card-hot max-w-[860px] mx-auto !rounded-[32px] text-center !p-8 sm:!p-12 space-y-5">
            <div className="text-5xl" aria-hidden="true">🏆</div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
              Ready to challenge your friends?
            </h2>
            <p className="text-white text-base leading-relaxed max-w-lg mx-auto">
              Create an account in 30 seconds, connect with friends, and discover who will triumph and who will face the dare.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="evo-btn evo-btn-lg font-bold bg-white text-[#C9381F] shadow-[0_4px_0_#C9381F]">
                Get Started Free
              </Link>
              <Link href="/games" className="evo-btn evo-btn-lg font-bold bg-white/20 text-white border-2 border-white/60">
                Browse Games
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
