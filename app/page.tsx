'use client';

// app/page.tsx
// Landing page — hero, AI Brain Terminal, live stats, recent scans.
// Makes the app feel "alive" with typewriter effect and simulated scanning.

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Simulated Terminal Logs ──────────────────────────────────

const TERMINAL_SCRIPTS: Array<{ lines: string[]; delay: number }> = [
  {
    delay: 80,
    lines: [
      '> Scanning new token 0x4B2f...a8c3',
      '  Rule 1: recipientAddress is EOA ✅',
      '  Rule 2: recipientRate = 10% — within safe range ✅',
      '  Rule 3: feeRate = 3% ✅',
      '  Rule 4: feePlan = true (anti-sniper ON) ✅',
      '  Rule 5: divideRate = 40% — strong holder rewards ✅',
      '  Safety Compiler: No corrections needed',
      '  Risk Score: 90/100 — LOW RISK 🟢',
      '',
    ],
  },
  {
    delay: 60,
    lines: [
      '> ⚠ ALERT: Scanning 0xe9d1...ffff',
      '  Status: SUSPENDED by Four.meme',
      '  Rule 1: HONEYPOT DETECTED ❌ (-65 pts)',
      '  recipientAddress has bytecode — contract detected',
      '  Tax fees cannot be received. Sells will fail.',
      '  Rule 4: feePlan = false ❌ (-10 pts)',
      '  Risk Score: 25/100 — CRITICAL 🔴',
      '  → This is the April 3rd exploit pattern.',
      '  → Sells will revert. DO NOT BUY.',
      '', 
    ],
  },
  {
    delay: 90,
    lines: [
      '> Monitoring fee dispatch on 0xb8d5...ffff',
      '  feeAccumulated: 0.847 BNB / 1.000 BNB',
      '  Progress: 84.7% — approaching threshold',
      '  Sniper Risk: MONITORING 🟡',
      '  Recommendation: Hold — wait for dispatch event.',
      '',
    ],
  },
  {
    delay: 70,
    lines: [
      '> Genesis: Generating token config...',
      '  Concept: "AI-powered coffee token"',
      '  Name: CyberBrew | Symbol: $CYBREW',
      '  Safety Compiler: Auto-correcting config...',
      '    • rateFounder: 35% → 30% (capped)',
      '    • feePlan: false → true (enabled)',
      '  Anti-sniper: ENABLED',
      '  Holder rewards: 40% — optimal engagement',
      '  Agent Readiness: 88/100 ✅'
    ],
  },
  {
    delay: 85,
    lines: [
      '> Scanning new token 0xF3c9...21bb',
      '  Rule 1: recipientAddress is EOA ✅',
      '  Rule 2: recipientRate = 55%, divideRate = 8% ⚠️',
      '  Rule 3: feeRate = 10% — EXTREME ❌ (-15 pts)',
      '  Rule 4: feePlan = false ❌ (-10 pts)',
      '  Safety Compiler: Applied 2 corrections',
      '  Risk Score: 45/100 — HIGH RISK 🟠',
      '  → Predatory tax config detected.',
      '',
      '',
    ],
  },
];

// ── Stats Data ───────────────────────────────────────────────

const STATS = [
  { label: 'Tokens Scanned', value: '1,247', icon: '🔍' },
  { label: 'Threats Blocked', value: '89', icon: '🛡️' },
  { label: 'Tokens Created', value: '34', icon: '✨' },
  { label: 'Risk Rules', value: '8', icon: '📐' },
];

const RECENT_SCANS = [
  { addr: '0x4B2f...a8c3', score: 90, level: 'LOW' as const },
  { addr: '0xe9d1...ffff', score: 25, level: 'CRITICAL' as const },
  { addr: '0xF3c9...21bb', score: 45, level: 'HIGH' as const },
  { addr: '0x1cce...4444', score: 85, level: 'MEDIUM' as const },
  { addr: '0xb8d5...ffff', score: 90, level: 'LOW' as const },
];

// ── Main Component ───────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-16 pb-12 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#22c55e]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative text-center space-y-5 max-w-2xl">
          <div className="text-5xl sm:text-6xl mb-2">🧠</div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[#22c55e] via-[#10b981] to-[#06b6d4] bg-clip-text text-transparent">
              MemeBrain
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-[#71717a] max-w-lg mx-auto leading-relaxed">
            Four.meme gave AI the hands.{' '}
            <span className="text-white font-semibold">We built the brain.</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 px-3 py-1 text-[11px] font-medium text-[#22c55e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              Phase 2: Agent Deployment Ready
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-[11px] font-medium text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Phase 3: Agentic Mode Optimized
            </span>
          </div>
          <p className="text-sm text-[#52525b] max-w-md mx-auto">
            Autonomous AI that protects Four.meme traders from exploits in real-time.
            Scan tokens, create safely, monitor dividends.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] px-7 py-3 text-sm font-semibold text-black hover:bg-[#16a34a] transition-all hover:shadow-[0_0_24px_rgba(34,197,94,0.3)]"
            >
              🔍 Scan a Token
            </Link>
            <Link
              href="/genesis"
              className="inline-flex items-center gap-2 rounded-lg border border-[#262626] bg-[#111111] px-7 py-3 text-sm font-semibold text-white hover:bg-[#1a1a1a] hover:border-[#333] transition-colors"
            >
              ✨ Create with AI
            </Link>
          </div>
        </div>
      </section>

      {/* AI Brain Terminal */}
      <section className="px-4 pb-10 max-w-3xl mx-auto">
        <AITerminal />
      </section>

      {/* Stats + Recent Scans */}
      <section className="px-4 pb-16 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          {/* Live Stats */}
          <div>
            <h2 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-3">
              Platform Stats
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[#262626] bg-[#111111] p-4 hover:border-[#333] transition-colors"
                >
                  <div className="text-xl mb-1">{stat.icon}</div>
                  <p className="text-2xl font-bold font-mono text-white">{stat.value}</p>
                  <p className="text-[11px] text-[#52525b] mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Scans */}
          <div>
            <h2 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-3">
              Recent Scans
            </h2>
            <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden">
              {RECENT_SCANS.map((scan, i) => (
                <div
                  key={scan.addr}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < RECENT_SCANS.length - 1 ? 'border-b border-[#1a1a1a]' : ''
                  } hover:bg-[#1a1a1a]/50 transition-colors`}
                >
                  <span className="text-sm font-mono text-[#71717a]">{scan.addr}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-white">{scan.score}</span>
                    <ScoreBadge level={scan.level} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-4 pb-20 max-w-4xl mx-auto">
        <h2 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider mb-3">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '🛡️',
              title: 'Risk Scanner',
              desc: '8-rule engine detects honeypots, predatory taxes, and the April 3rd exploit pattern.',
              href: '/scan',
              color: 'group-hover:text-red-400',
            },
            {
              icon: '✨',
              title: 'AI Genesis',
              desc: 'Describe a concept → AI builds a safe token config with auto-correcting Safety Compiler.',
              href: '/genesis',
              color: 'group-hover:text-purple-400',
            },
            {
              icon: '📊',
              title: 'Dividend Monitor',
              desc: 'Track fee accumulation and sniper bot alerts on TaxToken contracts in real-time.',
              href: '/monitor',
              color: 'group-hover:text-cyan-400',
            },
          ].map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group rounded-xl border border-[#262626] bg-[#111111] p-5 space-y-2.5 hover:border-[#333] hover:bg-[#111111]/80 transition-all"
            >
              <div className={`text-2xl transition-transform group-hover:scale-110`}>
                {feature.icon}
              </div>
              <h3 className={`text-sm font-semibold text-white ${feature.color} transition-colors`}>
                {feature.title}
              </h3>
              <p className="text-xs text-[#71717a] leading-relaxed">{feature.desc}</p>
              <span className="text-xs text-[#22c55e] opacity-0 group-hover:opacity-100 transition-opacity">
                Open →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── AI Brain Terminal ────────────────────────────────────────

function AITerminal() {
  const [lines, setLines] = useState<string[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptIdx = useRef(0);
  const isTyping = useRef(false);

  // Cursor blink
  useEffect(() => {
    const timer = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  // Typewriter engine
  const typeScript = useCallback(async () => {
    if (isTyping.current) return;
    isTyping.current = true;

    const script = TERMINAL_SCRIPTS[scriptIdx.current % TERMINAL_SCRIPTS.length];
    scriptIdx.current++;

    for (const line of script.lines) {
      // Type character by character for first line of each script (the main scan line)
      if (line.startsWith('> ')) {
        let typed = '';
        for (const char of line) {
          typed += char;
          setLines((prev) => {
            const next = [...prev];
            // Replace last partial line or add new
            if (next.length > 0 && next[next.length - 1] !== line && typed.length > 1 && !next[next.length - 1].startsWith('  ')) {
              next[next.length - 1] = typed;
            } else if (typed.length === 1) {
              next.push(typed);
            } else {
              next[next.length - 1] = typed;
            }
            return next;
          });
          await sleep(20 + Math.random() * 30);
        }
      } else {
        setLines((prev) => [...prev, line]);
      }
      await sleep(script.delay + Math.random() * 60);
    }

    isTyping.current = false;
  }, []);

  // Start cycling
  useEffect(() => {
    // Initial delay
    const start = setTimeout(() => typeScript(), 800);

    const interval = setInterval(() => {
      if (!isTyping.current) {
        // Keep max ~40 lines to avoid memory bloat
        setLines((prev) => (prev.length > 40 ? prev.slice(-20) : prev));
        typeScript();
      }
    }, 6000);

    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [typeScript]);

  return (
    <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111111] border-b border-[#1a1a1a]">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <span className="text-xs text-[#52525b] font-mono ml-2">
          memebrain-agent — live scanning
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
          </span>
          <span className="text-[10px] text-[#22c55e]">ACTIVE</span>
        </div>
      </div>

      {/* Terminal output */}
      <div
        ref={containerRef}
        className="p-4 h-[260px] overflow-y-auto font-mono text-[13px] leading-relaxed space-y-0.5 scrollbar-thin"
      >
        {lines.map((line, i) => (
          <TerminalLine key={i} text={line} />
        ))}
        {/* Blinking cursor */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[#22c55e]">{'>'}</span>
          <span
            className={`inline-block w-2 h-4 bg-[#22c55e] transition-opacity ${
              cursorVisible ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </div>
    </div>
  );
}

function TerminalLine({ text }: { text: string }) {
  if (!text) return <div className="h-2" />;

  // Timestamp + main scan line
  if (text.startsWith('> ')) {
    const hasAlert = text.includes('ALERT') || text.includes('HONEYPOT');
    return (
      <div className={hasAlert ? 'text-red-400' : 'text-[#22c55e]'}>
        <span className="text-[#3f3f46]">[{getTimestamp()}]</span> {text}
      </div>
    );
  }

  // Result lines
  if (text.includes('✅')) return <div className="text-[#22c55e]/80 pl-4">{text}</div>;
  if (text.includes('❌')) return <div className="text-red-400/80 pl-4">{text}</div>;
  if (text.includes('⚠️') || text.includes('⚠')) return <div className="text-yellow-400/80 pl-4">{text}</div>;
  if (text.includes('CRITICAL')) return <div className="text-red-400 font-bold pl-4">{text}</div>;
  if (text.includes('LOW RISK')) return <div className="text-[#22c55e] font-bold pl-4">{text}</div>;
  if (text.includes('HIGH RISK')) return <div className="text-orange-400 font-bold pl-4">{text}</div>;
  if (text.startsWith('  →')) return <div className="text-[#71717a] italic pl-4">{text}</div>;

  return <div className="text-[#52525b] pl-4">{text}</div>;
}

function ScoreBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) {
  const config = {
    LOW: { text: '🟢', bg: 'bg-[#22c55e]/10 text-[#22c55e]' },
    MEDIUM: { text: '🟡', bg: 'bg-yellow-500/10 text-yellow-400' },
    HIGH: { text: '🟠', bg: 'bg-orange-500/10 text-orange-400' },
    CRITICAL: { text: '🔴', bg: 'bg-red-500/10 text-red-400' },
  };
  const c = config[level];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${c.bg}`}>
      {c.text} {level}
    </span>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTimestamp() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
