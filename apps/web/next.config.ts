import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the Turbopack/webpack conflict warning in Next.js 16
  turbopack: {},
  // Packages that use native Node.js APIs — exclude from client/edge bundles
  serverExternalPackages: ['pdfkit', 'ws', '@deepgram/sdk'],
};

export default nextConfig;
