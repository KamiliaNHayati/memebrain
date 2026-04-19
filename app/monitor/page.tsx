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
 
  const fetchMonitor = useCallback(async (addr: string, silent = false) => {
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
      if (result.sniperAlert && !prevSniperAlert.current) {
        toast.warning('Sniper alert triggered! Fee pool near dispatch.');
      }
      prevSniperAlert.current = result.sniperAlert;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Polling failed';
      setError(msg);
      if (!silent) { setData(null); toast.error('Monitor failed — ' + msg); }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);
 
  useEffect(() => {
    if (isWatching && address) {
      intervalRef.current = setInterval(() => { fetchMonitor(address, true); }, 15_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
 
  const quickTest = (addr: string) => {
    setAddress(addr);
    setIsWatching(true);
    setRefreshCount(0);
    fetchMonitor(addr);
  };
 
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
          <p className="text-xs font-mono text-[#22c55e] uppercase tracking-[0.3em] mb-3">Dividend Monitor</p>
          <h1
            className="font-black tracking-tight leading-[0.95] text-white mb-3"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.04em' }}
          >
            Track fees in real-time.
            <br />
            <span style={{ color: '#3f3f46' }}>Beat the sniper bots.</span>
          </h1>
          <p className="text-sm text-[#52525b] max-w-md mx-auto">
            Monitor fee accumulation and dispatch thresholds on TaxToken contracts.
          </p>
        </div>
      </div>
 
      {/* ── Main Content ─────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8">
 
        {/* Input */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              id="monitor-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter TaxToken contract address..."
              className="flex-1 rounded-full border border-[#1a1a1a] bg-[#0a0a0a] px-6 py-3.5 text-sm text-white font-mono placeholder:text-[#3f3f46] focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="shrink-0 rounded-full bg-[#22c55e] px-7 py-3.5 text-sm font-bold text-black hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_24px_rgba(34,197,94,0.3)]"
            >
              {loading ? '⏳' : '👁 Watch'}
            </button>
          </div>
        </form>
 
        {/* Quick test */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em]">Quick test:</span>
          <button
            onClick={() => quickTest('0xb8d5d82da44e7072e09bdd3c664422f3f320ffff')}
            className="rounded-full border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-1 text-xs text-[#52525b] hover:border-[#22c55e]/30 hover:text-[#22c55e] transition-all"
          >
            DOGI TaxToken
          </button>
          <button
            onClick={() => quickTest('0xb8d5d82da44e7072e09bdd3c664422f3f320ffff?mock=true')}
            className="rounded-full border border-yellow-500/20 bg-yellow-500/5 px-3 py-1 text-xs text-yellow-500 hover:bg-yellow-500/10 transition-all"
          >
            ⚡ Sample Token
          </button>
        </div>
 
        {/* Error */}
        {error && (
          <div className="mb-6">
            <ErrorCard error={error} onRetry={() => fetchMonitor(address)} retryLabel="Retry Monitor" />
          </div>
        )}
 
        {/* Data */}
        {data && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {data.sniperAlert && <SniperAlertBanner />}
            <GraduationBanner data={data} />
            <AutoDispatchTimer
              accumulatedUSD={parseFloat(data.feeAccumulatedBNB) * 300}
              threshold={1000}
            />
            <ProgressPanel data={data} />
            <SniperAlertZone data={data} />
            <RecommendationPanel data={data} />
 
            {/* Status bar */}
            <div className="flex items-center justify-between text-[10px] text-[#262626] pt-1">
              <div className="flex items-center gap-2">
                {isWatching && (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
                    </span>
                    <span className="text-[#3f3f46]">Auto-refreshing every 15s · {refreshCount} updates</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#3f3f46]">
                  {new Date(data.lastUpdated).toLocaleTimeString()}
                </span>
                {isWatching && (
                  <button onClick={stopWatching} className="text-red-500/50 hover:text-red-400 transition-colors text-xs">
                    ■ Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
 
        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="text-center py-24">
            <div
              className="w-20 h-20 rounded-2xl border border-[#141414] bg-[#050505] flex items-center justify-center text-3xl mx-auto mb-6"
              style={{ boxShadow: '0 0 40px rgba(34,197,94,0.05)' }}
            >
              📊
            </div>
            <p className="text-base font-bold text-[#3f3f46] mb-2">
              Enter a TaxToken address to begin
            </p>
            <p className="text-sm text-[#262626] max-w-sm mx-auto">
              Tracks feeAccumulated vs minDispatch in real-time with sniper bot detection
            </p>
          </div>
        )}
 
        {loading && !data && <MonitorSkeleton />}
      </div>
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────

function GraduationBanner({ data }: { data: MonitorData }) {
  const funds = parseFloat(data.funds || '0');
  const maxFunds = parseFloat(data.maxFunds || '24');
  const isGraduated = data.graduated || funds >= maxFunds * 0.95;
  if (!isGraduated) return null;
 
  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">🎓 Token Graduated</h3>
        <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
          Live on PancakeSwap
        </span>
      </div>
      <p className="text-xs text-cyan-300/60 leading-relaxed">
        This token has completed its bonding curve phase and is now trading on PancakeSwap.
        MemeBrain continues monitoring for post-graduation risks.
      </p>
      <div className="flex gap-2 pt-1">
        <a
          href="https://pancakeswap.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-2 text-xs font-bold text-white hover:border-[#262626] transition-all"
        >
          🥞 Trade on PancakeSwap →
        </a>
      </div>
    </div>
  );
}

function ProgressPanel({ data }: { data: MonitorData }) {
  const progress = data.progressPercent;
  const style = getProgressStyle(progress);
 
  return (
    <div className="rounded-2xl border border-[#141414] bg-[#050505] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em]">Fee Dispatch Progress</p>
        <span className="text-[10px] text-[#3f3f46]">
          Fee Rate: {data.feeRate > 10 ? `${(data.feeRate / 100).toFixed(1)}%` : `${data.feeRate}%`}
        </span>
      </div>
 
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#141414] bg-[#0a0a0a] p-4">
          <p className="text-[9px] text-[#3f3f46] uppercase tracking-wider mb-2">Fee Accumulated</p>
          <p className="text-xl font-black font-mono text-white">
            {formatBNB(data.feeAccumulatedBNB)}
            <span className="text-xs text-[#3f3f46] ml-1">BNB</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#141414] bg-[#0a0a0a] p-4">
          <p className="text-[9px] text-[#3f3f46] uppercase tracking-wider mb-2">Min Dispatch</p>
          <p className="text-xl font-black font-mono text-white">
            {formatBNB(data.minDispatchBNB)}
            <span className="text-xs text-[#3f3f46] ml-1">BNB</span>
          </p>
        </div>
      </div>
 
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="relative h-6 rounded-full bg-[#141414] overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${style.pulseClass}`}
            style={{ width: `${Math.min(progress, 100)}%`, background: style.gradient }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-black font-mono text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {progress.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-[#262626] uppercase tracking-wider">
          <span>0%</span>
          <span className="text-yellow-500/40">60%</span>
          <span className="text-orange-500/40">85%</span>
          <span className="text-red-500/40">95%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

function SniperAlertBanner() {
  return (
    <div className="rounded-2xl border-2 border-red-500/40 bg-red-950/20 p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🚨</span>
        <div>
          <h3 className="text-sm font-black text-red-400 mb-1">SNIPER ALERT — 95%+ Progress</h3>
          <p className="text-xs text-red-400/60 leading-relaxed">
            Flash-buy bots may front-run the fee dispatch. Consider claiming your dividends now.
          </p>
        </div>
      </div>
    </div>
  );
}

function SniperAlertZone({ data }: { data: MonitorData }) {
  const config = {
    safe:    { label: 'SAFE',       text: 'No suspicious activity detected.', border: 'border-[#22c55e]/15', bg: 'bg-[#22c55e]/5', color: 'text-[#22c55e]', dot: 'bg-[#22c55e]' },
    caution: { label: 'MONITORING', text: 'Fee pool approaching dispatch threshold — watching for large buys.', border: 'border-yellow-500/15', bg: 'bg-yellow-950/10', color: 'text-yellow-400', dot: 'bg-yellow-400' },
    danger:  { label: 'ALERT',      text: 'Fee pool near dispatch — sniper bots may attempt flash-buy to capture dividends.', border: 'border-red-500/20', bg: 'bg-red-950/10', color: 'text-red-400', dot: 'bg-red-400' },
  }[data.sniperRisk];
 
  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} p-5 space-y-2`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em]">Sniper Alert Zone</p>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>{config.label}</span>
        </div>
      </div>
      <p className={`text-sm ${config.color}`}>{config.text}</p>
      {data.sniperRisk !== 'safe' && (
        <p className="text-[10px] text-[#3f3f46] leading-relaxed">
          ℹ️ When progress &gt; 85%, MemeBrain monitors for flash-buy patterns that indicate sniper bots trying to capture the next fee dispatch.
        </p>
      )}
    </div>
  );
}

function RecommendationPanel({ data }: { data: MonitorData }) {
  return (
    <div className="rounded-2xl border border-[#141414] bg-[#050505] p-5 space-y-3">
      <p className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em]">🧠 AI Recommendation</p>
      <p className="text-sm text-[#52525b] leading-relaxed">{data.recommendation}</p>
      {data.progressPercent >= 85 && (
        <div className="flex items-center gap-3 pt-1">
          <button
            disabled
            className="rounded-full bg-[#22c55e]/20 border border-[#22c55e]/20 px-5 py-2 text-xs font-bold text-[#22c55e]/50 cursor-not-allowed"
            title="Connect wallet to claim"
          >
            💰 Claim Dividends
          </button>
          <span className="text-[10px] text-[#3f3f46]">Connect wallet to claim</span>
        </div>
      )}
    </div>
  );
}
// ── Helpers ──────────────────────────────────────────────────

function getProgressStyle(progress: number) {
  if (progress >= 95) return { gradient: 'linear-gradient(90deg, #dc2626, #ef4444)', pulseClass: 'animate-pulse' };
  if (progress >= 85) return { gradient: 'linear-gradient(90deg, #ea580c, #f97316)', pulseClass: 'animate-pulse' };
  if (progress >= 60) return { gradient: 'linear-gradient(90deg, #ca8a04, #eab308)', pulseClass: '' };
  return { gradient: 'linear-gradient(90deg, #22c55e, #10b981)', pulseClass: '' };
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

function AutoDispatchTimer({ accumulatedUSD, threshold = 1000 }: { accumulatedUSD: number; threshold?: number }) {
  const [timeRemaining, setTimeRemaining] = useState('');
 
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const utc8String = now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' });
      const utc8Now = new Date(utc8String);
      const nextMidnight = new Date(utc8Now);
      nextMidnight.setHours(0, 0, 0, 0);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      const diff = nextMidnight.getTime() - utc8Now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    };
    setTimeRemaining(calc());
    const t = setInterval(() => setTimeRemaining(calc()), 1000);
    return () => clearInterval(t);
  }, []);
 
  const progress = Math.min((accumulatedUSD / threshold) * 100, 100);
  const isQualified = accumulatedUSD >= threshold;
 
  return (
    <div className="rounded-2xl border border-[#141414] bg-[#050505] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em] mb-1">Next Auto-Dispatch</p>
          <p className="text-2xl font-black font-mono text-white tracking-tight">{timeRemaining}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em] mb-1">Accumulated</p>
          <p className="text-lg font-black font-mono text-white">${accumulatedUSD.toFixed(2)}</p>
          <p className="text-[10px] text-[#3f3f46]">/ ${threshold} threshold</p>
        </div>
      </div>
 
      <div className="space-y-2">
        <div className="h-1.5 rounded-full bg-[#141414] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: isQualified
                ? 'linear-gradient(90deg, #22c55e, #10b981)'
                : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className={isQualified ? 'text-[#22c55e]' : 'text-[#3f3f46]'}>
            {isQualified
              ? '✅ Threshold reached — auto-distributes at midnight UTC+8'
              : `Need $${(threshold - accumulatedUSD).toFixed(2)} more to qualify`}
          </span>
          <span className="text-[#52525b] font-mono">{progress.toFixed(1)}%</span>
        </div>
      </div>
 
      <p className="text-[10px] text-[#262626]">
        📅 Distribution runs once daily at 00:00 UTC+8 for eligible tokens
      </p>
    </div>
  );
}