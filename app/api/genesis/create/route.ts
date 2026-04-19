// app/api/genesis/create/route.ts
// Full token creation flow: LLM output → Blink image → Four.meme API → createArg + signature.

import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/config';

export const maxDuration = 60;

const FOURMEME_BASE = 'https://four.meme/meme-api';

// Placeholder image for demo when no image is uploaded
// Use a real static hosted image, not Pollinations
const PLACEHOLDER_IMAGE = 'https://static.four.meme/market/68b871b6-96f7-408c-b8d0-388d804b34275092658264263839640.png';

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
  preSale?: string;
  label?: string;
  tradingPair?: 'BNB' | 'USDC';
  webUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
}

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

function getRaisedToken(pair: 'BNB' | 'USDC' = 'BNB') {
  if (pair === 'USDC') {
    return {
      symbol: 'USDC',
      nativeSymbol: 'USDC',
      symbolAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      deployCost: '0',
      buyFee: '0.01',
      sellFee: '0.01',
      minTradeFee: '0',
      b0Amount: '8000',
      totalBAmount: '18000',
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
  return RAISED_TOKEN_BSC;
}

/**
 * Build the full Four.meme /v1/private/token/create payload
 */
function buildCreatePayload(req: CreateRequest) {
  const { tokenConfig, imageUrl, label } = req;

  const safeSymbol = tokenConfig.symbol
    .toUpperCase()
    .replace(/[^A-Z]/g, '') // letters only, no numbers
    .slice(0, 8);

  const tokenLabel = label && VALID_LABELS.includes(label) ? label : inferLabel(tokenConfig.tags);
  const raisedToken = getRaisedToken(req.tradingPair);

  return {
    name: tokenConfig.name,
    shortName: safeSymbol,
    symbol: 'BNB',                      // Fixed param: base currency, NOT token ticker
    desc: tokenConfig.description.replace(/[^\x00-\x7F]/g, ''),
    imgUrl: imageUrl || PLACEHOLDER_IMAGE,
    launchTime: Date.now(),
    label: tokenLabel,
    lpTradingFee: 0.0025,               // Fixed by Four.meme
    preSale: '0',
    raisedAmount: raisedToken.totalBAmount,
    onlyMPC: false,
    feePlan: false,
    raisedToken,
  };
}

function encodeCreateTokenCalldata(createArg: string, signature: string): string {
  const selector = 'df5a8b2e'; // createToken(bytes,bytes)
  
  function encodeBytes(hex: string): string {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const byteLen = clean.length / 2;
    const lenHex = byteLen.toString(16).padStart(64, '0');
    const padded = clean.length % 64 === 0 ? clean : clean.padEnd(clean.length + (64 - clean.length % 64), '0');
    return lenHex + padded;
  }
  
  const arg = createArg.startsWith('0x') ? createArg.slice(2) : createArg;
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature; // ← use the parameter
  
  const offset1 = '0000000000000000000000000000000000000000000000000000000000000040';
  const argEncoded = encodeBytes(arg);
  const offset2Val = 64 + argEncoded.length / 2;
  const offset2 = offset2Val.toString(16).padStart(64, '0');
  
  return '0x' + selector + offset1 + offset2 + argEncoded + encodeBytes(sig);
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateRequest = await request.json();
    const { tokenConfig, accessToken, walletAddress } = body;

    // Validate required fields
    if (!tokenConfig?.name || !tokenConfig?.symbol) {
      return NextResponse.json({ error: 'Missing token name or symbol' }, { status: 400 });
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing accessToken — please connect wallet and sign in first' }, { status: 400 });
    }
    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }

    // ── Mock Mode ──────────────────────────────────────────
    if (isMockMode(request.url)) {
      const mockImageUrl = tokenConfig.imagePrompt 
        ? `https://image.pollinations.ai/prompt/${encodeURIComponent(tokenConfig.imagePrompt)}?width=512&height=512&nologo=true&seed=${Date.now()}`
        : PLACEHOLDER_IMAGE;
        
      return NextResponse.json({
        createArg: '0x' + '00'.repeat(64) + '(mock_createArg)',
        signature: '0x' + 'ff'.repeat(64) + '(mock_signature)',
        payload: buildCreatePayload({ ...body, imageUrl: mockImageUrl }),
        mode: 'mock',
        tradingPair: body.tradingPair || 'BNB',
        instructions: {
          step: 'Sign the transaction in your wallet',
          contract: 'TokenManager2',
          method: 'createToken(bytes createArg, bytes sign)',
          note: `Mock response for ${body.tradingPair || 'BNB'} pair — Pollinations image mocked.`,
        },
      });
    }

    // ── STEP 1: Generate + Upload Token Logo ─────────────────────
    let finalImageUrl = body.imageUrl || PLACEHOLDER_IMAGE;

    if (tokenConfig.imagePrompt) {
      try {
        const pollinationsPrompt = encodeURIComponent(
          `${tokenConfig.imagePrompt}, meme token logo, professional, high quality, vibrant colors`
        );
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${pollinationsPrompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;

        console.log('[Genesis] Fetching image from Pollinations:', pollinationsUrl);
        const imgBlob = await (await fetch(pollinationsUrl)).blob();

        // 1b. Try Four.meme's own upload endpoint first
        let uploadedToFourMeme = false;
        try {
          const fourMemeForm = new FormData();
          fourMemeForm.append('file', imgBlob, 'token-logo.png');

          const fourMemeUpload = await fetch(`${FOURMEME_BASE}/v1/private/token/upload`, {
            method: 'POST',
            headers: { 'meme-web-access': accessToken },
            body: fourMemeForm,
          });

          console.log('[Genesis] Four.meme upload status:', fourMemeUpload.status);
          const fourMemeText = await fourMemeUpload.text();
          console.log('[Genesis] Four.meme upload response:', fourMemeText);

          if (fourMemeUpload.ok) {
            const fourMemeJson = JSON.parse(fourMemeText);
            if (String(fourMemeJson.code) === '0' && fourMemeJson.data) {
              finalImageUrl = fourMemeJson.data;
              uploadedToFourMeme = true;
              console.log('[Genesis] Four.meme image URL:', finalImageUrl);
            }
          }
        } catch (e) {
          console.log('[Genesis] Four.meme upload failed, falling back to Cloudinary:', e);
        }

        // 1c. Fallback to Cloudinary if Four.meme upload failed
        if (!uploadedToFourMeme) {
          const imgBuffer = await imgBlob.arrayBuffer();
          const base64 = Buffer.from(imgBuffer).toString('base64');

          const cloudForm = new FormData();
          cloudForm.append('file', `data:image/png;base64,${base64}`);
          cloudForm.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET!);

          const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: 'POST', body: cloudForm }
          );
          const uploadJson = await uploadRes.json();
          if (uploadJson.error) throw new Error(uploadJson.error.message);

          finalImageUrl = uploadJson.secure_url;
          console.log('[Genesis] Cloudinary URL:', finalImageUrl);
        }

      } catch (error) {
        console.error('[Genesis] Image upload failed, using placeholder:', error);
        finalImageUrl = PLACEHOLDER_IMAGE;
      }
    }

    // ── STEP 2: Build Four.meme Payload WITH Generated Image ─
    // ← THIS IS WHERE YOU USE finalImageUrl
    const payload = buildCreatePayload({
      ...body,
      imageUrl: finalImageUrl, // ← Pass generated/fallback image to payload builder
    });

    console.log('[Genesis] Full payload imgUrl:', payload.imgUrl);
    console.log('[Genesis] Full payload:', JSON.stringify(payload, null, 2));

    console.log('[Genesis] Creating token:', payload.name, payload.shortName);

    // ── STEP 3: Call Four.meme API ───────────────────────────
    let res: Response;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      const rawText = await res.text();
      console.log('[Genesis] Four.meme status:', res.status);
      console.log('[Genesis] Four.meme raw:', rawText); // ← will always log now

      if (!res.ok) {
        return NextResponse.json(
          { error: 'Four.meme token creation failed', details: rawText },
          { status: res.status }
        );
      }

      json = JSON.parse(rawText);

    } catch (error) {
      console.error('[Genesis] Four.meme API error:', error);
      return NextResponse.json(
        { error: 'Token creation failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    if (String(json.code) !== '0') {
      console.error('[Genesis] Four.meme error:', json.code, json.msg);
      return NextResponse.json(
        { error: json.msg || 'Four.meme creation error', details: json.msg || json.code },
        { status: 400 }
      );
    }

    // ── Return createArg + signature + instructions ─────────
    return NextResponse.json({
      createArg: json.data.createArg,
      signature: json.data.signature,
      tokenAddress: json.data.tokenAddress,
      calldata: encodeCreateTokenCalldata(json.data.createArg, json.data.signature),
      payload,
      tradingPair: body.tradingPair || 'BNB',
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
      { error: 'Token creation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}