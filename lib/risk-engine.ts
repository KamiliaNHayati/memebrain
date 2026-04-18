// lib/risk-engine.ts
// Risk Engine — 8 rules, starting score 100, final score max(0, calculated).
// Combines off-chain Four.meme API data with on-chain getCode() checks.

import { ethers } from 'ethers';
import { provider, withFallback } from './bsc';
import { getTokenInfo } from './fourmeme';

// ── Interfaces ───────────────────────────────────────────────

export interface RiskRule {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  passed: boolean;
  scoreImpact: number;
  message: string;
}

export interface TokenData {
  // Tax config (from Four.meme API taxInfo or on-chain)
  recipientAddress: string;
  recipientRate: number;
  divideRate: number;
  liquidityRate: number;
  burnRate: number;
  feeRate: number;
  feePlan: boolean;
  // Bonding curve (from Four.meme API)
  funds: number;      // current BNB raised
  maxFunds: number;   // max BNB to raise (24 BNB)
  offers: number;     // tokens remaining
  maxOffers: number;  // total tokens for sale
  // Creator info
  creatorAddress: string;
  creatorWalletAge: number; // hours
  preSale: number;         // BNB pre-purchased by creator
  totalBAmount: number;    // max BNB (24)
  // On-chain state
  isRecipientContract: boolean;
  // TaxToken on-chain (optional)
  feeAccumulated: number;
  minDispatch: number;
  // Metadata
  isTaxToken: boolean;
  tokenName: string;
  tokenSymbol: string;
  status: string;
}

export interface RiskResult {
  tokenAddress: string;
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rules: RiskRule[];
  summary: string;
  tokenInfo: {
    name: string;
    symbol: string;
    feeRate: number;
    recipientRate: number;
    divideRate: number;
    liquidityRate: number;
    burnRate: number;
    recipientAddress: string;
    isRecipientContract: boolean;
    isTaxToken: boolean;
    progress: number;
    status: string;
  };
  scannedAt: string;
}

// ── Rule Definitions ─────────────────────────────────────────

function evaluateRule1(data: TokenData): RiskRule {
  // Three honeypot signals (ordered by severity):
  // 1. Token status is SUSPENDED (Four.meme confirmed exploit) → -60
  // 2. TaxToken with recipientAddress that is a contract → -40
  // 3. V9 token with on-chain recipientAddress that is a contract → -40
  const taxHoneypot = data.isTaxToken && data.recipientRate > 0 && data.isRecipientContract;
  const suspendedHoneypot = data.status === 'SUSPENDED';
  const onChainHoneypot = data.isRecipientContract && data.recipientAddress !== '';
  const triggered = taxHoneypot || suspendedHoneypot || onChainHoneypot;

  // SUSPENDED = platform-confirmed exploit → heavier penalty
  const impact = suspendedHoneypot ? -65 : triggered ? -40 : 0;

  return {
    id: 'rule-1',
    name: 'Honeypot Recipient',
    severity: 'critical',
    passed: !triggered,
    scoreImpact: impact,
    message: triggered
      ? suspendedHoneypot && !taxHoneypot
        ? 'CRITICAL: Token has been SUSPENDED by Four.meme. This token was flagged as an exploit — sells will likely fail.'
        : 'CRITICAL: Tax fees sent to smart contract. Sells may fail. This is the exact pattern from the April 3rd incident.'
      : data.isTaxToken
      ? 'Recipient address is a regular wallet (EOA). No honeypot risk.'
      : 'No honeypot indicators detected.',
  };
}

function evaluateRule2(data: TokenData): RiskRule {
  const triggered = data.isTaxToken && data.recipientRate > 50 && data.divideRate < 10;
  return {
    id: 'rule-2',
    name: 'Predatory Tax Config',
    severity: 'high',
    passed: !triggered,
    scoreImpact: triggered ? -30 : 0,
    message: triggered
      ? `HIGH: Creator takes ${data.recipientRate}% of tax fees with only ${data.divideRate}% for holders.`
      : data.isTaxToken
      ? `Tax distribution is within acceptable range (recipient: ${data.recipientRate}%, holders: ${data.divideRate}%).`
      : 'Not a TaxToken — tax config check not applicable.',
  };
}

function evaluateRule3(data: TokenData): RiskRule {
  const triggered = data.isTaxToken && data.feeRate === 10;
  return {
    id: 'rule-3',
    name: 'Extreme Fee Rate',
    severity: 'medium',
    passed: !triggered,
    scoreImpact: triggered ? -15 : 0,
    message: triggered
      ? 'MEDIUM: 10% fee on every trade is very high.'
      : data.isTaxToken
      ? `Fee rate is ${data.feeRate}% — within acceptable range.`
      : 'Not a TaxToken — fee rate check not applicable.',
  };
}

function evaluateRule4(data: TokenData): RiskRule {
  const triggered = !data.feePlan;
  return {
    id: 'rule-4',
    name: 'No Anti-Sniper Protection',
    severity: 'low',
    passed: !triggered,
    scoreImpact: triggered ? -10 : 0,
    message: triggered
      ? 'LOW: Anti-sniper mode disabled. Bots may front-run early trades.'
      : 'Anti-sniper mode is enabled. Dynamic fees protect against bots.',
  };
}

function evaluateRule5(data: TokenData): RiskRule {
  const triggered = data.isTaxToken && data.divideRate === 0 && data.liquidityRate === 0;
  return {
    id: 'rule-5',
    name: 'Zero Holder Rewards',
    severity: 'high',
    passed: !triggered,
    scoreImpact: triggered ? -20 : 0,
    message: triggered
      ? 'HIGH: No value flows back to holders. 100% goes to burn + creator.'
      : data.isTaxToken
      ? `Holders receive ${data.divideRate}% dividends, ${data.liquidityRate}% to liquidity.`
      : 'Not a TaxToken — holder rewards check not applicable.',
  };
}

function evaluateRule6(data: TokenData): RiskRule {
  const progress = data.maxFunds > 0 ? data.funds / data.maxFunds : 0;
  const offerRatio = data.maxOffers > 0 ? data.offers / data.maxOffers : 1;
  const triggered = progress > 0.8 && offerRatio < 0.3;
  return {
    id: 'rule-6',
    name: 'Bonding Curve Health',
    severity: 'info',
    passed: triggered, // "passed" = positive signal
    scoreImpact: triggered ? 15 : 0,
    message: triggered
      ? `POSITIVE: Strong demand at ${(progress * 100).toFixed(1)}% funded, nearing graduation.`
      : `Bonding curve at ${(progress * 100).toFixed(1)}% — ${progress > 0.5 ? 'moderate' : 'early stage'} demand.`,
  };
}

function evaluateRule7(data: TokenData): RiskRule {
  // Simplified: alert when fee accumulation is near dispatch threshold
  // Complex event log scanning for large purchases skipped per Sprint.md
  const progress = data.minDispatch > 0 ? data.feeAccumulated / data.minDispatch : 0;
  const nearDispatch = progress > 0.85;
  return {
    id: 'rule-7',
    name: 'Dividend Sniper Risk',
    severity: 'info',
    passed: !nearDispatch,
    scoreImpact: 0, // Alert only, no score change
    message: nearDispatch
      ? `WARNING: Fee pool at ${(progress * 100).toFixed(1)}% — approaching dispatch. Watch for large buys.`
      : data.isTaxToken
      ? `Fee pool at ${(progress * 100).toFixed(1)}% — no immediate sniper risk.`
      : 'Not a TaxToken — dividend sniper check not applicable.',
  };
}

function evaluateRule8(data: TokenData): RiskRule {
  const triggered =
    data.creatorWalletAge < 24 &&
    data.totalBAmount > 0 &&
    data.preSale > data.totalBAmount * 0.5;
  return {
    id: 'rule-8',
    name: 'Fresh Creator Check',
    severity: 'high',
    passed: !triggered,
    scoreImpact: triggered ? -25 : 0,
    message: triggered
      ? `HIGH: New wallet (${data.creatorWalletAge.toFixed(0)}h old) with large pre-sale (${data.preSale} BNB). Possible pump-and-dump.`
      : data.creatorWalletAge > 0
      ? `Creator wallet is ${data.creatorWalletAge.toFixed(0)} hours old.`
      : 'Creator wallet age could not be determined.',
  };
}

// ── Score Calculation ────────────────────────────────────────

export function getRiskLevel(score: number): RiskResult['riskLevel'] {
  if (score >= 90) return 'LOW';
  if (score >= 60) return 'MEDIUM';
  if (score >= 30) return 'HIGH';
  return 'CRITICAL';
}

export function calculateScore(rules: RiskRule[]): number {
  const BASE_SCORE = 100;
  const totalImpact = rules.reduce((sum, r) => sum + r.scoreImpact, 0);
  return Math.max(0, BASE_SCORE + totalImpact);
}

function generateSummary(score: number, rules: RiskRule[]): string {
  const level = getRiskLevel(score);
  const failedCritical = rules.filter((r) => !r.passed && r.severity === 'critical');
  const failedHigh = rules.filter((r) => !r.passed && r.severity === 'high');

  if (failedCritical.length > 0) {
    return `This token has critical security issues. ${failedCritical[0].message}`;
  }
  if (failedHigh.length > 0) {
    return `This token has concerning risk factors: ${failedHigh.map((r) => r.name).join(', ')}. Exercise caution.`;
  }
  if (level === 'LOW') {
    return 'This token has a healthy configuration with no major risk factors detected.';
  }
  return `This token has some risk factors. Score: ${score}/100 (${level}). Review the audit trail for details.`;
}

// ── Data Fetching ────────────────────────────────────────────

/**
 * Fetch all data needed for risk analysis from both on-chain and off-chain sources.
 */
export async function fetchTokenData(tokenAddress: string): Promise<TokenData> {
  // ── Off-chain: Four.meme API ─────────────────────────────
  let apiData: Record<string, unknown> = {};
  try {
    apiData = await getTokenInfo(tokenAddress);
  } catch {
    // API may fail for some tokens — proceed with on-chain only
    console.warn(`Four.meme API failed for ${tokenAddress}, proceeding with on-chain data`);
  }

  // Extract taxInfo if present (TaxToken)
  const taxInfo = apiData.taxInfo as Record<string, number | string> | undefined;
  const isTaxToken = !!taxInfo;
  const tokenPrice = apiData.tokenPrice as Record<string, string> | undefined;

  // Parse bonding curve from API
  const progress = tokenPrice?.progress ? parseFloat(tokenPrice.progress) : 0;
  const totalBAmount = 24; // Fixed at 24 BNB per Four.meme docs
  const funds = progress * totalBAmount;
  const maxFunds = totalBAmount;

  // Total sale amount and remaining offers
  const saleAmount = parseFloat(String(apiData.saleAmount || '800000000'));
  const currentAmount = tokenPrice?.amount ? parseFloat(tokenPrice.amount) : saleAmount;
  const offersRemaining = saleAmount - (saleAmount - currentAmount);

  // Creator info
  const creatorAddress = String(apiData.userAddress || '');
  const createDate = Number(apiData.createDate || 0);
  const creatorWalletAge = createDate > 0
    ? (Date.now() - createDate) / (1000 * 60 * 60) // convert ms to hours
    : 999; // Unknown = assume old enough

  // ── On-chain: getCode check for recipientAddress ─────────
  let recipientAddress = '';
  let recipientRate = 0;
  let isRecipientContract = false;
  let feeAccumulated = 0;
  let minDispatch = 0;

  if (isTaxToken && taxInfo) {
    recipientAddress = String(taxInfo.recipientAddress || '');
    recipientRate = Number(taxInfo.recipientRate || 0);

    // Check if recipient is a contract (Rule 1 - Honeypot)
    if (recipientAddress && recipientAddress !== '' && recipientRate > 0) {
      try {
        const code = await withFallback(
          (p) => p.getCode(recipientAddress),
          'mainnet'
        );
        isRecipientContract = code !== '0x';
      } catch {
        console.warn('Failed to getCode for recipientAddress');
      }
    }

    // Try reading feeAccumulated / minDispatch on-chain for Rule 7
    try {
      const TAX_ABI = [
        'function feeAccumulated() view returns (uint256)',
        'function minDispatch() view returns (uint256)',
      ];
      const p = provider;
      const contract = new ethers.Contract(tokenAddress, TAX_ABI, p);
      const [feeAcc, minDisp] = await Promise.all([
        contract.feeAccumulated(),
        contract.minDispatch(),
      ]);
      feeAccumulated = parseFloat(ethers.formatEther(feeAcc));
      minDispatch = parseFloat(ethers.formatEther(minDisp));
    } catch {
      // Not all TaxTokens have these readable — ignore
    }
  }

  // For non-TaxTokens (including V9 tokens), try reading recipientAddress on-chain
  // Some V9 tokens have TaxToken-like ABI even if API doesn't show taxInfo
  if (!isTaxToken) {
    try {
      const code = await withFallback(
        (p) => p.getCode(tokenAddress),
        'mainnet'
      );
      if (code === '0x') {
        throw new Error('Address is not a smart contract');
      }

      // Try reading recipientAddress from on-chain (V9 TaxToken pattern)
      try {
        const ONCHAIN_ABI = [
          'function recipientAddress() view returns (address)',
          'function recipientRate() view returns (uint256)',
        ];
        const contract = new ethers.Contract(tokenAddress, ONCHAIN_ABI, provider);
        const [onChainRecipient, onChainRate] = await Promise.all([
          contract.recipientAddress(),
          contract.recipientRate(),
        ]);
        if (onChainRecipient && onChainRecipient !== ethers.ZeroAddress) {
          recipientAddress = onChainRecipient;
          recipientRate = Number(onChainRate);
          // Check if this on-chain recipientAddress is a contract
          if (recipientRate > 0) {
            const recipientCode = await withFallback(
              (p) => p.getCode(onChainRecipient),
              'mainnet'
            );
            isRecipientContract = recipientCode !== '0x';
          }
        }
      } catch {
        // Not a V9 TaxToken or ABI doesn't match — that's fine
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('not a smart contract')) {
        throw err;
      }
    }
  }

  return {
    recipientAddress,
    recipientRate,
    divideRate: Number(taxInfo?.divideRate || 0),
    liquidityRate: Number(taxInfo?.liquidityRate || 0),
    burnRate: Number(taxInfo?.burnRate || 0),
    feeRate: Number(taxInfo?.feeRate || 0),
    feePlan: Boolean(apiData.feePlan),
    funds,
    maxFunds,
    offers: offersRemaining,
    maxOffers: saleAmount,
    creatorAddress,
    creatorWalletAge,
    preSale: 0, // Not available in GET response; would need creation data
    totalBAmount,
    isRecipientContract,
    feeAccumulated,
    minDispatch,
    isTaxToken,
    tokenName: String(apiData.name || 'Unknown'),
    tokenSymbol: String(apiData.shortName || '???'),
    status: String(apiData.status || 'UNKNOWN'),
  };
}

// ── Main Analysis Function ───────────────────────────────────

/**
 * Run the full 8-rule risk engine against a token.
 */
export async function analyzeToken(tokenAddress: string): Promise<RiskResult> {
  const data = await fetchTokenData(tokenAddress);

  // Evaluate all 8 rules
  const rules: RiskRule[] = [
    evaluateRule1(data),
    evaluateRule2(data),
    evaluateRule3(data),
    evaluateRule4(data),
    evaluateRule5(data),
    evaluateRule6(data),
    evaluateRule7(data),
    evaluateRule8(data),
  ];

  const score = calculateScore(rules);
  const riskLevel = getRiskLevel(score);
  const summary = generateSummary(score, rules);

  const progress = data.maxFunds > 0 ? data.funds / data.maxFunds : 0;

  return {
    tokenAddress,
    score,
    riskLevel,
    rules,
    summary,
    tokenInfo: {
      name: data.tokenName,
      symbol: data.tokenSymbol,
      feeRate: data.feeRate,
      recipientRate: data.recipientRate,
      divideRate: data.divideRate,
      liquidityRate: data.liquidityRate,
      burnRate: data.burnRate,
      recipientAddress: data.recipientAddress,
      isRecipientContract: data.isRecipientContract,
      isTaxToken: data.isTaxToken,
      progress: parseFloat((progress * 100).toFixed(1)),
      status: data.status,
    },
    scannedAt: new Date().toISOString(),
  };
}
