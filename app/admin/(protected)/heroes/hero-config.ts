/**
 * Shared constants for the heroes admin (client + server). Heroes live in the
 * `heroes` bucket (images ≤ 10 MB, mp4 ≤ 60 MB — rules in lib/admin/buckets.ts).
 * The original `hero-media` bucket (0005) is left in place so any URL already
 * stored keeps resolving.
 */
import { BUCKET_RULES } from "@/lib/admin/buckets";

export const HERO_BUCKET = "heroes" as const;
export const HERO_MAX_BYTES = Math.max(BUCKET_RULES.heroes.imageMaxBytes, BUCKET_RULES.heroes.videoMaxBytes);
export const HERO_ALLOWED_MIME: Record<string, "video" | "image"> = {
  "video/mp4": "video",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

export type HeroPageOption = { page: string; label: string };

/**
 * Static pages with a hero, in the admin's display order (content_heroes.page
 * values — always leading-slash routes). Apparel COLLECTION pages
 * (`/apparel/collections/{slug}`) are dynamic: they come from
 * `merch_collections.hero_page` and are merged in with `heroPagesWith()`.
 */
export const HERO_PAGES = [
  { page: "/", label: "Landing" },
  { page: "/outfitters", label: "Outfitters" },
  { page: "/higherself", label: "Higher Self" },
  { page: "/savagesquadstrains", label: "Savage Squad Strains" },
  { page: "/terpkings", label: "TerpKings (video sits under the CRT layers)" },
  { page: "/products", label: "Products" },
  { page: "/apparel", label: "Apparel (shop home)" },
  { page: "/apparel/shop", label: "Apparel — Shop all grid" },
  { page: "/about", label: "About" },
  { page: "/contact", label: "Contact" },
  { page: "/rewards", label: "Rewards" },
  { page: "/news", label: "News (index + posts)" },
  { page: "/store-locator", label: "Store Locator" },
] as const;

/** `/apparel/collections/{slug}` → slug, else null. Mirrors merch_collections.hero_page. */
export function collectionSlugFromHeroPage(page: string): string | null {
  const m = /^\/apparel\/collections\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(page);
  return m ? m[1] : null;
}

/** Static pages + collection pages, the latter inserted right after the shop-all grid. */
export function heroPagesWith(collectionPages: ReadonlyArray<HeroPageOption>): HeroPageOption[] {
  const out: HeroPageOption[] = [];
  for (const p of HERO_PAGES) {
    out.push({ page: p.page, label: p.label });
    if (p.page === "/apparel/shop") out.push(...collectionPages);
  }
  return out;
}

export function heroPageLabel(page: string): string {
  const known = HERO_PAGES.find((p) => p.page === page)?.label;
  if (known) return known;
  const slug = collectionSlugFromHeroPage(page);
  return slug ? `Apparel collection — ${slug}` : page;
}

/** DOM id for a page's group on /admin/heroes (deep links from other admin sections). */
export function heroAnchorId(page: string): string {
  return `hero${page.replace(/[^a-z0-9]+/gi, "_")}`;
}

/**
 * Landing-only nav hover targets. The stored value is what Header.navEnter
 * emits; since D-056 renamed the item back to BRANDS the value and the label
 * finally agree (it was value "BRANDS" / label "CATALOG" under D-021).
 */
export const NAV_TARGETS = [
  { value: "BRANDS", label: "BRANDS" },
  { value: "STORE LOCATOR", label: "STORE LOCATOR" },
  { value: "YOUR REWARDS", label: "YOUR REWARDS" },
] as const;

export function navTargetLabel(value: string | null): string | null {
  if (!value) return null;
  return NAV_TARGETS.find((t) => t.value === value.toUpperCase())?.label ?? value;
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
