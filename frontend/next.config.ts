import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'http://backend:8000/api/v1/:path*'
          : 'http://localhost:8000/api/v1/:path*'
      }
    ];
  }
};

export default nextConfig;
