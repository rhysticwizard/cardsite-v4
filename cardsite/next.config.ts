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
  // Moved from experimental.serverComponentsExternalPackages (Next.js 15+ change)
  serverExternalPackages: ['postgres'],
  
  // Fix file watching issues that cause development server crashes
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Reduce file watching pressure to prevent crashes
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000, // Poll every 1 second instead of continuous watching
        aggregateTimeout: 300, // Wait 300ms after changes before rebuilding
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
          '**/coverage/**',
          '**/*.log',
          '**/benchmark-results.json',
        ],
      };
      
      // Optimize memory usage to prevent OOM crashes
      config.cache = {
        type: 'memory',
        maxGenerations: 1, // Reduce cache generations to save memory
      };
    }
    
    // Prevent memory leaks from webpack
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // Optimize for development stability
  // Note: devIndicators.buildActivity is deprecated in Next.js 15+
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
