import type { Metadata } from "next";
import { Navbar } from "@/core/navigation/Navbar";
import { Footer } from "@/core/navigation/Footer";

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
    <div className="flex flex-col min-h-screen bg-[#FFF6EC] text-[#1E1B24] relative overflow-x-hidden">
      <Navbar />
      <main className="flex-1 py-10 sm:py-16 relative">
        <div className="max-w-[860px] mx-auto px-4 sm:px-7">
          <div className="relative mb-10 rounded-[32px] bg-[#EEEBFF] border-2 border-[#D7D0FF] shadow-[0_5px_0_#D7D0FF] overflow-hidden px-6 sm:px-10 py-9 sm:py-12 space-y-3">
            <span aria-hidden="true" className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[#FFC23D]/70" />
            <span aria-hidden="true" className="absolute -bottom-10 right-24 w-28 h-28 rounded-full bg-[#14C49A]/35" />
            <span aria-hidden="true" className="absolute top-5 right-6 text-4xl rotate-12">🔒</span>
            <span className="relative inline-block px-3.5 py-1.5 rounded-full bg-white border-2 border-[#1E1B24] text-[#1E1B24] text-xs font-extrabold uppercase tracking-wider -rotate-2">
              Legal &amp; Trust
            </span>
            <h1 className="relative font-display font-bold text-4xl sm:text-5xl text-[#1E1B24] tracking-tight">
              Privacy Policy
            </h1>
            <p className="relative text-[#1E1B24]/80 text-base leading-relaxed max-w-xl">
              JE Labs takes your privacy seriously. This policy explains what data EVOAIQU collects and how we use it.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {sections.map(({ title, content }, i) => (
              <section
                key={title}
                className={`b-card ${["", "b-card-mint", "b-card-lilac", "b-card-sun"][i % 4]} !p-6 sm:!p-7`}
              >
                <h2 className="font-display font-bold text-xl text-[#1E1B24] mb-3 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#FF5A3C] shrink-0" aria-hidden="true" />
                  {title}
                </h2>
                <ul className="space-y-3">
                  {content.map((item, j) => (
                    <li key={j} className="text-[#1E1B24]/80 text-sm leading-relaxed flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#FF5A3C] mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
