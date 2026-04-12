// app/api/risk/scan/route.ts
// Risk Scanner API — accepts a token address and returns risk score + audit trail.
// Supports mock mode for demo reliability. Live mode runs the full 8-rule engine.

import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/config';
import { MOCK_DEFAULTS } from '@/lib/mock-data';
import { TEST_TOKENS } from '@/lib/constants';
import { analyzeToken } from '@/lib/risk-engine';
import { generateRiskNarrative } from '@/lib/llm';

export const maxDuration = 60; // Vercel timeout extension

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid token address' },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // ── Mock Mode ──────────────────────────────────────────
    if (isMockMode(request.url)) {
      const mockResponse = getMockForAddress(address);
      return NextResponse.json({
        ...mockResponse,
        tokenAddress: address,
        mode: 'mock',
      });
    }

    // ── Live Mode — Full 8-Rule Risk Engine ────────────────
    const result = await analyzeToken(address);

    let aiExplanation = null;
    if (result.score < 60 && process.env.BLINK_API_KEY) {
      try {
        aiExplanation = await generateRiskNarrative(result);
      } catch (e) {
        console.warn('[Risk] Narrative generation failed:', e);
      }
    }
    
    return NextResponse.json({
      ...result,
      mode: 'live',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Risk scan failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Return the appropriate mock data based on the token address.
 */
function getMockForAddress(address: string) {
  const lower = address.toLowerCase();

  if (lower === TEST_TOKENS.CRITICAL_HONEYPOT.toLowerCase()) {
    return MOCK_DEFAULTS['/api/risk/scan']; // critical mock
  }

  // Default to critical mock for demo impact
  return MOCK_DEFAULTS['/api/risk/scan'];
}
