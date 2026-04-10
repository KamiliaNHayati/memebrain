// app/page.tsx
// Landing page — placeholder for Day 10 full implementation.
// Shows hero section with CTAs to Scan and Genesis.

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="text-center space-y-6 max-w-2xl">
        <div className="text-6xl mb-4">🧠</div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-[#22c55e] via-[#10b981] to-[#059669] bg-clip-text text-transparent">
            MemeBrain
          </span>
        </h1>
        <p className="text-lg text-[#71717a] max-w-lg mx-auto">
          Four.meme gave AI the hands.{' '}
          <span className="text-white font-medium">We built the brain.</span>
        </p>
        <p className="text-sm text-[#52525b]">
          Autonomous AI that protects Four.meme traders from exploits.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] px-6 py-3 text-sm font-semibold text-black hover:bg-[#16a34a] transition-colors"
          >
            🔍 Scan a Token
          </Link>
          <Link
            href="/genesis"
            className="inline-flex items-center gap-2 rounded-lg border border-[#262626] bg-[#111111] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1a1a1a] hover:border-[#333] transition-colors"
          >
            ✨ Create with AI
          </Link>
        </div>
      </div>

      {/* Feature Cards Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl w-full">
        {[
          { icon: '🛡️', title: 'Honeypot Detection', desc: 'Catch the April 3rd exploit pattern before you buy' },
          { icon: '📊', title: 'Risk Engine', desc: '8-rule audit with 0-100 risk scoring' },
          { icon: '🤖', title: 'AI Token Genesis', desc: 'Describe a concept → AI builds your meme token' },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-[#262626] bg-[#111111] p-5 space-y-2 hover:border-[#333] transition-colors"
          >
            <div className="text-2xl">{feature.icon}</div>
            <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
            <p className="text-xs text-[#71717a]">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
