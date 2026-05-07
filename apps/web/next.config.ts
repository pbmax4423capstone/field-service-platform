import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit uses Node.js canvas — exclude from client bundles
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        stream: false,
        zlib: false,
      }
    }
    return config
  },
};

export default nextConfig;
