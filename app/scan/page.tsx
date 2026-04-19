'use client';

// app/scan/page.tsx — Enhanced UI matching landing page aesthetic

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RiskScoreGauge } from '@/components/risk-score-gauge';
import { AuditTrail } from '@/components/audit-trail';
import { HoneypotBanner } from '@/components/honeypot-banner';
import { TwitterShareButton } from '@/components/twitter-share-button';
import { ScanSkeleton } from '@/components/scan-skeleton';
import { ErrorCard } from '@/components/error-card';
import { useToast } from '@/components/toast';

interface ScanResult {
  tokenAddress: string;
  score: number;
  riskLevel: string;
  rules: Array<{
    id: string;
    name: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    passed: boolean;
    scoreImpact: number;
    message: string;
  }>;
  summary: string;
  aiExplanation?: string;
  tokenInfo: {
    name: string;
    symbol: string;
    feeRate: number;
    recipientRate: number;
    divideRate: number;
    liquidityRate: number;
    burnRate: number;
    recipientAddress: string;
    isRecipientContract: boolean;
    isTaxToken: boolean;
    progress: number;
    status: string;
  };
  scannedAt: string;
  mode: string;
}

export default function ScanPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xs font-mono text-[#3f3f46] animate-pulse">Initializing scanner...</div>
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  );
}

function ScanPageContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mockParam = searchParams.get('mock') === 'true' ? '?mock=true' : '';

  const handleScan = useCallback(async (tokenAddress?: string) => {
    const addr = tokenAddress || address.trim();
    if (!addr) return;

    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError('Invalid address format. Must be a 0x-prefixed 40-character hex string.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/risk/scan${mockParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || 'Scan failed');
      }

      const data: ScanResult = await res.json();
      setResult(data);
      toast.success(`Scan complete — ${data.riskLevel} risk (${data.score}/100)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scan failed. Please try again.';

      if (msg.toLowerCase().includes('rate limit') || msg.includes('429')) {
        toast.warning('Rate limited — retrying in 15s...');
        const retryTimer = setTimeout(() => { handleScan(addr); }, 15_000);
        return () => clearTimeout(retryTimer);
      }

      setError(msg);
      toast.error('Scan failed — see details below');
    } finally {
      setLoading(false);
    }
  }, [address, mockParam, toast]);

  useEffect(() => {
    const urlAddress = searchParams.get('address');
    if (urlAddress) {
      setAddress(urlAddress);
      handleScan(urlAddress);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan();
  };

  const isHoneypot = result?.rules.some((r) => r.id === 'rule-1' && !r.passed);

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="relative border-b border-[#141414] px-6 py-10 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(34,197,94,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: 500, height: 160, background: 'radial-gradient(ellipse, rgba(34,197,94,0.06) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-xs font-mono text-[#22c55e] uppercase tracking-[0.3em] mb-3">Risk Scanner</p>
          <h1
            className="font-black tracking-tight leading-[0.95] text-white mb-3"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.04em' }}
          >
            Scan before you trade.
            <br />
            <span style={{ color: '#3f3f46' }}>Know before you buy.</span>
          </h1>
          <p className="text-sm text-[#52525b] max-w-md mx-auto">
            Paste any Four.meme token address for an instant 8-rule AI risk analysis.
          </p>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Search */}
        <form onSubmit={handleSubmit} className="mb-8" role="search">
          <div className="flex gap-2">
            <input
              id="token-address-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... Enter Four.meme token address"
              className="flex-1 rounded-full border border-[#1a1a1a] bg-[#0a0a0a] px-6 py-3.5 text-sm text-white font-mono placeholder:text-[#3f3f46] focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all"
              disabled={loading}
              aria-label="Token contract address"
            />
            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="shrink-0 rounded-full bg-[#22c55e] px-7 py-3.5 text-sm font-bold text-black hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_24px_rgba(34,197,94,0.3)]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin inline-block">⏳</span> Scanning
                </span>
              ) : 'Scan →'}
            </button>
          </div>

          {/* Quick test tokens */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em]">Quick test:</span>
            <button
              type="button"
              onClick={() => { setAddress('0xe9d11f369df3cece5c9fbcf6354123f58dafffff'); handleScan('0xe9d11f369df3cece5c9fbcf6354123f58dafffff'); }}
              className="rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20 transition-all"
            >
              🔴 April 3rd Exploit
            </button>
            <button
              type="button"
              onClick={() => { setAddress('0xb8d5d82da44e7072e09bdd3c664422f3f320ffff'); handleScan('0xb8d5d82da44e7072e09bdd3c664422f3f320ffff'); }}
              className="rounded-full bg-[#141414] border border-[#1a1a1a] px-3 py-1 text-xs text-[#52525b] hover:text-white hover:border-[#262626] transition-all"
            >
              🟢 DOGI Token
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-6">
            <ErrorCard error={error} onRetry={() => handleScan()} retryLabel="Retry Scan" />
          </div>
        )}

        {/* Loading */}
        {loading && <ScanSkeleton />}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Honeypot Banner */}
            {isHoneypot && (
              <HoneypotBanner
                message={result.rules.find((r) => r.id === 'rule-1')?.message || ''}
                tokenAddress={result.tokenAddress}
                score={result.score}
                riskLevel={result.riskLevel}
              />
            )}

            {/* Score + Token Info */}
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5">

              {/* Left: Gauge */}
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#141414] bg-[#050505] p-6">
                <RiskScoreGauge score={result.score} riskLevel={result.riskLevel} />
                <TwitterShareButton
                  tokenAddress={result.tokenAddress}
                  score={result.score}
                  riskLevel={result.riskLevel}
                  isHoneypot={isHoneypot}
                />
              </div>

              {/* Right: Token Info */}
              <div className="rounded-2xl border border-[#141414] bg-[#050505] p-5 space-y-4">

                {/* Token header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white tracking-tight">
                      {result.tokenInfo.name}
                      <span className="ml-2 text-[#3f3f46] text-sm font-normal">${result.tokenInfo.symbol}</span>
                    </h2>
                    <p className="text-[11px] text-[#3f3f46] font-mono mt-1 break-all">
                      {result.tokenAddress}
                    </p>
                  </div>
                  <StatusBadge status={result.tokenInfo.status} />
                </div>

                {/* Divider */}
                <div className="h-px bg-[#141414]" />

                {/* Token details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <InfoCell label="Type" value={result.tokenInfo.isTaxToken ? 'TaxToken' : 'Standard'} />
                  <InfoCell label="Fee Rate" value={result.tokenInfo.isTaxToken ? `${result.tokenInfo.feeRate}%` : 'N/A'} />
                  <InfoCell label="Recipient" value={result.tokenInfo.recipientRate > 0 ? `${result.tokenInfo.recipientRate}%` : 'None'} />
                  <InfoCell label="Dividends" value={result.tokenInfo.divideRate > 0 ? `${result.tokenInfo.divideRate}%` : 'None'} highlight={result.tokenInfo.divideRate > 0} />
                  <InfoCell label="Liquidity" value={result.tokenInfo.liquidityRate > 0 ? `${result.tokenInfo.liquidityRate}%` : 'None'} />
                  <InfoCell label="Burn" value={result.tokenInfo.burnRate > 0 ? `${result.tokenInfo.burnRate}%` : 'None'} />
                </div>

                {/* Bonding Curve */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em]">Bonding Curve</span>
                    <span className="text-sm font-black font-mono text-white">{result.tokenInfo.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#141414] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, result.tokenInfo.progress)}%`,
                        background: 'linear-gradient(90deg, #22c55e, #10b981)',
                      }}
                    />
                  </div>
                </div>

                {/* AI Summary */}
                <div className="rounded-xl border border-[#141414] bg-[#0a0a0a] p-4">
                  <p className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em] mb-2">AI Analysis</p>
                  <p className="text-sm text-[#52525b] leading-relaxed italic">
                    &ldquo;{result.summary}&rdquo;
                  </p>
                </div>

                {/* AI Security Explanation */}
                {result.aiExplanation && (
                  <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-red-400 uppercase tracking-[0.2em] font-bold">🧠 AI Security Analysis</span>
                    </div>
                    <p className="text-sm text-[#71717a] leading-relaxed">
                      {result.aiExplanation}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-[#262626]">
                  <span>
                    Mode:{' '}
                    <span className={result.mode === 'mock' ? 'text-yellow-500/70' : 'text-[#22c55e]/70'}>
                      {result.mode}
                    </span>
                  </span>
                  <span>{new Date(result.scannedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Audit Trail */}
            <AuditTrail rules={result.rules} />
          </div>
        )}

        {/* Empty State */}
        {!result && !loading && !error && (
          <div className="text-center py-24">
            <div
              className="w-20 h-20 rounded-2xl border border-[#141414] bg-[#050505] flex items-center justify-center text-3xl mx-auto mb-6"
              style={{ boxShadow: '0 0 40px rgba(34,197,94,0.05)' }}
            >
              🔍
            </div>
            <p className="text-base font-bold text-[#3f3f46] mb-2">
              Enter a token address to begin
            </p>
            <p className="text-sm text-[#262626] max-w-sm mx-auto">
              Try the April 3rd exploit token above to see the honeypot detector in action
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; ring: string }> = {
    SUSPENDED: { bg: 'bg-red-500/10', text: 'text-red-400', ring: 'ring-1 ring-red-500/20' },
    PUBLISH:   { bg: 'bg-[#22c55e]/10', text: 'text-[#22c55e]', ring: 'ring-1 ring-[#22c55e]/20' },
  };
  const c = config[status] || { bg: 'bg-[#141414]', text: 'text-[#52525b]', ring: '' };
  return (
    <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${c.bg} ${c.text} ${c.ring}`}>
      {status}
    </span>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'border-[#22c55e]/20 bg-[#22c55e]/5' : 'border-[#141414] bg-[#0a0a0a]'}`}>
      <p className="text-[9px] text-[#3f3f46] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-black font-mono ${highlight ? 'text-[#22c55e]' : 'text-white'}`}>{value}</p>
    </div>
  );
}