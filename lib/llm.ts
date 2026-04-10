// lib/llm.ts
// LLM API client — converts text prompts into token configurations.
// Primary: OpenAI-compatible API (Blink Pro / any OpenAI-compatible endpoint)
// Fallback: Hardcoded pre-generated suggestions from mock-data/

export interface TokenGenPrompt {
  concept: string;
}

export interface TokenGenResult {
  name: string;
  symbol: string;
  description: string;
  taxConfig: {
    feeRate: number;       // 1, 3, 5, or 10
    rateFounder: number;   // % → recipientRate
    rateHolder: number;    // % → divideRate
    rateBurn: number;      // % → burnRate
    rateLiquidity: number; // % → liquidityRate
    feePlan: boolean;      // anti-sniper
  };
  imagePrompt: string;     // Prompt for AI image generation
  tags: string[];
}

// ── Pre-generated AI Suggestions ─────────────────────────────
// These are always available as hardcoded fallbacks.

export const AI_SUGGESTIONS: Array<TokenGenResult & { id: string }> = [
  {
    id: 'cyberbrew',
    name: 'CyberBrew',
    symbol: 'CYBREW',
    description:
      'The first AI-powered coffee token on BSC. Fuel your mornings, fuel your portfolio. Each transaction brews value for holders through dividend-powered rewards. ☕🤖',
    taxConfig: {
      feeRate: 5,
      rateFounder: 20,
      rateHolder: 40,
      rateBurn: 10,
      rateLiquidity: 30,
      feePlan: true,
    },
    imagePrompt:
      'cyberpunk robot drinking coffee, neon lights, futuristic cafe, meme token art style, vibrant colors',
    tags: ['AI', 'coffee', 'dividend', 'BSC'],
  },
  {
    id: 'mooncat',
    name: 'MoonCat',
    symbol: 'MCAT',
    description:
      'A cosmic feline on a mission to the moon. MoonCat rewards diamond paws — hold longer, earn more. Community-driven with deflationary supply. 🐱🌙',
    taxConfig: {
      feeRate: 3,
      rateFounder: 10,
      rateHolder: 50,
      rateBurn: 30,
      rateLiquidity: 10,
      feePlan: true,
    },
    imagePrompt:
      'cute cat astronaut floating in space, moon background, meme art style, kawaii, crypto themed',
    tags: ['cat', 'moon', 'deflationary', 'community'],
  },
  {
    id: 'degen-ai',
    name: 'DegenAI',
    symbol: 'DGNAI',
    description:
      'An AI agent that trades memes so you don\'t have to. 50% of fees go back to holders — because your AI overlord believes in redistribution. 🤖💎',
    taxConfig: {
      feeRate: 5,
      rateFounder: 15,
      rateHolder: 50,
      rateBurn: 5,
      rateLiquidity: 30,
      feePlan: true,
    },
    imagePrompt:
      'robot wearing sunglasses and headphones, trading charts background, degen meme style, neon green, pixel art',
    tags: ['AI', 'degen', 'trading', 'dividend'],
  },
];

// ── LLM API Client ───────────────────────────────────────────

const BLINK_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are MemeBrain AI, an expert at creating meme token configurations for Four.meme on BNB Smart Chain.

Given a concept, generate a creative meme token with:
1. A catchy, memorable name (max 32 chars)
2. A short ticker symbol (3-6 chars, uppercase)
3. An engaging description (max 200 chars) with emojis
4. Tax configuration where rateFounder + rateHolder + rateBurn + rateLiquidity = 100
5. A descriptive image prompt for AI art generation
6. Relevant tags

Rules for taxConfig:
- feeRate: Must be 1, 3, 5, or 10 (percentage per trade)
- rateFounder: Creator's share (0-100, recommend <30)
- rateHolder: Dividend to holders (recommend 30-50 for engagement)
- rateBurn: Deflationary burn (recommend 5-20)
- rateLiquidity: Auto-added to LP (recommend 10-40)
- All four rates MUST sum to exactly 100
- feePlan: true (enables anti-sniper protection — always true)

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "name": "string",
  "symbol": "string",
  "description": "string",
  "taxConfig": {
    "feeRate": number,
    "rateFounder": number,
    "rateHolder": number,
    "rateBurn": number,
    "rateLiquidity": number,
    "feePlan": true
  },
  "imagePrompt": "string",
  "tags": ["string"]
}`;

/**
 * Generate token configuration from a text prompt using LLM.
 * Falls back to closest hardcoded suggestion if API fails.
 */
export async function generateTokenFromPrompt(
  prompt: TokenGenPrompt
): Promise<TokenGenResult & { source: 'llm' | 'fallback' }> {
  const apiKey = process.env.BLINK_API_KEY;

  // If no API key, use fallback immediately
  if (!apiKey) {
    console.warn('No BLINK_API_KEY set — using fallback suggestion');
    return { ...pickFallback(prompt.concept), source: 'fallback' };
  }

  try {
    const response = await fetch(BLINK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Create a meme token based on this concept: "${prompt.concept}"`,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty LLM response');
    }

    // Parse JSON from response (handle potential markdown wrapping)
    const result = extractJSON(content);

    // Validate the result
    validateTokenResult(result);

    return { ...result, source: 'llm' };
  } catch (err) {
    console.error(
      'LLM generation failed, using fallback:',
      err instanceof Error ? err.message : err
    );
    return { ...pickFallback(prompt.concept), source: 'fallback' };
  }
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Extract JSON from LLM response, handling markdown code blocks.
 */
function extractJSON(content: string): TokenGenResult {
  // Try parsing directly
  let text = content.trim();

  // Remove markdown code fences
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  text = text.trim();

  try {
    return JSON.parse(text);
  } catch {
    // Try to find JSON object in the text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not extract JSON from LLM response');
  }
}

/**
 * Validate that the token result has valid fields.
 */
function validateTokenResult(result: TokenGenResult): void {
  if (!result.name || !result.symbol || !result.description) {
    throw new Error('Missing required token fields');
  }

  const { taxConfig } = result;
  if (!taxConfig) throw new Error('Missing taxConfig');

  // Validate fee rate
  if (![1, 3, 5, 10].includes(taxConfig.feeRate)) {
    taxConfig.feeRate = 5; // Default to 5%
  }

  // Validate rates sum to 100
  const sum =
    taxConfig.rateFounder +
    taxConfig.rateHolder +
    taxConfig.rateBurn +
    taxConfig.rateLiquidity;

  if (sum !== 100) {
    // Auto-correct by adjusting liquidity to fill the gap
    taxConfig.rateLiquidity = 100 - taxConfig.rateFounder - taxConfig.rateHolder - taxConfig.rateBurn;
    if (taxConfig.rateLiquidity < 0) {
      // Reset to safe defaults
      taxConfig.rateFounder = 20;
      taxConfig.rateHolder = 40;
      taxConfig.rateBurn = 10;
      taxConfig.rateLiquidity = 30;
    }
  }

  // Ensure feePlan is always true
  taxConfig.feePlan = true;
}

/**
 * Pick the best fallback suggestion based on keyword matching.
 */
function pickFallback(concept: string): TokenGenResult {
  const lower = concept.toLowerCase();

  if (lower.includes('cat') || lower.includes('moon') || lower.includes('space')) {
    return AI_SUGGESTIONS[1]; // MoonCat
  }
  if (lower.includes('ai') || lower.includes('degen') || lower.includes('trade') || lower.includes('bot')) {
    return AI_SUGGESTIONS[2]; // DegenAI
  }
  // Default fallback
  return AI_SUGGESTIONS[0]; // CyberBrew
}
