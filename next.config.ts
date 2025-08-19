import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // WARNING: This allows production builds to successfully complete even if
    // your project has ESLint errors. Only use this temporarily!
    ignoreDuringBuilds: true,
  },
  typescript: {
    // WARNING: Dangerously allow production builds to successfully complete even if
    // your project has type errors. Only use this temporarily!
    // ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Suppress Handlebars warnings about require.extensions
    config.ignoreWarnings = [
      {
        module: /node_modules\/handlebars/,
        message: /require\.extensions/,
      },
    ];
    return config;
  },
};

export default nextConfig;