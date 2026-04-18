/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['viem'],
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };

    // ← ADD THIS: prevent viem from being split into a separate async chunk
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            viem: {
              test: /[\\/]node_modules[\\/]viem[\\/]/,
              name: 'viem',
              chunks: 'all',  // bundle synchronously, not async
              priority: 10,
            },
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;