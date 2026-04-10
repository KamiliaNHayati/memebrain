// app/api/risk/scan/route.ts
// Risk Scanner API — accepts a token address and returns risk score + audit trail.
// Supports mock mode for demo reliability.

import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/config';
import { MOCK_DEFAULTS } from '@/lib/mock-data';
import { provider } from '@/lib/bsc';
import { TEST_TOKENS } from '@/lib/constants';

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
      // Return appropriate mock based on address
      const mockResponse = getMockForAddress(address);
      return NextResponse.json({
        ...mockResponse,
        tokenAddress: address,
        mode: 'mock',
      });
    }

    // ── Live Mode ──────────────────────────────────────────
    // Day 3 will implement the full risk engine here.
    // For now (Day 1), verify we can read on-chain data.

    const code = await provider.getCode(address);
    const isContract = code !== '0x';

    return NextResponse.json({
      tokenAddress: address,
      mode: 'live',
      isContract,
      codeLength: code.length,
      message: isContract
        ? 'Address is a smart contract. Full risk scan coming Day 3.'
        : 'Address is an EOA (regular wallet), not a token contract.',
      note: 'Full 8-rule risk engine will be implemented on Day 3.',
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
 * Defaults to the critical (honeypot) mock for unknown addresses.
 */
function getMockForAddress(address: string) {
  const lower = address.toLowerCase();

  if (lower === TEST_TOKENS.CRITICAL_HONEYPOT.toLowerCase()) {
    return MOCK_DEFAULTS['/api/risk/scan']; // critical
  }

  // Default to critical for demo impact
  return MOCK_DEFAULTS['/api/risk/scan'];
}
