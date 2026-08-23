/**
 * 301 map — SEO launch gate (guardrail #9).
 *
 * TODO(post-cutover): populate from the WordPress URL inventory (Search Console /
 * Screaming Frog export) so every existing privatestock.co URL 301s to its new
 * home. Brand-domain redirects (outfittersoriginal.com etc.) happen at DNS
 * cutover and also land here for path-level mapping.
 *
 * Until that inventory lands, WORDPRESS_CATCHALL below is the graceful floor:
 * the obvious WordPress section roots 301 to their new equivalents, and
 * anything else unrecognized falls through to app/not-found.tsx (styled 404
 * with header nav + BACK TO HOME) — never a bare error page.
 *
 * Next.js emits 308 for `permanent: true` (method-preserving permanent
 * redirect; search engines treat it exactly like a 301).
 */

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

/**
 * Temporary WordPress catch-alls (pre-inventory). Order matters: Next.js
 * applies the first matching rule. Keep these BROAD — per-URL rules from the
 * inventory go in WORDPRESS_301_MAP and are checked first.
 */
export const WORDPRESS_CATCHALL: RedirectRule[] = [
  // Store / catalog
  { source: "/shop", destination: "/products", permanent: true },
  { source: "/shop/:path*", destination: "/products", permanent: true },

  // Blog → News (individual post slugs get exact mappings from the inventory later)
  { source: "/blog", destination: "/news", permanent: true },
  { source: "/blog/:path*", destination: "/news", permanent: true },

  // Static pages
  { source: "/about-us", destination: "/about", permanent: true },
  { source: "/contact-us", destination: "/contact", permanent: true },

  // WordPress asset + core paths — nothing to serve here; send home.
  { source: "/wp-content/:path*", destination: "/", permanent: true },
  { source: "/wp-includes/:path*", destination: "/", permanent: true },
];

/** Exact per-URL 301s from the WordPress URL inventory. Checked before the catch-alls. */
export const WORDPRESS_301_MAP: RedirectRule[] = [
  // e.g. { source: "/old-blog-post", destination: "/news/new-slug", permanent: true },
];

/** What next.config.ts actually installs. */
export const ALL_REDIRECTS: RedirectRule[] = [
  ...WORDPRESS_301_MAP,
  ...WORDPRESS_CATCHALL,
];
