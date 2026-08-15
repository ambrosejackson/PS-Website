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
}

export const BRANDS: readonly Brand[] = [
  {
    name: "Outfitters",
    slug: "outfitters",
    accentHex: "#3e6b4f",
    tagline: "Gear up. Head out.",
  },
  {
    name: "TerpKings",
    slug: "terpkings",
    accentHex: "#7a4dbd",
    tagline: "Chase the terps.",
  },
  {
    name: "Higher Self",
    slug: "higherself",
    accentHex: "#c9a86a",
    tagline: "Find your higher self.",
  },
  {
    name: "Savage Squad Strains",
    slug: "savagesquadstrains",
    accentHex: "#b03a3a",
    tagline: "Run with the squad.",
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
