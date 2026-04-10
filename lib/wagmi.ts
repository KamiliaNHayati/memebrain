// lib/wagmi.ts
// Wagmi + RainbowKit configuration for BSC Mainnet wallet connection.

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'MemeBrain',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [bsc],
  ssr: true, // Required for Next.js
});
