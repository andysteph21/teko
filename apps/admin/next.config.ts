import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les packages du monorepo sont livrés en source TS — Next les transpile.
  transpilePackages: [
    "@teko/api-client",
    "@teko/core",
    "@teko/i18n",
    "@teko/maps",
    "@teko/types",
    "@teko/ui",
  ],
};

export default nextConfig;
