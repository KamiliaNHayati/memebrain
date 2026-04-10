// app/api/health/route.ts
// Health check endpoint — returns BSC block number to verify RPC connectivity.

import { NextResponse } from 'next/server';
import { provider, testnetProvider } from '@/lib/bsc';

export const maxDuration = 60; // Vercel timeout extension

export async function GET() {
  try {
    // Try mainnet first
    const [mainnetBlock, testnetBlock] = await Promise.allSettled([
      provider.getBlockNumber(),
      testnetProvider.getBlockNumber(),
    ]);

    const result: Record<string, unknown> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      bsc: {
        mainnet: {
          blockNumber:
            mainnetBlock.status === 'fulfilled'
              ? mainnetBlock.value
              : null,
          connected: mainnetBlock.status === 'fulfilled',
          error:
            mainnetBlock.status === 'rejected'
              ? mainnetBlock.reason?.message
              : undefined,
        },
        testnet: {
          blockNumber:
            testnetBlock.status === 'fulfilled'
              ? testnetBlock.value
              : null,
          connected: testnetBlock.status === 'fulfilled',
          error:
            testnetBlock.status === 'rejected'
              ? testnetBlock.reason?.message
              : undefined,
        },
      },
    };

    // Overall health is OK if at least mainnet is connected
    if (mainnetBlock.status === 'rejected') {
      result.status = 'degraded';
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
