import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Vercel deployment configuration (no output needed)
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/react-dialog', '@radix-ui/react-label', '@radix-ui/react-slot', 'lucide-react'],
  },
  // Image optimization for card images
  images: {
    domains: ['cards.scryfall.io'],
    formats: ['image/webp', 'image/avif'],
  },
  // 🔒 Enhanced Security Headers Configuration
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()',
          },
          // Content Security Policy - relaxed for development to allow Stagewise
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:* ws://localhost:* wss://localhost:*; connect-src 'self' https://api.scryfall.com https://cards.scryfall.io https://discord.com https://discordapp.com wss: ws: http://localhost:* ws://localhost:* wss://localhost:*; img-src 'self' data: https: http://localhost:*; style-src 'self' 'unsafe-inline'; font-src 'self' data:;`
              : `default-src 'self'; script-src 'self'; connect-src 'self' https://api.scryfall.com https://cards.scryfall.io https://discord.com https://discordapp.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;`
          },
          // Production-only HSTS header
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          }] : []),
        ],
      },
      {
        // Specific headers for API routes
        source: '/api/(.*)',
        headers: [
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
};

export default nextConfig;
