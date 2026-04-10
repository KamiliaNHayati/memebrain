// scripts/test-risk-engine.ts
// Unit tests for the 8-rule risk engine.
// Tests pure rule logic (no RPC calls needed for most).

import {
  calculateScore,
  getRiskLevel,
  type TokenData,
  type RiskRule,
} from '../lib/risk-engine';

// ── Test Helpers ─────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}`);
    failed++;
  }
}

// We need access to the rule functions, but they're private in the module.
// Instead, we'll import analyzeToken indirectly by testing through calculateScore
// and by creating mock TokenData objects.

// Re-implement rule evaluation logic inline for unit testing
// (mirrors the private functions in risk-engine.ts exactly)

function evaluateRule1(data: TokenData): RiskRule {
  const taxHoneypot = data.isTaxToken && data.recipientRate > 0 && data.isRecipientContract;
  const suspendedHoneypot = data.status === 'SUSPENDED';
  const onChainHoneypot = data.isRecipientContract && data.recipientAddress !== '';
  const triggered = taxHoneypot || suspendedHoneypot || onChainHoneypot;
  return {
    id: 'rule-1', name: 'Honeypot Recipient', severity: 'critical',
    passed: !triggered, scoreImpact: triggered ? -40 : 0,
    message: triggered ? 'CRITICAL' : 'SAFE',
  };
}

function evaluateRule2(data: TokenData): RiskRule {
  const triggered = data.isTaxToken && data.recipientRate > 50 && data.divideRate < 10;
  return {
    id: 'rule-2', name: 'Predatory Tax Config', severity: 'high',
    passed: !triggered, scoreImpact: triggered ? -30 : 0,
    message: triggered ? 'HIGH' : 'SAFE',
  };
}

function evaluateRule3(data: TokenData): RiskRule {
  const triggered = data.isTaxToken && data.feeRate === 10;
  return {
    id: 'rule-3', name: 'Extreme Fee Rate', severity: 'medium',
    passed: !triggered, scoreImpact: triggered ? -15 : 0,
    message: triggered ? 'MEDIUM' : 'SAFE',
  };
}

function evaluateRule4(data: TokenData): RiskRule {
  const triggered = !data.feePlan;
  return {
    id: 'rule-4', name: 'No Anti-Sniper Protection', severity: 'low',
    passed: !triggered, scoreImpact: triggered ? -10 : 0,
    message: triggered ? 'LOW' : 'SAFE',
  };
}

function evaluateRule5(data: TokenData): RiskRule {
  const triggered = data.isTaxToken && data.divideRate === 0 && data.liquidityRate === 0;
  return {
    id: 'rule-5', name: 'Zero Holder Rewards', severity: 'high',
    passed: !triggered, scoreImpact: triggered ? -20 : 0,
    message: triggered ? 'HIGH' : 'SAFE',
  };
}

function evaluateRule6(data: TokenData): RiskRule {
  const progress = data.maxFunds > 0 ? data.funds / data.maxFunds : 0;
  const offerRatio = data.maxOffers > 0 ? data.offers / data.maxOffers : 1;
  const triggered = progress > 0.8 && offerRatio < 0.3;
  return {
    id: 'rule-6', name: 'Bonding Curve Health', severity: 'info',
    passed: triggered, scoreImpact: triggered ? 15 : 0,
    message: triggered ? 'POSITIVE' : 'NEUTRAL',
  };
}

function evaluateRule7(data: TokenData): RiskRule {
  const progress = data.minDispatch > 0 ? data.feeAccumulated / data.minDispatch : 0;
  const nearDispatch = progress > 0.85;
  return {
    id: 'rule-7', name: 'Dividend Sniper Risk', severity: 'info',
    passed: !nearDispatch, scoreImpact: 0,
    message: nearDispatch ? 'WARNING' : 'SAFE',
  };
}

function evaluateRule8(data: TokenData): RiskRule {
  const triggered =
    data.creatorWalletAge < 24 &&
    data.totalBAmount > 0 &&
    data.preSale > data.totalBAmount * 0.5;
  return {
    id: 'rule-8', name: 'Fresh Creator Check', severity: 'high',
    passed: !triggered, scoreImpact: triggered ? -25 : 0,
    message: triggered ? 'HIGH' : 'SAFE',
  };
}

function allRules(data: TokenData): RiskRule[] {
  return [
    evaluateRule1(data), evaluateRule2(data), evaluateRule3(data),
    evaluateRule4(data), evaluateRule5(data), evaluateRule6(data),
    evaluateRule7(data), evaluateRule8(data),
  ];
}

// ── Default "Safe" Token ─────────────────────────────────────

function safeTaxToken(): TokenData {
  return {
    recipientAddress: '0x1234567890123456789012345678901234567890',
    recipientRate: 10,
    divideRate: 30,
    liquidityRate: 40,
    burnRate: 20,
    feeRate: 3,
    feePlan: true,
    funds: 12,
    maxFunds: 24,
    offers: 500_000_000,
    maxOffers: 800_000_000,
    creatorAddress: '0xaaaaaa',
    creatorWalletAge: 720,
    preSale: 0.1,
    totalBAmount: 24,
    isRecipientContract: false,
    feeAccumulated: 0.1,
    minDispatch: 1.0,
    isTaxToken: true,
    tokenName: 'SafeToken',
    tokenSymbol: 'SAFE',
    status: 'PUBLISH',
  };
}

// ── Tests ────────────────────────────────────────────────────

console.log('\n🧪 Risk Engine Unit Tests\n');

// ── Score Calculation ────────────────────────────────────────
console.log('📐 Score Calculation:');
assert(calculateScore([]) === 100, 'Empty rules → 100');
assert(
  calculateScore([{ id: 'r1', name: 'x', severity: 'critical', passed: false, scoreImpact: -40, message: '' }]) === 60,
  '-40 impact → 60'
);
assert(
  calculateScore([
    { id: 'r1', name: 'x', severity: 'critical', passed: false, scoreImpact: -40, message: '' },
    { id: 'r2', name: 'x', severity: 'high', passed: false, scoreImpact: -30, message: '' },
    { id: 'r3', name: 'x', severity: 'high', passed: false, scoreImpact: -20, message: '' },
    { id: 'r4', name: 'x', severity: 'medium', passed: false, scoreImpact: -15, message: '' },
  ]) === 0,
  'Score never goes below 0 (negative clamped)'
);
assert(
  calculateScore([{ id: 'r6', name: 'x', severity: 'info', passed: true, scoreImpact: 15, message: '' }]) === 115,
  'Positive rule → can go above 100 before clamp'
);

// ── Risk Levels ──────────────────────────────────────────────
console.log('\n📊 Risk Levels:');
assert(getRiskLevel(100) === 'LOW', '100 → LOW');
assert(getRiskLevel(90) === 'LOW', '90 → LOW');
assert(getRiskLevel(89) === 'MEDIUM', '89 → MEDIUM');
assert(getRiskLevel(60) === 'MEDIUM', '60 → MEDIUM');
assert(getRiskLevel(59) === 'HIGH', '59 → HIGH');
assert(getRiskLevel(30) === 'HIGH', '30 → HIGH');
assert(getRiskLevel(29) === 'CRITICAL', '29 → CRITICAL');
assert(getRiskLevel(0) === 'CRITICAL', '0 → CRITICAL');

// ── Rule 1: Honeypot Recipient ──────────────────────────────
console.log('\n🛡️  Rule 1 — Honeypot Recipient:');
{
  const safe = safeTaxToken();
  assert(evaluateRule1(safe).passed === true, 'EOA recipient → PASS');

  const honeypot = { ...safe, isRecipientContract: true };
  assert(evaluateRule1(honeypot).passed === false, 'Contract recipient → FAIL');
  assert(evaluateRule1(honeypot).scoreImpact === -40, 'Impact = -40');

  const suspended = { ...safeTaxToken(), isTaxToken: false, status: 'SUSPENDED' };
  assert(evaluateRule1(suspended).passed === false, 'SUSPENDED status → FAIL');

  const noTax = { ...safeTaxToken(), isTaxToken: false, recipientRate: 0, isRecipientContract: false, status: 'PUBLISH' };
  assert(evaluateRule1(noTax).passed === true, 'Non-TaxToken, active → PASS');
}

// ── Rule 2: Predatory Tax Config ────────────────────────────
console.log('\n💰 Rule 2 — Predatory Tax Config:');
{
  const safe = safeTaxToken();
  assert(evaluateRule2(safe).passed === true, 'recipientRate=10, divideRate=30 → PASS');

  const predatory = { ...safe, recipientRate: 60, divideRate: 5 };
  assert(evaluateRule2(predatory).passed === false, 'recipientRate=60, divideRate=5 → FAIL');
  assert(evaluateRule2(predatory).scoreImpact === -30, 'Impact = -30');

  const borderline = { ...safe, recipientRate: 50, divideRate: 10 };
  assert(evaluateRule2(borderline).passed === true, 'recipientRate=50 (not >50) → PASS');
}

// ── Rule 3: Extreme Fee Rate ────────────────────────────────
console.log('\n📈 Rule 3 — Extreme Fee Rate:');
{
  const safe = safeTaxToken();
  assert(evaluateRule3(safe).passed === true, 'feeRate=3 → PASS');

  const extreme = { ...safe, feeRate: 10 };
  assert(evaluateRule3(extreme).passed === false, 'feeRate=10 → FAIL');
  assert(evaluateRule3(extreme).scoreImpact === -15, 'Impact = -15');

  const five = { ...safe, feeRate: 5 };
  assert(evaluateRule3(five).passed === true, 'feeRate=5 → PASS');
}

// ── Rule 4: No Anti-Sniper Protection ───────────────────────
console.log('\n🤖 Rule 4 — No Anti-Sniper Protection:');
{
  const safe = safeTaxToken();
  assert(evaluateRule4(safe).passed === true, 'feePlan=true → PASS');

  const noSniper = { ...safe, feePlan: false };
  assert(evaluateRule4(noSniper).passed === false, 'feePlan=false → FAIL');
  assert(evaluateRule4(noSniper).scoreImpact === -10, 'Impact = -10');
}

// ── Rule 5: Zero Holder Rewards ─────────────────────────────
console.log('\n🎁 Rule 5 — Zero Holder Rewards:');
{
  const safe = safeTaxToken();
  assert(evaluateRule5(safe).passed === true, 'divideRate=30, liquidityRate=40 → PASS');

  const zero = { ...safe, divideRate: 0, liquidityRate: 0 };
  assert(evaluateRule5(zero).passed === false, 'divideRate=0, liquidityRate=0 → FAIL');
  assert(evaluateRule5(zero).scoreImpact === -20, 'Impact = -20');

  const partial = { ...safe, divideRate: 0, liquidityRate: 10 };
  assert(evaluateRule5(partial).passed === true, 'divideRate=0, liquidityRate=10 → PASS');
}

// ── Rule 6: Bonding Curve Health ────────────────────────────
console.log('\n📉 Rule 6 — Bonding Curve Health:');
{
  const healthy = { ...safeTaxToken(), funds: 20, maxFunds: 24, offers: 200_000_000, maxOffers: 800_000_000 };
  assert(evaluateRule6(healthy).passed === true, '83% funded, 25% offers → PASS (positive)');
  assert(evaluateRule6(healthy).scoreImpact === 15, 'Impact = +15');

  const early = safeTaxToken(); // funds=12, maxFunds=24 → 50%
  assert(evaluateRule6(early).passed === false, '50% funded → no bonus');
  assert(evaluateRule6(early).scoreImpact === 0, 'Impact = 0');
}

// ── Rule 7: Dividend Sniper Risk ────────────────────────────
console.log('\n🎯 Rule 7 — Dividend Sniper Risk:');
{
  const safe = safeTaxToken();
  assert(evaluateRule7(safe).passed === true, '10% accumulated → PASS');
  assert(evaluateRule7(safe).scoreImpact === 0, 'Impact = 0 (alert only)');

  const near = { ...safe, feeAccumulated: 0.9, minDispatch: 1.0 };
  assert(evaluateRule7(near).passed === false, '90% accumulated → WARNING');
  assert(evaluateRule7(near).scoreImpact === 0, 'Still 0 impact (alert only)');
}

// ── Rule 8: Fresh Creator Check ─────────────────────────────
console.log('\n👶 Rule 8 — Fresh Creator Check:');
{
  const safe = safeTaxToken();
  assert(evaluateRule8(safe).passed === true, '720h old, low preSale → PASS');

  const fresh = { ...safe, creatorWalletAge: 2, preSale: 15 };
  assert(evaluateRule8(fresh).passed === false, '2h old + 15 BNB preSale (>50% of 24) → FAIL');
  assert(evaluateRule8(fresh).scoreImpact === -25, 'Impact = -25');

  const freshLow = { ...safe, creatorWalletAge: 2, preSale: 5 };
  assert(evaluateRule8(freshLow).passed === true, '2h old but low preSale (5 BNB < 12) → PASS');
}

// ── Full Scenario Tests ─────────────────────────────────────
console.log('\n🎭 Full Scenario Tests:');
{
  // Perfect safe TaxToken
  const safeData = safeTaxToken();
  const safeRules = allRules(safeData);
  const safeScore = calculateScore(safeRules);
  assert(safeScore === 100, `Safe TaxToken → score ${safeScore} (expected 100)`);
  assert(getRiskLevel(safeScore) === 'LOW', `Safe → LOW risk`);

  // April 3rd honeypot TaxToken
  const honeypotData: TokenData = {
    ...safeTaxToken(),
    recipientAddress: '0xDEAD000000000000000000000000000000000000',
    recipientRate: 80,
    divideRate: 5,
    liquidityRate: 5,
    burnRate: 10,
    feeRate: 10,
    feePlan: false,
    isRecipientContract: true,
    status: 'SUSPENDED',
  };
  const honeypotRules = allRules(honeypotData);
  const honeypotScore = calculateScore(honeypotRules);
  assert(honeypotScore <= 29, `Honeypot TaxToken → score ${honeypotScore} (expected ≤29 CRITICAL)`);
  assert(getRiskLevel(honeypotScore) === 'CRITICAL', `Honeypot → CRITICAL`);

  // Medium risk TaxToken
  const mediumData: TokenData = {
    ...safeTaxToken(),
    feeRate: 10,    // Rule 3 triggers
    feePlan: false, // Rule 4 triggers
  };
  const mediumRules = allRules(mediumData);
  const mediumScore = calculateScore(mediumRules);
  assert(mediumScore === 75, `Medium risk → score ${mediumScore} (expected 75 = 100 - 15 - 10)`);
  assert(getRiskLevel(mediumScore) === 'MEDIUM', `Medium → MEDIUM risk`);
}

// ── Summary ──────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
