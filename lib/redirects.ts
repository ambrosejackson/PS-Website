/**
 * 301 map — SEO launch gate (guardrail #9).
 *
 * TODO(pre-launch): populate from the WordPress URL inventory (Search Console /
 * Screaming Frog export) so every existing privatestock.co URL 301s to its new
 * home. Brand-domain redirects (outfittersoriginal.com etc.) happen at DNS
 * cutover and also land here for path-level mapping. WordPress stays live
 * until this map is verified.
 */

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

export const WORDPRESS_301_MAP: RedirectRule[] = [
  // e.g. { source: "/old-blog-post", destination: "/news/new-slug", permanent: true },
];
