import { BRANDS, brandBySlug } from "@/lib/brands";

/**
 * Persona scheme (guardrail #7, build plan §1 — CONFIRMED):
 * every signup is tagged `Website Sign-up – {Brand}` (en dash), where {Brand} is
 * determined by the page the visitor was on at submit. Brand pages (any depth,
 * including /products/{brand}/{slug}) map to their brand; every non-brand page
 * maps to Private Stock.
 */

export const NON_BRAND_CONTEXT = "Private Stock";

export interface PersonaResult {
  /** Full tag stored in subscribers.persona, e.g. "Website Sign-up – Outfitters" */
  persona: string;
  /** Brand alone, stored in subscribers.brand_context ("Private Stock" on non-brand pages) */
  brandContext: string;
}

export function personaTag(brand: string): string {
  return `Website Sign-up – ${brand}`;
}

/**
 * Resolve persona + brand_context from the path the visitor was on at submit.
 * Callers store the exact path in subscribers.source_path for audit.
 */
export function personaForPath(sourcePath: string): PersonaResult {
  const path = sourcePath.split(/[?#]/)[0].toLowerCase();
  const segments = path.split("/").filter(Boolean);

  // /outfitters, /higherself/..., etc. (any depth)
  const first = segments[0] ?? "";
  const brandFromSubpath = brandBySlug(first);
  if (brandFromSubpath) {
    return {
      persona: personaTag(brandFromSubpath.name),
      brandContext: brandFromSubpath.name,
    };
  }

  // /products/{brand}/{slug} — brand product detail pages
  if (first === "products" && segments.length >= 2) {
    const brandFromProduct = brandBySlug(segments[1]);
    if (brandFromProduct) {
      return {
        persona: personaTag(brandFromProduct.name),
        brandContext: brandFromProduct.name,
      };
    }
  }

  // Everything else — homepage, /apparel, /rewards, /news, /about, /contact,
  // /products index, /store-locator, footer/popup on any non-brand page.
  return {
    persona: personaTag(NON_BRAND_CONTEXT),
    brandContext: NON_BRAND_CONTEXT,
  };
}

/** All valid persona tags (for validation / admin filters). */
export const ALL_PERSONA_TAGS = [
  personaTag(NON_BRAND_CONTEXT),
  ...BRANDS.map((b) => personaTag(b.name)),
];
