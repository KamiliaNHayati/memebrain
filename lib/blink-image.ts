// lib/blink-image.ts
// Blink New Image Generation API client using Recraft model.

const BLINK_IMAGE_API_URL = 'https://core.blink.new/api/v1/ai/image';

export interface BlinkImageRequest {
  prompt: string;
  model?: 'recraft/recraft-v4' | 'recraft/recraft-v3' | 'recraft/recraft-v2';
  n?: number;
  output_format?: 'png' | 'jpeg' | 'webp';
}

export interface BlinkImageResponse {
  url: string;
  width: number;
  height: number;
}

/**
 * Generate an image using Blink New's API with Recraft model.
 * Returns the first image URL or null if generation fails.
 */
export async function generateBlinkImage(
  request: BlinkImageRequest,
  apiKey: string
): Promise<string | null> {
  try {
    const response = await fetch(BLINK_IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        model: request.model || 'recraft/recraft-v4', // Use Recraft V4 by default
        n: request.n || 1,
        output_format: request.output_format || 'webp',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Blink Image] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    // Blink returns { result: { data: [{ url, width, height }], model }, usage }
    return data.result?.data?.[0]?.url || null;
  } catch (error) {
    console.error('[Blink Image] Generation failed:', error);
    return null;
  }
}