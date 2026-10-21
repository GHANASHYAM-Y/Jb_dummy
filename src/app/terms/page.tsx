import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
    <div className="flex flex-col min-h-screen bg-[#F7F8F4]">
      <Navbar />
      <main className="flex-1 evo-section py-12">
        <div className="evo-container max-w-3xl">
          <div className="mb-10 animate-fade-in text-center sm:text-left">
            <h1 className="font-display font-bold text-4xl text-[#203331] mb-3">Terms of Service</h1>
            <p className="text-[#65736F]">Last updated: October 2026 · JE Labs</p>
          </div>

          <div className="flex flex-col gap-6">
            {sections.map(({ title, content }, i) => (
              <div
                key={title}
                className="bg-white border border-[#E2E8E2] rounded-2xl p-6 shadow-sm animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <h2 className="font-display font-bold text-lg text-[#203331] mb-2">{title}</h2>
                <p className="text-[#65736F] text-sm leading-relaxed">{content}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
