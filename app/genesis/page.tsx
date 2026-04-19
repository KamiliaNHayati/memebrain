'use client';

// app/genesis/page.tsx — Enhanced UI matching landing page aesthetic

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useFourMemeAuth } from '@/hooks/use-fourmeme-auth';
import { resolveFourDomain } from '@/lib/safety-compiler';
import { GenesisSkeleton } from '@/components/genesis-skeleton';
import { ErrorCard } from '@/components/error-card';
import { useToast } from '@/components/toast';

// ── Types ────────────────────────────────────────────────────

interface TaxConfig {
  feeRate: number;
  rateFounder: number;
  rateHolder: number;
  rateBurn: number;
  rateLiquidity: number;
  feePlan: boolean;
}

interface TokenGenResult {
  name: string;
  symbol: string;
  description: string;
  taxConfig: TaxConfig;
  imagePrompt: string;
  tags: string[];
  source?: string;
  safetyCertificate?: {
    isSafe: boolean;
    guarantees: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    corrections: Array<{ field: string; original: any; corrected: any }>;
    warnings: string[];
  };
}

interface Suggestion extends TokenGenResult {
  id: string;
}

interface DeployResult {
  createArg: string;
  signature: string;
  calldata: string;
  tokenAddress?: string;
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

type ChatRole = 'system' | 'user' | 'ai';
interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: number;
}

type DeployStep = 'idle' | 'creating' | 'signing' | 'confirming' | 'done' | 'error';

const TOKEN_MANAGER_ADDRESS = '0x5c952063c7fc8610FFDB798152D69F0B9550762b';

// ── Main Component ───────────────────────────────────────────

export default function GenesisPage() {
  const { address, isConnected } = useAccount();
  const { accessToken, isAuthenticated, authenticate, status: authStatus } = useFourMemeAuth();
  const authLoading = authStatus === 'signing';
  const toast = useToast();
  const [tradingPair, setTradingPair] = useState<'BNB' | 'USDC'>('BNB');

  const INITIAL_MESSAGE: ChatMessage = {
    role: 'system',
    content: "Hi! I'm MemeBrain AI. Describe a meme token concept and I'll generate a safe, optimized configuration — or pick one of my suggestions below.",
    timestamp: Date.now(),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [result, setResult] = useState<TokenGenResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [revealStep, setRevealStep] = useState(0);

  const [deployStep, setDeployStep] = useState<DeployStep>('idle');
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('memebrain_genesis_chat');
      const savedResult = localStorage.getItem('memebrain_genesis_result');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
      if (savedResult) {
        const parsed = JSON.parse(savedResult);
        if (parsed?.name) setResult(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      try { localStorage.setItem('memebrain_genesis_chat', JSON.stringify(messages)); } catch { /* ignore */ }
    }
  }, [messages]);

  useEffect(() => {
    if (result) {
      try { localStorage.setItem('memebrain_genesis_result', JSON.stringify(result)); } catch { /* ignore */ }
    }
  }, [result]);

  useEffect(() => {
    fetch('/api/genesis/generate')
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!result) { setRevealStep(0); return; }
    const steps = [1, 2, 3, 4, 5, 6];
    let i = 0;
    const timer = setInterval(() => {
      if (i < steps.length) { setRevealStep(steps[i]); i++; }
      else clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [result]);

  const addMessage = (role: ChatRole, content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: Date.now() }]);
  };

  const handleGenerate = useCallback(async (concept: string) => {
    if (!concept.trim()) return;
    addMessage('user', concept);
    setLoading(true);
    setError(null);
    setResult(null);
    setDeployResult(null);
    setDeployError(null);
    setDeployStep('idle');
    setTxHash(null);

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
      const data: TokenGenResult = await res.json();
      setResult(data);
      const sourceLabel = data.source === 'llm' ? 'AI generated' : data.source === 'fallback' ? 'pre-generated' : 'ready';
      toast.success(`Token config generated — ${data.name} ($${data.symbol})`);
      addMessage('ai', `Here's your token: **${data.name}** ($${data.symbol}) — ${sourceLabel}. ${
        data.safetyCertificate?.corrections?.length
          ? `Safety compiler applied ${data.safetyCertificate.corrections.length} auto-correction(s).`
          : 'Safety check passed ✅'
      }`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setError(msg);
      toast.error('Generation failed');
      addMessage('ai', `Sorry, something went wrong: ${msg}. Try again?`);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    setInputText('');
    handleGenerate(text);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    addMessage('user', `I'll go with ${suggestion.name}`);
    setResult({ ...suggestion, source: 'suggestion' });
    setError(null);
    setDeployResult(null);
    setDeployError(null);
    setDeployStep('idle');
    setTxHash(null);
    addMessage('ai', `Great choice! **${suggestion.name}** ($${suggestion.symbol}) is ready. Review the config and hit Deploy when ready.`);
  };

  const handleDeploy = useCallback(async () => {
    if (!result || !accessToken || !address) return;
    setDeployStep('creating');
    setDeployError(null);
    setDeployResult(null);

    try {
      addMessage('ai', '🔄 Creating token on Four.meme API...');
      const res = await fetch('/api/genesis/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenConfig: result, accessToken, walletAddress: address, preSale: '0', tradingPair }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (errData.suggestion?.includes('BNB')) {
          setDeployError(`USDC pair not supported yet. Try BNB pair instead.`);
          setDeployStep('idle');
          addMessage('ai', `⚠️ USDC deployment failed. Try BNB pair instead.`);
          return;
        }
        throw new Error(errData.details || errData.error || 'Four.meme API failed');
      }

      const data: DeployResult = await res.json();
      setDeployResult(data);
      setDeployStep('signing');
      addMessage('ai', '📝 Please sign the transaction in your wallet...');

      if (data.mode === 'mock' || process.env.NEXT_PUBLIC_MOCK_TX === 'true') {
        await new Promise(r => setTimeout(r, 1500));
        const mockHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setTxHash(mockHash);
        setDeployStep('confirming');
        await new Promise(r => setTimeout(r, 1000));
        setDeployStep('done');
        toast.success('Token created on BSC!');
        const tokenAddress = data.tokenAddress || '';
        addMessage('ai', `🎉 Token created on Four.meme!\n\nContract: \`${tokenAddress}\`\nView: https://four.meme/token/${tokenAddress}`);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error('No wallet detected. Please install MetaMask.');

      const hash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: TOKEN_MANAGER_ADDRESS, data: data.calldata, value: '0x2386F26FC10000' }],
      });

      setTxHash(hash);
      setDeployStep('confirming');
      toast.info('Transaction submitted');
      addMessage('ai', `⏳ Transaction submitted! Hash: ${hash.slice(0, 10)}...`);
      setDeployStep('done');
      toast.success('Token created on BSC!');
      addMessage('ai', `🎉 Token created! https://bscscan.com/tx/${hash}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deploy failed';
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setDeployStep('idle');
        addMessage('ai', '❌ Transaction cancelled. You can try again when ready.');
      } else {
        setDeployStep('error');
        setDeployError(msg);
        addMessage('ai', `❌ Deploy failed: ${msg}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, accessToken, address, tradingPair, toast]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Page header */}
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
          style={{ width: 600, height: 200, background: 'radial-gradient(ellipse, rgba(34,197,94,0.06) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#22c55e] uppercase tracking-[0.3em] mb-3">AI Token Genesis</p>
          <h1
            className="font-black tracking-tight leading-[0.95] text-white mb-3"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.04em' }}
          >
            Describe a concept.
            <br />
            <span style={{ color: '#3f3f46' }}>We'll build the token.</span>
          </h1>
          <p className="text-sm text-[#52525b] max-w-md mx-auto">
            MemeBrain generates a safe, optimized token configuration with AI-powered Safety Compiler.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* ── Left: Chat Panel ─────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Messages */}
            <div className="rounded-2xl border border-[#141414] bg-[#050505] overflow-hidden">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border-b border-[#141414]">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-[#22c55e]/60" />
                </div>
                <span className="text-xs text-[#3f3f46] font-mono ml-2">memebrain — genesis</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
                  </span>
                  <span className="text-[10px] text-[#22c55e] font-mono">READY</span>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-4 max-h-[360px] overflow-y-auto space-y-3 scrollbar-thin">
                {messages.map((msg, i) => (
                  <ChatBubble key={i} message={msg} />
                ))}
                {loading && (
                  <div className="flex items-center gap-2 pl-2">
                    <span className="animate-bounce text-base">🧠</span>
                    <span className="text-xs text-[#3f3f46] font-mono animate-pulse">Generating...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Suggestions */}
            {!result && !loading && (
              <div>
                <p className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em] mb-2">Quick picks</p>
                {suggestions.length === 0 ? (
                  <div className="rounded-2xl border border-[#141414] border-dashed p-6 text-center">
                    <p className="text-xs text-[#3f3f46]">AI suggestions loading...</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => selectSuggestion(s)}
                        className="group rounded-full border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-2 text-sm font-semibold text-[#52525b] hover:border-[#22c55e]/30 hover:text-white hover:bg-[#0f0f0f] transition-all"
                      >
                        {s.name}
                        <span className="text-[#3f3f46] ml-1.5 text-xs">${s.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={result ? 'Describe a different concept...' : 'Describe your meme token idea...'}
                className="flex-1 rounded-full border border-[#1a1a1a] bg-[#0a0a0a] px-5 py-3 text-sm text-white placeholder:text-[#3f3f46] focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all"
                disabled={loading}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="shrink-0 rounded-full bg-[#22c55e] px-6 py-3 text-sm font-bold text-black hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
              >
                {loading ? '⏳' : '→'}
              </button>
            </form>

            {error && (
              <div className="mt-1">
                <ErrorCard error={error} />
              </div>
            )}
          </div>

          {/* ── Right: Preview Card ───────────────────────────── */}
          <div className="lg:sticky lg:top-24 self-start">
            {loading && !result ? (
              <GenesisSkeleton />
            ) : result ? (
              <PreviewCard
                result={result}
                revealStep={revealStep}
                deployStep={deployStep}
                txHash={txHash}
                deployError={deployError}
                isConnected={isConnected}
                isAuthenticated={isAuthenticated}
                authLoading={authLoading}
                onLogin={authenticate}
                onDeploy={handleDeploy}
                onReset={() => {
                  setResult(null);
                  setDeployResult(null);
                  setDeployError(null);
                  setDeployStep('idle');
                  setTxHash(null);
                  setMessages([INITIAL_MESSAGE]);
                  localStorage.removeItem('memebrain_genesis_chat');
                  localStorage.removeItem('memebrain_genesis_result');
                }}
                creatorAddress={address}
                tradingPair={tradingPair}
                deployResult={deployResult}
                onTradingPairChange={setTradingPair}
              />
            ) : (
              <EmptyPreview />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-[#22c55e] text-black rounded-br-sm font-medium'
            : isSystem
            ? 'bg-[#0f0f0f] text-[#52525b] border border-[#141414] rounded-bl-sm'
            : 'bg-[#0f0f0f] text-[#a1a1aa] border border-[#141414] rounded-bl-sm'
        }`}
      >
        {!isUser && (
          <span className="text-[10px] text-[#3f3f46] font-mono block mb-1">🧠 MemeBrain</span>
        )}
        <span dangerouslySetInnerHTML={{ __html: formatBold(message.content) }} />
      </div>
    </div>
  );
}

function formatBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:white">$1</strong>');
}

function EmptyPreview() {
  return (
    <div className="rounded-2xl border border-[#141414] border-dashed bg-[#050505] p-10 text-center">
      <div className="text-3xl mb-4 opacity-20">✨</div>
      <p className="text-sm text-[#3f3f46]">Token preview will appear here</p>
      <p className="text-xs text-[#262626] mt-1">Describe a concept or pick a suggestion</p>
    </div>
  );
}

function PreviewCard({
  result, revealStep, deployStep, txHash, deployError,
  isConnected, isAuthenticated, authLoading,
  onLogin, onDeploy, onReset, creatorAddress,
  tradingPair, deployResult, onTradingPairChange,
}: {
  result: TokenGenResult;
  revealStep: number;
  deployStep: DeployStep;
  txHash: string | null;
  deployError: string | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  onLogin: () => void;
  onDeploy: () => void;
  onReset: () => void;
  creatorAddress?: string;
  tradingPair?: 'BNB' | 'USDC';
  deployResult?: DeployResult | null;
  onTradingPairChange?: (pair: 'BNB' | 'USDC') => void;
}) {
  return (
    <div className="rounded-2xl border border-[#141414] bg-[#050505] overflow-hidden">
      {/* Accent top bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#22c55e] to-transparent" />

      <div className="p-5 space-y-4">
        {/* Name + Symbol + Image */}
        <div className={`transition-all duration-300 ${revealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="flex items-start gap-3">
            {typeof deployResult?.payload?.imgUrl === 'string' && (
              <img
                src={deployResult.payload.imgUrl}
                alt={result.name}
                className="w-14 h-14 rounded-xl object-cover border border-[#1a1a1a] shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white tracking-tight">
                {result.name}
                <span className="ml-2 text-[#3f3f46] text-sm font-normal">${result.symbol}</span>
              </h2>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {result.tags?.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[10px] text-[#22c55e] font-bold uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
                {creatorAddress && resolveFourDomain(creatorAddress) && (
                  <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">
                    🌐 {resolveFourDomain(creatorAddress)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className={`transition-all duration-300 delay-75 ${revealStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <p className="text-xs text-[#52525b] leading-relaxed italic border-l-2 border-[#1a1a1a] pl-3">
            &ldquo;{result.description}&rdquo;
          </p>
        </div>

        {/* Tax Config */}
        <div className={`transition-all duration-300 delay-100 ${revealStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <p className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em] mb-2">Tax Config</p>
          <div className="grid grid-cols-5 gap-1">
            <MiniConfig label="Fee" value={`${result.taxConfig.feeRate}%`} />
            <MiniConfig label="Creator" value={`${result.taxConfig.rateFounder}%`} />
            <MiniConfig label="Holders" value={`${result.taxConfig.rateHolder}%`} highlight />
            <MiniConfig label="Burn" value={`${result.taxConfig.rateBurn}%`} />
            <MiniConfig label="LP" value={`${result.taxConfig.rateLiquidity}%`} />
          </div>
          {/* Distribution bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden mt-2.5">
            <div className="bg-orange-500" style={{ width: `${result.taxConfig.rateFounder}%` }} />
            <div className="bg-[#22c55e]" style={{ width: `${result.taxConfig.rateHolder}%` }} />
            <div className="bg-red-500" style={{ width: `${result.taxConfig.rateBurn}%` }} />
            <div className="bg-blue-500" style={{ width: `${result.taxConfig.rateLiquidity}%` }} />
          </div>
        </div>

        {/* Trading Pair */}
        <div className={`transition-all duration-300 delay-125 ${revealStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <p className="text-[10px] text-[#3f3f46] uppercase tracking-[0.2em] mb-2">Trading Pair</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onTradingPairChange?.('BNB')}
              className={`flex-1 rounded-xl border px-3 py-2 text-center text-xs font-bold transition-all ${
                tradingPair === 'BNB'
                  ? 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]'
                  : 'border-[#141414] bg-[#0a0a0a] text-[#3f3f46] hover:border-[#1a1a1a]'
              }`}
            >
              BNB
            </button>
            <button
              type="button"
              onClick={() => onTradingPairChange?.('USDC')}
              className={`flex-1 rounded-xl border px-3 py-2 text-center text-xs font-bold transition-all ${
                tradingPair === 'USDC'
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                  : 'border-[#141414] bg-[#0a0a0a] text-[#3f3f46] hover:border-[#1a1a1a]'
              }`}
            >
              USDC
            </button>
          </div>
        </div>

        {/* Safety Certificate */}
        <div className={`transition-all duration-300 delay-150 ${revealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          {result.safetyCertificate ? (
            <SafetyCertificateUI cert={result.safetyCertificate} />
          ) : (
            result.taxConfig.feePlan && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 px-3 py-1.5 text-[11px] text-[#22c55e] font-bold">
                🛡️ Anti-Sniper Enabled
              </div>
            )
          )}
        </div>

        {/* Agent Score */}
        <div className={`transition-all duration-300 delay-165 ${revealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#52525b] uppercase tracking-[0.2em]">Agent Readiness</span>
              <span className="text-sm font-black text-white font-mono">{calculateAgentScore(result)}/100</span>
            </div>
            <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${calculateAgentScore(result)}%`,
                  background: 'linear-gradient(90deg, #22c55e, #10b981)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Twitter share */}
        <div className={`transition-all duration-300 delay-175 ${revealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <GenesisTwitterShare result={result} />
        </div>

        {/* Deploy */}
        <div className={`transition-all duration-300 delay-200 ${revealStep >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="border-t border-[#141414] pt-4 space-y-3">
            {deployStep !== 'idle' && deployStep !== 'error' && (
              <DeployProgress step={deployStep} txHash={txHash} />
            )}
            {deployError && <p className="text-xs text-red-400">❌ {deployError}</p>}

            <div className="flex flex-wrap gap-2">
              {!isConnected ? (
                <div className="w-full rounded-xl border border-[#141414] bg-[#0a0a0a] p-4 text-center">
                  <p className="text-sm font-bold text-white mb-1">Wallet Required</p>
                  <p className="text-xs text-[#3f3f46]">Connect wallet to deploy to BSC mainnet</p>
                </div>
              ) : !isAuthenticated ? (
                <button
                  onClick={onLogin}
                  disabled={authLoading}
                  className="w-full rounded-full bg-[#22c55e] px-4 py-3 text-sm font-bold text-black hover:bg-[#16a34a] disabled:opacity-50 transition-all"
                >
                  {authLoading ? '⏳ Signing in...' : '🔐 Sign in to Four.meme'}
                </button>
              ) : deployStep === 'done' ? (
                <a
                  href={txHash ? `https://bscscan.com/tx/${txHash}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 px-4 py-3 text-sm font-bold text-[#22c55e] text-center hover:bg-[#22c55e]/20 transition-all"
                >
                  ✅ View on BSCScan
                </a>
              ) : (
                <button
                  onClick={onDeploy}
                  disabled={['creating','signing','confirming'].includes(deployStep)}
                  className="flex-1 rounded-full bg-[#22c55e] px-4 py-3 text-sm font-bold text-black hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                >
                  {['creating','signing','confirming'].includes(deployStep) ? '⏳ Deploying...' : '🚀 Launch Token'}
                </button>
              )}
              <button
                onClick={onReset}
                className="rounded-full border border-[#141414] px-4 py-3 text-sm text-[#3f3f46] hover:text-white hover:border-[#262626] hover:bg-[#0f0f0f] transition-all"
                title="Start over"
              >
                ↩
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniConfig({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-2 text-center ${highlight ? 'border-[#22c55e]/20 bg-[#22c55e]/5' : 'border-[#141414] bg-[#0a0a0a]'}`}>
      <p className="text-[8px] text-[#3f3f46] uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-black font-mono mt-0.5 ${highlight ? 'text-[#22c55e]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function SafetyCertificateUI({ cert }: { cert: NonNullable<TokenGenResult['safetyCertificate']> }) {
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${cert.isSafe ? 'border-[#22c55e]/20 bg-[#22c55e]/5' : 'border-yellow-500/20 bg-yellow-950/10'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#22c55e] flex items-center gap-1">🛡️ Safety Certificate</span>
        <span className={`text-[10px] font-black uppercase tracking-wider ${cert.isSafe ? 'text-[#22c55e]' : 'text-yellow-400'}`}>
          {cert.isSafe ? 'SAFE' : 'REVIEW'}
        </span>
      </div>
      {cert.corrections.length > 0 && (
        <div className="space-y-1">
          {cert.corrections.map((c, i) => (
            <div key={i} className="text-[11px] flex items-center gap-1.5">
              <span className="text-[#22c55e]">✓</span>
              <code className="bg-[#0a0a0a] px-1 rounded text-[10px] text-[#52525b]">{c.field.split('.').pop()}</code>
              <span className="text-red-400 line-through">{String(c.original)}</span>
              <span className="text-[#22c55e]">→ {String(c.corrected)}</span>
            </div>
          ))}
        </div>
      )}
      {cert.guarantees.length > 0 && (
        <div className="text-[11px] text-[#22c55e]/70 space-y-0.5">
          {cert.guarantees.map((g, i) => <div key={i}>• {g}</div>)}
        </div>
      )}
      {cert.warnings.length > 0 && (
        <div className="text-[11px] text-yellow-400/70 space-y-0.5">
          {cert.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
        </div>
      )}
    </div>
  );
}

function calculateAgentScore(result: TokenGenResult): number {
  let score = 70;
  if (result.taxConfig.feeRate <= 3) score += 10;
  else if (result.taxConfig.feeRate <= 5) score += 5;
  if (result.taxConfig.rateHolder >= 40) score += 10;
  else if (result.taxConfig.rateHolder >= 30) score += 5;
  if (result.taxConfig.feePlan) score += 10;
  if (result.safetyCertificate?.corrections?.length) score += 5;
  return Math.min(100, score);
}

function GenesisTwitterShare({ result }: { result: TokenGenResult }) {
  const tweetText = encodeURIComponent(
    `Just generated $${result.symbol} with @fourdotmemeZH AI + @MemeBrain safety!\n\n` +
    `Name: ${result.name}\nFee: ${result.taxConfig.feeRate}% | Holders: ${result.taxConfig.rateHolder}%\n` +
    `Safety: ${result.safetyCertificate?.corrections?.length || 0} auto-corrections applied\n\n` +
    `#FourMeme #MemeBrain #BNBChain`
  );
  return (
    <a
      href={`https://twitter.com/intent/tweet?text=${tweetText}`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#1DA1F2]/20 bg-[#1DA1F2]/5 px-4 py-2.5 text-xs font-bold text-[#1DA1F2] hover:bg-[#1DA1F2]/10 transition-all"
    >
      🐦 Share on X
    </a>
  );
}

function DeployProgress({ step }: { step: DeployStep; txHash: string | null }) {
  const steps: Array<{ label: string; key: DeployStep }> = [
    { label: 'API', key: 'creating' },
    { label: 'Sign', key: 'signing' },
    { label: 'Confirm', key: 'confirming' },
    { label: 'Done', key: 'done' },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
              i < currentIdx ? 'bg-[#22c55e] text-black'
              : i === currentIdx ? 'bg-[#22c55e]/20 text-[#22c55e] ring-1 ring-[#22c55e]/40 animate-pulse'
              : 'bg-[#141414] text-[#3f3f46]'
            }`}
          >
            {i < currentIdx ? '✓' : i + 1}
          </div>
          <span className={`text-[9px] uppercase tracking-wider ${i <= currentIdx ? 'text-[#52525b]' : 'text-[#262626]'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`w-3 h-px ${i < currentIdx ? 'bg-[#22c55e]' : 'bg-[#141414]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}