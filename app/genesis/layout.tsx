import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Token Genesis — MemeBrain',
  description:
    'Describe a meme token concept and let AI generate a safe, optimized configuration with auto-correcting Safety Compiler on Four.meme.',
  openGraph: {
    title: 'MemeBrain AI Token Genesis',
    description: 'Create safe meme tokens with AI. Auto-correcting Safety Compiler ensures optimal configurations.',
  },
};

export default function GenesisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
