import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui";
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

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#070B25] text-[#F5F7FF] relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-radial from-[#315BFF]/15 via-[#8B2CFF]/10 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 right-0 w-[500px] h-[500px] bg-radial from-[#39DFFF]/10 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <Navbar />

      <main className="flex-1 relative z-10">
        {/* ── Hero Section ──────────────────────────────────────────────── */}
        <section className="py-20 sm:py-28 relative">
          <div className="evo-container max-w-4xl text-center space-y-7 animate-fade-in px-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#101638] border border-[#39DFFF]/30 text-[#39DFFF] text-xs font-bold tracking-wide uppercase shadow-[0_0_16px_rgba(57,223,255,0.2)]">
              <Sparkles className="h-3.5 w-3.5" />
              About EVOAIQU
            </div>

            <h1 className="font-display font-black text-4xl sm:text-6xl text-[#F5F7FF] tracking-tight leading-[1.12]">
              Play the Game. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#39DFFF] via-[#7B61FF] to-[#8B2CFF]">
                Dare the Moment.
              </span>
            </h1>

            <p className="text-[#B8C3E0] text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
              EVOAIQU is a next-generation social gaming platform where skill-based multiplayer matches
              unlock real-world creative dares, hilarious video stories, and lasting friendships.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <Button
                  variant="primary"
                  size="lg"
                  className="font-bold shadow-[0_0_24px_rgba(49,91,255,0.45)] hover:shadow-[0_0_32px_rgba(57,223,255,0.6)] px-8 py-3.5 text-base"
                >
                  Join EVOAIQU Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/how-to-play">
                <Button
                  variant="secondary"
                  size="lg"
                  className="font-semibold bg-[#101638] hover:bg-[#151D48] text-[#F5F7FF] border border-[#1C2758] hover:border-[#39DFFF]/40 px-8 py-3.5 text-base"
                >
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <hr className="border-t border-[#1C2758] max-w-5xl mx-auto my-4 opacity-60" />

        {/* ── Core Philosophy ───────────────────────────────────────────── */}
        <section className="py-20 sm:py-24">
          <div className="evo-container max-w-5xl space-y-16 px-4">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight">
                Why We Built EVOAIQU
              </h2>
              <p className="text-[#B8C3E0] text-base sm:text-lg leading-relaxed">
                Traditional social apps focus on passive scrolling. Standard online games focus only on leaderboards.
                EVOAIQU bridges the gap by turning online competitive victories into genuine, lighthearted social moments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pillar 1 */}
              <div className="rounded-2xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-md p-8 shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-[#39DFFF]/50 hover:shadow-[0_12px_40px_rgba(57,223,255,0.15)] transition-all space-y-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#39DFFF]/20 to-[#315BFF]/30 border border-[#39DFFF]/40 flex items-center justify-center text-[#39DFFF] shadow-[0_0_16px_rgba(57,223,255,0.25)]">
                  <Gamepad2 className="h-7 w-7" />
                </div>
                <h3 className="font-display font-bold text-2xl text-[#F5F7FF]">
                  Pure Skill Gaming
                </h3>
                <p className="text-[#B8C3E0] text-sm leading-relaxed">
                  Fast, server-authoritative multiplayer games like First-to-5 Rock Paper Scissors and Speed Chess.
                  No pay-to-win, no rng hacks — pure tactical mastery.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="rounded-2xl border border-[rgba(139,44,255,0.3)] bg-[#101638]/90 backdrop-blur-md p-8 shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-[#8B2CFF]/60 hover:shadow-[0_12px_40px_rgba(139,44,255,0.2)] transition-all space-y-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#8B2CFF]/25 to-[#FF5370]/20 border border-[#8B2CFF]/40 flex items-center justify-center text-[#B87DFF] shadow-[0_0_16px_rgba(139,44,255,0.25)]">
                  <Flame className="h-7 w-7" />
                </div>
                <h3 className="font-display font-bold text-2xl text-[#F5F7FF]">
                  Creative Video Dares
                </h3>
                <p className="text-[#B8C3E0] text-sm leading-relaxed">
                  Win the match, and choose a creative dare for your friend: dance, sing, mimic, or act!
                  Losers submit short, authentic video dares to settle the score.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="rounded-2xl border border-[rgba(57,223,255,0.2)] bg-[#101638]/90 backdrop-blur-md p-8 shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-[#39DFFF]/50 hover:shadow-[0_12px_40px_rgba(57,223,255,0.15)] transition-all space-y-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#315BFF]/25 to-[#39DFFF]/20 border border-[#315BFF]/40 flex items-center justify-center text-[#39DFFF] shadow-[0_0_16px_rgba(49,91,255,0.25)]">
                  <Shield className="h-7 w-7" />
                </div>
                <h3 className="font-display font-bold text-2xl text-[#F5F7FF]">
                  Privacy & Safety First
                </h3>
                <p className="text-[#B8C3E0] text-sm leading-relaxed">
                  Creator-controlled public or private visibility, single-use winner review, bidirectional blocking,
                  and automated 24-hour permanent video lifecycle deletion.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-t border-[#1C2758] max-w-5xl mx-auto my-4 opacity-60" />

        {/* ── Key Standards & Trust ─────────────────────────────────────── */}
        <section className="py-20 sm:py-24">
          <div className="evo-container max-w-4xl space-y-12 px-4">
            <div className="text-center space-y-3">
              <h2 className="font-display font-extrabold text-3xl text-[#F5F7FF] tracking-tight">
                Our Privacy & Community Commitments
              </h2>
              <p className="text-[#B8C3E0] text-sm sm:text-base leading-relaxed">
                How we protect our players and maintain a respectful social environment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-[#101638]/80 border border-[#1C2758] hover:border-[#39DFFF]/30 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-[#39DFFF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-base text-[#F5F7FF]">24-Hour Ephemeral Retention</p>
                  <p className="text-sm text-[#B8C3E0] mt-1.5 leading-relaxed">
                    Stories automatically expire after 24 hours, and actual video files are permanently deleted through our server cleanup engine.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-[#101638]/80 border border-[#1C2758] hover:border-[#39DFFF]/30 transition-colors">
                <Lock className="h-6 w-6 text-[#39DFFF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-base text-[#F5F7FF]">Creator Visibility Choice</p>
                  <p className="text-sm text-[#B8C3E0] mt-1.5 leading-relaxed">
                    The dare performer decides whether their submission is shared publicly or kept private strictly between match participants.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-[#101638]/80 border border-[#1C2758] hover:border-[#39DFFF]/30 transition-colors">
                <Shield className="h-6 w-6 text-[#39DFFF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-base text-[#F5F7FF]">Bidirectional Blocking</p>
                  <p className="text-sm text-[#B8C3E0] mt-1.5 leading-relaxed">
                    Blocked users cannot view your profile, search for you, send invitations, or interact with your stories in any way.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-[#101638]/80 border border-[#1C2758] hover:border-[#39DFFF]/30 transition-colors">
                <Trophy className="h-6 w-6 text-[#39DFFF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-base text-[#F5F7FF]">Server-Authoritative Gameplay</p>
                  <p className="text-sm text-[#B8C3E0] mt-1.5 leading-relaxed">
                    All moves, matchmaking timers, match states, and challenge decisions are verified on secure server APIs to prevent tampering.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-t border-[#1C2758] max-w-5xl mx-auto my-4 opacity-60" />

        {/* ── Ready to Play CTA ─────────────────────────────────────────── */}
        <section className="py-24 text-center">
          <div className="evo-container max-w-2xl space-y-8 px-4">
            <h2 className="font-display font-black text-3xl sm:text-4xl text-[#F5F7FF] tracking-tight">
              Ready to challenge your friends?
            </h2>
            <p className="text-[#B8C3E0] text-base leading-relaxed">
              Create an account in 30 seconds, connect with friends, and discover who will triumph and who will face the dare.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Link href="/signup">
                <Button
                  variant="primary"
                  size="lg"
                  className="font-bold shadow-[0_0_24px_rgba(49,91,255,0.45)] hover:shadow-[0_0_32px_rgba(57,223,255,0.6)] px-8 py-3.5 text-base"
                >
                  Get Started Free
                </Button>
              </Link>
              <Link href="/games">
                <Button
                  variant="secondary"
                  size="lg"
                  className="font-semibold bg-[#101638] hover:bg-[#151D48] text-[#F5F7FF] border border-[#1C2758] hover:border-[#39DFFF]/40 px-8 py-3.5 text-base"
                >
                  Browse Games
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
