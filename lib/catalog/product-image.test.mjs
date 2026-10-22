// Product image pipeline unit tests — run with `npm test` (Node's built-in runner).
// Exercises the pure step (processProductImage) with sharp-generated sources; no Storage.
import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  ProductImageError,
  assertProductImageInput,
  isStagingKey,
  processProductImage,
  productImageKeys,
  productImageSrcSet,
  sourceHash,
} from "./product-image.ts";

const PRODUCT_ID = "0f2d9c3e-4b1a-4c6d-9e8f-123456789abc";

async function jpeg(width, height) {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 60 } } })
    .jpeg({ quality: 90 })
    .toBuffer();
}

test("good JPEG → three WebP renditions with the catalog key pattern", async () => {
  const buffer = await jpeg(2400, 1800);
  const out = await processProductImage({ buffer, mime: "image/jpeg", productId: PRODUCT_ID });

  const hash = sourceHash(buffer);
  assert.match(hash, /^[0-9a-f]{8}$/);
  assert.equal(out.storagePath, `catalog/${PRODUCT_ID}/${hash}`);
  // Long edge capped at 1600, aspect kept.
  assert.equal(out.width, 1600);
  assert.equal(out.height, 1200);

  assert.equal(out.renditions.length, 3);
  assert.deepEqual(
    out.renditions.map((r) => r.key),
    [400, 800, 1600].map((w) => `catalog/${PRODUCT_ID}/${hash}/${w}.webp`),
  );
  assert.deepEqual(out.renditions.map((r) => r.actualWidth), [400, 800, 1600]);
  for (const r of out.renditions) {
    const meta = await sharp(r.buffer).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, r.actualWidth);
    assert.equal(meta.exif, undefined, "metadata stripped");
  }
  assert.deepEqual(productImageKeys(out.storagePath), {
    400: out.renditions[0].key,
    800: out.renditions[1].key,
    1600: out.renditions[2].key,
  });
});

test("a text file is rejected with a typed error", async () => {
  const buffer = Buffer.from("hello, not an image\n", "utf8");
  await assert.rejects(
    processProductImage({ buffer, mime: "text/plain", productId: PRODUCT_ID }),
    (e) => e instanceof ProductImageError && e.code === "unsupported_type",
  );
  // Text bytes mislabelled as JPEG are caught by the decoder.
  await assert.rejects(
    processProductImage({ buffer, mime: "image/jpeg", productId: PRODUCT_ID }),
    (e) => e instanceof ProductImageError && e.code === "undecodable",
  );
});

test("HEIC is rejected with the export-as-JPEG message", () => {
  assert.throws(
    () => assertProductImageInput("image/heic", 1000),
    (e) => e instanceof ProductImageError && e.code === "unsupported_type" && /JPEG/.test(e.message),
  );
});

test("a 20 MB buffer is rejected before decoding", async () => {
  const buffer = Buffer.alloc(20 * 1024 * 1024, 0);
  assert.ok(buffer.byteLength > PRODUCT_IMAGE_MAX_BYTES);
  await assert.rejects(
    processProductImage({ buffer, mime: "image/png", productId: PRODUCT_ID }),
    (e) => e instanceof ProductImageError && e.code === "too_large",
  );
});

test("a 300 px source is never upscaled but keeps the three filenames", async () => {
  const buffer = await jpeg(300, 300);
  const out = await processProductImage({ buffer, mime: "image/jpeg", productId: PRODUCT_ID });
  assert.equal(out.width, 300);
  assert.deepEqual(out.renditions.map((r) => r.actualWidth), [300, 300, 300]);
  assert.deepEqual(
    out.renditions.map((r) => r.key.split("/").pop()),
    ["400.webp", "800.webp", "1600.webp"],
  );
});

test("EXIF orientation is applied (portrait phone photo lands portrait)", async () => {
  // 800×400 landscape pixels tagged "rotate 90°" → should come out 400×800.
  const buffer = await sharp({ create: { width: 800, height: 400, channels: 3, background: "#222" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const out = await processProductImage({ buffer, mime: "image/jpeg", productId: PRODUCT_ID });
  assert.equal(out.width, 400);
  assert.equal(out.height, 800);
});

test("product id must be a UUID", async () => {
  const buffer = await jpeg(10, 10);
  await assert.rejects(
    processProductImage({ buffer, mime: "image/jpeg", productId: "../etc" }),
    (e) => e instanceof ProductImageError && e.code === "invalid_product_id",
  );
});

test("productImageSrcSet points src at 800 and lists all three widths", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  const path = `catalog/${PRODUCT_ID}/deadbeef`;
  const s = productImageSrcSet(path);
  assert.equal(s.src, `https://example.supabase.co/storage/v1/object/public/products/${path}/800.webp`);
  assert.equal(
    s.srcSet,
    [400, 800, 1600]
      .map((w) => `https://example.supabase.co/storage/v1/object/public/products/${path}/${w}.webp ${w}w`)
      .join(", "),
  );
  assert.ok(s.sizes.length > 0);
});

test("staging keys are constrained to the _staging folder", () => {
  assert.ok(isStagingKey("_staging/0f2d9c3e-4b1a-4c6d-9e8f-123456789abc.jpg"));
  assert.ok(isStagingKey("_staging/1729600000000-photo.png"));
  assert.ok(!isStagingKey("catalog/x/y/800.webp"));
  assert.ok(!isStagingKey("_staging/../catalog/a.jpg"));
  assert.ok(!isStagingKey("_staging/sub/a.jpg"));
  assert.ok(!isStagingKey("_staging/a.heic"));
});
