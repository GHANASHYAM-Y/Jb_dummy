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
    <div className="flex flex-col min-h-screen bg-[#F7F8F4]">
      <Navbar />
      <main className="flex-1 evo-section py-12">
        <div className="evo-container max-w-3xl">
          <div className="mb-10 animate-fade-in text-center sm:text-left">
            <h1 className="font-display font-bold text-4xl text-[#203331] mb-3">Privacy Policy</h1>
            <p className="text-[#65736F] leading-relaxed">
              JE Labs takes your privacy seriously. This policy explains what data EVOAIQU collects and how we use it.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {sections.map(({ title, content }, i) => (
              <div
                key={title}
                className="bg-white border border-[#E2E8E2] rounded-2xl p-6 shadow-sm animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <h2 className="font-display font-bold text-lg text-[#203331] mb-3">{title}</h2>
                <ul className="space-y-2.5">
                  {content.map((item, j) => (
                    <li key={j} className="text-[#65736F] text-sm leading-relaxed flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#167D78] mt-2 flex-shrink-0" />
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
