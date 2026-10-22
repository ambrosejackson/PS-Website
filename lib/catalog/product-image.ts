import { createHash } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Catalog product image pipeline (2026-10, replaces sheet-fed image URLs).
 *
 * Source bytes (jpeg/png/webp, ≤ 15 MB) → auto-orient → strip metadata → cap
 * the long edge at 1600 px → WebP q82 at widths 400 / 800 / 1600. Keys in the
 * public `products` bucket:
 *
 *   catalog/{productId}/{sha1(source).slice(0,8)}/{400|800|1600}.webp
 *
 * The hash folder makes every upload a new immutable path, so the renditions
 * are served with a one-year cache and a re-upload never fights a stale CDN
 * copy. `processProductImage` is pure (no I/O) so it can be unit-tested;
 * `storeProductImage` adds the Storage upload.
 *
 * HEIC/HEIF is NOT accepted: the prebuilt sharp binaries used here and on
 * Vercel ship without an HEIC decoder (libheif is patent-encumbered). Phones
 * must export the photo as JPEG first — the error message says so.
 */

export const PRODUCT_IMAGE_BUCKET = "products";
export const PRODUCT_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_EDGE = 1600;
export const PRODUCT_IMAGE_WIDTHS = [400, 800, 1600] as const;
export const PRODUCT_IMAGE_WEBP_QUALITY = 82;
export const PRODUCT_IMAGE_CACHE_CONTROL = "31536000";
export const PRODUCT_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_EXTENSIONS: Record<(typeof PRODUCT_IMAGE_MIME)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ProductImageWidth = (typeof PRODUCT_IMAGE_WIDTHS)[number];
export type ProductImageMime = (typeof PRODUCT_IMAGE_MIME)[number];

export type ProductImageErrorCode =
  | "unsupported_type" // not jpeg/png/webp (incl. HEIC/HEIF)
  | "too_large" // > 15 MB
  | "empty" // zero bytes
  | "undecodable" // sharp could not read the bytes as an image
  | "invalid_product_id"
  | "storage"; // Supabase Storage returned an error

export class ProductImageError extends Error {
  readonly code: ProductImageErrorCode;
  constructor(code: ProductImageErrorCode, message: string) {
    super(message);
    this.name = "ProductImageError";
    this.code = code;
  }
}

export function isProductImageMime(mime: string): mime is ProductImageMime {
  return (PRODUCT_IMAGE_MIME as readonly string[]).includes(mime);
}

/** Validate (mime, size) before touching the bytes. Throws ProductImageError. */
export function assertProductImageInput(mime: string, bytes: number): asserts mime is ProductImageMime {
  const m = (mime ?? "").toLowerCase().split(";")[0].trim();
  if (m === "image/heic" || m === "image/heif" || m === "image/heic-sequence" || m === "image/heif-sequence") {
    throw new ProductImageError(
      "unsupported_type",
      "HEIC photos can't be processed here. On your phone, export or share the photo as JPEG, then upload that file.",
    );
  }
  if (!isProductImageMime(m)) {
    throw new ProductImageError(
      "unsupported_type",
      `Unsupported file type ${mime || "(unknown)"}. Upload a JPEG, PNG or WebP image.`,
    );
  }
  if (!Number.isFinite(bytes) || bytes <= 0) throw new ProductImageError("empty", "The file is empty.");
  if (bytes > PRODUCT_IMAGE_MAX_BYTES) {
    throw new ProductImageError(
      "too_large",
      `Images must be 15 MB or smaller (this file is ${(bytes / 1048576).toFixed(1)} MB).`,
    );
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sourceHash(buffer: Buffer): string {
  return createHash("sha1").update(buffer).digest("hex").slice(0, 8);
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

export interface ProductImageRendition {
  width: ProductImageWidth;
  key: string;
  buffer: Buffer;
  /** Actual pixel width (≤ `width` — never upscaled). */
  actualWidth: number;
  actualHeight: number;
}

export interface ProcessedProductImage {
  storagePath: string;
  hash: string;
  renditions: ProductImageRendition[];
  /** Dimensions of the oriented source after the 1600 px cap. */
  width: number;
  height: number;
}

/**
 * Pure step: validate + decode + emit the three WebP renditions. No I/O.
 * A source narrower than a target width is emitted at its own width under
 * the same filename (no upscale).
 */
export async function processProductImage(input: {
  buffer: Buffer;
  mime: string;
  productId: string;
}): Promise<ProcessedProductImage> {
  const { buffer, mime, productId } = input;
  if (!UUID_RE.test(productId)) throw new ProductImageError("invalid_product_id", "Product id must be a UUID.");
  assertProductImageInput(mime, buffer.byteLength);

  // Oriented, metadata-stripped master capped at 1600 on the long edge.
  let master: Buffer;
  let width: number;
  let height: number;
  try {
    const out = await sharp(buffer, { failOn: "error" })
      .rotate() // auto-orient from EXIF; EXIF itself is dropped (no withMetadata)
      .resize({ width: PRODUCT_IMAGE_MAX_EDGE, height: PRODUCT_IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 0 }) // lossless intermediate; renditions re-encode once
      .toBuffer({ resolveWithObject: true });
    master = out.data;
    width = out.info.width;
    height = out.info.height;
  } catch (e) {
    const kind = mime.split("/")[1]?.toUpperCase() ?? "image";
    throw new ProductImageError(
      "undecodable",
      `The file could not be read as a ${kind}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const hash = sourceHash(buffer);
  const storagePath = productImageStoragePath(productId, hash);
  const renditions: ProductImageRendition[] = [];
  for (const w of PRODUCT_IMAGE_WIDTHS) {
    const out = await sharp(master)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: PRODUCT_IMAGE_WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    renditions.push({
      width: w,
      key: productImageKey(storagePath, w),
      buffer: out.data,
      actualWidth: out.info.width,
      actualHeight: out.info.height,
    });
  }
  return { storagePath, hash, renditions, width, height };
}

export interface StoredProductImage {
  storagePath: string;
  urls: Record<ProductImageWidth, string>;
  width: number;
  height: number;
}

type Admin = SupabaseClient<Database>;

/**
 * Process + upload all three renditions (upsert, one-year cache). Server-only:
 * `admin` must be the service-role client from lib/supabase/admin.ts.
 */
export async function storeProductImage(
  admin: Admin,
  input: { buffer: Buffer; mime: string; productId: string },
): Promise<StoredProductImage> {
  const processed = await processProductImage(input);
  const bucket = admin.storage.from(PRODUCT_IMAGE_BUCKET);
  for (const r of processed.renditions) {
    const { error } = await bucket.upload(r.key, r.buffer, {
      contentType: "image/webp",
      cacheControl: PRODUCT_IMAGE_CACHE_CONTROL,
      upsert: true,
    });
    if (error) throw new ProductImageError("storage", `Upload of ${r.key} failed: ${error.message}`);
  }
  return {
    storagePath: processed.storagePath,
    urls: productImageUrls(processed.storagePath),
    width: processed.width,
    height: processed.height,
  };
}

/** Remove the three rendition objects for a storage path (no-op for empty input). */
export async function deleteProductImage(admin: Admin, storagePath: string | null | undefined): Promise<void> {
  if (!storagePath) return;
  const keys = Object.values(productImageKeys(storagePath));
  const { error } = await admin.storage.from(PRODUCT_IMAGE_BUCKET).remove(keys);
  if (error) throw new ProductImageError("storage", `Could not delete ${storagePath}: ${error.message}`);
}

/**
 * Server-side copy of one product's renditions to another product's own path
 * (same hash segment, different productId). No download, no re-encode.
 */
export async function copyProductImage(
  admin: Admin,
  sourceStoragePath: string,
  targetProductId: string,
): Promise<Pick<StoredProductImage, "storagePath" | "urls">> {
  if (!UUID_RE.test(targetProductId)) throw new ProductImageError("invalid_product_id", "Product id must be a UUID.");
  const hash = sourceStoragePath.split("/").pop() ?? "";
  if (!/^[0-9a-f]{8}$/.test(hash)) {
    throw new ProductImageError("storage", `"${sourceStoragePath}" is not a catalog image path.`);
  }
  const targetPath = productImageStoragePath(targetProductId, hash);
  const bucket = admin.storage.from(PRODUCT_IMAGE_BUCKET);
  const from = productImageKeys(sourceStoragePath);
  const to = productImageKeys(targetPath);
  for (const w of PRODUCT_IMAGE_WIDTHS) {
    // copy() refuses to overwrite; a re-copy to the same target is already in place.
    const { error } = await bucket.copy(from[w], to[w]);
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw new ProductImageError("storage", `Copy of ${from[w]} failed: ${error.message}`);
    }
  }
  return { storagePath: targetPath, urls: productImageUrls(targetPath) };
}

export async function downloadObject(admin: Admin, key: string): Promise<Buffer> {
  const { data, error } = await admin.storage.from(PRODUCT_IMAGE_BUCKET).download(key);
  if (error || !data) throw new ProductImageError("storage", `Could not read ${key}: ${error?.message ?? "no data"}`);
  return Buffer.from(await data.arrayBuffer());
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

/**
 * Delete `_staging/*` objects older than `maxAgeMs` (default 1 h) so abandoned
 * browser uploads don't accumulate. Called at the start of each image route;
 * failures are swallowed — housekeeping must never block an upload.
 */
export async function cleanupStagingObjects(admin: Admin, maxAgeMs = 60 * 60 * 1000): Promise<number> {
  try {
    const bucket = admin.storage.from(PRODUCT_IMAGE_BUCKET);
    const { data, error } = await bucket.list(PRODUCT_IMAGE_STAGING_PREFIX, { limit: 1000 });
    if (error || !data) return 0;
    const cutoff = Date.now() - maxAgeMs;
    const stale = data
      .filter((o) => o.id && o.created_at && new Date(o.created_at).getTime() < cutoff)
      .map((o) => `${PRODUCT_IMAGE_STAGING_PREFIX}/${o.name}`);
    if (!stale.length) return 0;
    const { error: rmErr } = await bucket.remove(stale);
    return rmErr ? 0 : stale.length;
  } catch {
    return 0;
  }
}

/* ---------- rendering helpers (public components, later prompts) ---------- */

/** Default `sizes` for a product image: full width on phones, half on tablets, a third on desktop. */
export const PRODUCT_IMAGE_SIZES_DEFAULT = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

/** `src` (800), `srcSet` for the three widths and a default `sizes` for an <img>. */
export function productImageSrcSet(storagePath: string): { src: string; srcSet: string; sizes: string } {
  const urls = productImageUrls(storagePath);
  return {
    src: urls[800],
    srcSet: PRODUCT_IMAGE_WIDTHS.map((w) => `${urls[w]} ${w}w`).join(", "),
    sizes: PRODUCT_IMAGE_SIZES_DEFAULT,
  };
}
