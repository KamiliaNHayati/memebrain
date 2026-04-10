// scripts/test-taxtoken-read.ts
// Quick test: Read TaxToken state from April 3rd token

import { ethers } from 'ethers';

const TOKEN = '0xe9d11f369df3cece5c9fbcf6354123f58dafffff';

const TAX_TOKEN_ABI = [
  'function feeRate() view returns (uint256)',
  'function rateFounder() view returns (uint256)',
  'function rateHolder() view returns (uint256)',
  'function rateBurn() view returns (uint256)',
  'function rateLiquidity() view returns (uint256)',
  'function founder() view returns (address)',
  'function recipientAddress() view returns (address)',
  'function recipientRate() view returns (uint256)',
  'function feeAccumulated() view returns (uint256)',
  'function minDispatch() view returns (uint256)',
  'function _mode() view returns (uint256)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.bnbchain.org', 56, { staticNetwork: true });
  const contract = new ethers.Contract(TOKEN, TAX_TOKEN_ABI, provider);

  console.log('Reading TaxToken state for:', TOKEN);
  console.log('═'.repeat(50));

  try {
    const [feeRate, rateFounder, rateHolder, rateBurn, rateLiquidity, founder, recipientAddr, recipientRate, feeAccum, minDispatch, mode] = await Promise.all([
      contract.feeRate(),
      contract.rateFounder(),
      contract.rateHolder(),
      contract.rateBurn(),
      contract.rateLiquidity(),
      contract.founder(),
      contract.recipientAddress(),
      contract.recipientRate(),
      contract.feeAccumulated(),
      contract.minDispatch(),
      contract._mode(),
    ]);

    console.log('feeRate:', feeRate.toString());
    console.log('rateFounder:', rateFounder.toString());
    console.log('rateHolder:', rateHolder.toString());
    console.log('rateBurn:', rateBurn.toString());
    console.log('rateLiquidity:', rateLiquidity.toString());
    console.log('founder:', founder);
    console.log('recipientAddress:', recipientAddr);
    console.log('recipientRate:', recipientRate.toString());
    console.log('feeAccumulated:', ethers.formatEther(feeAccum), 'BNB');
    console.log('minDispatch:', ethers.formatEther(minDispatch), 'BNB');
    console.log('mode:', mode.toString());

    // Check if recipientAddress is a contract
    const code = await provider.getCode(recipientAddr);
    console.log('\n🔍 Honeypot check:');
    console.log('recipientAddress is contract:', code !== '0x');
    console.log('recipientRate > 0:', Number(recipientRate) > 0);
    console.log('HONEYPOT:', code !== '0x' && Number(recipientRate) > 0 ? '❌ YES' : '✅ NO');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log('Error reading TaxToken ABI:', message);
    console.log('This token may not be a TaxToken — trying basic getCode check...');
    const code = await provider.getCode(TOKEN);
    console.log('Token is contract:', code !== '0x', '(length:', code.length, ')');
  }
}

main().catch(console.error);
