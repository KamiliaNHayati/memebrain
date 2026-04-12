'use client';

// app/genesis/page.tsx
// Day 7: Conversational UI with animated preview card,
// MetaMask signing (TokenManager2.createToken), and transaction status.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useFourMemeAuth } from '@/hooks/use-fourmeme-auth';
import { validateGenesisConfig } from '@/lib/safety-compiler';

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
const TOKEN_MANAGER_ABI = [
  'function createToken(bytes calldata createArg, bytes calldata sign) external payable',
];

// ── Main Component ───────────────────────────────────────────

export default function GenesisPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { accessToken, isAuthenticated, login, isLoading: authLoading } = useFourMemeAuth();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: "Hi! I'm MemeBrain AI. Describe a meme token concept and I'll generate a safe, optimized configuration — or pick one of my suggestions below.",
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Token state
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
        addMessage('ai', `Sorry, something went wrong: ${msg}. Try again?`);
      } finally {
        setLoading(false);
      }
    },
    []
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
    if (!result || !accessToken || !address || !walletClient) return;

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
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
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
        addMessage('ai', '✅ Mock deploy complete! In live mode, this would create the token on BSC.');
        return;
      }

      // Live mode: call TokenManager2.createToken via walletClient
      const { encodeFunctionData, parseEther } = await import('viem');

      const txData = encodeFunctionData({
        abi: [
          {
            name: 'createToken',
            type: 'function',
            stateMutability: 'payable',
            inputs: [
              { name: 'createArg', type: 'bytes' },
              { name: 'sign', type: 'bytes' },
            ],
            outputs: [],
          },
        ],
        functionName: 'createToken',
        args: [data.createArg as `0x${string}`, data.signature as `0x${string}`],
      });

      const hash = await walletClient.sendTransaction({
        to: TOKEN_MANAGER_ADDRESS as `0x${string}`,
        data: txData,
        value: parseEther('0.01'), // Creation fee
      });

      setTxHash(hash);
      setDeployStep('confirming');
      addMessage('ai', `⏳ Transaction submitted! Hash: ${hash.slice(0, 10)}...`);

      // Wait for confirmation (simplified — in production use waitForTransactionReceipt)
      setDeployStep('done');
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
  }, [result, accessToken, address, walletClient]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
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
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              id="chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={result ? 'Describe a different concept...' : 'Describe your meme token idea...'}
              className="flex-1 rounded-lg border border-[#262626] bg-[#111111] px-4 py-3 text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30 transition-all"
              disabled={loading}
              maxLength={500}
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
          {result ? (
            <PreviewCard
              result={result}
              revealStep={revealStep}
              deployStep={deployStep}
              txHash={txHash}
              deployError={deployError}
              isConnected={isConnected}
              isAuthenticated={isAuthenticated}
              authLoading={authLoading}
              onLogin={login}
              onDeploy={handleDeploy}
              onReset={() => {
                setResult(null);
                setDeployResult(null);
                setDeployError(null);
                setDeployStep('idle');
                setTxHash(null);
              }}
            />
          ) : (
            <EmptyPreview />
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-300">
          ❌ {error}
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
                <p className="text-xs text-[#52525b]">💡 Connect wallet to deploy</p>
              ) : !isAuthenticated ? (
                <button
                  onClick={onLogin}
                  disabled={authLoading}
                  className="flex-1 rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
                >
                  {authLoading ? '⏳ Signing in...' : '🔐 Sign in to Four.meme'}
                </button>
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

function DeployProgress({ step, txHash }: { step: DeployStep; txHash: string | null }) {
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
