// lib/bsc.ts
// BSC RPC provider with fallback for auto-rotation on rate limits.
// Module-level instantiation = cached across warm serverless invocations.

import { ethers } from 'ethers';

// ── BSC Mainnet ──────────────────────────────────────────────
const BSC_MAINNET_RPCS = [
  'https://bsc-dataseed.bnbchain.org',
  'https://bsc-dataseed1.bnbchain.org',
  'https://rpc.ankr.com/bsc',
];

// ── BSC Testnet ──────────────────────────────────────────────
const BSC_TESTNET_RPCS = [
  'https://bsc-testnet-dataseed.bnbchain.org',
  'https://bsc-testnet.bnbchain.org',
];

/**
 * Create a JsonRpcProvider with a static network to avoid extra chainId calls.
 */
function createProvider(url: string, chainId: number): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(url, chainId, {
    staticNetwork: true,
  });
}

/**
 * Create an array of providers from RPC URLs for fallback.
 * The first provider is the primary; others are fallbacks.
 */
function createProviders(rpcs: string[], chainId: number) {
  return rpcs.map((url) => createProvider(url, chainId));
}

// Pre-configure provider arrays (cached at module level)
const mainnetProviders = createProviders(BSC_MAINNET_RPCS, 56);
const testnetProviders = createProviders(BSC_TESTNET_RPCS, 97);

// Export primary providers
export const mainnetProvider = mainnetProviders[0];
export const testnetProvider = testnetProviders[0];

// Default provider for on-chain reads (Risk Engine etc. reads mainnet tokens)
export const provider = mainnetProvider;

/**
 * Execute an RPC call with automatic fallback.
 * Tries each provider in order until one succeeds.
 */
export async function withFallback<T>(
  fn: (provider: ethers.JsonRpcProvider) => Promise<T>,
  network: 'mainnet' | 'testnet' = 'mainnet'
): Promise<T> {
  const providers = network === 'mainnet' ? mainnetProviders : testnetProviders;
  let lastError: Error | null = null;

  for (const p of providers) {
    try {
      return await fn(p);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`RPC fallback: ${p._getConnection().url} failed, trying next...`);
    }
  }

  throw lastError || new Error('All RPC providers failed');
}
