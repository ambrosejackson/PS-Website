import type { ShopProduct } from "@/lib/merch/queries";
import type { MerchVariant } from "@/lib/data";
import { sortSizes } from "@/lib/merchCategories";
import { isVariantSoldOut } from "@/lib/merchStock";
import { money } from "@/lib/commerce/config";

/** Shared card/modal derivations so the two never disagree. */

const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();

export function activeVariantsOf(product: ShopProduct): MerchVariant[] {
  return product.merch_variants.filter((v) => v.is_active);
}

/** Distinct colours in variant order (first-seen casing kept). */
export function colorsOf(product: ShopProduct): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of activeVariantsOf(product)) {
    if (!v.color) continue;
    const k = norm(v.color);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v.color.trim());
  }
  return out;
}

export function variantsForColor(product: ShopProduct, color: string | null): MerchVariant[] {
  const c = norm(color);
  return activeVariantsOf(product).filter((v) => !c || norm(v.color) === c);
}

export type SizeOption = { size: string; soldOut: boolean; variant: MerchVariant };

/**
 * Size pills for a colour, in SIZE_ORDER. A size with no size string (e.g. a
 * hat) is presented as "One Size". Sold out = every variant for that size is
 * tracked and at 0.
 */
export function sizeOptions(product: ShopProduct, color: string | null): SizeOption[] {
  const groups = new Map<string, MerchVariant[]>();
  for (const v of variantsForColor(product, color)) {
    const key = (v.size ?? "").trim() || "One Size";
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }
  const rows = [...groups.entries()].map(([size, vs]) => {
    const available = vs.find((v) => !isVariantSoldOut(v));
    return { size, soldOut: !available, variant: available ?? vs[0] };
  });
  return sortSizes(rows);
}

/** A product is "One Size" when the selected colour offers exactly one size option. */
export function isOneSize(options: SizeOption[]): boolean {
  return options.length === 1;
}

export function priceLabel(product: ShopProduct, color: string | null): string {
  const prices = variantsForColor(product, color).map((v) => v.price_cents);
  if (prices.length === 0) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)} – ${money(max)}`;
}

export function productHref(product: ShopProduct, color: string | null): string {
  return `/apparel/${product.slug}${color ? `?color=${encodeURIComponent(color)}` : ""}`;
}

export function variantLabel(v: MerchVariant): string {
  return [v.size, v.color].filter(Boolean).join(" · ");
}
