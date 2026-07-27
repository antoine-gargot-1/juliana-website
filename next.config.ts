import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Local assets only; keep modern formats for the LCP hero.
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
