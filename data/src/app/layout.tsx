import type { Metadata, Viewport } from "next";
import { DM_Sans, Fredoka } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/core/i18n/I18nContext";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EVOAIQU — Play. Connect. Evolve.",
    template: "%s | EVOAIQU",
  },
  description:
    "A playful social gaming platform. Play Chess or Rock, Paper, Scissors against friends or random opponents — then dare the loser to a challenge.",
  keywords: ["gaming", "social", "chess", "rock paper scissors", "challenges", "multiplayer", "India", "EVOAIQU"],
  authors: [{ name: "JE Labs" }],
  creator: "JE Labs",
  publisher: "JE Labs",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://evoaiqu.app"),
  openGraph: {
    type: "website",
    siteName: "EVOAIQU",
    title: "EVOAIQU — Play. Connect. Evolve.",
    description: "A bold, futuristic social gaming platform by JE Labs. Play games, win matches, and assign hilarious challenges.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "EVOAIQU — Play. Connect. Evolve.",
    description: "The next-generation social gaming platform by JE Labs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF6EC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fredoka.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Google Fonts — Noto Sans Tamil (Tamil script fallback) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[#FFF6EC] text-[#1E1B24]">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
