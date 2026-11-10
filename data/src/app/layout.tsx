import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/contexts/I18nContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EVOAIQU — Play. Connect. Evolve.",
    template: "%s | EVOAIQU",
  },
  description:
    "A bold, futuristic next-generation social gaming platform. Play Chess or Rock, Paper, Scissors against friends or random opponents — then dare the loser to a challenge.",
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
  themeColor: "#070B25",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Google Fonts — Noto Sans Tamil & Manrope */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Noto+Sans+Tamil:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[#070B25] text-[#F5F7FF]">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
