import type { NextConfig } from "next";
import { ALL_REDIRECTS } from "./lib/redirects";

const nextConfig: NextConfig = {
  images: {
    // Admin uploads live in the website Supabase project's public buckets;
    // the apparel shop renders them through next/image (explicit `sizes`).
    remotePatterns: [
      { protocol: "https", hostname: "ihurvtxmcyahvtcydmnf.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async redirects() {
    // SEO launch gate (guardrail #9): exact WordPress 301s + temporary
    // catch-alls live in lib/redirects.ts. Unmatched legacy paths fall through
    // to app/not-found.tsx (styled 404), never an error page.
    return ALL_REDIRECTS;
  },
};

export default nextConfig;
