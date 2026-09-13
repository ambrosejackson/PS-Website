import "server-only";
import { revalidatePath } from "next/cache";
import { BRANDS, brandByName, brandBySlug } from "@/lib/brands";

/**
 * Which public paths an admin mutation invalidates (D-038..D-044 session,
 * apparel shop rebuild D-071..D-081):
 *   products           → /, /products, /products/[brand]/[slug], the brand page
 *   apparel            → /, /apparel, /apparel/shop, /apparel/[slug]
 *   apparel-home       → /apparel (merch_settings / tiles)
 *   apparel-collection → /apparel, /apparel/shop, /apparel/collections/[slug]
 *   heroes             → its page (hero pages are routes, incl. /apparel/collections/[slug])
 *   banners            → /
 *   social             → / + every brand page (FOLLOW US strip, D-064)
 *   blog               → /news, /news/[slug]
 *   messages/contact   → none
 * Every admin mutation calls `revalidateFor(...)` directly (same process, no
 * token round-trip); /api/revalidate stays for out-of-process callers (the
 * PSM publish job) and only accepts paths produced by these rules.
 */

export type RevalidateTarget =
  | { kind: "products"; brand?: string; slug?: string }
  | { kind: "apparel"; slug?: string }
  | { kind: "apparel-home" }
  | { kind: "apparel-collection"; slug?: string }
  | { kind: "heroes"; page: string }
  | { kind: "banners" }
  | { kind: "social" }
  | { kind: "blog"; slug?: string }
  | { kind: "messages" };

/** Normalize a brand name OR slug to its route slug (unknown → null). */
function brandSlug(brand?: string): string | null {
  if (!brand) return null;
  return (brandBySlug(brand.toLowerCase()) ?? brandByName(brand))?.slug ?? null;
}

export function pathsFor(target: RevalidateTarget): string[] {
  const out = new Set<string>();
  switch (target.kind) {
    case "products": {
      out.add("/");
      out.add("/products");
      const slug = brandSlug(target.brand);
      if (slug) {
        out.add(`/${slug}`);
        if (target.slug) out.add(`/products/${slug}/${target.slug}`);
      }
      break;
    }
    case "apparel":
      out.add("/");
      out.add("/apparel");
      out.add("/apparel/shop");
      if (target.slug) out.add(`/apparel/${target.slug}`);
      break;
    case "apparel-home":
      out.add("/apparel");
      break;
    case "apparel-collection":
      out.add("/apparel");
      out.add("/apparel/shop");
      if (target.slug) out.add(`/apparel/collections/${target.slug}`);
      break;
    case "heroes":
      out.add(normalizePage(target.page));
      break;
    case "banners":
    case "social":
      // Landing strip + every brand page: tiles are pooled per brand (0013).
      out.add("/");
      for (const b of BRANDS) out.add(`/${b.slug}`);
      break;
    case "blog":
      out.add("/news");
      if (target.slug) out.add(`/news/${target.slug}`);
      break;
    case "messages":
      break;
  }
  return [...out];
}

function normalizePage(page: string): string {
  const p = page.trim();
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

/** Revalidate every path affected by one or more targets. Returns the paths. */
export function revalidateFor(...targets: RevalidateTarget[]): string[] {
  const paths = [...new Set(targets.flatMap(pathsFor))];
  for (const p of paths) revalidatePath(p);
  return paths;
}

/**
 * Allowlist for externally supplied paths (/api/revalidate). Only shapes the
 * rules above can produce — never arbitrary strings.
 */
const STATIC_PATHS = new Set([
  "/",
  "/products",
  "/apparel",
  "/apparel/shop",
  "/news",
  "/about",
  "/contact",
  "/rewards",
  "/store-locator",
  "/outfitters",
  "/terpkings",
  "/higherself",
  "/savagesquadstrains",
]);
const SLUG = "[a-z0-9-]{1,120}";
const DYNAMIC_PATHS = [
  new RegExp(`^/products/(outfitters|terpkings|higherself|savagesquadstrains)/${SLUG}$`),
  new RegExp(`^/apparel/${SLUG}$`),
  new RegExp(`^/apparel/collections/${SLUG}$`),
  new RegExp(`^/news/${SLUG}$`),
];

export function isAllowedRevalidatePath(path: string): boolean {
  if (typeof path !== "string" || path.length > 200) return false;
  if (STATIC_PATHS.has(path)) return true;
  return DYNAMIC_PATHS.some((re) => re.test(path));
}
