// scripts/verify-token.ts
// Day 1 verification: Query April 3rd token with getCode() to confirm still detectable.
// Run with: npx tsx scripts/verify-token.ts

import { ethers } from 'ethers';

const APRIL_3RD_TOKEN = '0xe9d11f369df3cece5c9fbcf6354123f58dafffff';
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

async function main() {
  console.log('🧠 MemeBrain — Day 1 Token Verification');
  console.log('═'.repeat(50));

  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.bnbchain.org', 56, {
    staticNetwork: true,
  });

  // ── 1. Test BSC connectivity ─────────────────────────────
  console.log('\n📡 Testing BSC Mainnet connectivity...');
  const blockNumber = await provider.getBlockNumber();
  console.log(`✅ Connected! Current block: ${blockNumber}`);

  // ── 2. Test reading WBNB balance (simple contract read) ──
  console.log('\n💰 Testing WBNB contract read...');
  const wbnbAbi = ['function balanceOf(address) view returns (uint256)'];
  const wbnb = new ethers.Contract(WBNB_ADDRESS, wbnbAbi, provider);
  
  // Read WBNB balance of the null address (should be some amount)
  const balance = await wbnb.balanceOf('0x0000000000000000000000000000000000000001');
  console.log(`✅ WBNB.balanceOf(0x0001) = ${ethers.formatEther(balance)} WBNB`);

  // ── 3. Verify April 3rd token (getCode check) ────────────
  console.log('\n🔍 Verifying April 3rd exploit token...');
  console.log(`   Token: ${APRIL_3RD_TOKEN}`);
  
  const code = await provider.getCode(APRIL_3RD_TOKEN);
  const isContract = code !== '0x';
  const codeLength = code.length;

  console.log(`   Is contract: ${isContract}`);
  console.log(`   Bytecode length: ${codeLength} characters`);

  if (isContract) {
    console.log('   ✅ Token is still a contract — Rule 1 (Honeypot) will trigger correctly.');
  } else {
    console.log('   ⚠️  Token is NOT a contract! Rule 1 may not work as expected.');
  }

  // ── 4. Summary ───────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('📋 Day 1 Verification Summary:');
  console.log(`   BSC Connected:    ✅ Block ${blockNumber}`);
  console.log(`   WBNB Read:        ✅ ${ethers.formatEther(balance)} WBNB`);
  console.log(`   April 3rd Token:  ${isContract ? '✅' : '❌'} ${isContract ? 'Detectable' : 'NOT detectable'}`);
  console.log(`   Bytecode Length:  ${codeLength} chars`);
  console.log('═'.repeat(50));
}

main().catch((error) => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});
