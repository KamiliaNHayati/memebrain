'use client';

// app/genesis/page.tsx
// AI Token Genesis — describe a concept, AI generates a full token config.
// Day 6: Full deploy flow with Four.meme API integration.

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useFourMemeAuth } from '@/hooks/use-fourmeme-auth';

interface TokenGenResult {
  name: string;
  symbol: string;
  description: string;
  taxConfig: {
    feeRate: number;
    rateFounder: number;
    rateHolder: number;
    rateBurn: number;
    rateLiquidity: number;
    feePlan: boolean;
  };
  imagePrompt: string;
  tags: string[];
  source?: 'llm' | 'fallback' | 'suggestion';
}

interface Suggestion extends TokenGenResult {
  id: string;
}

interface DeployResult {
  createArg: string;
  signature: string;
  payload: Record<string, unknown>;
  mode: string;
  instructions: {
    step: string;
    contract: string;
    method: string;
    note: string;
    fee?: string;
  };
}

export default function GenesisPage() {
  const { address, isConnected } = useAccount();
  const { accessToken, isAuthenticated, login, isLoading: authLoading } = useFourMemeAuth();

  const [concept, setConcept] = useState('');
  const [result, setResult] = useState<TokenGenResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deploy state
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Load pre-generated suggestions on mount
  useEffect(() => {
    fetch('/api/genesis/generate')
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!concept.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setDeployResult(null);
    setDeployError(null);

    try {
      const res = await fetch('/api/genesis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: concept.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || 'Generation failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [concept]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    setResult({ ...suggestion, source: 'suggestion' });
    setError(null);
    setDeployResult(null);
    setDeployError(null);
  };

  // ── Deploy Flow ────────────────────────────────────────────
  const handleDeploy = useCallback(async () => {
    if (!result || !accessToken || !address) return;

    setDeploying(true);
    setDeployError(null);
    setDeployResult(null);

    try {
      const res = await fetch('/api/genesis/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenConfig: result,
          accessToken,
          walletAddress: address,
          preSale: '0',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || 'Deploy failed');
      }

      const data: DeployResult = await res.json();
      setDeployResult(data);
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  }, [result, accessToken, address]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          ✨ AI Token Genesis
        </h1>
        <p className="text-sm text-[#71717a]">
          Describe a concept — MemeBrain AI generates a complete token configuration
        </p>
      </div>

      {/* Custom Input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            id="concept-input"
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder='e.g. "A doge-themed AI agent that trades memes"'
            className="flex-1 rounded-lg border border-[#262626] bg-[#111111] px-4 py-3 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30 transition-all"
            disabled={loading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !concept.trim()}
            className="shrink-0 rounded-lg bg-[#22c55e] px-6 py-3 text-sm font-semibold text-black hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Generating...
              </span>
            ) : (
              '🧠 Generate'
            )}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-300">
          ❌ {error}
        </div>
      )}

      {/* Pre-generated Suggestions */}
      {!result && !loading && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#71717a] uppercase tracking-wider mb-4">
            🤖 AI-Generated Suggestions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSuggestion(s)}
                className="text-left rounded-lg border border-[#262626] bg-[#111111] p-5 space-y-3 hover:border-[#22c55e]/50 hover:bg-[#111111]/80 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white group-hover:text-[#22c55e] transition-colors">
                    {s.name}
                  </h3>
                  <span className="text-xs font-mono text-[#52525b]">
                    ${s.symbol}
                  </span>
                </div>
                <p className="text-xs text-[#71717a] leading-relaxed line-clamp-3">
                  {s.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-[#52525b]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-[#22c55e] opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to preview →
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generated Result */}
      {result && !loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Source Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                result.source === 'llm'
                  ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
                  : result.source === 'suggestion'
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30'
              }`}
            >
              {result.source === 'llm'
                ? '🧠 AI Generated'
                : result.source === 'suggestion'
                ? '⚡ Pre-generated'
                : '📦 Fallback'}
            </span>
            <button
              onClick={() => { setResult(null); setDeployResult(null); setDeployError(null); }}
              className="text-xs text-[#52525b] hover:text-white transition-colors"
            >
              ← Back to suggestions
            </button>
          </div>

          {/* Token Card */}
          <div className="rounded-lg border border-[#262626] bg-[#111111] p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {result.name}
                  <span className="ml-2 text-[#71717a] text-sm font-normal">
                    ${result.symbol}
                  </span>
                </h2>
              </div>
              <div className="flex gap-1">
                {result.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[10px] text-[#22c55e] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-[#a1a1aa] leading-relaxed italic">
              &ldquo;{result.description}&rdquo;
            </p>

            {/* Tax Config */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#71717a] uppercase tracking-wider">
                Tax Configuration
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <ConfigCard label="Fee Rate" value={`${result.taxConfig.feeRate}%`} />
                <ConfigCard label="Creator" value={`${result.taxConfig.rateFounder}%`} />
                <ConfigCard label="Holders" value={`${result.taxConfig.rateHolder}%`} highlight />
                <ConfigCard label="Burn" value={`${result.taxConfig.rateBurn}%`} />
                <ConfigCard label="Liquidity" value={`${result.taxConfig.rateLiquidity}%`} />
              </div>

              {/* Distribution Bar */}
              <div className="flex h-3 rounded-full overflow-hidden">
                <div className="bg-orange-500" style={{ width: `${result.taxConfig.rateFounder}%` }} />
                <div className="bg-[#22c55e]" style={{ width: `${result.taxConfig.rateHolder}%` }} />
                <div className="bg-red-500" style={{ width: `${result.taxConfig.rateBurn}%` }} />
                <div className="bg-blue-500" style={{ width: `${result.taxConfig.rateLiquidity}%` }} />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[#52525b]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"/>Creator</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]"/>Holders</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"/>Burn</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/>Liquidity</span>
              </div>
            </div>

            {/* Anti-sniper badge */}
            {result.taxConfig.feePlan && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-3 py-1 text-xs text-[#22c55e] font-medium">
                🛡️ Anti-Sniper Protection Enabled
              </div>
            )}

            {/* Image Prompt Preview */}
            {result.imagePrompt && (
              <div className="rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-3">
                <p className="text-xs text-[#52525b] mb-1 font-semibold uppercase tracking-wider">
                  Image Prompt
                </p>
                <p className="text-sm text-[#71717a] italic">
                  &ldquo;{result.imagePrompt}&rdquo;
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {!isConnected ? (
                <div className="text-sm text-[#71717a]">
                  💡 Connect your wallet to deploy this token to Four.meme
                </div>
              ) : !isAuthenticated ? (
                <button
                  onClick={login}
                  disabled={authLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
                >
                  {authLoading ? '⏳ Signing in...' : '🔐 Sign in to Four.meme'}
                </button>
              ) : (
                <button
                  onClick={handleDeploy}
                  disabled={deploying || !!deployResult}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
                >
                  {deploying ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span> Creating on Four.meme...
                    </span>
                  ) : deployResult ? (
                    '✅ Token Created!'
                  ) : (
                    '🚀 Deploy to Four.meme'
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  setResult(null);
                  setConcept('');
                  setDeployResult(null);
                  setDeployError(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-[#262626] bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors"
              >
                ↩ Start Over
              </button>
            </div>
          </div>

          {/* Deploy Error */}
          {deployError && (
            <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-300">
              ❌ Deploy failed: {deployError}
            </div>
          )}

          {/* Deploy Result — On-chain signing instructions */}
          {deployResult && (
            <div className="rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/5 p-5 space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <h3 className="text-base font-bold text-[#22c55e]">
                  Token Ready for On-Chain Deployment!
                </h3>
              </div>

              <p className="text-sm text-[#a1a1aa]">
                Four.meme has prepared your token. Complete the on-chain transaction to finalize creation.
              </p>

              {/* Instructions */}
              <div className="rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] p-4 space-y-2">
                <p className="text-xs font-semibold text-[#71717a] uppercase tracking-wider">
                  Next Step
                </p>
                <p className="text-sm text-white">
                  {deployResult.instructions.step}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#52525b]">Contract:</span>{' '}
                    <span className="text-white font-mono">{deployResult.instructions.contract}</span>
                  </div>
                  <div>
                    <span className="text-[#52525b]">Method:</span>{' '}
                    <span className="text-white font-mono text-[11px]">{deployResult.instructions.method}</span>
                  </div>
                </div>
                {deployResult.instructions.fee && (
                  <p className="text-xs text-yellow-500">
                    💰 Fee: {deployResult.instructions.fee}
                  </p>
                )}
              </div>

              {/* createArg + signature (truncated) */}
              <div className="space-y-2">
                <DataField label="createArg" value={deployResult.createArg} />
                <DataField label="signature" value={deployResult.signature} />
              </div>

              {deployResult.mode === 'mock' && (
                <p className="text-xs text-yellow-500 italic">
                  ⚠️ This is a mock response — no real transaction will be created.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 animate-bounce">🧠</div>
          <p className="text-lg font-medium text-[#71717a]">
            MemeBrain is thinking...
          </p>
          <p className="text-sm text-[#52525b] mt-1">
            Generating your token configuration with AI
          </p>
        </div>
      )}
    </div>
  );
}

function ConfigCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-center ${
        highlight
          ? 'border-[#22c55e]/30 bg-[#22c55e]/5'
          : 'border-[#262626] bg-[#0a0a0a]'
      }`}
    >
      <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`text-lg font-bold font-mono ${
          highlight ? 'text-[#22c55e]' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  const truncated = value.length > 80 ? `${value.slice(0, 40)}...${value.slice(-20)}` : value;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#52525b] shrink-0 w-20">{label}:</span>
      <code className="text-xs text-[#71717a] font-mono truncate bg-[#0a0a0a] px-2 py-1 rounded flex-1">
        {truncated}
      </code>
      <button
        onClick={() => navigator.clipboard.writeText(value)}
        className="text-xs text-[#52525b] hover:text-white shrink-0 transition-colors"
        title="Copy to clipboard"
      >
        📋
      </button>
    </div>
  );
}
