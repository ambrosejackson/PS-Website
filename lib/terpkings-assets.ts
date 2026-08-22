import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Build-time check for optional brand renders under /public. Missing files get
 * a brand-palette placeholder (TKPlaceholder) instead of a broken <img>. When
 * /public isn't readable (ISR revalidation inside a serverless function), we
 * trust the manifest so a revalidate never swaps real images for placeholders.
 */
const PUBLIC_DIR = path.join(process.cwd(), "public");

export function publicAssetExists(url: string): boolean {
  if (!url.startsWith("/")) return true;
  let publicReadable = false;
  try {
    publicReadable = fs.statSync(PUBLIC_DIR).isDirectory();
  } catch {
    publicReadable = false;
  }
  if (!publicReadable) return true;
  try {
    return fs.statSync(path.join(PUBLIC_DIR, url)).isFile();
  } catch {
    return false;
  }
}

/** url → exists, for a list of public asset URLs. */
export function assetAvailability(urls: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const u of urls) out[u] = publicAssetExists(u);
  return out;
}
