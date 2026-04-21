'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

// ── Terminal Scripts ─────────────────────────────────────────

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
      '  Agent Readiness: 88/100 ✅',
    ],
  },
];

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

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Risk Scanner',
    desc: '8-rule engine detects honeypots, predatory taxes, and the April 3rd exploit pattern in real-time.',
    href: '/scan',
    accent: '#22c55e',
    tag: 'PROTECTION',
  },
  {
    icon: '✨',
    title: 'AI Genesis',
    desc: 'Describe a concept — AI builds a safe token config with auto-correcting Safety Compiler and agent readiness scoring.',
    href: '/genesis',
    accent: '#a78bfa',
    tag: 'CREATE',
  },
  {
    icon: '📊',
    title: 'Dividend Monitor',
    desc: 'Track fee accumulation and sniper bot alerts on TaxToken contracts. Know before bots do.',
    href: '/monitor',
    accent: '#06b6d4',
    tag: 'MONITOR',
  },
];

// ── Main Component ───────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative flex items-center px-6 md:px-16 pt-20 pb-0 min-h-[92vh] overflow-hidden">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(34,197,94,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Ghost background text — "FOUR.MEME" huge behind everything */}
        <div
          className="absolute left-0 top-1/2 pointer-events-none select-none"
          style={{
            transform: 'translateY(-55%)',
            fontSize: 'clamp(120px, 18vw, 220px)',
            fontWeight: 900,
            letterSpacing: '-0.06em',
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: '1px rgba(255,255,255,0.04)',
            whiteSpace: 'nowrap',
            zIndex: 0,
          }}
        >
          FOUR.MEME
        </div>

        {/* Content: left text + right image */}
        <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* LEFT: Text */}
          <div>
            {/* "Four.meme gave AI" — blurred/faded line */}
            <p
              className="hero-fade-1 font-black leading-none mb-2 select-none"
              style={{
                fontSize: 'clamp(28px, 4vw, 48px)',
                letterSpacing: '-0.04em',
                color: 'rgba(255,255,255,0.15)',
                filter: 'blur(0.3px)',
              }}
            >
              Four.meme gave AI
            </p>

            {/* Main headline */}
            <h1
              className="hero-fade-2 font-black tracking-tight leading-[0.93] mb-8"
              style={{ fontSize: 'clamp(52px, 7vw, 80px)', letterSpacing: '-0.04em' }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'block',
                }}
              >
                the hands.
              </span>
              <span className="text-white block">We built</span>
              <span className="text-white block">the brain.</span>
            </h1>

            <p className="hero-fade-3 text-lg text-[#52525b] max-w-md leading-relaxed mb-12">
              Autonomous AI that protects Four.meme traders from exploits in real-time.
              Scan tokens, create safely, monitor dividends.
            </p>

            <div className="hero-fade-4 flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/scan"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[#22c55e] px-8 py-4 text-sm font-bold text-black transition-all hover:bg-[#16a34a] hover:shadow-[0_0_40px_rgba(34,197,94,0.35)]"
              >
                🔍 Scan a Token
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/genesis"
                className="inline-flex items-center gap-2.5 rounded-full border border-[#262626] px-8 py-4 text-sm font-bold text-white transition-all hover:bg-[#111111] hover:border-[#333]"
              >
                ✨ Create with AI
              </Link>
            </div>
          </div>

          {/* RIGHT: Image */}
          <div className="hero-fade-3 relative hidden lg:block">
            <div
              className="absolute inset-0 rounded-[32px] pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.15) 0%, transparent 70%)', transform: 'scale(1.2)' }}
            />
            <div className="relative rounded-[32px] overflow-hidden border border-[#1a1a1a] bg-[#050505]" style={{ aspectRatio: '4/5' }}>
              {/* Fallback: animated terminal if no image */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3 opacity-20">
                  <div className="text-8xl">🧠</div>
                  <p className="text-xs font-mono text-[#22c55e] uppercase tracking-widest">MemeBrain</p>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-brain.png"
                alt="MemeBrain AI neural network"
                className="w-full h-full object-cover relative z-10"
                style={{ filter: 'brightness(0.9) saturate(1.1)' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 z-20" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, transparent 60%, rgba(0,0,0,0.2) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 h-1/3 z-20" style={{ background: 'linear-gradient(to bottom, transparent, black)' }} />
            </div>
          </div>
        </div>

        {/* Bottom page fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, black)' }} />
      </section>

      {/* ── STATS GRID ───────────────────────────────────── */}
      <section className="relative z-10 border-y border-[#141414]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            { val: '1,247', label: 'Tokens Scanned' },
            { val: '89', label: 'Threats Blocked' },
            { val: '34', label: 'Tokens Created' },
            { val: '8', label: 'Risk Rules Active' },
          ].map((s, i) => (
            <div
              key={s.label}
              className="p-10 flex flex-col gap-3 border-[#141414]"
              style={{ borderRight: i < 3 ? '1px solid #141414' : undefined }}
            >
              <p
                className="font-black tabular-nums leading-none"
                style={{ fontSize: 'clamp(36px, 5vw, 52px)', letterSpacing: '-0.04em', color: i === 1 ? '#22c55e' : 'white' }}
              >
                {s.val}
              </p>
              <p className="text-xs text-[#3f3f46] uppercase tracking-[0.2em]">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="py-5 border-t border-[#141414] text-center">
          <p className="text-xs text-[#3f3f46] uppercase tracking-[0.3em]">
            Trusted by Four.meme traders across BNB Chain
          </p>
        </div>
      </section>

      {/* ── TERMINAL + RECENT SCANS ───────────────────────── */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-16 items-start">
          {/* Left: text + terminal */}
          <div>
            <p className="text-xs font-mono text-[#22c55e] uppercase tracking-[0.3em] mb-6">Live Intelligence</p>
            <h2
              className="font-black tracking-tight leading-[1] mb-8"
              style={{ fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '-0.04em' }}
            >
              The brain that
              <br />
              <span style={{ color: '#3f3f46' }}>never sleeps.</span>
            </h2>
            <p className="text-[#71717a] text-lg leading-relaxed mb-10 max-w-md">
              MemeBrain&apos;s risk engine scans tokens in real-time, flagging honeypots and predatory tax configs before they drain your wallet.
            </p>
            <AITerminal />
          </div>

          {/* Right: recent scans + stats cards */}
          <div className="space-y-6 lg:pt-20">
            <div>
              <p className="text-xs text-[#3f3f46] uppercase tracking-[0.2em] mb-4">Recent Scans</p>
              <div className="rounded-2xl border border-[#141414] bg-[#0a0a0a] overflow-hidden">
                {RECENT_SCANS.map((scan, i) => (
                  <div
                    key={scan.addr}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#111111]"
                    style={{ borderBottom: i < RECENT_SCANS.length - 1 ? '1px solid #141414' : undefined }}
                  >
                    <span className="text-sm font-mono text-[#52525b]">{scan.addr}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black font-mono text-white">{scan.score}</span>
                      <ScoreBadge level={scan.level} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-2xl border border-[#141414] bg-[#0a0a0a] p-5">
                  <div className="text-xl mb-2">{s.icon}</div>
                  <p className="text-2xl font-black font-mono text-white">{s.value}</p>
                  <p className="text-[11px] text-[#3f3f46] mt-1 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES ───────────────────────────────── */}
      <section className="relative z-10 py-32 px-6 border-t border-[#141414]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-xs font-mono text-[#22c55e] uppercase tracking-[0.3em] mb-6">What MemeBrain Does</p>
            <h2
              className="font-black tracking-tight leading-[1]"
              style={{ fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '-0.04em' }}
            >
              Built for the{' '}
              <span style={{ color: '#3f3f46' }}>future</span>
              <br />
              of meme trading.
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group relative rounded-[28px] border border-[#141414] bg-[#0a0a0a] p-8 flex flex-col gap-5 overflow-hidden transition-all duration-500 hover:border-[#1f1f1f]"
                style={{ minHeight: 340 }}
              >
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 50% 0%, ${f.accent}10 0%, transparent 70%)` }}
                />

                {/* Tag */}
                <div
                  className="inline-flex w-fit items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: `${f.accent}15`, color: f.accent }}
                >
                  {f.tag}
                </div>

                {/* Icon */}
                <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  {f.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white mb-3 tracking-tight">{f.title}</h3>
                  <p className="text-sm text-[#52525b] leading-relaxed">{f.desc}</p>
                </div>

                {/* Arrow */}
                <div
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all duration-300 opacity-50 group-hover:opacity-100"
                  style={{ color: f.accent }}
                >
                  Open
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>

                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, transparent, ${f.accent}, transparent)` }}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ───────────────────────────────────── */}
      <section className="relative z-10 py-40 px-6 border-t border-[#141414] overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(34,197,94,0.06) 0%, transparent 60%)' }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[20px] border border-[#1a1a1a] bg-[#0d0d0d] mb-12 mx-auto">
            <Image src="/logo.svg" alt="MemeBrain" width={44} height={44} />
          </div>

          <h2
            className="font-black tracking-tight leading-[0.95] mb-8 text-white"
            style={{ fontSize: 'clamp(44px, 8vw, 80px)', letterSpacing: '-0.04em' }}
          >
            Ready to trade
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #10b981 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              with protection?
            </span>
          </h2>

          <p className="text-xl text-[#52525b] mb-14 max-w-xl mx-auto leading-relaxed">
            Join traders who trust MemeBrain to keep them safe from exploits, honeypots, and sniper bots on Four.meme.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link
              href="/scan"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#22c55e] px-10 py-5 text-sm font-black text-black transition-all hover:bg-[#16a34a] hover:shadow-[0_0_60px_rgba(34,197,94,0.3)]"
            >
              🔍 Start Scanning Free
            </Link>
            <Link
              href="/genesis"
              className="inline-flex items-center gap-2.5 rounded-full border border-[#1a1a1a] px-10 py-5 text-sm font-black text-[#52525b] transition-all hover:text-white hover:border-[#262626]"
            >
              ✨ Create a Token
            </Link>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes heroFade {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-fade-1 { animation: heroFade 0.7s ease-out 0.1s both; }
        .hero-fade-2 { animation: heroFade 0.7s ease-out 0.25s both; }
        .hero-fade-3 { animation: heroFade 0.7s ease-out 0.4s both; }
        .hero-fade-4 { animation: heroFade 0.7s ease-out 0.55s both; }
      `}</style>
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

  useEffect(() => {
    const timer = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const typeScript = useCallback(async () => {
    if (isTyping.current) return;
    isTyping.current = true;
    const script = TERMINAL_SCRIPTS[scriptIdx.current % TERMINAL_SCRIPTS.length];
    scriptIdx.current++;
    for (const line of script.lines) {
      if (line.startsWith('> ')) {
        let typed = '';
        for (const char of line) {
          typed += char;
          setLines((prev) => {
            const next = [...prev];
            if (next.length > 0 && typed.length > 1 && !next[next.length - 1].startsWith('  ')) {
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

  useEffect(() => {
    const start = setTimeout(() => typeScript(), 800);
    const interval = setInterval(() => {
      if (!isTyping.current) {
        setLines((prev) => (prev.length > 40 ? prev.slice(-20) : prev));
        typeScript();
      }
    }, 6000);
    return () => { clearTimeout(start); clearInterval(interval); };
  }, [typeScript]);

  return (
    <div className="rounded-2xl border border-[#141414] bg-[#050505] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border-b border-[#141414]">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/60" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <span className="w-3 h-3 rounded-full bg-[#22c55e]/60" />
        </div>
        <span className="text-xs text-[#3f3f46] font-mono ml-2">memebrain — live scanning</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
          </span>
          <span className="text-[10px] text-[#22c55e] font-mono">ACTIVE</span>
        </div>
      </div>
      <div ref={containerRef} className="p-4 h-[280px] overflow-y-auto font-mono text-[12px] leading-relaxed space-y-0.5 scrollbar-thin">
        {lines.map((line, i) => <TerminalLine key={i} text={line} />)}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[#22c55e]">{'>'}</span>
          <span className={`inline-block w-2 h-4 bg-[#22c55e] transition-opacity ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      </div>
    </div>
  );
}

function TerminalLine({ text }: { text: string }) {
  if (!text) return <div className="h-2" />;
  if (text.startsWith('> ')) {
    const isAlert = text.includes('ALERT') || text.includes('HONEYPOT');
    return (
      <div className={isAlert ? 'text-red-400' : 'text-[#22c55e]'}>
        <span className="text-[#262626]">[{getTimestamp()}]</span> {text}
      </div>
    );
  }
  if (text.includes('✅')) return <div className="text-[#22c55e]/70 pl-4">{text}</div>;
  if (text.includes('❌')) return <div className="text-red-400/70 pl-4">{text}</div>;
  if (text.includes('⚠️') || text.includes('⚠')) return <div className="text-yellow-400/70 pl-4">{text}</div>;
  if (text.includes('CRITICAL')) return <div className="text-red-400 font-bold pl-4">{text}</div>;
  if (text.includes('LOW RISK')) return <div className="text-[#22c55e] font-bold pl-4">{text}</div>;
  if (text.startsWith('  →')) return <div className="text-[#52525b] italic pl-4">{text}</div>;
  return <div className="text-[#3f3f46] pl-4">{text}</div>;
}

function ScoreBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) {
  const config = {
    LOW: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'LOW' },
    MEDIUM: { bg: 'rgba(234,179,8,0.1)', color: '#eab308', label: 'MED' },
    HIGH: { bg: 'rgba(249,115,22,0.1)', color: '#f97316', label: 'HIGH' },
    CRITICAL: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'CRIT' },
  };
  const c = config[level];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function getTimestamp() {
  const n = new Date();
  return `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}

function pad(n: number) { return n.toString().padStart(2, '0'); }