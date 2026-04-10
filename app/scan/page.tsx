'use client';

// app/scan/page.tsx
// THE HERO PAGE — Risk Scanner with address input, gauge, audit trail,
// honeypot banner, and Twitter share buttons.

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { RiskScoreGauge, getRiskColor } from '@/components/risk-score-gauge';
import { AuditTrail } from '@/components/audit-trail';
import { HoneypotBanner } from '@/components/honeypot-banner';
import { TwitterShareButton } from '@/components/twitter-share-button';
import { ScanSkeleton } from '@/components/scan-skeleton';

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

export default function ScanPage() {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for mock mode from URL
  const mockParam = searchParams.get('mock') === 'true' ? '?mock=true' : '';

  const handleScan = useCallback(async (tokenAddress?: string) => {
    const addr = tokenAddress || address.trim();
    if (!addr) return;

    // Basic validation
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [address, mockParam]);

  // Auto-scan if address is provided in URL
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

  const isHoneypot = result?.rules.some(
    (r) => r.id === 'rule-1' && !r.passed
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          🔍 Risk Scanner
        </h1>
        <p className="text-sm text-[#71717a]">
          Paste any Four.meme token address to get an instant AI risk analysis
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="token-address-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... Enter Four.meme token address"
              className="w-full rounded-lg border border-[#262626] bg-[#111111] px-4 py-3 text-sm text-white font-mono placeholder:text-[#52525b] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30 transition-all"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="shrink-0 rounded-lg bg-[#22c55e] px-6 py-3 text-sm font-semibold text-black hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Scanning...
              </span>
            ) : (
              'Scan'
            )}
          </button>
        </div>

        {/* Quick test tokens */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-[#52525b]">Quick test:</span>
          <button
            type="button"
            onClick={() => {
              setAddress('0xe9d11f369df3cece5c9fbcf6354123f58dafffff');
              handleScan('0xe9d11f369df3cece5c9fbcf6354123f58dafffff');
            }}
            className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-0.5 rounded transition-colors"
          >
            🔴 April 3rd Exploit
          </button>
          <button
            type="button"
            onClick={() => {
              setAddress('0xb8d5d82da44e7072e09bdd3c664422f3f320ffff');
              handleScan('0xb8d5d82da44e7072e09bdd3c664422f3f320ffff');
            }}
            className="text-xs text-[#71717a] hover:text-white bg-[#1a1a1a] px-2 py-0.5 rounded transition-colors"
          >
            🟢 DOGI Token
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-300">
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && <ScanSkeleton />}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Honeypot Banner — above everything if triggered */}
          {isHoneypot && (
            <HoneypotBanner
              message={result.rules.find((r) => r.id === 'rule-1')?.message || ''}
              tokenAddress={result.tokenAddress}
              score={result.score}
              riskLevel={result.riskLevel}
            />
          )}

          {/* Score + Token Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
            {/* Left: Gauge */}
            <div className="flex flex-col items-center gap-4 rounded-lg border border-[#262626] bg-[#111111] p-6">
              <RiskScoreGauge score={result.score} riskLevel={result.riskLevel} />
              <TwitterShareButton
                tokenAddress={result.tokenAddress}
                score={result.score}
                riskLevel={result.riskLevel}
                isHoneypot={isHoneypot}
              />
            </div>

            {/* Right: Token Info */}
            <div className="rounded-lg border border-[#262626] bg-[#111111] p-5 space-y-4">
              {/* Token Name Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {result.tokenInfo.name}
                    <span className="ml-2 text-[#71717a] text-sm font-normal">
                      ${result.tokenInfo.symbol}
                    </span>
                  </h2>
                  <p className="text-xs text-[#52525b] font-mono mt-0.5">
                    {result.tokenAddress}
                  </p>
                </div>
                {/* Status Badge */}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    result.tokenInfo.status === 'SUSPENDED'
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                      : result.tokenInfo.status === 'PUBLISH'
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-[#262626] text-[#71717a]'
                  }`}
                >
                  {result.tokenInfo.status}
                </span>
              </div>

              {/* Token Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Type" value={result.tokenInfo.isTaxToken ? 'TaxToken' : 'Standard'} />
                <InfoRow label="Fee Rate" value={result.tokenInfo.isTaxToken ? `${result.tokenInfo.feeRate}%` : 'N/A'} />
                <InfoRow label="Recipient Rate" value={result.tokenInfo.recipientRate > 0 ? `${result.tokenInfo.recipientRate}%` : 'None'} />
                <InfoRow label="Holder Dividends" value={result.tokenInfo.divideRate > 0 ? `${result.tokenInfo.divideRate}%` : 'None'} />
                <InfoRow label="Liquidity" value={result.tokenInfo.liquidityRate > 0 ? `${result.tokenInfo.liquidityRate}%` : 'None'} />
                <InfoRow label="Burn" value={result.tokenInfo.burnRate > 0 ? `${result.tokenInfo.burnRate}%` : 'None'} />
              </div>

              {/* Bonding Curve Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#71717a]">Bonding Curve</span>
                  <span className="text-white font-mono">{result.tokenInfo.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#262626] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#22c55e] transition-all duration-1000"
                    style={{ width: `${Math.min(100, result.tokenInfo.progress)}%` }}
                  />
                </div>
              </div>

              {/* AI Summary */}
              <div className="rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-3">
                <p className="text-xs text-[#71717a] mb-1 font-semibold uppercase tracking-wider">
                  AI Analysis
                </p>
                <p className="text-sm text-[#a1a1aa] leading-relaxed italic">
                  &ldquo;{result.summary}&rdquo;
                </p>
              </div>

              {/* Mode + Timestamp */}
              <div className="flex items-center justify-between text-xs text-[#52525b]">
                <span>
                  Mode: <span className={result.mode === 'mock' ? 'text-yellow-500' : 'text-emerald-500'}>{result.mode}</span>
                </span>
                <span>
                  {new Date(result.scannedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <AuditTrail rules={result.rules} />
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="text-center py-16 text-[#52525b]">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg font-medium text-[#71717a]">
            Enter a token address to start scanning
          </p>
          <p className="text-sm mt-1">
            Try the April 3rd exploit token to see the honeypot detector in action
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[#52525b] text-xs">{label}</span>
      <p className="text-white font-mono text-sm">{value}</p>
    </div>
  );
}
