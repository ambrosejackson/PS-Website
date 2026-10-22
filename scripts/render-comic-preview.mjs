/**
 * Pre-renders the FREE PREVIEW pages of the Lumen War Saga Part 1 PDF
 * (pages 10–17 of the 60-page book, D-124) for the TerpKings flip-book.
 * Only these pages are ever rendered; the PDF itself stays out of the repo.
 * Output is committed so Vercel builds stay fast.
 *
 * Uses poppler's `pdftoppm` (not pdf.js like the Brand Book script): the
 * book's Bangers caption font renders as boxes under pdf.js in Node.
 * Windows: `winget install oschwartz10612.Poppler` (or scoop install poppler),
 * then:   node scripts/render-comic-preview.mjs path/to/lumen-war-saga-part-1.pdf
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const PDF_PATH = process.argv[2];
if (!PDF_PATH) {
  console.error("usage: node scripts/render-comic-preview.mjs <pdf>");
  process.exit(1);
}
const OUT_DIR = "public/terpkings/comic-preview";
const FIRST_PAGE = 10;
const LAST_PAGE = 17;
const TARGET_WIDTH = 1100;
const JPEG_QUALITY = 82;

await mkdir(OUT_DIR, { recursive: true });

// Page size in points → scale so the output is TARGET_WIDTH px wide.
const info = execFileSync("pdfinfo", ["-f", String(FIRST_PAGE), "-l", String(FIRST_PAGE), PDF_PATH], { encoding: "utf8" });
const size = /Page\s+\d+\s+size:\s+([\d.]+) x ([\d.]+)/.exec(info) ?? /Page size:\s+([\d.]+) x ([\d.]+)/.exec(info);
const pages = /Pages:\s+(\d+)/.exec(info);
if (!size || !pages) throw new Error("pdfinfo did not report page size/count");
const [wPt, hPt] = [Number(size[1]), Number(size[2])];
const dpi = Math.round((TARGET_WIDTH / wPt) * 72);

execFileSync("pdftoppm", [
  "-f", String(FIRST_PAGE), "-l", String(LAST_PAGE),
  "-r", String(dpi),
  "-jpeg", "-jpegopt", `quality=${JPEG_QUALITY}`,
  PDF_PATH, path.join(OUT_DIR, "tmp"),
], { stdio: "inherit" });

// pdftoppm names files tmp-10.jpg … tmp-17.jpg; renumber to page-01 … page-08.
let n = 0;
for (const f of (await readdir(OUT_DIR)).filter((f) => f.startsWith("tmp-")).sort()) {
  const src = Number(/tmp-0*(\d+)\.jpg/.exec(f)[1]);
  const dest = `page-${String(src - FIRST_PAGE + 1).padStart(2, "0")}.jpg`;
  await rename(path.join(OUT_DIR, f), path.join(OUT_DIR, dest));
  console.log(`rendered ${dest} (from PDF page ${src})`);
  n++;
}

await writeFile(
  path.join(OUT_DIR, "manifest.json"),
  JSON.stringify(
    {
      pageCount: n,
      sourcePages: [FIRST_PAGE, LAST_PAGE],
      bookPages: Number(pages[1]),
      aspectRatio: Number((wPt / hPt).toFixed(4)),
      source: path.basename(PDF_PATH),
      renderedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
console.log(`done: ${n} pages (${FIRST_PAGE}–${LAST_PAGE} of ${pages[1]}) at ${dpi} dpi`);
