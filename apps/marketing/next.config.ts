import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  transpilePackages: ['@field-service/ui', '@field-service/shared'],
}

export default nextConfig
