// app/api/genesis/create/route.ts
// Full token creation flow: LLM output → Four.meme API → createArg + signature.
// The frontend sends the token config (from /generate) + accessToken + walletAddress.
// This route builds the Four.meme payload and calls /v1/private/token/create.

import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/config';

export const maxDuration = 60;

const FOURMEME_BASE = 'https://four.meme/meme-api';

// Placeholder image for demo when no image is uploaded
const PLACEHOLDER_IMAGE =
  'https://image.pollinations.ai/prompt/meme%20token%20logo%20abstract%20neon%20crypto?width=400&height=400&nologo=true';

// Fixed raisedToken config from Four.meme docs
const RAISED_TOKEN_BSC = {
  symbol: 'BNB',
  nativeSymbol: 'BNB',
  symbolAddress: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  deployCost: '0',
  buyFee: '0.01',
  sellFee: '0.01',
  minTradeFee: '0',
  b0Amount: '8',
  totalBAmount: '24',
  totalAmount: '1000000000',
  logoUrl:
    'https://static.four.meme/market/68b871b6-96f7-408c-b8d0-388d804b34275092658264263839640.png',
  tradeLevel: ['0.1', '0.5', '1'],
  status: 'PUBLISH',
  buyTokenLink: 'https://pancakeswap.finance/swap',
  reservedNumber: 10,
  saleRate: '0.8',
  networkCode: 'BSC',
  platform: 'MEME',
};

// Valid Four.meme labels
const VALID_LABELS = [
  'Meme', 'AI', 'Defi', 'Games', 'Infra', 'De-Sci', 'Social', 'Depin', 'Charity', 'Others',
];

interface TokenConfig {
  name: string;
  symbol: string;
  description: string;
  taxConfig: {
    feeRate: number;
    rateFounder: number;
    rateHolder: number;
    rateBurn: number;
    rateLiquidity: number;
    feePlan: boolean;
  };
  imagePrompt?: string;
  tags?: string[];
}

interface CreateRequest {
  tokenConfig: TokenConfig;
  accessToken: string;
  walletAddress: string;
  imageUrl?: string;
  preSale?: string; // BNB amount for creator's pre-purchase (default "0")
  label?: string;   // Token category (default best-guess from tags)'
  tradingPair?: 'BNB' | 'USDC';
}

/**
 * Map LLM tags to a Four.meme label.
 */
function inferLabel(tags?: string[]): string {
  if (!tags || tags.length === 0) return 'Meme';
  const lower = tags.map((t) => t.toLowerCase());

  if (lower.some((t) => t.includes('ai') || t.includes('bot') || t.includes('agent'))) return 'AI';
  if (lower.some((t) => t.includes('defi') || t.includes('yield') || t.includes('dividend'))) return 'Defi';
  if (lower.some((t) => t.includes('game'))) return 'Games';
  if (lower.some((t) => t.includes('social'))) return 'Social';
  if (lower.some((t) => t.includes('charity'))) return 'Charity';
  return 'Meme';
}

// ── Helper: Get raisedToken config based on trading pair ─────
function getRaisedToken(pair: 'BNB' | 'USDC' = 'BNB') {
  if (pair === 'USDC') {
    return {
      symbol: 'USDC',
      nativeSymbol: 'USDC',
      symbolAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC on BSC
      deployCost: '0',
      buyFee: '0.01',
      sellFee: '0.01',
      minTradeFee: '0',
      // ⚠️ ADJUSTED FOR USDC (6 decimals, ~$1 price)
      // Target: ~$15,000-20,000 USDC (similar to 24 BNB value)
      b0Amount: '8000',        // 8,000 USDC initial (~$8,000)
      totalBAmount: '18000',   // 18,000 USDC total (~$18,000)
      totalAmount: '1000000000',
      logoUrl: 'https://static.four.meme/market/usdc-logo.png',
      tradeLevel: ['0.1', '0.5', '1'],
      status: 'PUBLISH',
      buyTokenLink: 'https://pancakeswap.finance/swap',
      reservedNumber: 10,
      saleRate: '0.8',
      networkCode: 'BSC',
      platform: 'MEME',
    };
  }
  // Default: BNB
  return RAISED_TOKEN_BSC;
}

/**
 * Build the full Four.meme /v1/private/token/create payload
 * from our LLM-generated token config.
 */
function buildCreatePayload(req: CreateRequest) {
  const { tokenConfig, walletAddress, imageUrl, preSale, label } = req;
  const { taxConfig } = tokenConfig;

  // Determine label
  const tokenLabel = label && VALID_LABELS.includes(label) ? label : inferLabel(tokenConfig.tags);

  // Build tokenTaxInfo (only for TaxTokens — when feeRate > 0)
  const hasTax = taxConfig.feeRate > 0;
  const tokenTaxInfo = hasTax
    ? {
        feeRate: taxConfig.feeRate,
        burnRate: taxConfig.rateBurn,
        divideRate: taxConfig.rateHolder,
        liquidityRate: taxConfig.rateLiquidity,
        recipientAddress: walletAddress, // Creator receives founder share
        recipientRate: taxConfig.rateFounder,
        minSharing: 100000, // 1×10⁵ — minimum threshold
      }
    : undefined;

  return {
    name: tokenConfig.name,
    shortName: tokenConfig.symbol,
    desc: tokenConfig.description,
    imgUrl: imageUrl || PLACEHOLDER_IMAGE,
    launchTime: Date.now(),
    label: tokenLabel,
    lpTradingFee: 0.0025, // Fixed by Four.meme
    webUrl: '',
    twitterUrl: '',
    telegramUrl: '',
    preSale: preSale || '0',
    onlyMPC: false,
    feePlan: taxConfig.feePlan,
    ...(tokenTaxInfo ? { tokenTaxInfo } : {}),
    raisedToken: getRaisedToken(req.tradingPair)
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateRequest = await request.json();
    const { tokenConfig, accessToken, walletAddress } = body;

    // Validate required fields
    if (!tokenConfig?.name || !tokenConfig?.symbol) {
      return NextResponse.json(
        { error: 'Missing token name or symbol' },
        { status: 400 }
      );
    }
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing accessToken — please connect wallet and sign in first' },
        { status: 400 }
      );
    }
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing walletAddress' },
        { status: 400 }
      );
    }

    // ── Mock Mode ──────────────────────────────────────────
    if (isMockMode(request.url)) {
      return NextResponse.json({
        createArg: '0x' + '00'.repeat(64) + '(mock_createArg)',
        signature: '0x' + 'ff'.repeat(64) + '(mock_signature)',
        payload: buildCreatePayload(body),
        mode: 'mock',
        tradingPair: body.tradingPair || 'BNB',  // ← ADD THIS
        instructions: {
          step: 'Sign the transaction in your wallet',
          contract: 'TokenManager2',
          method: 'createToken(bytes createArg, bytes sign)',
          note: `Mock response for ${body.tradingPair || 'BNB'} pair — no real transaction.`,
        },
      });
    }

    // ── Build Four.meme Payload ─────────────────────────────
    const payload = buildCreatePayload(body);

    console.log('[Genesis] Creating token:', payload.name, payload.shortName);

    // ── Call Four.meme API ──────────────────────────────────
    let res: Response;
    let json: any;
    
    try {
      res = await fetch(`${FOURMEME_BASE}/v1/private/token/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'meme-web-access': accessToken,
        },
        body: JSON.stringify(payload),
      });
    
      // Handle HTTP errors
      if (!res.ok) {
        const text = await res.text();
        console.error('[Genesis] Four.meme HTTP error:', res.status, text);
        
        // Special handling for USDC failures — USE body.tradingPair
        if (body.tradingPair === 'USDC') {  // ← FIXED: body, not req
          return NextResponse.json(
            { 
              error: 'USDC pair not supported yet',
              suggestion: 'Try BNB pair instead',
              details: text,
            },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: 'Four.meme token creation failed', details: text },
          { status: res.status }
        );
      }
    
      json = await res.json();
      
    } catch (error) {
      console.error('[Genesis] Four.meme API error:', error);
      return NextResponse.json(
        { 
          error: 'Token creation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          // FIXED: body.tradingPair, not req.tradingPair
          suggestion: body.tradingPair === 'USDC' ? 'Try BNB pair instead' : 'Check your connection',
        },
        { status: 500 }
      );
    }
    
    // Check Four.meme business logic errors
    if (String(json.code) !== '0') {
      // If USDC failed, provide helpful error — FIXED: body.tradingPair
      if (body.tradingPair === 'USDC') {  // ← FIXED
        return NextResponse.json(
          {
            error: 'USDC pair configuration failed',
            details: json.msg || json.code,
            suggestion: 'Four.meme may not support USDC yet. Try BNB pair.',
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Four.meme creation error', details: json.msg || json.code },
        { status: 400 }
      );
    }
    
    // ── Return createArg + signature + instructions ─────────
    return NextResponse.json({
      createArg: json.data.createArg,
      signature: json.data.signature,
      payload,
      // FIXED: body.tradingPair, not req.tradingPair
      tradingPair: body.tradingPair || 'BNB',  // ← FIXED
      mode: 'live',
      instructions: {
        step: 'Sign the on-chain transaction in your wallet',
        contract: 'TokenManager2',
        method: 'createToken(bytes createArg, bytes sign)',
        note: 'Call TokenManager2.createToken with the returned createArg and signature as byte arrays.',
        fee: '0.01 BNB minimum required',
      },
    });
  } catch (error) {
    console.error('[Genesis] Error:', error);
    return NextResponse.json(
      {
        error: 'Token creation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
