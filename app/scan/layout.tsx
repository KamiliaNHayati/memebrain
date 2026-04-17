import type { Metadata } from 'next';

// Dynamic SEO for /scan page — enables rich previews when sharing scan results
export const metadata: Metadata = {
  title: 'Risk Scanner — MemeBrain AI',
  description:
    'Scan any Four.meme token for honeypots, predatory taxes, and the April 3rd exploit pattern. 8-rule AI risk engine on BNB Chain.',
  openGraph: {
    title: 'MemeBrain Risk Scanner — AI Token Analysis',
    description: 'Paste any token address for instant AI risk analysis. Detect honeypots before you trade.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MemeBrain Risk Scanner',
    description: 'AI-powered token risk analysis for Four.meme on BNB Chain.',
  },
};

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
