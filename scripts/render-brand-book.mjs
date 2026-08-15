/**
 * Pre-renders the Brand Book PDF to page images for the flip-book catalog.
 * Output is committed so Vercel builds stay fast. Re-run after the admin
 * uploads a replacement PDF:
 *
 *   node scripts/render-brand-book.mjs [path-to-pdf]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const PDF_PATH =
  process.argv[2] ?? "docs/July-13-Brand-Book-Private-Stock.pdf";
const OUT_DIR = "public/brand-book";
const TARGET_WIDTH = 1100;
const JPEG_QUALITY = 78;

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

const data = new Uint8Array(await readFile(PDF_PATH));
const doc = await getDocument({
  data,
  CanvasFactory: NodeCanvasFactory,
  disableFontFace: false,
  useSystemFonts: true,
}).promise;

await mkdir(OUT_DIR, { recursive: true });
const factory = new NodeCanvasFactory();
let aspect = null;

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const base = page.getViewport({ scale: 1 });
  const scale = TARGET_WIDTH / base.width;
  const viewport = page.getViewport({ scale });
  const { canvas, context } = factory.create(
    Math.round(viewport.width),
    Math.round(viewport.height),
  );
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  const file = path.join(OUT_DIR, `page-${String(i).padStart(2, "0")}.jpg`);
  await writeFile(file, canvas.toBuffer("image/jpeg", JPEG_QUALITY));
  aspect ??= base.width / base.height;
  console.log(`rendered ${file} (${canvas.width}x${canvas.height})`);
}

await writeFile(
  path.join(OUT_DIR, "manifest.json"),
  JSON.stringify(
    {
      pageCount: doc.numPages,
      aspectRatio: Number(aspect.toFixed(4)),
      source: path.basename(PDF_PATH),
      renderedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(`done: ${doc.numPages} pages`);
