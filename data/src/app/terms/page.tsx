import type { Metadata } from "next";
import { Navbar } from "@/core/navigation/Navbar";
import { Footer } from "@/core/navigation/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "EVOAIQU Terms of Service — the rules for using JE Labs' social gaming platform.",
};

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By creating an EVOAIQU account or using any JE Labs service, you agree to these Terms of Service. If you do not agree, do not use the platform.",
    },
    {
      title: "2. Eligibility",
      content: "You must be at least 13 years old to use EVOAIQU. If you are under 18, you must have parental consent. We reserve the right to terminate accounts that violate this requirement.",
    },
    {
      title: "3. Acceptable Use",
      content: "You agree not to: (a) post or share illegal, harassing, threatening, discriminatory, or sexually exploitative content; (b) attempt to manipulate game outcomes through cheating or exploiting bugs; (c) create fake accounts or impersonate others; (d) use automated scripts or bots; (e) reverse-engineer or copy the platform.",
    },
    {
      title: "4. Challenges",
      content: "Challenges must be safe, legal, and respectful. You may not assign challenges that are sexually exploitative, physically dangerous, discriminatory, or designed to harass. JE Labs reserves the right to remove any challenge that violates these rules and may suspend accounts that repeatedly abuse the challenge system.",
    },
    {
      title: "5. Content & Consent",
      content: "You retain ownership of content you create. By publishing a challenge submission, you grant JE Labs a limited licence to display it on the platform. Recordings and videos will only be published with your explicit consent. You may delete your submissions at any time.",
    },
    {
      title: "6. Moderation",
      content: "JE Labs moderates public content before it appears on the feed. We may remove content, suspend accounts, or ban users who repeatedly violate these terms. Moderation decisions may be appealed by contacting support@jelabs.in.",
    },
    {
      title: "7. Intellectual Property",
      content: "The EVOAIQU brand, design system, and platform code are the property of JE Labs. You may not reproduce or distribute them without written permission.",
    },
    {
      title: "8. Disclaimer",
      content: "EVOAIQU is provided 'as is'. JE Labs makes no warranties about uptime, data retention, or fitness for a particular purpose. We are not liable for any indirect, incidental, or consequential damages.",
    },
    {
      title: "9. Changes to Terms",
      content: "We may update these terms from time to time. Continued use of EVOAIQU after changes constitutes acceptance of the updated terms.",
    },
    {
      title: "10. Contact",
      content: "For questions about these terms, contact legal@jelabs.in.",
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
            <span aria-hidden="true" className="absolute top-5 right-6 text-4xl rotate-12">📜</span>
            <span className="relative inline-block px-3.5 py-1.5 rounded-full bg-white border-2 border-[#1E1B24] text-[#1E1B24] text-xs font-extrabold uppercase tracking-wider -rotate-2">
              Legal &amp; Terms
            </span>
            <h1 className="relative font-display font-bold text-4xl sm:text-5xl text-[#1E1B24] tracking-tight">
              Terms of Service
            </h1>
            <p className="relative text-[#1E1B24]/80 text-base leading-relaxed max-w-xl">
              Last updated: October 2026 · JE Labs
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
                <p className="text-[#1E1B24]/80 text-sm leading-relaxed">{content}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
