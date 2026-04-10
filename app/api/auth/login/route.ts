// app/api/auth/login/route.ts
// Proxy: Login to Four.meme with signed message.
// Client → Our API → Four.meme (avoids CORS issues)

import { NextRequest, NextResponse } from 'next/server';
import { loginWithSignature } from '@/lib/fourmeme';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { address, signature } = await request.json();

    if (!address || !signature) {
      return NextResponse.json(
        { error: 'Missing address or signature' },
        { status: 400 }
      );
    }

    const accessToken = await loginWithSignature(address, signature);

    return NextResponse.json({ accessToken });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Login failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
