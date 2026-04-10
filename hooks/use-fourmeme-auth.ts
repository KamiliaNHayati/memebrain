'use client';

// hooks/use-fourmeme-auth.ts
// Custom hook for Four.meme authentication flow:
// 1. Connect wallet (via RainbowKit)
// 2. Generate nonce via /api/auth/nonce proxy
// 3. Sign message with wallet
// 4. Exchange signature for access_token via /api/auth/login proxy
// 5. Store access_token in state (session-based)

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { buildSignMessage } from '@/lib/fourmeme';

export type AuthStatus = 'disconnected' | 'connected' | 'signing' | 'authenticated' | 'error';

interface UseFourMemeAuthReturn {
  /** Current auth status */
  status: AuthStatus;
  /** Connected wallet address */
  address: string | undefined;
  /** Four.meme access token (null if not authenticated) */
  accessToken: string | null;
  /** Error message if auth failed */
  error: string | null;
  /** Trigger the full auth flow (nonce → sign → login) */
  authenticate: () => Promise<void>;
  /** Clear auth state */
  logout: () => void;
  /** Whether the user is fully authenticated with Four.meme */
  isAuthenticated: boolean;
}

export function useFourMemeAuth(): UseFourMemeAuthReturn {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Reset auth when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setAccessToken(null);
      setStatus('disconnected');
      setError(null);
    } else if (!accessToken) {
      setStatus('connected');
    }
  }, [isConnected, accessToken]);

  const authenticate = useCallback(async () => {
    if (!address) {
      setError('No wallet connected. Please connect your wallet first.');
      return;
    }

    try {
      setError(null);
      setStatus('signing');

      // Step 1: Get nonce via our proxy (avoids CORS)
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!nonceRes.ok) {
        const errData = await nonceRes.json();
        throw new Error(errData.details || 'Failed to generate nonce');
      }

      const { nonce } = await nonceRes.json();

      // Step 2: Build message and sign with wallet
      const message = buildSignMessage(nonce);
      const signature = await signMessageAsync({ message });

      // Step 3: Login via our proxy
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      });

      if (!loginRes.ok) {
        const errData = await loginRes.json();
        throw new Error(errData.details || 'Login failed');
      }

      const { accessToken: token } = await loginRes.json();

      // Step 4: Store token
      setAccessToken(token);
      setStatus('authenticated');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed';

      // Handle user rejection gracefully
      if (message.includes('rejected') || message.includes('denied') || message.includes('User rejected')) {
        setError('Signature rejected. Please try again.');
      } else {
        setError(message);
      }
      setStatus('error');
    }
  }, [address, signMessageAsync]);

  const logout = useCallback(() => {
    setAccessToken(null);
    setError(null);
    setStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  // Compute the display status
  const currentStatus: AuthStatus = accessToken
    ? 'authenticated'
    : error
    ? 'error'
    : status;

  return {
    status: currentStatus,
    address,
    accessToken,
    error,
    authenticate,
    logout,
    isAuthenticated: !!accessToken,
  };
}
