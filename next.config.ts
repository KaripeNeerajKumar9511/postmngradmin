import type { NextConfig } from 'next';

const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  env: {
    BACKEND_URL,
  },
};

export default nextConfig;
