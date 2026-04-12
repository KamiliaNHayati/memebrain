// app/api/monitor/[address]/route.ts
// Dividend Monitor — polls feeAccumulated/minDispatch from TaxToken contracts.
// Returns progress percentage and simplified sniper alert at 95%+.
// 30s in-memory cache to avoid RPC spam.

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { withFallback } from '@/lib/bsc';
import { TAX_TOKEN_ABI } from '@/lib/constants';
import { isMockMode } from '@/lib/config';
import { monitor84 } from '@/lib/mock-data/index';

export const maxDuration = 60;

// ── 30s Cache Layer ──────────────────────────────────────────
interface CacheEntry {
  data: MonitorResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function getCached(key: string): MonitorResponse | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: MonitorResponse) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Response Type ────────────────────────────────────────────
interface MonitorResponse {
  tokenAddress: string;
  feeAccumulated: string;    // wei string
  minDispatch: string;       // wei string
  feeAccumulatedBNB: string; // formatted BNB
  minDispatchBNB: string;    // formatted BNB
  progressPercent: number;
  feeRate: number;
  sniperAlert: boolean;
  sniperRisk: 'safe' | 'caution' | 'danger';
  recommendation: string;
  lastUpdated: string;
}

// ── Route Handler ────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;

    // Validate address
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid token address' },
        { status: 400 }
      );
    }

    // ── Mock Mode ──────────────────────────────────────────
    if (isMockMode(request.url)) {
      return NextResponse.json({
        ...monitor84,
        tokenAddress: address,
        feeAccumulatedBNB: '0.847',
        minDispatchBNB: '1.0',
        sniperRisk: 'caution',
        lastUpdated: new Date().toISOString(),
      });
    }

    // ── Cache Check ────────────────────────────────────────
    const cacheKey = address.toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // ── On-Chain Read ──────────────────────────────────────
    const data = await withFallback(async (provider) => {
      const contract = new ethers.Contract(address, TAX_TOKEN_ABI, provider);

      // Parallel reads for speed
      const [feeAccumulated, minDispatch, feeRate] = await Promise.all([
        contract.feeAccumulated().catch(() => BigInt(0)),
        contract.minDispatch().catch(() => BigInt(0)),
        contract.feeRate().catch(() => BigInt(0)),
      ]);

      return {
        feeAccumulated: feeAccumulated as bigint,
        minDispatch: minDispatch as bigint,
        feeRate: Number(feeRate),
      };
    });

    // ── Calculate Progress ─────────────────────────────────
    const { feeAccumulated, minDispatch, feeRate } = data;

    let progressPercent = 0;
    if (minDispatch > BigInt(0)) {
      progressPercent = Number(
        (feeAccumulated * BigInt(10000)) / minDispatch
      ) / 100;
      progressPercent = Math.min(progressPercent, 100);
    }

    // ── Sniper Alert Logic ─────────────────────────────────
    // Simplified: mock sniper risk at 95%+ progress
    // Real implementation would scan Transfer events in last 5 blocks
    let sniperRisk: MonitorResponse['sniperRisk'] = 'safe';
    let sniperAlert = false;
    if (progressPercent >= 95) {
      sniperRisk = 'danger';
      sniperAlert = true;
    } else if (progressPercent >= 85) {
      sniperRisk = 'caution';
    }

    // ── Recommendation ─────────────────────────────────────
    let recommendation: string;
    if (progressPercent >= 95) {
      recommendation = `⚠️ Fee pool at ${progressPercent.toFixed(1)}% — SNIPER ALERT ZONE. Flash-buy bots may front-run the dispatch. Consider claiming your dividends now.`;
    } else if (progressPercent >= 85) {
      recommendation = `Fee pool at ${progressPercent.toFixed(1)}% — approaching dispatch threshold. Monitor for sudden large buys.`;
    } else if (progressPercent >= 60) {
      recommendation = `Fee pool at ${progressPercent.toFixed(1)}%. No immediate action needed — wait for dispatch event.`;
    } else {
      recommendation = `Fee pool at ${progressPercent.toFixed(1)}%. Early accumulation phase — check back later.`;
    }

    // ── Build Response ─────────────────────────────────────
    const response: MonitorResponse = {
      tokenAddress: address,
      feeAccumulated: feeAccumulated.toString(),
      minDispatch: minDispatch.toString(),
      feeAccumulatedBNB: ethers.formatEther(feeAccumulated),
      minDispatchBNB: ethers.formatEther(minDispatch),
      progressPercent: Math.round(progressPercent * 10) / 10,
      feeRate,
      sniperAlert,
      sniperRisk,
      recommendation,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    setCache(cacheKey, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Monitor] Error:', error);

    // If it's a contract call error (not a TaxToken), return a helpful message
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const isNotTaxToken =
      msg.includes('call revert exception') ||
      msg.includes('CALL_EXCEPTION') ||
      msg.includes('BAD_DATA');

    if (isNotTaxToken) {
      return NextResponse.json(
        {
          error: 'Not a TaxToken',
          details: 'This token does not have feeAccumulated/minDispatch functions. Only TaxTokens support dividend monitoring.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: 'Monitor polling failed',
        details: msg,
      },
      { status: 500 }
    );
  }
}
