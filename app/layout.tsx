import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { ErrorBoundaryWrapper } from "@/components/error-boundary-wrapper";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MemeBrain — AI-Powered Four.meme Intelligence",
  description:
    "Autonomous AI that protects Four.meme traders from exploits. Risk scanning, honeypot detection, and AI-powered token creation on BNB Chain.",
  keywords: ["Four.meme", "MemeBrain", "AI", "risk scanner", "honeypot detection", "BNB Chain", "meme token"],
  openGraph: {
    title: "MemeBrain — AI-Powered Four.meme Intelligence",
    description: "Scan tokens for exploits, create safely with AI, and monitor dividends in real-time.",
    siteName: "MemeBrain",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MemeBrain — AI-Powered Four.meme Intelligence",
    description: "Autonomous AI that protects Four.meme traders from exploits.",
    creator: "@MemeBrain",
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505] text-[#fafafa] min-h-screen`}
      >
        <Providers>
          {/* Skip to content — keyboard a11y */}
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <ErrorBoundaryWrapper>
            <Navbar />
            <main id="main-content" className="pb-16 md:pb-0">
              {children}
            </main>
          </ErrorBoundaryWrapper>
        </Providers>
      </body>
    </html>
  );
}

