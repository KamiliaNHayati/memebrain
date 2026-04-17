'use client';

// components/error-card.tsx
// Reusable error display with human-readable messages and retry button.

interface ErrorCardProps {
  error: string;
  onRetry?: () => void;
  retryLabel?: string;
}

// Map technical errors to human-readable messages
function humanizeError(error: string): { title: string; description: string } {
  const lower = error.toLowerCase();

  if (lower.includes('fetch') || lower.includes('network') || lower.includes('econnrefused')) {
    return {
      title: 'Network Error',
      description: 'Unable to reach the server. Check your internet connection and try again.',
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline')) {
    return {
      title: 'Request Timed Out',
      description: 'The operation took too long. BSC network may be congested — try again in a moment.',
    };
  }

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) {
    return {
      title: 'Rate Limited',
      description: 'Too many requests. Wait a few seconds before trying again.',
    };
  }

  if (lower.includes('rpc') || lower.includes('provider') || lower.includes('block')) {
    return {
      title: 'BSC Network Busy',
      description: 'The BSC RPC endpoint is overloaded. We\'ll retry with a fallback provider automatically.',
    };
  }

  if (lower.includes('invalid') && lower.includes('address')) {
    return {
      title: 'Invalid Address',
      description: 'Please enter a valid 0x-prefixed Ethereum/BSC address (42 characters).',
    };
  }

  if (lower.includes('not found') || lower.includes('404')) {
    return {
      title: 'Token Not Found',
      description: 'This address doesn\'t appear to be a Four.meme token. Double-check the address.',
    };
  }

  if (lower.includes('usdc') || lower.includes('pair')) {
    return {
      title: 'USDC Pair Issue',
      description: 'USDC pair may not be supported yet. Try switching to BNB pair instead.',
    };
  }

  if (lower.includes('rejected') || lower.includes('denied') || lower.includes('cancelled')) {
    return {
      title: 'Transaction Cancelled',
      description: 'You cancelled the wallet transaction. You can try again when ready.',
    };
  }

  // Default: show the original error
  return {
    title: 'Something Went Wrong',
    description: error,
  };
}

export function ErrorCard({ error, onRetry, retryLabel = 'Try Again' }: ErrorCardProps) {
  const { title, description } = humanizeError(error);
  
  return (
    <div
      className="rounded-xl border border-red-500/30 bg-red-950/20 p-5 animate-page-enter"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
          <span className="text-lg">❌</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-400 mb-1">{title}</h3>
          <p className="text-sm text-red-300/80 leading-relaxed">{description}</p>

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
              aria-label={retryLabel}
            >
              ↻ {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
