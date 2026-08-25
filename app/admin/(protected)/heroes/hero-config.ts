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

/** Pages with a hero, in the admin's display order (content_heroes.page values). */
export const HERO_PAGES = [
  { page: "/", label: "Landing" },
  { page: "/outfitters", label: "Outfitters" },
  { page: "/higherself", label: "Higher Self" },
  { page: "/savagesquadstrains", label: "Savage Squad Strains" },
  { page: "/terpkings", label: "TerpKings (video sits under the CRT layers)" },
  { page: "/products", label: "Products" },
  { page: "/apparel", label: "Apparel" },
  { page: "/about", label: "About" },
  { page: "/contact", label: "Contact" },
  { page: "/rewards", label: "Rewards" },
  { page: "/news", label: "News (index + posts)" },
  { page: "/store-locator", label: "Store Locator" },
] as const;

export function heroPageLabel(page: string): string {
  return HERO_PAGES.find((p) => p.page === page)?.label ?? page;
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
