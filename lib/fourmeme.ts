// lib/fourmeme.ts
// Four.meme API client — stub for Day 2 (Auth) and Day 6 (Token Creation).
// Authentication flow: nonce → sign → access_token

export const FOURMEME_BASE_URL = 'https://four.meme/api';

/**
 * Step 1: Generate nonce for wallet signing.
 * POST /v1/private/user/nonce/generate
 */
export async function generateNonce(walletAddress: string): Promise<string> {
  // TODO: Implement Day 2
  throw new Error('Not implemented — Day 2 task');
}

/**
 * Step 2: User signs message: "You are sign in Meme {nonce}"
 * This happens client-side via MetaMask/wagmi.
 */

/**
 * Step 3: Login with signed message.
 * POST /v1/private/user/login/dex
 */
export async function loginWithSignature(
  walletAddress: string,
  signature: string,
  nonce: string
): Promise<string> {
  // TODO: Implement Day 2
  throw new Error('Not implemented — Day 2 task');
}

/**
 * Create a token on Four.meme.
 * POST /v1/private/token/create
 */
export async function createToken(
  accessToken: string,
  tokenConfig: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // TODO: Implement Day 6
  throw new Error('Not implemented — Day 6 task');
}
