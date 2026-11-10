import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "EVOAIQU Privacy Policy — how JE Labs collects, uses and protects your data.",
};

export default function PrivacyPage() {
  const sections = [
    {
      title: "Information We Collect",
      content: [
        "Account information: display name, email address, and hashed password managed securely by Supabase Auth.",
        "Profile data: your EVOAIQU ID, avatar, bio, and language preference.",
        "Game data: match history, moves, scores, and challenge records.",
        "Optional submissions: video or text challenge responses that you explicitly consent to share.",
        "Usage data: page views and feature interactions to improve the product.",
      ],
    },
    {
      title: "How We Use Your Information",
      content: [
        "To operate and improve the EVOAIQU platform.",
        "To match you with friends or opponents.",
        "To send game invitations, challenge notifications, and account alerts.",
        "To moderate content and enforce our community standards.",
        "We do not sell your personal data to third parties.",
      ],
    },
    {
      title: "Challenge Submissions & Consent",
      content: [
        "Challenges are private by default and visible only to the participants.",
        "Video or text submissions require your explicit consent before publication.",
        "You may delete your submission at any time.",
        "Public challenge posts are moderated before appearing on the feed.",
        "We never display unapproved or non-consented content publicly.",
      ],
    },
    {
      title: "Data Security",
      content: [
        "All data is stored in Supabase PostgreSQL with Row Level Security enabled.",
        "Authentication is handled by Supabase Auth with industry-standard hashing.",
        "We use HTTPS and secure cookie sessions for all communication.",
        "Storage access policies prevent unauthorised access to private files.",
      ],
    },
    {
      title: "Your Rights",
      content: [
        "You may request a copy of your personal data at any time.",
        "You may delete your account and all associated data from Settings.",
        "You may opt out of non-essential communications.",
        "Contact us at privacy@jelabs.in for any data requests.",
      ],
    },
    {
      title: "Contact",
      content: [
        "JE Labs — privacy@jelabs.in",
        "This policy was last updated: October 2026.",
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#070B25] text-[#F5F7FF] relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-radial from-[#315BFF]/15 via-[#8B2CFF]/10 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <Navbar />
      <main className="flex-1 py-16 sm:py-24 relative z-10">
        <div className="evo-container max-w-3xl px-4">
          <div className="mb-12 animate-fade-in text-center sm:text-left space-y-3">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#101638] border border-[#39DFFF]/30 text-[#39DFFF] text-xs font-bold uppercase tracking-wider">
              Legal & Trust
            </span>
            <h1 className="font-display font-black text-3xl sm:text-5xl text-[#F5F7FF] tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-[#B8C3E0] text-base leading-relaxed">
              JE Labs takes your privacy seriously. This policy explains what data EVOAIQU collects and how we use it.
            </p>
          </div>

          <hr className="border-t border-[#1C2758] my-8 opacity-60" />

          <div className="flex flex-col gap-6">
            {sections.map(({ title, content }, i) => (
              <div
                key={title}
                className="bg-[#101638]/90 backdrop-blur-md border border-[rgba(57,223,255,0.15)] rounded-2xl p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-[#39DFFF]/40 transition-all animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <h2 className="font-display font-bold text-xl text-[#F5F7FF] mb-4 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#39DFFF]" />
                  {title}
                </h2>
                <ul className="space-y-3">
                  {content.map((item, j) => (
                    <li key={j} className="text-[#B8C3E0] text-sm leading-relaxed flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#39DFFF]/70 mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
