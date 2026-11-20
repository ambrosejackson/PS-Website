/**
 * `merch_products.images` contract (docs/MERCH-MEDIA.md).
 *
 * Stored shape: an ORDERED jsonb array whose entries are either
 *   - a bare URL string (every row written before 2026-09-13), or
 *   - `{ url, alt?, color?, role?: 'primary' | 'hover' }`.
 * Both shapes stay valid forever; everything reads through `normalizeImages`
 * so no component does index arithmetic on the raw column.
 *
 * `role='primary'` is LEGACY (D-144): still read, never written by the admin.
 * Order is the source of truth — images[0] is the cover, and the first image
 * tagged with a colour is that colour's main image.
 *
 * Resolution rules (D-073, reference-driven per D-081):
 *   card primary  = first role='primary' (legacy), else images[0]
 *   card hover    = first role='hover' ONLY — no tag, no crossfade (D-081)
 *   colour chosen = resolve primary/hover among images whose `color` matches
 *                   first, then fall back to the untagged rules above.
 */

export type MerchImageRole = "primary" | "hover";

export type MerchImage = {
  url: string;
  alt?: string | null;
  color?: string | null;
  role?: MerchImageRole | null;
};

const ROLES: readonly string[] = ["primary", "hover"];

const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();

/** Accepts the raw jsonb value (unknown) and returns a clean, ordered array. */
export function normalizeImages(raw: unknown): MerchImage[] {
  if (!Array.isArray(raw)) return [];
  const out: MerchImage[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      if (entry.trim()) out.push({ url: entry.trim() });
      continue;
    }
    if (entry && typeof entry === "object" && typeof (entry as { url?: unknown }).url === "string") {
      const e = entry as { url: string; alt?: unknown; color?: unknown; role?: unknown };
      if (!e.url.trim()) continue;
      out.push({
        url: e.url.trim(),
        alt: typeof e.alt === "string" && e.alt.trim() ? e.alt.trim() : null,
        color: typeof e.color === "string" && e.color.trim() ? e.color.trim() : null,
        role: typeof e.role === "string" && ROLES.includes(e.role) ? (e.role as MerchImageRole) : null,
      });
    }
  }
  return out;
}

/** `merch_products.size_chart_image` (D-149): ONE entry in the `images` shape, or null. */
export function sizeChartImage(raw: unknown): MerchImage | null {
  return raw == null ? null : (normalizeImages([raw])[0] ?? null);
}

/** Images tagged with a colour (case-insensitive). Empty when none are tagged. */
export function imagesForColor(images: MerchImage[], color: string | null | undefined): MerchImage[] {
  const c = norm(color);
  if (!c) return [];
  return images.filter((i) => norm(i.color) === c);
}

/** Card / PDP primary image, honouring a selected colour when it has tagged images. */
export function primaryImage(images: MerchImage[], color?: string | null): MerchImage | null {
  const scoped = imagesForColor(images, color);
  const pool = scoped.length > 0 ? scoped : images;
  return pool.find((i) => i.role === "primary") ?? pool[0] ?? null;
}

/**
 * Hover (crossfade) image — ONLY an image explicitly tagged role='hover'.
 * Untagged second images do not crossfade (D-081, matches the reference:
 * hovering a card swaps the text row, not the picture, unless a hover shot exists).
 */
export function hoverImage(images: MerchImage[], color?: string | null): MerchImage | null {
  const scoped = imagesForColor(images, color);
  const pool = scoped.length > 0 ? scoped : images;
  const primary = primaryImage(images, color);
  return pool.find((i) => i.role === "hover" && i.url !== primary?.url) ?? null;
}

/** Lift the first image tagged `primary` (what `primaryImage()` picks) to the front; order is otherwise untouched. */
function primaryFirst(list: MerchImage[]): MerchImage[] {
  const idx = list.findIndex((i) => i.role === "primary");
  return idx <= 0 ? list : [list[idx], ...list.slice(0, idx), ...list.slice(idx + 1)];
}

/**
 * PDP gallery: the selected colour's images first (if any), then the rest, de-duplicated by URL.
 * Within each group a legacy `role='primary'` image leads (D-144 backstop so the product page
 * agrees with `primaryImage()` on old rows); order is otherwise preserved.
 */
export function galleryImages(images: MerchImage[], color?: string | null): MerchImage[] {
  const scoped = imagesForColor(images, color);
  const seen = new Set<string>();
  const out: MerchImage[] = [];
  for (const i of [...primaryFirst(scoped), ...primaryFirst(images)]) {
    if (seen.has(i.url)) continue;
    seen.add(i.url);
    out.push(i);
  }
  return out;
}

/** Distinct colours that have at least one tagged image, in first-seen order. */
export function taggedColors(images: MerchImage[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const i of images) {
    if (!i.color) continue;
    const k = norm(i.color);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i.color);
  }
  return out;
}

/**
 * Default selected colour for a card (D-073): the colour of images[0] when it
 * is tagged, else the first active variant's colour, else null.
 */
export function defaultColor(
  images: MerchImage[],
  variants: ReadonlyArray<{ color: string | null; is_active?: boolean }>,
): string | null {
  const first = images[0]?.color;
  if (first) return first;
  return variants.find((v) => v.is_active !== false && v.color)?.color ?? null;
}

/** Swatch thumbnail for a colour: its primary image URL, or null (caller falls back to `colorHexFor`). */
export function swatchImage(images: MerchImage[], color: string): string | null {
  return primaryImage(imagesForColor(images, color), color)?.url ?? null;
}
