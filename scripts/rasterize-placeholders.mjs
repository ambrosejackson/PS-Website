/**
 * Rasterizes every SVG in public/placeholders/ to PNG (same basename) at
 * generous dimensions, then deletes the SVG originals. Ambrose overwrites the
 * PNGs with real imagery later — filenames are the stable contract.
 *
 *   node scripts/rasterize-placeholders.mjs
 */
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = "public/placeholders";

function targetSize(name) {
  if (name.startsWith("hero-")) return { w: 2400, h: 1350 };
  if (name.startsWith("banner-")) return { w: 2000, h: 600 };
  if (name.startsWith("product") || name.startsWith("merch-"))
    return { w: 1200, h: 1200 };
  if (name.startsWith("follow-")) return { w: 800, h: 800 };
  if (name.startsWith("blog-")) return { w: 1600, h: 1000 };
  if (name.startsWith("intro-media")) return { w: 1800, h: 1200 };
  if (name.startsWith("newsletter-photo")) return { w: 1200, h: 1375 };
  return { w: 1600, h: 1600 };
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".svg"));
for (const f of files) {
  const base = f.replace(/\.svg$/, "");
  const { w, h } = targetSize(base);
  const src = path.join(DIR, f);
  const out = path.join(DIR, `${base}.png`);
  await sharp(src, { density: 300 })
    .resize(w, h, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  await unlink(src);
  console.log(`${f} -> ${base}.png (${w}x${h})`);
}
console.log(`done: ${files.length} converted`);
