/**
 * Apparel categories and sub-nav tabs (D-064).
 *
 * `merch_products.category` is a free text column; THIS file is the validation
 * (admin select offers exactly CATEGORIES) and the grouping (sub-nav TABS).
 * Same single-config pattern as `lib/brands.ts`.
 */

export const CATEGORIES = [
  { value: "t-shirts",           label: "T-Shirts",           tab: "tees" },
  { value: "long-sleeve-shirts", label: "Long Sleeve Shirts", tab: "long-sleeves" },
  { value: "hoodies",            label: "Hoodies",            tab: "hoodies-sweaters" },
  { value: "sweaters",           label: "Sweaters",           tab: "hoodies-sweaters" },
  { value: "sportswear",         label: "Sportswear",         tab: "sportswear" },
  { value: "jackets-coats",      label: "Jackets & Coats",    tab: "outerwear" },
  { value: "hats",               label: "Hats",               tab: "hats" },
  { value: "socks",              label: "Socks",              tab: "accessories" },
  { value: "accessories",        label: "Accessories",        tab: "accessories" },
] as const;

export const TABS = [
  { slug: "tees",             label: "Tees" },
  { slug: "long-sleeves",     label: "Long Sleeves" },
  { slug: "hoodies-sweaters", label: "Hoodies & Sweaters" },
  { slug: "sportswear",       label: "Sportswear" },
  { slug: "outerwear",        label: "Outerwear" },
  { slug: "hats",             label: "Hats" },
  { slug: "accessories",      label: "Accessories" },
] as const;

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "One Size"] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];
export type TabSlug = (typeof TABS)[number]["slug"];

/** Product slugs that would shadow the shop routes (D-063). Mirrors the DB check. */
export const RESERVED_PRODUCT_SLUGS = ["shop", "collections", "cart", "checkout", "order"] as const;

export function isCategory(value: unknown): value is CategoryValue {
  return typeof value === "string" && CATEGORIES.some((c) => c.value === value);
}

export function isTab(value: unknown): value is TabSlug {
  return typeof value === "string" && TABS.some((t) => t.slug === value);
}

export function categoryLabel(value: string | null | undefined): string | null {
  return CATEGORIES.find((c) => c.value === value)?.label ?? null;
}

export function tabLabel(slug: string | null | undefined): string | null {
  return TABS.find((t) => t.slug === slug)?.label ?? null;
}

/** Category values belonging to a tab — what `?tab=` expands to server-side. */
export function categoriesForTab(slug: string): CategoryValue[] {
  return CATEGORIES.filter((c) => c.tab === slug).map((c) => c.value);
}

/** Tab a category belongs to (null for unknown/unset categories). */
export function tabForCategory(value: string | null | undefined): TabSlug | null {
  return CATEGORIES.find((c) => c.value === value)?.tab ?? null;
}

/** Sort sizes in SIZE_ORDER; unknown sizes go last, alphabetically. */
export function sortSizes<T extends { size: string | null }>(items: T[]): T[] {
  const rank = (s: string | null) => {
    const i = SIZE_ORDER.indexOf((s ?? "").trim() as (typeof SIZE_ORDER)[number]);
    return i === -1 ? SIZE_ORDER.length : i;
  };
  return [...items].sort((a, b) => rank(a.size) - rank(b.size) || (a.size ?? "").localeCompare(b.size ?? ""));
}

/**
 * Fallback swatch dots when a colour has no image tagged with it. Keys are the
 * UPPERCASE strings stored in `merch_variants.color` (seeded from the colours
 * present on 2026-09-13); look up through `colorHexFor` so casing never matters.
 */
export const colorHex: Record<string, string> = {
  BLACK: "#111111",
  WHITE: "#f5f5f5",
  GREY: "#8a8a8a",
  GRAY: "#8a8a8a",
  GREEN: "#1f6f43",
  "NAVY BLUE": "#1b2a4a",
  NAVY: "#1b2a4a",
  RED: "#b3261e",
  "SKY BLUE": "#8ec5e6",
  BLUE: "#2b5fb3",
  CREAM: "#efe6d3",
  SAND: "#d8c8a8",
  BROWN: "#5b3a29",
  GOLD: "#c9a227",
};

export function colorHexFor(color: string | null | undefined): string {
  if (!color) return "#cccccc";
  return colorHex[color.trim().toUpperCase()] ?? "#cccccc";
}
