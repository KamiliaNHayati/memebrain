'use client';

// components/error-card.tsx
// Reusable error display with human-readable messages, retry button,
// and rate-limit cooldown timer.

import { useState, useEffect } from 'react';

interface ErrorCardProps {
  error: string;
  onRetry?: () => void;
  retryLabel?: string;
}

// Map technical errors to human-readable messages
function humanizeError(error: string): { title: string; description: string; isRateLimit: boolean } {
  const lower = error.toLowerCase();

  if (lower.includes('fetch') || lower.includes('network') || lower.includes('econnrefused')) {
    return {
      title: 'Network Error',
      description: 'Unable to reach the server. Check your internet connection and try again.',
      isRateLimit: false,
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline')) {
    return {
      title: 'Request Timed Out',
      description: 'The operation took too long. BSC network may be congested — try again in a moment.',
      isRateLimit: false,
    };
  }

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) {
    return {
      title: 'Rate Limited',
      description: 'Too many requests to the Four.meme API. Please wait before trying again.',
      isRateLimit: true,
    };
  }

  if (lower.includes('rpc') || lower.includes('provider') || lower.includes('block')) {
    return {
      title: 'BSC Network Busy',
      description: 'The BSC RPC endpoint is overloaded. We\'ll retry with a fallback provider automatically.',
      isRateLimit: false,
    };
  }

  if (lower.includes('invalid') && lower.includes('address')) {
    return {
      title: 'Invalid Address',
      description: 'Please enter a valid 0x-prefixed Ethereum/BSC address (42 characters).',
      isRateLimit: false,
    };
  }

  if (lower.includes('not found') || lower.includes('404')) {
    return {
      title: 'Token Not Found',
      description: 'This address doesn\'t appear to be a Four.meme token. Double-check the address.',
      isRateLimit: false,
    };
  }

  if (lower.includes('usdc') || lower.includes('pair')) {
    return {
      title: 'USDC Pair Issue',
      description: 'USDC pair may not be supported yet. Try switching to BNB pair instead.',
      isRateLimit: false,
    };
  }

  if (lower.includes('rejected') || lower.includes('denied') || lower.includes('cancelled')) {
    return {
      title: 'Transaction Cancelled',
      description: 'You cancelled the wallet transaction. You can try again when ready.',
      isRateLimit: false,
    };
  }

  // Default: show the original error
  return {
    title: 'Something Went Wrong',
    description: error,
    isRateLimit: false,
  };
}

export function ErrorCard({ error, onRetry, retryLabel = 'Try Again' }: ErrorCardProps) {
  const { title, description, isRateLimit } = humanizeError(error);
  const COOLDOWN_SECONDS = 10;
  const [cooldown, setCooldown] = useState(isRateLimit ? COOLDOWN_SECONDS : 0);

  // Countdown timer for rate-limited errors
  useEffect(() => {
    if (!isRateLimit) return;
    setCooldown(COOLDOWN_SECONDS);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRateLimit, error]);

  const isCoolingDown = isRateLimit && cooldown > 0;

  return (
    <div
      className={`rounded-xl border p-5 animate-page-enter ${
        isRateLimit
          ? 'border-yellow-500/30 bg-yellow-950/20'
          : 'border-red-500/30 bg-red-950/20'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isRateLimit ? 'bg-yellow-500/20' : 'bg-red-500/20'
        }`}>
          <span className="text-lg">{isRateLimit ? '⏳' : '❌'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold mb-1 ${
            isRateLimit ? 'text-yellow-400' : 'text-red-400'
          }`}>{title}</h3>
          <p className={`text-sm leading-relaxed ${
            isRateLimit ? 'text-yellow-300/80' : 'text-red-300/80'
          }`}>{description}</p>

          {/* Rate limit cooldown bar */}
          {isRateLimit && (
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 rounded-full bg-yellow-900/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-yellow-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(cooldown / COOLDOWN_SECONDS) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-yellow-500/70">
                {cooldown > 0 ? `Retry available in ${cooldown}s` : 'Ready to retry'}
              </p>
            </div>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isCoolingDown}
              className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                isCoolingDown
                  ? 'bg-[#1a1a1a] border border-[#262626] text-[#52525b] cursor-not-allowed'
                  : isRateLimit
                  ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
              }`}
              aria-label={retryLabel}
            >
              ↻ {isCoolingDown ? `Wait ${cooldown}s` : retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

