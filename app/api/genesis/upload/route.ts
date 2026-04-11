// app/api/genesis/upload/route.ts
// Proxy: Upload token image to Four.meme (avoids CORS).
// Accepts multipart/form-data with 'file' field + 'accessToken' field.

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const FOURMEME_BASE = 'https://four.meme/meme-api';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const accessToken = formData.get('accessToken');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing file in form data' },
        { status: 400 }
      );
    }

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing accessToken' },
        { status: 400 }
      );
    }

    // Forward to Four.meme
    const upstreamForm = new FormData();
    upstreamForm.append('file', file);

    const res = await fetch(`${FOURMEME_BASE}/v1/private/token/upload`, {
      method: 'POST',
      headers: {
        'meme-web-access': accessToken,
      },
      body: upstreamForm,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: 'Four.meme upload failed', details: text },
        { status: res.status }
      );
    }

    const json = await res.json();

    if (String(json.code) !== '0') {
      return NextResponse.json(
        { error: 'Four.meme upload error', details: json.msg || json.code },
        { status: 400 }
      );
    }

    return NextResponse.json({
      imageUrl: json.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
