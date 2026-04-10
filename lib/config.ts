// lib/config.ts
// Mock mode toggle — controls whether API routes serve mock or live data.
// Set via NEXT_PUBLIC_APP_MODE env var, or via ?mock=true query param for demo.

export type AppMode = 'mock' | 'live';

/**
 * Get app mode from environment variable (works server-side).
 */
export function getAppModeFromEnv(): AppMode {
  return (process.env.NEXT_PUBLIC_APP_MODE as AppMode) || 'live';
}

/**
 * Determine app mode for client-side:
 * 1. ENV var NEXT_PUBLIC_APP_MODE takes priority
 * 2. Query param ?mock=true forces mock mode (for judges/demo)
 * 3. Default: 'live'
 */
export function getAppMode(): AppMode {
  // Server-side: only check env var
  if (typeof window === 'undefined') {
    return getAppModeFromEnv();
  }

  // Client-side: check env var first, then query param
  const envMode = process.env.NEXT_PUBLIC_APP_MODE as AppMode;
  if (envMode === 'mock') return 'mock';

  if (window.location.search.includes('mock=true')) {
    return 'mock';
  }

  return envMode || 'live';
}

/**
 * Check if a request should use mock mode.
 * Works server-side by checking both env var and request URL query param.
 */
export function isMockMode(requestUrl?: string): boolean {
  // Check env first
  if (getAppModeFromEnv() === 'mock') return true;

  // Check URL query param if provided (for API routes)
  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      if (url.searchParams.get('mock') === 'true') return true;
    } catch {
      // Invalid URL, ignore
    }
  }

  return false;
}
