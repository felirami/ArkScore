import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: join(__dirname, "../.."),
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ["@arkscore/shared"]
};

export default nextConfig;
