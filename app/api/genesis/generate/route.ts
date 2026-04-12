// app/api/genesis/generate/route.ts
// Token Genesis API — accepts a text prompt and returns AI-generated token config.
// Supports mock mode for demo reliability.

import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/config';
import { generateTokenFromPrompt, AI_SUGGESTIONS } from '@/lib/llm';
import { genesisCyberbrew } from '@/lib/mock-data/index';
import { compileSafeTokenConfig } from '@/lib/safety-compiler';
import { TokenGenResult } from '@/lib/llm';

export const maxDuration = 60;

/**
 * Transform genesisCyberbrew mock format → TokenGenResult format
 */
function transformMockToTokenGenResult(mock: any): TokenGenResult {
  return {
    name: mock.token?.name || mock.name,
    symbol: mock.token?.symbol || mock.symbol,
    description: mock.token?.description || mock.description,
    taxConfig: {
      feeRate: mock.taxConfig?.feeRate || 5,
      rateFounder: mock.taxConfig?.rateFounder || 20,
      rateHolder: mock.taxConfig?.rateHolder || 40,
      rateBurn: mock.taxConfig?.rateBurn || 10,
      rateLiquidity: mock.taxConfig?.rateLiquidity || 30,
      feePlan: mock.taxConfig?.feePlan ?? true,
    },
    imagePrompt: mock.metadata?.imagePrompt || mock.imagePrompt || 'cyberpunk robot drinking coffee, neon lights',
    tags: mock.metadata?.tags || mock.tags || ['AI', 'coffee', 'dividend', 'BSC'],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { concept } = body;

    if (!concept || typeof concept !== 'string') {
      return NextResponse.json(
        { error: 'Missing concept text' },
        { status: 400 }
      );
    }

    if (concept.length > 500) {
      return NextResponse.json(
        { error: 'Concept too long (max 500 chars)' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const demoMode = url.searchParams.get('demo');

    if (demoMode === 'dangerous') {
      // Import the dangerous mock
      const dangerousMock = await import('@/lib/mock-data/genesis-dangerous.json');
      
      const { config: safeConfig, certificate } = compileSafeTokenConfig(
        dangerousMock,
        undefined
      );
      
      return NextResponse.json({
        ...safeConfig,
        safetyCertificate: certificate,
        source: 'demo-dangerous',
        concept,
      });
    }

    // ── Mock Mode ──────────────────────────────────────────
    if (isMockMode(request.url)) {
      // Transform mock data to TokenGenResult format
      const tokenGenResult = transformMockToTokenGenResult(genesisCyberbrew);
      
      // Run through safety compiler
      const { config: safeConfig, certificate } = compileSafeTokenConfig(
        tokenGenResult,
        undefined
      );
      
      return NextResponse.json({
        ...safeConfig,
        safetyCertificate: certificate,
        source: 'mock',
        concept,
      });
    }

    // ── Live Mode — LLM Generation ─────────────────────────
    const result = await generateTokenFromPrompt({ concept });

    // 🔒 SAFETY COMPILER: Apply auto-corrections (Option A: no wallet yet)
    const { config: safeConfig, certificate } = compileSafeTokenConfig(
      result,
      undefined // No creatorAddress; full protection happens in /create
    );

    return NextResponse.json({
      ...safeConfig,
      safetyCertificate: certificate,
      concept,
      source: result.source,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Token generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET — Returns the 3 pre-generated AI suggestions.
 * Always works, no LLM needed.
 */
export async function GET() {
  return NextResponse.json({
    suggestions: AI_SUGGESTIONS,
  });
}
