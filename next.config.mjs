/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Fix pino / WalletConnect / RainbowKit bundling errors in Next.js 14
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
