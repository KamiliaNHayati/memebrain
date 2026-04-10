// app/api/auth/nonce/route.ts
// Proxy: Generate nonce from Four.meme API.
// Client → Our API → Four.meme (avoids CORS issues)

import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from '@/lib/fourmeme';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Missing wallet address' },
        { status: 400 }
      );
    }

    const nonce = await generateNonce(address);

    return NextResponse.json({ nonce });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate nonce',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
