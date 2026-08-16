import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Brand Book (the "Catalog") page manifest, written by
 * scripts/render-brand-book.mjs alongside the rendered page JPEGs.
 * Read once in the public layout so ANY trigger on the page — the header
 * CATALOG button, the intro-section link — can open the same modal flip-book.
 */
export interface BrandBookManifest {
  pageCount: number;
  aspectRatio: number;
}

export async function getBrandBookManifest(): Promise<BrandBookManifest | null> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "public/brand-book/manifest.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as Partial<BrandBookManifest>;
    if (!parsed.pageCount || !parsed.aspectRatio) return null;
    return { pageCount: parsed.pageCount, aspectRatio: parsed.aspectRatio };
  } catch {
    return null;
  }
}
