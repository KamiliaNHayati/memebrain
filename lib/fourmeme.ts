// lib/fourmeme.ts
// Four.meme API client — Auth flow + Token Creation.
// Flow: nonce → sign → access_token → API calls with `meme-web-access` header.

const FOURMEME_BASE_URL = 'https://four.meme/meme-api';

interface FourMemeResponse<T> {
  code: number | string;
  msg?: string;
  data: T;
}

// ── Auth Flow ────────────────────────────────────────────────

/**
 * Step 1: Generate nonce for wallet signing.
 * POST /v1/private/user/nonce/generate
 */
export async function generateNonce(walletAddress: string): Promise<string> {
  const res = await fetch(`${FOURMEME_BASE_URL}/v1/private/user/nonce/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountAddress: walletAddress,
      verifyType: 'LOGIN',
      networkCode: 'BSC',
    }),
  });

  if (!res.ok) {
    throw new Error(`Nonce generation failed: ${res.status} ${res.statusText}`);
  }

  const json: FourMemeResponse<string> = await res.json();

  if (String(json.code) !== '0') {
    throw new Error(`Nonce generation error: ${json.msg || json.code}`);
  }

  return json.data;
}

/**
 * Build the message that the user must sign with their wallet.
 * Per Four.meme docs: "You are sign in Meme {nonce}"
 */
export function buildSignMessage(nonce: string): string {
  return `You are sign in Meme ${nonce}`;
}

/**
 * Step 3: Login with signed message.
 * POST /v1/private/user/login/dex
 * Returns the access_token.
 */
export async function loginWithSignature(
  walletAddress: string,
  signature: string,
): Promise<string> {
  const res = await fetch(`${FOURMEME_BASE_URL}/v1/private/user/login/dex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: 'WEB',
      langType: 'EN',
      loginIp: '',
      inviteCode: '',
      verifyInfo: {
        address: walletAddress,
        networkCode: 'BSC',
        signature,
        verifyType: 'LOGIN',
      },
      walletName: 'MetaMask',
    }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${res.statusText}`);
  }

  const json: FourMemeResponse<string> = await res.json();

  if (String(json.code) !== '0') {
    throw new Error(`Login error: ${json.msg || json.code}`);
  }

  return json.data; // access_token
}

// ── Token Info ───────────────────────────────────────────────

/**
 * Get public token info from Four.meme.
 * GET /v1/private/token/get?address={tokenAddress}
 * Note: This endpoint works without auth for reading.
 */
export async function getTokenInfo(
  tokenAddress: string,
  accessToken?: string
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['meme-web-access'] = accessToken;
  }

  const res = await fetch(
    `${FOURMEME_BASE_URL}/v1/private/token/get?address=${tokenAddress}`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Token info request failed: ${res.status}`);
  }

  const json: FourMemeResponse<Record<string, unknown>> = await res.json();

  if (String(json.code) !== '0') {
    throw new Error(`Token info error: ${json.msg || json.code}`);
  }

  return json.data;
}

// ── Token Creation (Day 6) ───────────────────────────────────

/**
 * Upload token image to Four.meme.
 * POST /v1/private/token/upload
 */
export async function uploadTokenImage(
  accessToken: string,
  imageFile: File
): Promise<string> {
  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await fetch(`${FOURMEME_BASE_URL}/v1/private/token/upload`, {
    method: 'POST',
    headers: {
      'meme-web-access': accessToken,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Image upload failed: ${res.status}`);
  }

  const json: FourMemeResponse<string> = await res.json();

  if (String(json.code) !== '0') {
    throw new Error(`Image upload error: ${json.msg || json.code}`);
  }

  return json.data; // image URL
}

/**
 * Create a token on Four.meme.
 * POST /v1/private/token/create
 * Returns createArg + signature for on-chain transaction.
 */
export async function createToken(
  accessToken: string,
  tokenConfig: Record<string, unknown>
): Promise<{ createArg: string; signature: string }> {
  const res = await fetch(`${FOURMEME_BASE_URL}/v1/private/token/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'meme-web-access': accessToken,
    },
    body: JSON.stringify(tokenConfig),
  });

  if (!res.ok) {
    throw new Error(`Token creation failed: ${res.status}`);
  }

  const json: FourMemeResponse<{ createArg: string; signature: string }> =
    await res.json();

  if (String(json.code) !== '0') {
    throw new Error(`Token creation error: ${json.msg || json.code}`);
  }

  return json.data;
}
