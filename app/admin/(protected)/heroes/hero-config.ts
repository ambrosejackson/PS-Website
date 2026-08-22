/** Shared constants for the hero-media pipeline (client + server). */

export const HERO_BUCKET = "hero-media";
export const HERO_MAX_BYTES = 50 * 1024 * 1024;
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
