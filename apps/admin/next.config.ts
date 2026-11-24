import { resolve } from "node:path";
import type { NextConfig } from "next";

const privateAlpha = process.env.NEXT_PUBLIC_TEKO_ALPHA_ADMIN === "true";

const nextConfig: NextConfig = {
  ...(privateAlpha && {
    basePath: "/admin",
    output: "standalone",
    outputFileTracingRoot: resolve(process.cwd(), "../.."),
    distDir: ".next/alpha-vps",
  }),
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
