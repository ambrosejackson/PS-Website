/**
 * Brand allowlist — THE single switch for which brands appear anywhere on the site
 * (guardrail #3). Kush League and Clusters stay excluded until Ambrose adds them here.
 * Every brand surface (nav, grids, catalog sync, publish upsert, filters, routes)
 * must derive from this list — never hardcode brand names elsewhere.
 */

export type BrandSlug =
  | "outfitters"
  | "terpkings"
  | "higherself"
  | "savagesquadstrains";

export interface Brand {
  /** Display name, exactly as used in data rows (catalog_products.brand, personas). */
  name: string;
  /** URL subpath segment, e.g. /outfitters */
  slug: BrandSlug;
  /** Placeholder accent until each brand's full design lands (phases 1–2). */
  accentHex: string;
  tagline: string;
  /** Real logo files in public/brand-assets/ — for dark backgrounds. */
  logoOnDark: string;
  /** Real logo files in public/brand-assets/ — for light backgrounds. */
  logoOnLight: string;
}

export const BRANDS: readonly Brand[] = [
  {
    name: "Outfitters",
    slug: "outfitters",
    accentHex: "#3e6b4f",
    tagline: "Gear up. Head out.",
    logoOnDark: "/brand-assets/outfitters-white.png",
    logoOnLight: "/brand-assets/outfitters-black.png",
  },
  {
    name: "TerpKings",
    slug: "terpkings",
    accentHex: "#7a4dbd",
    tagline: "Choose your terpenes.",
    logoOnDark: "/brand-assets/terpkings-white.png",
    logoOnLight: "/brand-assets/terpkings-monogram.png",
  },
  {
    name: "Higher Self",
    slug: "higherself",
    accentHex: "#c9a86a",
    tagline: "Find your higher self.",
    logoOnDark: "/brand-assets/higherself-white.svg",
    logoOnLight: "/brand-assets/higherself-blue.svg",
  },
  {
    name: "Savage Squad Strains",
    slug: "savagesquadstrains",
    accentHex: "#b03a3a",
    tagline: "Run with the squad.",
    logoOnDark: "/brand-assets/savagesquadstrains-white.png",
    logoOnLight: "/brand-assets/savagesquadstrains-black.png",
  },
] as const;

export const BRAND_SLUGS = BRANDS.map((b) => b.slug);
export const BRAND_NAMES = BRANDS.map((b) => b.name);

export function brandBySlug(slug: string): Brand | undefined {
  return BRANDS.find((b) => b.slug === slug);
}

export function brandByName(name: string): Brand | undefined {
  return BRANDS.find((b) => b.name.toLowerCase() === name.toLowerCase());
}

/** True if a data row's brand value is on the allowlist (case-insensitive). */
export function isAllowlistedBrand(name: string): boolean {
  return brandByName(name) !== undefined;
}
