// app/api/genesis/generate/route.ts
// Token Genesis API — accepts a text prompt and returns AI-generated token config.
// Supports mock mode for demo reliability.

import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/config';
import { generateTokenFromPrompt, AI_SUGGESTIONS } from '@/lib/llm';
import { genesisCyberbrew } from '@/lib/mock-data/index';

export const maxDuration = 60;

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

    // ── Mock Mode ──────────────────────────────────────────
    if (isMockMode(request.url)) {
      return NextResponse.json({
        ...genesisCyberbrew,
        source: 'mock',
        concept,
      });
    }

    // ── Live Mode — LLM Generation ─────────────────────────
    const result = await generateTokenFromPrompt({ concept });

    return NextResponse.json({
      ...result,
      concept,
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
