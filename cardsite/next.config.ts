import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/react-dialog', '@radix-ui/react-label', '@radix-ui/react-slot', 'lucide-react'],
  },
  // Image optimization for card images
  images: {
    domains: ['cards.scryfall.io'],
    formats: ['image/webp', 'image/avif'],
  },
};

export default nextConfig;
