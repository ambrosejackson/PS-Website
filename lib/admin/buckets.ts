/**
 * Admin media buckets (migrations 0006, 0011) — ONE source of truth for the per-bucket
 * rules, shared by the client uploader (lib/admin/upload.tsx) and the server
 * signing action (lib/admin/upload-actions.ts). Buckets are public-read; writes
 * happen only through service-role signed upload URLs minted after the staff
 * allowlist check (D-038..D-044 session).
 *
 * `storage.buckets.file_size_limit` is the hard cap per bucket; the per-kind
 * caps below (images 10 MB everywhere, heroes mp4 60 MB, banners mp4 30 MB, social mp4 20 MB) are
 * enforced here on both sides.
 */

export const ADMIN_BUCKETS = ["heroes", "banners", "blog", "products", "apparel", "social"] as const;
export type AdminBucket = (typeof ADMIN_BUCKETS)[number];

export type MediaKind = "image" | "video";

export interface BucketRules {
  /** Allowed image MIME types (PNG/JPG are converted to webp client-side when > 300 KB). */
  imageMime: readonly string[];
  imageMaxBytes: number;
  /** Allowed video MIME types; empty = bucket is image-only. */
  videoMime: readonly string[];
  videoMaxBytes: number;
}

const MB = 1024 * 1024;
const IMAGES = ["image/jpeg", "image/png", "image/webp"] as const;

export const BUCKET_RULES: Record<AdminBucket, BucketRules> = {
  heroes: { imageMime: IMAGES, imageMaxBytes: 10 * MB, videoMime: ["video/mp4"], videoMaxBytes: 60 * MB },
  banners: { imageMime: IMAGES, imageMaxBytes: 10 * MB, videoMime: ["video/mp4"], videoMaxBytes: 30 * MB },
  blog: { imageMime: IMAGES, imageMaxBytes: 10 * MB, videoMime: [], videoMaxBytes: 0 },
  products: { imageMime: IMAGES, imageMaxBytes: 10 * MB, videoMime: [], videoMaxBytes: 0 },
  apparel: { imageMime: IMAGES, imageMaxBytes: 10 * MB, videoMime: [], videoMaxBytes: 0 },
  social: { imageMime: IMAGES, imageMaxBytes: 10 * MB, videoMime: ["video/mp4"], videoMaxBytes: 20 * MB }, // D-068: ≤ 15 s clips
};

/** PNG/JPG above this size are re-encoded to webp (q80) before upload. */
export const WEBP_CONVERT_THRESHOLD_BYTES = 300 * 1024;
export const WEBP_QUALITY = 0.8;

export function isAdminBucket(name: string): name is AdminBucket {
  return (ADMIN_BUCKETS as readonly string[]).includes(name);
}

export function mediaKindFor(bucket: AdminBucket, mime: string): MediaKind | null {
  const r = BUCKET_RULES[bucket];
  if (r.imageMime.includes(mime)) return "image";
  if (r.videoMime.includes(mime)) return "video";
  return null;
}

/** Validate a (mime, size) pair against a bucket. Returns an error string or null. */
export function validateForBucket(
  bucket: AdminBucket,
  mime: string,
  size: number,
): string | null {
  const r = BUCKET_RULES[bucket];
  const kind = mediaKindFor(bucket, mime);
  if (!kind) {
    const allowed = [...r.imageMime, ...r.videoMime]
      .map((m) => m.split("/")[1].toUpperCase())
      .join(", ");
    return `Unsupported type ${mime || "(unknown)"} for "${bucket}". Allowed: ${allowed}.`;
  }
  const cap = kind === "image" ? r.imageMaxBytes : r.videoMaxBytes;
  if (!Number.isFinite(size) || size <= 0) return "Empty file.";
  if (size > cap) {
    return `${kind === "image" ? "Images" : "Videos"} in "${bucket}" must be ≤ ${Math.round(cap / MB)} MB (this file is ${(size / MB).toFixed(1)} MB).`;
  }
  return null;
}

/** Accept attribute for <input type=file> per bucket. */
export function acceptFor(bucket: AdminBucket): string {
  const r = BUCKET_RULES[bucket];
  return [...r.imageMime, ...r.videoMime].join(",");
}
