/**
 * Catalog product image helpers that are safe to import ANYWHERE — client
 * components, server components, route handlers. No sharp, no Storage client.
 * The sharp pipeline (lib/catalog/product-image.ts) re-exports these so the P1
 * API surface is unchanged.
 */

export const PRODUCT_IMAGE_BUCKET = "products";
export const PRODUCT_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const PRODUCT_IMAGE_WIDTHS = [400, 800, 1600] as const;
export const PRODUCT_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_EXTENSIONS: Record<(typeof PRODUCT_IMAGE_MIME)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** Targets per POST /api/admin/products/apply-image call; the admin batches above this. */
export const APPLY_IMAGE_MAX_TARGETS = 100;

export type ProductImageWidth = (typeof PRODUCT_IMAGE_WIDTHS)[number];
export type ProductImageMime = (typeof PRODUCT_IMAGE_MIME)[number];

export function isProductImageMime(mime: string): mime is ProductImageMime {
  return (PRODUCT_IMAGE_MIME as readonly string[]).includes(mime);
}

/** `catalog/{productId}/{hash}` — the value stored in catalog_products.image_storage_path. */
export function productImageStoragePath(productId: string, hash: string): string {
  return `catalog/${productId}/${hash}`;
}

/** Object key for one rendition inside the bucket. */
export function productImageKey(storagePath: string, width: ProductImageWidth): string {
  return `${storagePath}/${width}.webp`;
}

export function productImageKeys(storagePath: string): Record<ProductImageWidth, string> {
  return {
    400: productImageKey(storagePath, 400),
    800: productImageKey(storagePath, 800),
    1600: productImageKey(storagePath, 1600),
  };
}

/** Public URL of one object in the products bucket (same shape as Storage's getPublicUrl). */
export function productImagePublicUrl(key: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${key}`;
}

export function productImageUrls(storagePath: string): Record<ProductImageWidth, string> {
  const keys = productImageKeys(storagePath);
  return {
    400: productImagePublicUrl(keys[400]),
    800: productImagePublicUrl(keys[800]),
    1600: productImagePublicUrl(keys[1600]),
  };
}

/** Default `sizes` for a product image: full width on phones, half on tablets, a third on desktop. */
export const PRODUCT_IMAGE_SIZES_DEFAULT = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
/** Card tile in the 2 / 3 / 6-column product grids. */
export const PRODUCT_IMAGE_SIZES_CARD = "(min-width: 768px) 220px, 45vw";
/** Product detail hero image. */
export const PRODUCT_IMAGE_SIZES_DETAIL = "(min-width: 768px) 600px, 100vw";

/** `src` (800), `srcSet` for the three widths and a default `sizes` for an <img>. */
export function productImageSrcSet(storagePath: string): { src: string; srcSet: string; sizes: string } {
  const urls = productImageUrls(storagePath);
  return {
    src: urls[800],
    srcSet: PRODUCT_IMAGE_WIDTHS.map((w) => `${urls[w]} ${w}w`).join(", "),
    sizes: PRODUCT_IMAGE_SIZES_DEFAULT,
  };
}

/* ---------- staging (originals uploaded by the browser before processing) ---------- */

export const PRODUCT_IMAGE_STAGING_PREFIX = "_staging";
/** `_staging/{uuid}.{ext}` as specced; a timestamped name from createSignedUpload also passes. */
const STAGING_KEY_RE = /^_staging\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.(jpe?g|png|webp)$/i;

export function isStagingKey(key: string): boolean {
  return STAGING_KEY_RE.test(key);
}

/** Mime for a staging key from its extension (the browser named it from the file's type). */
export function stagingMime(key: string): ProductImageMime {
  const ext = key.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

/* ---------- PSM-hosted images (D-137) ---------- */

/**
 * Only public objects in PS Management's `product-images` bucket may be
 * hotlinked. The publish route nulls anything else; the website never holds a
 * PSM key — these are plain public URLs.
 */
export const PSM_IMAGE_URL_PREFIX =
  "https://skdhqrjxvhegbufykhyp.supabase.co/storage/v1/object/public/product-images/";
export const PSM_RENDITION_QUALITY = 75;

/** Storage image-transform base for a PSM object URL (`/object/public/` → `/render/image/public/`). */
export function psmRenderBase(psmImageUrl: string): string {
  return psmImageUrl.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
}

/**
 * One PSM rendition URL at the given width (quality 75).
 *
 * `resize=contain` is load-bearing (D-138): Storage's image transform defaults to
 * `resize=cover`, and with only `width` given it keeps the original height and crops
 * the width — a 3000×3000 source came back as a 400×3000 strip. `contain` scales
 * proportionally with no crop, so a square source returns width×width.
 */
export function psmRenditionUrl(psmImageUrl: string, width: ProductImageWidth): string {
  return `${psmRenderBase(psmImageUrl)}?width=${width}&quality=${PSM_RENDITION_QUALITY}&resize=contain`;
}

/** `src` (800) + `srcSet` over 400/800/1600 from Storage's image transforms. */
export function psmRenditionUrls(psmImageUrl: string): { src: string; srcSet: string } {
  return {
    src: psmRenditionUrl(psmImageUrl, 800),
    srcSet: PRODUCT_IMAGE_WIDTHS.map((w) => `${psmRenditionUrl(psmImageUrl, w)} ${w}w`).join(", "),
  };
}

/** The legacy placeholder the sheet era wrote into image_url for manual rows. */
export const LEGACY_PRODUCT_PLACEHOLDER = "/placeholders/product.png";

/** True when a product has nothing real to show (placeholder time). A PSM image counts as real. */
export function productImageIsMissing(p: {
  image_url: string | null;
  image_missing: boolean;
  image_storage_path?: string | null;
  psm_image_url?: string | null;
}): boolean {
  if (p.psm_image_url) return false;
  if (p.image_storage_path) return false;
  return p.image_missing || !p.image_url || p.image_url.trim() === "" || p.image_url === LEGACY_PRODUCT_PLACEHOLDER;
}
