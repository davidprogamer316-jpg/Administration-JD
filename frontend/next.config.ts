import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.DESKTOP_BUILD === 'true' ? 'standalone' : undefined,
};

export default nextConfig;
