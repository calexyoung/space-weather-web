import type { NextConfig } from "next";
import { getSecurityHeaders } from "./src/lib/security/headers";

// Get security headers configuration
const securityHeaders = Object.entries(getSecurityHeaders()).map(([key, value]) => ({
  key,
  value
}));

const nextConfig: NextConfig = {
  eslint: {
    // TODO: Remove this after fixing ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // WARNING: Dangerously allow production builds to successfully complete even if
    // your project has type errors. Only use this temporarily!
    // ignoreBuildErrors: true,
  },
  
  // Security headers configuration
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Additional headers for API routes
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  
  // CORS configuration for API routes
  async rewrites() {
    return [];
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Enable strict mode for React
  reactStrictMode: true,
  
  // Compress responses
  compress: true,
  
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