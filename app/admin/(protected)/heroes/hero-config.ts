/**
 * Shared constants for the hero-media pipeline (client + server). Since
 * migration 0006 heroes live in the `heroes` bucket (images ≤ 10 MB, mp4 ≤ 60 MB
 * — rules in lib/admin/buckets.ts). The original `hero-media` bucket (0005)
 * is left in place so any URL already stored keeps resolving.
 */
import { BUCKET_RULES } from "@/lib/admin/buckets";

export const HERO_BUCKET = "heroes" as const;
/** Hard ceiling used for the quick client pre-check; the real per-kind caps come from BUCKET_RULES. */
export const HERO_MAX_BYTES = Math.max(
  BUCKET_RULES.heroes.imageMaxBytes,
  BUCKET_RULES.heroes.videoMaxBytes,
);
export const HERO_ALLOWED_MIME: Record<string, "video" | "image"> = {
  "video/mp4": "video",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

/** Pages that render a HeroSwitcher / brand hero (content_heroes.page values). */
export const HERO_PAGES = [
  "/",
  "/terpkings",
  "/outfitters",
  "/higherself",
  "/savagesquadstrains",
  "/products",
  "/apparel",
  "/news",
  "/about",
  "/contact",
  "/rewards",
  "/store-locator",
] as const;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
