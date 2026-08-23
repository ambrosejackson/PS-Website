/** Shared constants for the Apparel admin (client + server). */

export const FULFILLMENT_PROVIDERS = ["self", "printify", "tapstitch"] as const;
export type FulfillmentProvider = (typeof FULFILLMENT_PROVIDERS)[number];

export const FULFILLMENT_LABEL: Record<FulfillmentProvider, string> = {
  self: "Self — we pack & ship it",
  printify: "Printify — Ambrose places the order in the Printify dashboard",
  tapstitch: "Tapstitch — Ambrose places the order in the Tapstitch dashboard",
};

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
