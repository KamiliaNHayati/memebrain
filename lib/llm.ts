// lib/llm.ts
// LLM API client — converts text prompts into token configurations.
// Primary: OpenAI-compatible API (Blink Pro / any OpenAI-compatible endpoint)
// Fallback: Hardcoded pre-generated suggestions from mock-data/
/* eslint-disable @typescript-eslint/no-explicit-any */

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

const BLINK_API_URL = 'https://core.blink.new/api/v1/ai/chat/completions';

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
  const apiKey = process.env.LLM_API_KEY;

  // If no API key, use fallback immediately
  if (!apiKey) {
    console.warn('No LLM_API_KEY set — using fallback suggestion');
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
        model: 'alibaba/qwen-3-32b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Create a meme token based on this concept: "${prompt.concept}"`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
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

    // Parse JSON from response (handle Qwen thinking blocks, markdown, etc.)
    console.log('[LLM] Raw response length:', content.length, 'chars');
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

export async function generateRiskNarrative(riskResult: any): Promise<string> {
  const criticalRules = riskResult.rules?.filter((r: any) => r.status === 'failed' && Math.abs(r.impact) >= 20) || [];
  const failedRules = riskResult.rules?.filter((r: any) => r.status === 'failed') || [];
  
  // Build dynamic context based on risk level
  const riskContext = riskResult.score < 60 
    ? "This is a HIGH-RISK token. Be direct and alarming about exploit potential."
    : riskResult.score < 85
    ? "This is a MEDIUM-RISK token. Highlight concerns but acknowledge safe aspects."
    : "This is a LOW-RISK token. Still provide 2-3 sentences explaining WHY it's safe and what to monitor.";

  const prompt = `You are MemeBrain AI, a security analyst for Four.meme tokens.

Generate a 2-3 sentence risk summary. REQUIRED STRUCTURE:
1. Sentence 1: Overall assessment + primary factor (score driver)
2. Sentence 2: Specific technical observation (contract code, tax config, or bonding curve)
3. Sentence 3: Trader impact + clear recommendation

Token Data:
• Score: ${riskResult.score}/100 (${riskResult.level})
• Failed checks: ${failedRules.length > 0 ? failedRules.map((r: any) => r.name).join(', ') : 'None'}
• Critical issues: ${criticalRules.length > 0 ? criticalRules.map((r: any) => r.name).join(', ') : 'None'}

${riskContext}

Key Context: The April 3rd exploit bricked sells by setting recipientAddress to a contract without receive() function.

RESPONSE RULES:
• MUST be 2-3 complete sentences (40-80 words total)
• NO JSON, NO markdown, NO bullet points
• If LOW RISK: Explain WHAT makes it safe + WHAT to still watch
• If HIGH RISK: Lead with the exploit pattern + immediate warning

Example LOW RISK output:
"This token scores 90/100 with no critical vulnerabilities detected. The recipientAddress is a verified EOA wallet and tax rates are within safe ranges. Traders can proceed with normal caution, monitoring bonding curve progress toward graduation."

Example HIGH RISK output:
"CRITICAL: This token matches the April 3rd honeypot pattern with recipientAddress set to a non-receiving contract. Sell transactions will revert, trapping buyer funds. DO NOT TRADE — this configuration bricks liquidity permanently."

Now analyze the token above:`;

  const response = await fetch(BLINK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: 'You are MemeBrain AI, a security analyst. Provide detailed 2-3 sentence risk assessments.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 350, // Increased for 3 detailed sentences
      temperature: 0.3, // Lower = more deterministic, less creative fluff
    }),
  });

  const data = await response.json();
  let summary = data.choices?.[0]?.message?.content?.trim() || '';
  
  // Fallback: If response is too short (< 30 words), append structured context
  if (summary.split(' ').length < 30) {
    const fallback = generateFallbackSummary(riskResult);
    summary = summary + ' ' + fallback;
  }
  
  return summary || 'Risk analysis complete. Review the audit trail for detailed rule checks.';
}

// ── Fallback: Structured summary if LLM response is too short ─────────
function generateFallbackSummary(riskResult: any): string {
  const { score, rules } = riskResult;
  
  if (score >= 90) {
    return `This token demonstrates strong security practices with a ${score}/100 safety score. Key positives include ${rules.filter((r: any) => r.passed).slice(0, 2).map((r: any) => r.name.toLowerCase()).join(' and ')}. Continue monitoring bonding curve progress as the token approaches graduation.`;
  }
  
  if (score >= 60) {
    const failed = rules.filter((r: any) => !r.passed).map((r: any) => r.name);
    return `Moderate risk detected with score ${score}/100. Areas of concern: ${failed.join(', ') || 'tax configuration'}. Traders should review the full audit trail and consider position sizing before entry.`;
  }
  
  // High risk fallback
  const critical = rules.filter((r: any) => r.severity === 'critical' && !r.passed);
  return `HIGH RISK: ${critical[0]?.message || 'Critical vulnerability detected'}. Immediate action recommended: avoid trading until configuration is reviewed by a security expert. This pattern has been associated with permanent fund loss in past exploits.`;
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Extract JSON from LLM response, handling markdown code blocks.
 */
function extractJSON(content: string): TokenGenResult {
  const text = content.trim();

  // Try 1: Strip think blocks and parse what remains
  const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (withoutThink.includes('{')) {
    try {
      return parseJSONFromText(withoutThink);
    } catch { /* continue */ }
  }

  // Try 2: Maybe JSON is INSIDE the think block? (Qwen quirk)
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    try {
      return parseJSONFromText(thinkMatch[1]);
    } catch { /* continue */ }
  }

  // Try 3: Just brute force search for JSON object in entire text
  return parseJSONFromText(text);
}

function parseJSONFromText(text: string): TokenGenResult {
  // Remove markdown fences
  text = text.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1').trim();
  
  // Find outermost JSON object
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON start');
  
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') depth--;
    if (depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        throw new Error('Invalid JSON');
      }
    }
  }
  throw new Error('Unclosed JSON');
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
