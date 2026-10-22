import sharp, { type Metadata } from "sharp";
import { PRODUCT_IMAGE_MAX_BYTES, type ProductImageMime } from "./product-image-urls.ts";

/**
 * Pure helpers for the ONE-TIME legacy image import (P3 of the sheet-sync
 * retirement). No Supabase, no Next imports, so Node's test runner can load
 * this file directly (lib/catalog/legacy-drive.test.mjs). The batch runner
 * that uses them lives in import-legacy-images.ts.
 *
 * The sheet era wrote Google Drive images into catalog_products.image_url in
 * two shapes — `https://lh3.googleusercontent.com/d/{id}=w1200` (D-063) and
 * raw `drive.google.com` share links — and image_source_url preserves that
 * original for every row.
 */

/** Drive file IDs are URL-safe base64-ish, 10+ chars (real ones are 28–44). */
const DRIVE_ID_RES = [
  /lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,})/,
  /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/,
  /drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/,
  /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/,
  /docs\.google\.com\/uc\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/,
];

/** True when the URL is hosted on one of the legacy Drive hosts (whatever its shape). */
export function isLegacyDriveUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /(lh3\.googleusercontent\.com|drive\.google\.com)\//i.test(url);
}

/**
 * Extract the Drive file ID from either legacy form, with or without the
 * `=w1200` / `=s0` size suffix. Returns null for anything that is not a Drive
 * image URL (local placeholders, Storage URLs, blanks).
 */
export function extractDriveId(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url.trim();
  for (const re of DRIVE_ID_RES) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

/**
 * The URL the import downloads: the lh3 CDN form resized to a 1600 px long
 * edge. The pipeline caps the long edge at 1600 anyway, so asking Google for
 * that size yields the same renditions from a ~3.5 MB download (PNG stays PNG)
 * instead of the ~12 MB 3000×3000 originals, and keeps every file under 15 MB.
 */
export const DRIVE_DOWNLOAD_SIZE = "s1600";
export function driveDownloadUrl(id: string): string {
  return `https://lh3.googleusercontent.com/d/${id}=${DRIVE_DOWNLOAD_SIZE}`;
}

/**
 * Google answers a request for a file the caller can't see with HTTP 200 and
 * its "You need access" / sign-in HTML page. Sniff the first bytes so that
 * page is treated as a 403, not as an image.
 */
export function looksLikeHtml(bytes: Uint8Array | Buffer): boolean {
  if (!bytes || bytes.byteLength === 0) return false;
  const head = Buffer.from(bytes.buffer, bytes.byteOffset, Math.min(bytes.byteLength, 1024))
    .toString("utf8")
    .replace(/^﻿/, "")
    .trimStart()
    .toLowerCase();
  return /^<!doctype\s+html|^<html|^<head|^<body|^<meta|^<title|^<script|^<\?xml[^>]*>\s*<(!doctype\s+html|html)/.test(head);
}

export type DriveDownloadVerdict =
  | { ok: true; mime: ProductImageMime; format: string; width: number; height: number; bytes: number }
  | { ok: false; reason: string; accessDenied?: boolean };

const ACCESS_DENIED_REASON = "access denied (Google returned its sign-in page instead of the file — treated as 403)";

/**
 * Status + content-type + first bytes → quick verdict WITHOUT decoding the
 * image. `classifyDriveResponse` is synchronous and sharp-free so it can be
 * unit-tested with fabricated responses; `inspectDriveImage` adds the sharp
 * metadata check.
 */
export function classifyDriveResponse(input: {
  status: number;
  contentType: string | null | undefined;
  body: Uint8Array | Buffer;
}): { ok: true } | { ok: false; reason: string; accessDenied?: boolean } {
  const { status, body } = input;
  const ct = (input.contentType ?? "").toLowerCase().split(";")[0].trim();
  if (status === 403 || status === 401) return { ok: false, reason: `HTTP ${status}`, accessDenied: true };
  if (status === 404) return { ok: false, reason: "HTTP 404 (file not found or deleted)" };
  if (status < 200 || status >= 300) return { ok: false, reason: `HTTP ${status}` };
  if (ct === "text/html" || ct === "application/xhtml+xml" || looksLikeHtml(body)) {
    return { ok: false, reason: ACCESS_DENIED_REASON, accessDenied: true };
  }
  if (ct && !ct.startsWith("image/") && ct !== "application/octet-stream") {
    return { ok: false, reason: `not an image (content-type ${ct})` };
  }
  if (body.byteLength === 0) return { ok: false, reason: "empty response" };
  if (body.byteLength > PRODUCT_IMAGE_MAX_BYTES) {
    return { ok: false, reason: `file is ${(body.byteLength / 1048576).toFixed(1)} MB (limit 15 MB)` };
  }
  return { ok: true };
}

const FORMAT_MIME: Record<string, ProductImageMime> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Full validation: headers/body sniff, then sharp must decode it as jpeg/png/webp. */
export async function inspectDriveImage(input: {
  status: number;
  contentType: string | null | undefined;
  body: Buffer;
}): Promise<DriveDownloadVerdict> {
  const quick = classifyDriveResponse(input);
  if (!quick.ok) return quick;
  let meta: Metadata;
  try {
    meta = await sharp(input.body, { failOn: "error" }).metadata();
  } catch (e) {
    return { ok: false, reason: `not a readable image: ${e instanceof Error ? e.message : String(e)}` };
  }
  const format = meta.format ?? "unknown";
  const mime = FORMAT_MIME[format];
  if (!mime) return { ok: false, reason: `unsupported image format ${format} (jpeg/png/webp only)` };
  if (!meta.width || !meta.height) return { ok: false, reason: "image has no dimensions" };
  return { ok: true, mime, format, width: meta.width, height: meta.height, bytes: input.body.byteLength };
}
