// Legacy Drive import helpers — run with `npm test` (Node's built-in runner).
// Covers Drive file-ID extraction for both legacy URL forms and the
// "Google answered 200 + HTML" → access-denied detection. No network, no Storage.
import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import {
  classifyDriveResponse,
  driveDownloadUrl,
  extractDriveId,
  inspectDriveImage,
  isLegacyDriveUrl,
  looksLikeHtml,
} from "./legacy-drive.ts";

const ID = "18ER2rH0wJXyBwlrkL6zyQF0z3dIEbxQT";

test("extractDriveId: lh3 form with and without the =w1200 suffix", () => {
  assert.equal(extractDriveId(`https://lh3.googleusercontent.com/d/${ID}=w1200`), ID);
  assert.equal(extractDriveId(`https://lh3.googleusercontent.com/d/${ID}`), ID);
  assert.equal(extractDriveId(`https://lh3.googleusercontent.com/d/${ID}=s0`), ID);
  assert.equal(extractDriveId(`  https://lh3.googleusercontent.com/d/${ID}=w1200  `), ID);
});

test("extractDriveId: drive.google.com share / open / uc / thumbnail forms", () => {
  assert.equal(extractDriveId(`https://drive.google.com/file/d/${ID}/view?usp=sharing`), ID);
  assert.equal(extractDriveId(`https://drive.google.com/file/d/${ID}/view?usp=drive_link`), ID);
  assert.equal(extractDriveId(`https://drive.google.com/open?id=${ID}`), ID);
  assert.equal(extractDriveId(`https://drive.google.com/uc?export=view&id=${ID}`), ID);
  assert.equal(extractDriveId(`https://drive.google.com/uc?id=${ID}&export=download`), ID);
  assert.equal(extractDriveId(`https://drive.google.com/thumbnail?id=${ID}&sz=w1000`), ID);
});

test("extractDriveId: non-Drive URLs and blanks yield null", () => {
  assert.equal(extractDriveId("/placeholders/product.png"), null);
  assert.equal(extractDriveId(""), null);
  assert.equal(extractDriveId(null), null);
  assert.equal(extractDriveId(undefined), null);
  assert.equal(
    extractDriveId("https://example.supabase.co/storage/v1/object/public/products/catalog/x/deadbeef/800.webp"),
    null,
  );
  assert.equal(extractDriveId("https://drive.google.com/drive/folders/abc"), null);
  // Too short to be a file id.
  assert.equal(extractDriveId("https://lh3.googleusercontent.com/d/short"), null);
});

test("isLegacyDriveUrl matches both hosts only", () => {
  assert.ok(isLegacyDriveUrl(`https://lh3.googleusercontent.com/d/${ID}=w1200`));
  assert.ok(isLegacyDriveUrl(`https://drive.google.com/file/d/${ID}/view`));
  assert.ok(!isLegacyDriveUrl("/placeholders/product.png"));
  assert.ok(!isLegacyDriveUrl("https://example.supabase.co/storage/v1/object/public/products/a/800.webp"));
  assert.ok(!isLegacyDriveUrl(null));
});

test("driveDownloadUrl asks lh3 for the 1600 px copy (the pipeline's own cap)", () => {
  assert.equal(driveDownloadUrl(ID), `https://lh3.googleusercontent.com/d/${ID}=s1600`);
});

const NEED_ACCESS_PAGE = Buffer.from(
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Google Drive - You need access</title></head><body>Request access</body></html>',
  "utf8",
);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

test("looksLikeHtml sniffs Google's access page, not image bytes", () => {
  assert.ok(looksLikeHtml(NEED_ACCESS_PAGE));
  assert.ok(looksLikeHtml(Buffer.from("\n\n  <html><body>x</body></html>")));
  assert.ok(looksLikeHtml(Buffer.from("﻿<!doctype HTML>", "utf8")));
  assert.ok(!looksLikeHtml(JPEG_MAGIC));
  assert.ok(!looksLikeHtml(Buffer.alloc(0)));
  assert.ok(!looksLikeHtml(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")));
});

test("classifyDriveResponse: 200 + text/html is an access-denied failure (403)", () => {
  const v = classifyDriveResponse({ status: 200, contentType: "text/html; charset=utf-8", body: NEED_ACCESS_PAGE });
  assert.equal(v.ok, false);
  assert.ok(!v.ok && v.accessDenied);
  assert.match(!v.ok ? v.reason : "", /403/);
});

test("classifyDriveResponse: an HTML body mislabelled as image/jpeg is still a 403", () => {
  const v = classifyDriveResponse({ status: 200, contentType: "image/jpeg", body: NEED_ACCESS_PAGE });
  assert.equal(v.ok, false);
  assert.ok(!v.ok && v.accessDenied);
});

test("classifyDriveResponse: real 403 / 404 / 500 statuses", () => {
  const forbidden = classifyDriveResponse({ status: 403, contentType: "text/html", body: NEED_ACCESS_PAGE });
  assert.ok(!forbidden.ok && forbidden.accessDenied && /403/.test(forbidden.reason));
  const missing = classifyDriveResponse({ status: 404, contentType: "text/html", body: Buffer.alloc(0) });
  assert.ok(!missing.ok && /404/.test(missing.reason));
  const err = classifyDriveResponse({ status: 500, contentType: null, body: Buffer.alloc(0) });
  assert.ok(!err.ok && /500/.test(err.reason));
});

test("classifyDriveResponse: image content-type + image bytes passes; PDFs and blanks do not", () => {
  assert.deepEqual(classifyDriveResponse({ status: 200, contentType: "image/jpeg", body: JPEG_MAGIC }), { ok: true });
  assert.deepEqual(classifyDriveResponse({ status: 200, contentType: null, body: JPEG_MAGIC }), { ok: true });
  const pdf = classifyDriveResponse({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4") });
  assert.ok(!pdf.ok && /content-type application\/pdf/.test(pdf.reason));
  const empty = classifyDriveResponse({ status: 200, contentType: "image/png", body: Buffer.alloc(0) });
  assert.ok(!empty.ok && /empty/.test(empty.reason));
});

test("inspectDriveImage: a real JPEG decodes to jpeg with its dimensions", async () => {
  const body = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#123456" } }).jpeg().toBuffer();
  const v = await inspectDriveImage({ status: 200, contentType: "image/jpeg", body });
  assert.ok(v.ok);
  if (v.ok) {
    assert.equal(v.mime, "image/jpeg");
    assert.equal(v.width, 64);
    assert.equal(v.height, 48);
    assert.equal(v.bytes, body.byteLength);
  }
});

test("inspectDriveImage: HTML never reaches sharp; junk bytes labelled image fail as unreadable", async () => {
  const html = await inspectDriveImage({ status: 200, contentType: "text/html", body: NEED_ACCESS_PAGE });
  assert.ok(!html.ok && html.accessDenied);
  const junk = await inspectDriveImage({ status: 200, contentType: "image/jpeg", body: Buffer.from("not really a jpeg") });
  assert.ok(!junk.ok && /not a readable image/.test(junk.reason));
});

test("inspectDriveImage: a GIF is rejected as unsupported (pipeline takes jpeg/png/webp only)", async () => {
  const gif = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).gif().toBuffer();
  const v = await inspectDriveImage({ status: 200, contentType: "image/gif", body: gif });
  assert.ok(!v.ok && /unsupported image format gif/.test(v.reason));
});
