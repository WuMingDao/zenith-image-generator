import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  typedRoutes: true,
  logging: {
    browserToTerminal: true,
  },
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
