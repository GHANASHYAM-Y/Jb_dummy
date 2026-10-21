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
    <div className="flex flex-col min-h-screen bg-[#F7F8F4] text-[#203331]">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero Section ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-16 sm:py-24 border-b border-[#E2E8E2] bg-white">
          <div className="evo-container max-w-4xl text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DDF2EB] border border-[rgba(22,125,120,0.25)] text-[#167D78] text-xs font-bold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              About EVOAIQU
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-[#203331] tracking-tight leading-[1.15]">
              Play the Game. <br className="hidden sm:inline" />
              <span className="text-[#167D78]">Dare the Moment.</span>
            </h1>

            <p className="text-[#65736F] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              EVOAIQU is a next-generation social gaming platform where skill-based multiplayer matches
              unlock real-world creative dares, hilarious video stories, and lasting friendships.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup">
                <Button variant="primary" size="lg" className="font-bold shadow-md">
                  Join EVOAIQU Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/how-to-play">
                <Button variant="secondary" size="lg" className="font-semibold">
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Core Philosophy ───────────────────────────────────────────── */}
        <section className="py-16 sm:py-20">
          <div className="evo-container max-w-5xl space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#203331]">
                Why We Built EVOAIQU
              </h2>
              <p className="text-[#65736F] text-sm sm:text-base leading-relaxed">
                Traditional social apps focus on passive scrolling. Standard online games focus only on leaderboards.
                EVOAIQU bridges the gap by turning online competitive victories into genuine, lighthearted social moments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pillar 1 */}
              <div className="rounded-3xl border border-[#E2E8E2] bg-white p-7 shadow-xs hover:border-[#167D78] transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#DDF2EB] flex items-center justify-center text-[#167D78]">
                  <Gamepad2 className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-xl text-[#203331]">
                  Pure Skill Gaming
                </h3>
                <p className="text-[#65736F] text-sm leading-relaxed">
                  Fast, server-authoritative multiplayer games like First-to-5 Rock Paper Scissors and Speed Chess.
                  No pay-to-win, no rng hacks — pure tactical mastery.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="rounded-3xl border border-[#E2E8E2] bg-white p-7 shadow-xs hover:border-[#D95F49] transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FCE6DE] flex items-center justify-center text-[#D95F49]">
                  <Flame className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-xl text-[#203331]">
                  Creative Video Dares
                </h3>
                <p className="text-[#65736F] text-sm leading-relaxed">
                  Win the match, and choose a creative dare for your friend: dance, sing, mimic, or act!
                  Losers submit short, authentic video dares to settle the score.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="rounded-3xl border border-[#E2E8E2] bg-white p-7 shadow-xs hover:border-[#167D78] transition-all space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EEF1ED] flex items-center justify-center text-[#203331]">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-xl text-[#203331]">
                  Privacy & Safety First
                </h3>
                <p className="text-[#65736F] text-sm leading-relaxed">
                  Creator-controlled public or private visibility, single-use winner review, bidirectional blocking,
                  and automated 24-hour permanent video lifecycle deletion.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Key Standards & Trust ─────────────────────────────────────── */}
        <section className="py-16 bg-white border-t border-b border-[#E2E8E2]">
          <div className="evo-container max-w-4xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="font-display font-bold text-2xl text-[#203331]">
                Our Privacy & Community Commitments
              </h2>
              <p className="text-[#65736F] text-sm">
                How we protect our players and maintain a respectful social environment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F7F8F4] border border-[#E2E8E2]">
                <CheckCircle2 className="h-5 w-5 text-[#167D78] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-[#203331]">24-Hour Ephemeral Retention</p>
                  <p className="text-xs text-[#65736F] mt-1">
                    Stories automatically expire after 24 hours, and actual video files are permanently deleted through our server cleanup engine.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F7F8F4] border border-[#E2E8E2]">
                <Lock className="h-5 w-5 text-[#167D78] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-[#203331]">Creator Visibility Choice</p>
                  <p className="text-xs text-[#65736F] mt-1">
                    The dare performer decides whether their submission is shared publicly or kept private strictly between match participants.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F7F8F4] border border-[#E2E8E2]">
                <Shield className="h-5 w-5 text-[#167D78] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-[#203331]">Bidirectional Blocking</p>
                  <p className="text-xs text-[#65736F] mt-1">
                    Blocked users cannot view your profile, search for you, send invitations, or interact with your stories in any way.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F7F8F4] border border-[#E2E8E2]">
                <Trophy className="h-5 w-5 text-[#167D78] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-[#203331]">Server-Authoritative Gameplay</p>
                  <p className="text-xs text-[#65736F] mt-1">
                    All moves, matchmaking timers, match states, and challenge decisions are verified on secure server APIs to prevent tampering.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Ready to Play CTA ─────────────────────────────────────────── */}
        <section className="py-20 text-center">
          <div className="evo-container max-w-xl space-y-6">
            <h2 className="font-display font-bold text-3xl text-[#203331]">
              Ready to challenge your friends?
            </h2>
            <p className="text-[#65736F] text-sm sm:text-base leading-relaxed">
              Create an account in 30 seconds, connect with friends, and discover who will triumph and who will face the dare.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/signup">
                <Button variant="primary" size="lg" className="font-bold shadow-md">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/games">
                <Button variant="secondary" size="lg" className="font-semibold">
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
