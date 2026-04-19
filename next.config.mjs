/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tree-shake viem/wagmi properly instead of creating giant async chunks
    optimizePackageImports: ['viem', 'wagmi', '@wagmi/core', '@wagmi/connectors'],
  },
  webpack: (config) => {
    // Fix pino / WalletConnect / RainbowKit bundling errors in Next.js 14
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Fix MetaMask SDK trying to import React Native async-storage
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };

    return config;
  },
};

export default nextConfig;