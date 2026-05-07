import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the Turbopack/webpack conflict warning in Next.js 16
  turbopack: {},
  // pdfkit uses Node.js APIs — exclude from client bundles
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
