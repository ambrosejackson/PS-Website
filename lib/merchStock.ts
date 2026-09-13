/**
 * Stock badge rules (D-066) — ONE helper shared by the storefront card, the
 * PDP and the admin badge preview so they never disagree.
 *
 *   - Only ACTIVE variants with a non-null stock_qty ("tracked") count. No
 *     tracked variants (made to order) → no badge, ever.
 *   - All tracked variants at 0            → "sold_out"
 *   - Any tracked variant 0 < qty ≤ threshold, or at least one tracked size
 *     sold out while others remain          → "low_stock"
 *   - When a colour is selected, compute over that colour's variants only.
 */

export type StockVariant = {
  size: string | null;
  color: string | null;
  stock_qty: number | null;
  is_active: boolean;
};

export type StockBadge = "sold_out" | "low_stock" | null;

export const STOCK_BADGE_LABEL: Record<Exclude<StockBadge, null>, string> = {
  sold_out: "Sold Out",
  low_stock: "Low Stock",
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();

/** Active variants, optionally narrowed to one colour (case-insensitive). */
export function activeVariants<T extends StockVariant>(variants: readonly T[], color?: string | null): T[] {
  const c = norm(color);
  return variants.filter((v) => v.is_active && (!c || norm(v.color) === c));
}

/** True when this variant is tracked and has nothing left. */
export function isVariantSoldOut(v: StockVariant): boolean {
  return v.stock_qty !== null && v.stock_qty <= 0;
}

export function stockBadge(variants: readonly StockVariant[], threshold: number, color?: string | null): StockBadge {
  const tracked = activeVariants(variants, color).filter((v) => v.stock_qty !== null);
  if (tracked.length === 0) return null;
  const soldOut = tracked.filter((v) => v.stock_qty! <= 0).length;
  if (soldOut === tracked.length) return "sold_out";
  const t = Math.max(0, Math.round(threshold));
  const low = tracked.some((v) => v.stock_qty! > 0 && v.stock_qty! <= t);
  return low || soldOut > 0 ? "low_stock" : null;
}

/** A product is purchasable when at least one active variant is not sold out. */
export function isProductSoldOut(variants: readonly StockVariant[], color?: string | null): boolean {
  const active = activeVariants(variants, color);
  return active.length > 0 && active.every(isVariantSoldOut);
}
