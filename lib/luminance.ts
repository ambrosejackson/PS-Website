/**
 * Hero theme detection (build plan §1 decision 9).
 * The flag describes the ASSET: a hero whose top band (the region the header
 * overlays) is bright is a "light" asset → header renders dark text; a dark
 * asset → white text. Computed at upload time, stored on content_heroes.theme,
 * overridable in /admin.
 */

/** Fraction of image height the header overlays — the band we sample. */
export const TOP_BAND_FRACTION = 0.22;

/** Threshold on 0–255 relative luminance above which an asset counts as "light". */
export const LIGHT_THRESHOLD = 140;

export type HeroTheme = "light" | "dark";

/** Rec. 709 relative luminance of one sRGB pixel (0–255 channels). */
export function pixelLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Average luminance of the top band of RGBA pixel data (e.g. canvas ImageData.data).
 * `width`/`height` describe the full image; only rows within TOP_BAND_FRACTION are read.
 */
export function topBandLuminance(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  bandFraction: number = TOP_BAND_FRACTION,
): number {
  const bandRows = Math.max(1, Math.floor(height * bandFraction));
  let sum = 0;
  let count = 0;
  for (let y = 0; y < bandRows; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = rgba[i + 3] / 255;
      // Composite transparent pixels over white (page background).
      const r = rgba[i] * alpha + 255 * (1 - alpha);
      const g = rgba[i + 1] * alpha + 255 * (1 - alpha);
      const b = rgba[i + 2] * alpha + 255 * (1 - alpha);
      sum += pixelLuminance(r, g, b);
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
}

/** Classify an asset from its top-band luminance. Bright band → "light" asset → header uses dark text. */
export function themeFromLuminance(avgLuminance: number): HeroTheme {
  return avgLuminance >= LIGHT_THRESHOLD ? "light" : "dark";
}

/**
 * Browser helper: load an image URL/File into a canvas and classify it.
 * Used by /admin at upload time; the result is stored on content_heroes.theme.
 */
export async function computeHeroTheme(source: string | Blob): Promise<HeroTheme> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      el.src = url;
    });
    // Downscale for speed — luminance average is scale-invariant.
    const w = Math.min(img.naturalWidth, 320);
    const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, Math.max(1, Math.floor(h * TOP_BAND_FRACTION))).data;
    return themeFromLuminance(
      topBandLuminance(data, w, Math.max(1, Math.floor(h * TOP_BAND_FRACTION)), 1),
    );
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}
