// lib/llm.ts
// LLM API wrapper — stub for Day 5 implementation.
// Primary: Blink Pro (Sonnet/GPT-4o equivalent)
// Fallback: Hardcoded JSON from mock-data/

export interface TokenGenPrompt {
  concept: string;
  output_format: 'name' | 'ticker' | 'description' | 'tax_config' | 'full';
}

export interface TokenGenResult {
  name: string;
  symbol: string;
  description: string;
  taxConfig: {
    feeRate: number;
    rateFounder: number;
    rateHolder: number;
    rateBurn: number;
    rateLiquidity: number;
  };
}

/**
 * Generate token configuration from a text prompt using LLM.
 * Falls back to hardcoded mock data if API fails.
 */
export async function generateTokenFromPrompt(
  prompt: TokenGenPrompt
): Promise<TokenGenResult> {
  // TODO: Implement Day 5
  throw new Error('Not implemented — Day 5 task');
}
