import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  serverExternalPackages: ['better-sqlite3', '@node-rs/argon2', 'sharp', 'pino'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
