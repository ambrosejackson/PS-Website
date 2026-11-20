/** Shared constants for the Apparel admin (client + server). */

import { isPod, isProviderKey, SELF_LABEL, type ProviderKey } from "@/lib/commerce/providers";

/** "Who fulfills this" dropdown option: in-house first, then one per fulfillment_providers row (D-146). */
export type ProviderOption = { key: ProviderKey; label: string; is_active: boolean };

export function providerOptions(rows: ReadonlyArray<{ key: string; label: string; is_active: boolean }>): ProviderOption[] {
  const pod = rows
    .filter((r) => isProviderKey(r.key) && isPod(r.key))
    .map((r) => ({ key: r.key as ProviderKey, label: r.label, is_active: r.is_active }));
  return [{ key: "self", label: SELF_LABEL, is_active: true }, ...pod];
}

/** Brand attribution dropdown: Private Stock (house, stored as null) + the four brands. */
export const HOUSE_BRAND = "Private Stock";

/** Short codes for SKU auto-suggest: BRAND-SLUG-SIZE-COLOR. */
export const SKU_BRAND_CODE: Record<string, string> = {
  "Private Stock": "PS",
  Outfitters: "OF",
  TerpKings: "TK",
  "Higher Self": "HS",
  "Savage Squad Strains": "SSS",
};

export function suggestSku(brand: string | null, slug: string, size: string | null, color: string | null): string {
  const parts = [
    SKU_BRAND_CODE[brand ?? HOUSE_BRAND] ?? "PS",
    slug.toUpperCase().replace(/[^A-Z0-9-]+/g, ""),
    (size ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, ""),
    (color ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, ""),
  ].filter(Boolean);
  return parts.join("-");
}
