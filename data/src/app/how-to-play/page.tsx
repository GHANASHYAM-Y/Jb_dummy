import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/core/navigation/Navbar";
import { Footer } from "@/core/navigation/Footer";
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
      tone: "b-card-mint",
      iconTone: "bg-[#14C49A] text-white",
      title: "Choose a Game & Match Up",
      desc: "Jump into Quick Play for instant random matchmaking, or invite a friend directly through chat or private link. Enter a First-to-5 Rock Paper Scissors duel with intense 10-second move rounds.",
    },
    {
      num: "02",
      icon: Trophy,
      badge: "The Victory",
      tone: "b-card-sun",
      iconTone: "bg-[#1E1B24] text-white",
      title: "Win the Match & Pick a Dare",
      desc: "Reach 5 round wins first to claim victory. The winner instantly unlocks the Dare Studio to assign a fun challenge: Dance, Singing, Acting, Mimicry, Tongue Twister, Comedy, or a Custom dare.",
    },
    {
      num: "03",
      icon: Camera,
      badge: "The Dare",
      tone: "b-card-lilac",
      iconTone: "bg-[#8C7BFF] text-white",
      title: "Record & Submit the Video",
      desc: "The loser has 24 hours to record or upload a short, authentic 10-second video dare. The performer chooses Public visibility (shared with all friends and discoverable) or Private (only between participants).",
    },
    {
      num: "04",
      icon: Eye,
      badge: "The Review",
      tone: "",
      iconTone: "bg-[#FFC23D] text-[#1E1B24]",
      title: "One-Time Winner Review",
      desc: "Only the verified match winner receives access to a single-use review session. The winner watches the submission once and either approves it or requests a one-time retry.",
    },
    {
      num: "05",
      icon: Film,
      badge: "The Story",
      tone: "b-card-mint",
      iconTone: "bg-[#FF5A3C] text-white",
      title: "24-Hour Ephemeral Stories Reel",
      desc: "Approved dares join the dynamic 24-hour Stories reel in Chat & Stories. Friends can cheer and react before the media is permanently deleted by our automated retention cleanup engine.",
    },
  ];

  const dareCategories = [
    { title: "Dance", desc: "Show off a signature dance move or viral groove.", icon: "💃", tone: "b-card-hot" },
    { title: "Singing", desc: "Sing a chorus or perform an operatic high note.", icon: "🎤", tone: "b-card-lilac" },
    { title: "Acting", desc: "Deliver a dramatic movie monologue with passion.", icon: "🎭", tone: "b-card-sun" },
    { title: "Mimicry", desc: "Impersonate a famous celebrity or cartoon character.", icon: "🦜", tone: "b-card-mint" },
    { title: "Tongue Twister", desc: "Recite an impossible tongue twister 3 times fast.", icon: "⚡", tone: "" },
    { title: "Comedy", desc: "Deliver a punchline or hilarious quick skit.", icon: "😂", tone: "b-card-lilac" },
  ];

  const rules = [
    { icon: Clock, title: "10-Second Move Timer", desc: "Rounds auto-resolve if a player runs out of time. Consistent timeouts result in round concessions." },
    { icon: Lock, title: "Keep It Safe & Respectful", desc: "Dares must never involve danger, harm, harassment, or illegal activities. Respect your friends boundaries." },
    { icon: Globe, title: "Public vs. Private Control", desc: "Only the challenge recipient chooses visibility. Match winners cannot force private videos to become public." },
    { icon: Sparkles, title: "Strict 24-Hour Expiry", desc: "All story media is ephemerally retained for 24 hours. Once expired, media cannot be re-streamed or recovered." },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#FFF6EC] text-[#1E1B24] relative overflow-x-hidden">
      <Navbar />

      <main className="flex-1 relative">
        {/* ── Hero ── */}
        <section className="px-4 sm:px-7 pt-8 sm:pt-12">
          <div className="relative max-w-[1100px] mx-auto rounded-[32px] bg-[#8C7BFF] border-2 border-[#6D5BE0] shadow-[0_5px_0_#6D5BE0] overflow-hidden px-6 sm:px-12 py-12 sm:py-16 text-center">
            <span aria-hidden="true" className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-[#FFC23D]/70" />
            <span aria-hidden="true" className="absolute -bottom-14 -left-8 w-44 h-44 rounded-full bg-[#14C49A]/50" />
            <span aria-hidden="true" className="absolute top-6 left-[8%] text-5xl -rotate-12 hidden sm:block">✊</span>
            <span aria-hidden="true" className="absolute bottom-6 right-[8%] text-5xl rotate-12 hidden sm:block">✌️</span>
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-[#1E1B24] text-[#1E1B24] text-xs font-extrabold tracking-wide uppercase rotate-1">
                <HelpCircle className="h-3.5 w-3.5 text-[#8C7BFF]" />
                Game Guide &amp; Rules • How to Play
              </div>
              <h1 className="font-display font-bold text-4xl sm:text-6xl text-white tracking-tight leading-[1.08] [text-shadow:0_3px_0_#4B3BB8]">
                How EVOAIQU Works: <br className="hidden sm:inline" />
                <span className="text-[#FFC23D]">5 Simple Steps to Fun</span>
              </h1>
              <p className="text-[#1E1B24] text-base sm:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                From the opening Rock Paper Scissors move to the viral dare video, here is everything you need to know
                about how matches, challenges, and 24-hour stories work.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link href="/games" className="evo-btn evo-btn-primary evo-btn-lg font-bold">
                  Enter Game Arena
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
                <Link href="/signup" className="evo-btn evo-btn-lg font-bold bg-white text-[#1E1B24] border-2 border-[#1E1B24]">
                  Sign Up Free
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Steps ── */}
        <section className="px-4 sm:px-7 py-14 sm:py-20">
          <div className="max-w-[860px] mx-auto flex flex-col gap-10">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#1E1B24] tracking-tight">
                The Complete Gameplay Loop
              </h2>
              <p className="text-[#6E6878] text-base leading-relaxed">
                Fast, fair, and authoritatively verified on the server from start to finish.
              </p>
            </div>

            <ol className="flex flex-col gap-5">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <li key={step.num} className={`b-card ${step.tone} flex flex-col sm:flex-row items-start gap-5 !p-6 sm:!p-7`}>
                    <div className="flex items-center gap-4 sm:flex-col sm:items-center shrink-0">
                      <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center ${step.iconTone}`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <span className="font-display font-bold text-sm text-[#1E1B24] tracking-wider uppercase">
                        Step {step.num}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2.5">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-white text-[#1E1B24] border-2 border-[#EADBC8]">
                        {step.badge}
                      </span>
                      <h3 className="font-display font-bold text-2xl text-[#1E1B24]">{step.title}</h3>
                      <p className="text-[#1E1B24]/80 text-base leading-relaxed">{step.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ── Dare categories ── */}
        <section className="px-4 sm:px-7 pb-14 sm:pb-20">
          <div className="max-w-[1100px] mx-auto flex flex-col gap-10">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#1E1B24] tracking-tight">
                Dare Categories
              </h2>
              <p className="text-[#6E6878] text-base leading-relaxed">
                Pick from our curated catalog of lighthearted, creative dares or invent your own.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {dareCategories.map((cat) => (
                <div key={cat.title} className={`b-card ${cat.tone} space-y-2.5 !p-6`}>
                  <span className="text-4xl block" aria-hidden="true">{cat.icon}</span>
                  <h4 className={`font-display font-bold text-xl ${cat.tone === "b-card-hot" ? "text-white" : "text-[#1E1B24]"}`}>{cat.title}</h4>
                  <p className={`text-sm leading-relaxed ${cat.tone === "b-card-hot" ? "text-white" : "text-[#1E1B24]/80"}`}>
                    {cat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Rules ── */}
        <section className="px-4 sm:px-7 pb-14 sm:pb-20">
          <div className="max-w-[860px] mx-auto flex flex-col gap-8">
            <div className="text-center space-y-3">
              <h2 className="font-display font-bold text-3xl text-[#1E1B24] tracking-tight">
                Rules &amp; Fair Play Guidelines
              </h2>
              <p className="text-[#6E6878] text-base leading-relaxed">
                Keeping the community fun, safe, and positive for everyone.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rules.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="b-card space-y-2.5 !p-6">
                  <p className="font-display font-bold text-lg text-[#1E1B24] flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-[#FFC23D] flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </span>
                    {title}
                  </p>
                  <p className="text-sm text-[#6E6878] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-4 sm:px-7 pb-16">
          <div className="b-card b-card-hot max-w-[760px] mx-auto !rounded-[32px] text-center !p-8 sm:!p-12 space-y-4">
            <div className="text-5xl" aria-hidden="true">✊</div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
              Ready to take your first move?
            </h2>
            <p className="text-white text-base leading-relaxed">
              Challenge an online opponent in Quick Play or invite a friend right now.
            </p>
            <div className="pt-2 flex justify-center">
              <Link href="/games" className="evo-btn evo-btn-lg font-bold bg-white text-[#C9381F] shadow-[0_4px_0_#C9381F]">
                Play Quick Play Now
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
