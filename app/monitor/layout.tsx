import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dividend Monitor — MemeBrain',
  description:
    'Real-time fee accumulation tracking and sniper bot alerts on Four.meme TaxToken contracts. Auto-refreshing dashboard on BNB Chain.',
  openGraph: {
    title: 'MemeBrain Dividend Monitor',
    description: 'Track fee dispatch progress and sniper alerts in real-time for Four.meme TaxTokens.',
  },
};

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
