import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/* Monorepo root: Next must trace from here when a parent `package-lock.json` exists (see output caveats). */
const ukDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(ukDir, "..");

const nextConfig: NextConfig = {
  distDir: ".next",
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
