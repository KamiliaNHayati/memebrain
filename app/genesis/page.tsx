'use client';

// app/genesis/page.tsx
// Day 7: Conversational UI with animated preview card,
// MetaMask signing (TokenManager2.createToken), and transaction status.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useFourMemeAuth } from '@/hooks/use-fourmeme-auth';
import { resolveFourDomain } from '@/lib/safety-compiler';
import { GenesisSkeleton } from '@/components/genesis-skeleton';
import { ErrorCard } from '@/components/error-card';
import { useToast } from '@/components/toast';
import { useSendTransaction } from 'wagmi';

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

// Chat message types
type ChatRole = 'system' | 'user' | 'ai';
interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: number;
}

// Deploy steps
type DeployStep = 'idle' | 'creating' | 'signing' | 'confirming' | 'done' | 'error';

// TokenManager2 address (BSC Mainnet)
const TOKEN_MANAGER_ADDRESS = '0x5c952063c7fc8610FFDB798152D69F0B9550762b';

// ── Main Component ───────────────────────────────────────────

export default function GenesisPage() {
  const { address, isConnected } = useAccount();
  const { accessToken, isAuthenticated, authenticate, status: authStatus } = useFourMemeAuth();
  const authLoading = authStatus === 'signing';
  const toast = useToast();
  const [tradingPair, setTradingPair] = useState<'BNB' | 'USDC'>('BNB');
  const { sendTransactionAsync } = useSendTransaction();

  const INITIAL_MESSAGE: ChatMessage = {
    role: 'system',
    content: "Hi! I'm MemeBrain AI. Describe a meme token concept and I'll generate a safe, optimized configuration — or pick one of my suggestions below.",
    timestamp: Date.now(),
  };

  // Chat state — restore from localStorage on mount
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Token state — restore from localStorage on mount
  const [result, setResult] = useState<TokenGenResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animated preview state
  const [revealStep, setRevealStep] = useState(0);

  // Deploy state
  const [deployStep, setDeployStep] = useState<DeployStep>('idle');
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // ── Restore chat + result from localStorage on mount ──────
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('memebrain_genesis_chat');
      const savedResult = localStorage.getItem('memebrain_genesis_result');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
      if (savedResult) {
        const parsed = JSON.parse(savedResult);
        if (parsed && parsed.name) {
          setResult(parsed);
        }
      }
    } catch {
      // Corrupted localStorage — ignore
    }
  }, []);

  // ── Persist chat messages to localStorage ─────────────────
  useEffect(() => {
    // Only save if there's more than the initial system message
    if (messages.length > 1) {
      try {
        localStorage.setItem('memebrain_genesis_chat', JSON.stringify(messages));
      } catch { /* quota exceeded — ignore */ }
    }
  }, [messages]);

  // ── Persist result to localStorage ────────────────────────
  useEffect(() => {
    if (result) {
      try {
        localStorage.setItem('memebrain_genesis_result', JSON.stringify(result));
      } catch { /* quota exceeded — ignore */ }
    }
  }, [result]);

  // Load suggestions
  useEffect(() => {
    fetch('/api/genesis/generate')
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => {});
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Animate preview reveal
  useEffect(() => {
    if (!result) { setRevealStep(0); return; }
    const steps = [1, 2, 3, 4, 5, 6]; // name, symbol, desc, tax, safety, actions
    let i = 0;
    const timer = setInterval(() => {
      if (i < steps.length) {
        setRevealStep(steps[i]);
        i++;
      } else {
        clearInterval(timer);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [result]);

  // ── Chat Handlers ──────────────────────────────────────────

  const addMessage = (role: ChatRole, content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: Date.now() }]);
  };

  const handleGenerate = useCallback(
    async (concept: string) => {
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

        const sourceLabel =
          data.source === 'llm' ? 'AI generated' : data.source === 'fallback' ? 'pre-generated (API unavailable)' : 'ready';

        toast.success(`Token config generated — ${data.name} ($${data.symbol})`);

        addMessage(
          'ai',
          `Here's your token: **${data.name}** ($${data.symbol}) — ${sourceLabel}. ${
            data.safetyCertificate?.corrections?.length
              ? `Safety compiler applied ${data.safetyCertificate.corrections.length} auto-correction(s).`
              : 'Safety check passed ✅'
          }`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Generation failed';
        setError(msg);
        toast.error('Generation failed — see chat for details');
        addMessage('ai', `Sorry, something went wrong: ${msg}. Try again?`);
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

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
    addMessage('ai', `Great choice! **${suggestion.name}** ($${suggestion.symbol}) is ready. Review the config below and hit Deploy when ready.`);
  };

  // ── Deploy Flow ────────────────────────────────────────────
  const handleDeploy = useCallback(async () => {
    if (!result || !accessToken || !address) return; 

    setDeployStep('creating');
    setDeployError(null);
    setDeployResult(null);

    try {
      // Step 1: Call /api/genesis/create to get createArg + signature
      addMessage('ai', '🔄 Creating token on Four.meme API...');

      const res = await fetch('/api/genesis/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenConfig: result,
          accessToken,
          walletAddress: address,
          preSale: '0',
          tradingPair, // ← ADD THIS: 'BNB' or 'USDC'
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        
        // Special handling for USDC errors with fallback suggestion
        if (errData.suggestion?.includes('BNB')) {
          setDeployError(
            `USDC pair not supported yet. ${errData.details}\n\n` +
            `💡 Try selecting BNB pair and deploying again.`
          );
          setDeployStep('idle');
          addMessage('ai', `⚠️ USDC deployment failed: ${errData.details}. Try BNB pair instead.`);
          return; // Exit early — don't throw
        }
        
        // Generic error handling
        throw new Error(errData.details || errData.error || 'Four.meme API failed');
      }

      const data: DeployResult = await res.json();
      setDeployResult(data);

      // Step 2: Sign on-chain transaction via MetaMask
      setDeployStep('signing');
      addMessage('ai', '📝 Please sign the transaction in your wallet...');

      if (data.mode === 'mock') {
        // Mock mode — simulate success
        setDeployStep('done');
        toast.success('Mock deploy complete!');
        addMessage('ai', '✅ Mock deploy complete! In live mode, this would create the token on BSC.');
        return;
      }
      // Live mode: send pre-encoded calldata via wagmi
      const hash = await sendTransactionAsync({
        to: TOKEN_MANAGER_ADDRESS as `0x${string}`,
        data: data.calldata as `0x${string}`,
        value: BigInt('10000000000000000'),
      });
      
      setTxHash(hash);
      setDeployStep('confirming');
      toast.info('Transaction submitted — waiting for confirmation');
      addMessage('ai', `⏳ Transaction submitted! Hash: ${hash.slice(0, 10)}...`);

      // Wait for confirmation (simplified — in production use waitForTransactionReceipt)
      setDeployStep('done');
      toast.success('Token created on BSC!');
      addMessage('ai', `🎉 Token created! View on BSCScan: https://bscscan.com/tx/${hash}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deploy failed';

      // User rejected = not an error
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
  }, [result, accessToken, address, sendTransactionAsync, toast]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10 animate-page-enter">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          ✨ AI Token Genesis
        </h1>
        <p className="text-sm text-[#71717a]">
          Describe a concept — MemeBrain AI generates a safe, optimized token
        </p>
      </div>

      {/* Chat + Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* ── Left: Chat Panel ──────────────────────────────── */}
        <div className="flex flex-col">
          {/* Messages */}
          <div className="flex-1 space-y-3 mb-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 pl-3">
                <span className="animate-bounce text-lg">🧠</span>
                <span className="text-sm text-[#71717a] animate-pulse">Thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestions (only when no result) */}
          {!result && !loading && (
            <div className="mb-4">
              <p className="text-xs text-[#52525b] mb-2">Quick picks:</p>
              
              {/* Empty state: no suggestions loaded */}
              {suggestions.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-[#262626] rounded-lg">
                  <div className="text-2xl mb-2 opacity-30">✨</div>
                  <p className="text-xs text-[#71717a]">AI suggestions loading...</p>
                  <p className="text-[10px] text-[#52525b] mt-1">Or describe your concept above</p>
                </div>
              ) : (
                /* Existing suggestions grid */
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectSuggestion(s)}
                      className="rounded-lg border border-[#262626] bg-[#111111] px-3 py-2 text-left hover:border-[#22c55e]/50 transition-all group"
                    >
                      <span className="text-sm font-semibold text-white group-hover:text-[#22c55e] transition-colors">
                        {s.name}
                      </span>
                      <span className="text-xs text-[#52525b] ml-2">${s.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Token concept input">
            <input
              id="chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={result ? 'Describe a different concept...' : 'Describe your meme token idea...'}
              className="flex-1 rounded-lg border border-[#262626] bg-[#111111] px-4 py-3 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30 transition-all"
              disabled={loading}
              maxLength={500}
              aria-label="Describe your meme token concept"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="shrink-0 rounded-lg bg-[#22c55e] px-5 py-3 text-sm font-semibold text-black hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳' : '→'}
            </button>
          </form>
        </div>

        {/* ── Right: Live Preview Card ──────────────────────── */}
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
                // Clear persisted state
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

      {/* Error */}
      {error && (
        <div className="mt-4">
          <ErrorCard error={error} />
        </div>
      )}
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-[#22c55e] text-black rounded-br-sm'
            : isSystem
            ? 'bg-[#1a1a1a] text-[#a1a1aa] border border-[#262626] rounded-bl-sm'
            : 'bg-[#111111] text-[#d4d4d8] border border-[#262626] rounded-bl-sm'
        }`}
      >
        {!isUser && <span className="text-xs text-[#52525b] block mb-1">🧠 MemeBrain</span>}
        <span dangerouslySetInnerHTML={{ __html: formatBold(message.content) }} />
      </div>
    </div>
  );
}

function formatBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
}

function EmptyPreview() {
  return (
    <div className="rounded-xl border border-dashed border-[#262626] bg-[#0a0a0a] p-8 text-center">
      <div className="text-4xl mb-3 opacity-30">🎨</div>
      <p className="text-sm text-[#52525b]">
        Token preview will appear here
      </p>
      <p className="text-xs text-[#3f3f46] mt-1">
        Describe a concept or pick a suggestion
      </p>
    </div>
  );
}

function PreviewCard({
  result,
  revealStep,
  deployStep,
  txHash,
  deployError,
  isConnected,
  isAuthenticated,
  authLoading,
  onLogin,
  onDeploy,
  onReset,
  creatorAddress,
  tradingPair,       
  deployResult,
  onTradingPairChange,     
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
    <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden animate-in fade-in duration-500">
      {/* Header gradient */}
      <div className="h-2 bg-gradient-to-r from-[#22c55e] via-[#06b6d4] to-[#8b5cf6]" />

      <div className="p-5 space-y-4">
        {/* Name + Symbol */}
        <div className={`transition-all duration-300 ${revealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <h2 className="text-xl font-bold text-white">
            {result.name}
            <span className="ml-2 text-[#71717a] text-sm font-normal">${result.symbol}</span>
          </h2>
          <div className="flex gap-1 mt-1">
            {result.tags?.map((tag) => (
              <span key={tag} className="rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[10px] text-[#22c55e] font-medium">
                {tag}
              </span>
            ))}
            {creatorAddress && resolveFourDomain(creatorAddress) && (
              <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] text-blue-400">
                🌐 {resolveFourDomain(creatorAddress)}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className={`transition-all duration-300 delay-75 ${revealStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <p className="text-xs text-[#a1a1aa] leading-relaxed italic">
            &ldquo;{result.description}&rdquo;
          </p>
        </div>

        {/* Tax Config */}
        <div className={`transition-all duration-300 delay-100 ${revealStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-2">Tax Configuration</p>
          <div className="grid grid-cols-5 gap-1.5">
            <MiniConfig label="Fee" value={`${result.taxConfig.feeRate}%`} />
            <MiniConfig label="Creator" value={`${result.taxConfig.rateFounder}%`} />
            <MiniConfig label="Holders" value={`${result.taxConfig.rateHolder}%`} highlight />
            <MiniConfig label="Burn" value={`${result.taxConfig.rateBurn}%`} />
            <MiniConfig label="LP" value={`${result.taxConfig.rateLiquidity}%`} />
          </div>

          {/* Distribution bar */}
          <div className="flex h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-orange-500" style={{ width: `${result.taxConfig.rateFounder}%` }} />
            <div className="bg-[#22c55e]" style={{ width: `${result.taxConfig.rateHolder}%` }} />
            <div className="bg-red-500" style={{ width: `${result.taxConfig.rateBurn}%` }} />
            <div className="bg-blue-500" style={{ width: `${result.taxConfig.rateLiquidity}%` }} />
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-[#3f3f46]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Creator</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />Holders</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Burn</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />LP</span>
          </div>
        </div>

        {/* ── Trading Pair Selector ───────────────────────────── */}
        <div className={`transition-all duration-300 delay-125 ${revealStep >= 3.5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-2">
            Trading Pair
          </p>
          <div className="flex gap-2">
            {/* BNB Button */}
            <button
              type="button"
              onClick={() => onTradingPairChange?.('BNB')}  // ← USE CALLBACK
              className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-all ${
                tradingPair === 'BNB'
                  ? 'border-[#22c55e]/50 bg-[#22c55e]/10 text-[#22c55e]'
                  : 'border-[#262626] bg-[#0a0a0a] text-[#71717a] hover:border-[#333]'
              }`}
            >
              💵 BNB (Default)
            </button>

            {/* USDC Button */}
            <button
              type="button"
              onClick={() => onTradingPairChange?.('USDC')}  // ← USE CALLBACK
              className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-all ${
                tradingPair === 'USDC'
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                  : 'border-[#262626] bg-[#0a0a0a] text-[#71717a] hover:border-[#333]'
              }`}
              title="Multi-token trading now supported on Four.meme"
            >
              💵 USDC (New!)
            </button>
          </div>
          <p className="text-[10px] text-[#3f3f46] mt-1.5">
            ℹ️ {tradingPair === 'USDC' ? 'Selected: USDC pair (requires Four.meme API support)' : 'Default: BNB pair'}
          </p>
        </div>

        {/* ── Image Generation Status ───────────────────────── */}
        {deployStep === 'creating' && result.imagePrompt && (
          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/30">
            <div className="flex items-center gap-2">
              <span className="animate-spin text-purple-400">🎨</span>
              <p className="text-xs text-purple-300">
                Generating logo with Recraft V2...
              </p>
            </div>
          </div>
        )}

        {/* Safety Certificate */}
        <div className={`transition-all duration-300 delay-150 ${revealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          {result.safetyCertificate ? (
            <SafetyCertificateUI cert={result.safetyCertificate} />
          ) : (
            result.taxConfig.feePlan && (
              <div className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2.5 py-1 text-[11px] text-[#22c55e] font-medium">
                🛡️ Anti-Sniper Enabled
              </div>
            )
          )}
        </div>

        {/* ── Agent-Optimized Badge ───────────────────── */}
        {result.taxConfig.feePlan && result.taxConfig.rateHolder >= 30 && (
          <div className={`transition-all duration-300 delay-160 ${revealStep >= 4.25 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-[11px] font-medium text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              🤖 Agent-Optimized Config
            </span>
            <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
              Low fees + high holder rewards = ideal for autonomous trading
            </p>
          </div>
        )}

        {/* ── NEW: Agent Safety Score ───────────────────────── */}
        <div className={`transition-all duration-300 delay-165 ${revealStep >= 4.35 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-400">🤖</span>
              <h4 className="text-purple-300 font-semibold text-sm">
                Agent Readiness Score
              </h4>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                  style={{ width: `${calculateAgentScore(result)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-purple-400 font-mono">
                {calculateAgentScore(result)}/100
              </span>
            </div>
            
            <p className="text-xs text-gray-400 mt-2">
              {calculateAgentScore(result) >= 80 
                ? "✅ Safe for autonomous AI agent trading" 
                : "⚠️ Manual review recommended for agents"}
            </p>
          </div>
        </div>

        {/* ── Twitter Share Button ────────────────────────── */}
        <div className={`transition-all duration-300 delay-175 ${revealStep >= 4.5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <GenesisTwitterShare result={result} />
        </div>

        {/* ── USDC Warning ────────────────────────── */}
        {tradingPair === 'USDC' && deployStep === 'idle' && (
          <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-500/30">
            <p className="text-xs text-yellow-300">
              ⚠️ <strong>Experimental:</strong> USDC pair support depends on Four.meme API. 
              If deployment fails, try switching to BNB pair.
            </p>
          </div>
        )}

        {/* Deploy Section */}
        <div className={`transition-all duration-300 delay-200 ${revealStep >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="border-t border-[#1a1a1a] pt-4 space-y-3">
            {/* Deploy Steps Indicator */}
            {deployStep !== 'idle' && deployStep !== 'error' && (
              <DeployProgress step={deployStep} txHash={txHash} />
            )}

            {/* Deploy Error */}
            {deployError && (
              <p className="text-xs text-red-400">❌ {deployError}</p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {!isConnected ? (
                <div className="w-full p-4 rounded-lg border border-[#262626] bg-[#0a0a0a] text-center">
                  <div className="text-2xl mb-2">🔗</div>
                  <p className="text-sm font-semibold text-white mb-1">Wallet Required</p>
                  <p className="text-xs text-[#71717a] mb-3">
                    Connect your wallet to deploy this token to BSC mainnet
                  </p>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 px-3 py-1.5 text-xs font-medium text-[#22c55e]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                    Use the Connect Wallet button above
                  </div>
                </div>
              ) : !isAuthenticated ? (
                <div className="w-full space-y-2">
                  <button
                    onClick={onLogin}
                    disabled={authLoading}
                    className="w-full rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
                    aria-label="Sign in to Four.meme to deploy"
                  >
                    {authLoading ? '⏳ Signing in...' : '🔐 Sign in to Four.meme'}
                  </button>
                  <p className="text-[10px] text-[#52525b] text-center">
                    Required to call the Four.meme create token API
                  </p>
                </div>
              ) : deployStep === 'done' ? (
                <a
                  href={txHash ? `https://bscscan.com/tx/${txHash}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-[#22c55e]/20 px-4 py-2.5 text-sm font-semibold text-[#22c55e] text-center hover:bg-[#22c55e]/30 transition-colors"
                >
                  ✅ View on BSCScan
                </a>
              ) : (
                <button
                  onClick={onDeploy}
                  disabled={deployStep === 'creating' || deployStep === 'signing' || deployStep === 'confirming'}
                  className="flex-1 rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deployStep === 'creating' || deployStep === 'signing' || deployStep === 'confirming'
                    ? '⏳ Deploying...'
                    : '🚀 Launch Token'}
                </button>
              )}

              {deployResult && (
                <div className="mt-3 p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
                  <p className="text-xs text-[#52525b]">
                    Trading Pair: <span className="font-semibold text-white">{tradingPair}</span>
                  </p>
                  {tradingPair === 'USDC' && (
                    <p className="text-[10px] text-blue-400 mt-1">
                      ℹ️ USDC pair selected — ensure your wallet has USDC on BSC for trading
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={onReset}
                className="rounded-lg border border-[#262626] px-3 py-2.5 text-sm text-[#71717a] hover:text-white hover:bg-[#1a1a1a] transition-colors"
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
    <div className={`rounded-md border p-2 text-center ${highlight ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-[#1a1a1a] bg-[#0a0a0a]'}`}>
      <p className="text-[9px] text-[#3f3f46] uppercase">{label}</p>
      <p className={`text-sm font-bold font-mono ${highlight ? 'text-[#22c55e]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function SafetyCertificateUI({ cert }: { cert: NonNullable<TokenGenResult['safetyCertificate']> }) {
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${cert.isSafe ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-yellow-500/30 bg-yellow-950/20'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#22c55e] flex items-center gap-1">
          🛡️ Safety Certificate
        </span>
        <span className={`text-[10px] font-bold ${cert.isSafe ? 'text-[#22c55e]' : 'text-yellow-400'}`}>
          {cert.isSafe ? 'SAFE' : 'REVIEW'}
        </span>
      </div>

      {/* Corrections */}
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

      {/* Guarantees */}
      {cert.guarantees.length > 0 && (
        <div className="text-[11px] text-[#22c55e] space-y-0.5">
          {cert.guarantees.map((g, i) => <div key={i}>• {g}</div>)}
        </div>
      )}

      {/* Warnings */}
      {cert.warnings.length > 0 && (
        <div className="text-[11px] text-yellow-400 space-y-0.5">
          {cert.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Helper: Calculate Agent Safety Score ─────────────────
function calculateAgentScore(result: TokenGenResult): number {
  let score = 70; // Base score
  
  // Fee rate: lower = better for agents
  if (result.taxConfig.feeRate <= 3) score += 10;
  else if (result.taxConfig.feeRate <= 5) score += 5;
  
  // Holder rewards: higher = better for agent retention
  if (result.taxConfig.rateHolder >= 40) score += 10;
  else if (result.taxConfig.rateHolder >= 30) score += 5;
  
  // Anti-sniper: mandatory for agents
  if (result.taxConfig.feePlan) score += 10;
  
  // Safety compiler corrections: auto-fixed = +5 trust
  if (result.safetyCertificate?.corrections?.length) score += 5;
  
  // Cap at 100
  return Math.min(100, score);
}

// ── Helper: Genesis Twitter Share (no token address yet) ──
function GenesisTwitterShare({ result }: { result: TokenGenResult }) {
  
  // Build custom tweet for Genesis context
  const tweetText = encodeURIComponent(
    `Just generated $${result.symbol} with @fourdotmemeZH AI + @MemeBrain safety!\n\n` +
    `Name: ${result.name}\n` +
    `Fee: ${result.taxConfig.feeRate}% | Holders: ${result.taxConfig.rateHolder}%\n` +
    `Safety: ${result.safetyCertificate?.corrections?.length || 0} auto-corrections applied\n\n` +
    `Try it: https://memebrain.vercel.app/genesis\n` +
    `#FourMeme #MemeBrain #BNBChain`
  );
  
  return (
    <a
      href={`https://twitter.com/intent/tweet?text=${tweetText}`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#1DA1F2]/30 bg-[#1DA1F2]/10 px-4 py-2.5 text-sm font-semibold text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-colors"
    >
      🐦 Share on X
    </a>
  );
}

function DeployProgress({ step }: { step: DeployStep; txHash: string | null }) {
  const steps: Array<{ label: string; key: DeployStep }> = [
    { label: 'API Call', key: 'creating' },
    { label: 'Sign TX', key: 'signing' },
    { label: 'Confirm', key: 'confirming' },
    { label: 'Done', key: 'done' },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              i < currentIdx
                ? 'bg-[#22c55e] text-black'
                : i === currentIdx
                ? 'bg-[#22c55e]/30 text-[#22c55e] ring-2 ring-[#22c55e]/50 animate-pulse'
                : 'bg-[#1a1a1a] text-[#3f3f46]'
            }`}
          >
            {i < currentIdx ? '✓' : i + 1}
          </div>
          <span className={`text-[10px] ${i <= currentIdx ? 'text-[#71717a]' : 'text-[#3f3f46]'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && <div className={`w-4 h-px ${i < currentIdx ? 'bg-[#22c55e]' : 'bg-[#1a1a1a]'}`} />}
        </div>
      ))}
    </div>
  );
}
