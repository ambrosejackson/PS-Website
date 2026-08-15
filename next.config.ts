import type { NextConfig } from "next";
import { WORDPRESS_301_MAP } from "./lib/redirects";

const nextConfig: NextConfig = {
  async redirects() {
    // SEO launch gate (guardrail #9): the full WordPress 301 map lives in
    // lib/redirects.ts and must be populated + verified before DNS cutover.
    return WORDPRESS_301_MAP;
  },
};

export default nextConfig;
