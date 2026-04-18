'use client';

// hooks/use-fourmeme-auth.ts
// Four.meme authentication — shared via React Context so Navbar + Genesis
// (and any other consumer) share the same auth state.
//
// Flow: Connect wallet → Generate nonce → Sign message → Exchange for access_token

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { buildSignMessage } from '@/lib/fourmeme';

export type AuthStatus = 'disconnected' | 'connected' | 'signing' | 'authenticated' | 'error';

interface FourMemeAuthContextValue {
  status: AuthStatus;
  address: string | undefined;
  accessToken: string | null;
  error: string | null;
  authenticate: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const FourMemeAuthContext = createContext<FourMemeAuthContextValue | null>(null);

// ── Provider (wrap once in Providers) ────────────────────────────

export function FourMemeAuthProvider({ children }: { children: ReactNode }) {
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

  return (
    <FourMemeAuthContext.Provider
      value={{
        status: currentStatus,
        address,
        accessToken,
        error,
        authenticate,
        logout,
        isAuthenticated: !!accessToken,
      }}
    >
      {children}
    </FourMemeAuthContext.Provider>
  );
}

// ── Hook (consumers call this) ──────────────────────────────────

export function useFourMemeAuth(): FourMemeAuthContextValue {
  const context = useContext(FourMemeAuthContext);
  if (!context) {
    throw new Error('useFourMemeAuth must be used within <FourMemeAuthProvider>');
  }
  return context;
}
