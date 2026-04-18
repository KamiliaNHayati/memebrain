'use client';

// app/monitor/page.tsx
// Dividend Monitor — real-time fee accumulation tracking with sniper alerts.
// Auto-refreshes every 15 seconds.

import { useState, useCallback, useEffect, useRef } from 'react';
import { MonitorSkeleton } from '@/components/monitor-skeleton';
import { ErrorCard } from '@/components/error-card';
import { useToast } from '@/components/toast';

// ── Types ────────────────────────────────────────────────────

interface MonitorData {
  tokenAddress: string;
  feeAccumulated: string;
  minDispatch: string;
  feeAccumulatedBNB: string;
  minDispatchBNB: string;
  progressPercent: number;
  feeRate: number;
  sniperAlert: boolean;
  sniperRisk: 'safe' | 'caution' | 'danger';
  recommendation: string;
  lastUpdated: string;
  funds?: string;      // BNB raised
  maxFunds?: string;   // BNB target for graduation
  graduated?: boolean; // Optional: if API provides it
}

// ── Main Component ───────────────────────────────────────────

export default function MonitorPage() {
  const toast = useToast();
  const [address, setAddress] = useState('');
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevSniperAlert = useRef(false);

  // ── Fetch Data ─────────────────────────────────────────────

  const fetchMonitor = useCallback(
    async (addr: string, silent = false) => {
      if (!addr.trim()) return;
      if (!silent) setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/monitor/${addr.trim()}`);

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.details || err.error || 'Failed to fetch');
        }

        const result: MonitorData = await res.json();
        setData(result);
        setRefreshCount((c) => c + 1);

        // Toast on sniper alert transition
        if (result.sniperAlert && !prevSniperAlert.current) {
          toast.warning('Sniper alert triggered! Fee pool near dispatch.');
        }
        prevSniperAlert.current = result.sniperAlert;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Polling failed';
        setError(msg);
        if (!silent) {
          setData(null);
          toast.error('Monitor failed — ' + msg);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [toast]
  );

  // ── Auto-Refresh (15s) ────────────────────────────────────

  useEffect(() => {
    if (isWatching && address) {
      intervalRef.current = setInterval(() => {
        fetchMonitor(address, true);
      }, 15_000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isWatching, address, fetchMonitor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    setIsWatching(true);
    setRefreshCount(0);
    fetchMonitor(address);
    toast.success('Monitoring started — auto-refreshing every 15s');
  };

  const stopWatching = () => {
    setIsWatching(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // ── Test Buttons ───────────────────────────────────────────

  const quickTest = (addr: string) => {
    setAddress(addr);
    setIsWatching(true);
    setRefreshCount(0);
    fetchMonitor(addr);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 animate-page-enter">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          📊 Dividend Monitor
        </h1>
        <p className="text-sm text-[#71717a]">
          Track fee accumulation and sniper alerts on TaxToken contracts
        </p>
      </div>

      {/* Address Input */}
      <form onSubmit={handleSubmit} className="mb-4" role="search" aria-label="Token address monitor">
        <div className="flex gap-2">
          <input
            id="monitor-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter TaxToken contract address..."
            className="flex-1 rounded-lg border border-[#262626] bg-[#111111] px-4 py-3 text-sm text-white font-mono placeholder:text-[#52525b] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30 transition-all"
            disabled={loading}
            aria-label="TaxToken contract address"
          />
          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="shrink-0 rounded-lg bg-[#22c55e] px-6 py-3 text-sm font-semibold text-black hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳' : '👁 Watch'}
          </button>
        </div>
      </form>

      {/* Quick Test */}
      <div className="flex items-center gap-2 mb-8 text-xs">
        <span className="text-[#52525b]">Quick test:</span>
        <button
          onClick={() =>
            quickTest('0xb8d5d82da44e7072e09bdd3c664422f3f320ffff')
          }
          className="rounded-full border border-[#262626] bg-[#111111] px-3 py-1 text-[#71717a] hover:border-[#22c55e]/50 hover:text-[#22c55e] transition-all"
        >
          DOGI TaxToken
        </button>
        <button
          onClick={() =>
            quickTest(
              '0xb8d5d82da44e7072e09bdd3c664422f3f320ffff?mock=true'
            )
          }
          className="rounded-full border border-[#262626] bg-[#111111] px-3 py-1 text-yellow-500 hover:border-yellow-500/50 transition-all"
        >
          🎬 Demo (84.7%)
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorCard
            error={error}
            onRetry={() => fetchMonitor(address)}
            retryLabel="Retry Monitor"
          />
        </div>
      )}

      {/* Monitor Data */}
      {data && (
        <div className="space-y-5 animate-in fade-in duration-500">
          {/* Sniper Alert Banner */}
          {data.sniperAlert && <SniperAlertBanner />}

          {/* ── Graduation Banner ─────────────────────── */}
          <GraduationBanner data={data} />

          {/* ── Auto-Dispatch Timer ────────────────────── */}
          <AutoDispatchTimer 
            accumulatedUSD={parseFloat(data.feeAccumulatedBNB) * 300} // Approximate BNB price
            threshold={1000}
          />

          {/* Fee Dispatch Progress */}
          <ProgressPanel data={data} />

          {/* Sniper Alert Zone */}
          <SniperAlertZone data={data} />

          {/* AI Recommendation */}
          <RecommendationPanel data={data} />

          {/* Status Bar */}
          <div className="flex items-center justify-between text-xs text-[#3f3f46]">
            <div className="flex items-center gap-2">
              {isWatching && (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
                  </span>
                  <span className="text-[#52525b]">
                    Auto-refreshing every 15s · {refreshCount} updates
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#52525b]">
                Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
              {isWatching && (
                <button
                  onClick={stopWatching}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  ■ Stop
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!data && !loading && !error && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-30">📊</div>
          <p className="text-sm text-[#52525b]">
            Enter a TaxToken address to start monitoring
          </p>
          <p className="text-xs text-[#3f3f46] mt-1">
            Tracks feeAccumulated vs minDispatch in real-time
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <MonitorSkeleton />
      )}
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────

// ── NEW: Graduation Status Banner ────────────────────────
function GraduationBanner({ data }: { data: MonitorData }) {
  const funds = parseFloat(data.funds || '0');
  const maxFunds = parseFloat(data.maxFunds || '24'); // Default Four.meme max
  const isGraduated = data.graduated || funds >= maxFunds * 0.95;
  
  if (!isGraduated) return null;
  
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
          🎓 Token Graduated
        </h3>
        <span className="text-xs text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded">
          Live on PancakeSwap
        </span>
      </div>
      
      <p className="text-xs text-cyan-300/80">
        This token has completed its bonding curve phase and is now trading on PancakeSwap. 
        MemeBrain continues monitoring for post-graduation risks.
      </p>
      
      <div className="flex gap-2 pt-1">
        <a
          href="https://pancakeswap.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] border border-[#333] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] transition-colors"
        >
          🥞 Trade on PancakeSwap AI →
        </a>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors"
        >
          📊 View Post-Grad Metrics
        </button>
      </div>
    </div>
  );
}

function ProgressPanel({ data }: { data: MonitorData }) {
  const progress = data.progressPercent;
  const { bgColor, pulseClass } = getProgressStyle(progress);

  return (
    <div className="rounded-xl border border-[#262626] bg-[#111111] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#71717a] uppercase tracking-wider">
          Fee Dispatch Progress
        </h2>
        <span className="text-xs text-[#52525b]">
          Fee Rate: {data.feeRate > 10 ? `${(data.feeRate / 100).toFixed(1)}%` : `${data.feeRate}%`}
        </span>
      </div>

      {/* Values */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
          <p className="text-[10px] text-[#3f3f46] uppercase tracking-wider mb-1">
            Fee Accumulated
          </p>
          <p className="text-lg font-bold font-mono text-white">
            {formatBNB(data.feeAccumulatedBNB)} <span className="text-xs text-[#52525b]">BNB</span>
          </p>
        </div>
        <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
          <p className="text-[10px] text-[#3f3f46] uppercase tracking-wider mb-1">
            Min Dispatch
          </p>
          <p className="text-lg font-bold font-mono text-white">
            {formatBNB(data.minDispatchBNB)} <span className="text-xs text-[#52525b]">BNB</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="relative h-5 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${bgColor} ${pulseClass}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
          {/* Percentage label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold font-mono text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {progress.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Tier markers */}
        <div className="flex justify-between text-[9px] text-[#3f3f46]">
          <span>0%</span>
          <span className="text-yellow-500/50">60%</span>
          <span className="text-orange-500/50">85%</span>
          <span className="text-red-500/50">95%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

function SniperAlertBanner() {
  return (
    <div className="rounded-xl border-2 border-red-500/50 bg-red-950/40 p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🚨</span>
        <div>
          <h3 className="text-sm font-bold text-red-400">
            SNIPER ALERT ZONE — 95%+ Progress
          </h3>
          <p className="text-xs text-red-300/80 mt-0.5">
            Flash-buy bots may front-run the fee dispatch. Consider claiming
            your dividends now to avoid dilution.
          </p>
        </div>
      </div>
    </div>
  );
}

function SniperAlertZone({ data }: { data: MonitorData }) {
  const { sniperRisk } = data;

  const statusConfig = {
    safe: {
      icon: '🟢',
      label: 'SAFE',
      text: 'No suspicious activity detected',
      borderColor: 'border-[#22c55e]/20',
      bgColor: 'bg-[#22c55e]/5',
      textColor: 'text-[#22c55e]',
    },
    caution: {
      icon: '🟡',
      label: 'MONITORING',
      text: 'Fee pool approaching dispatch threshold — watching for large buys',
      borderColor: 'border-yellow-500/20',
      bgColor: 'bg-yellow-950/20',
      textColor: 'text-yellow-400',
    },
    danger: {
      icon: '🔴',
      label: 'ALERT',
      text: 'Fee pool near dispatch — sniper bots may attempt flash-buy to capture dividends',
      borderColor: 'border-red-500/30',
      bgColor: 'bg-red-950/20',
      textColor: 'text-red-400',
    },
  };

  const config = statusConfig[sniperRisk];

  return (
    <div
      className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-5 space-y-3`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#71717a] uppercase tracking-wider">
          Sniper Alert Zone
        </h2>
        <span className={`text-xs font-bold ${config.textColor}`}>
          {config.icon} {config.label}
        </span>
      </div>

      <p className={`text-sm ${config.textColor}`}>{config.text}</p>

      {sniperRisk !== 'safe' && (
        <div className="text-xs text-[#52525b]">
          ℹ️ When progress &gt; 85%, MemeBrain monitors for flash-buy patterns
          that indicate sniper bots trying to capture the next fee dispatch.
        </div>
      )}
    </div>
  );
}

function RecommendationPanel({ data }: { data: MonitorData }) {
  return (
    <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 space-y-3">
      <h2 className="text-sm font-semibold text-[#71717a] uppercase tracking-wider">
        🧠 AI Recommendation
      </h2>
      <p className="text-sm text-[#a1a1aa] leading-relaxed">
        {data.recommendation}
      </p>

      {data.progressPercent >= 85 && (
        <div className="flex gap-2 pt-1">
          <button
            className="rounded-lg bg-[#22c55e] px-4 py-2 text-xs font-semibold text-black hover:bg-[#16a34a] transition-colors opacity-60 cursor-not-allowed"
            disabled
            title="Connect wallet to claim"
          >
            💰 Claim Dividends
          </button>
          <span className="text-[10px] text-[#3f3f46] self-center">
            Connect wallet to claim
          </span>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function getProgressStyle(progress: number) {
  if (progress >= 95) {
    return {
      color: 'text-red-400',
      bgColor: 'bg-gradient-to-r from-red-600 to-red-500',
      pulseClass: 'animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]',
    };
  }
  if (progress >= 85) {
    return {
      color: 'text-orange-400',
      bgColor: 'bg-gradient-to-r from-orange-600 to-orange-500',
      pulseClass: 'animate-pulse',
    };
  }
  if (progress >= 60) {
    return {
      color: 'text-yellow-400',
      bgColor: 'bg-gradient-to-r from-yellow-600 to-yellow-500',
      pulseClass: '',
    };
  }
  return {
    color: 'text-[#22c55e]',
    bgColor: 'bg-gradient-to-r from-[#22c55e] to-[#16a34a]',
    pulseClass: '',
  };
}

function formatBNB(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '0';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (num >= 1) return num.toFixed(3);
  if (num >= 0.001) return num.toFixed(4);
  return num.toFixed(6);
}

// ── Auto-Dispatch Countdown Timer ───────────────────

function AutoDispatchTimer({ 
  accumulatedUSD, 
  threshold = 1000 
}: { 
  accumulatedUSD: number; 
  threshold?: number;
}) {
  const [timeRemaining, setTimeRemaining] = useState('');
  
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      
      // ✅ Correct: Get current time in UTC+8 (Asia/Singapore)
      const utc8String = now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' });
      const utc8Now = new Date(utc8String);
      
      // Calculate next midnight UTC+8
      const nextMidnight = new Date(utc8Now);
      nextMidnight.setHours(0, 0, 0, 0);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      
      const diff = nextMidnight.getTime() - utc8Now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    };
    
    setTimeRemaining(calculateTimeRemaining());
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const progress = Math.min((accumulatedUSD / threshold) * 100, 100);
  const isQualified = accumulatedUSD >= threshold;
  
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
          ⏰ Next Auto-Dispatch
        </h3>
        <span className="text-xs font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
          {timeRemaining}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Accumulated Value</span>
          <span className="text-white font-mono font-semibold">
            ${accumulatedUSD.toFixed(2)} / ${threshold}
          </span>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${
              isQualified ? 'bg-gradient-to-r from-[#22c55e] to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-400">
            {isQualified ? (
              <span className="text-[#22c55e] flex items-center gap-1">
                ✅ Threshold reached — auto-distributes at midnight UTC+8
              </span>
            ) : (
              `Need $${(threshold - accumulatedUSD).toFixed(2)} more to qualify`
            )}
          </span>
          <span className="text-blue-400 font-mono">
            {progress.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div className="pt-2 border-t border-blue-500/20">
        <p className="text-[11px] text-blue-300/80">
          📅 Distribution runs once daily at 00:00 UTC+8 for eligible tokens
        </p>
      </div>
    </div>
  );
}