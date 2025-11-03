import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['app.strongai.kr', '*.strongai.kr', 'https://app.strongai.kr'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
