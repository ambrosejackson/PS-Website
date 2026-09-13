# Merch media — images contract, tagging, asset sizes

Applies to the apparel shop (`/apparel`, `/apparel/shop`, `/apparel/collections/{slug}`,
`/apparel/{slug}`) and `/admin/apparel`. Ratios below were **measured on the reference site**
(jeeterapparel.com, captured 2026-09-13 at 1440 and 390, see
`docs/reference/jeeterapparel/2026-09-13/`) and supersede the brief's guesses (D-073).
Hero media is the one exception: our hero system and its ratios are unchanged
(see `docs/HERO-MEDIA.md`).

## 1. `merch_products.images` (jsonb)

An **ordered** array. Each entry is one of:

| Shape | Example | Notes |
|---|---|---|
| bare string | `"https://…/apparel/ps-polo/…webp"` | every row written before 2026-09-13; still valid |
| object | `{ "url": "…", "alt": "Back view", "color": "NAVY BLUE", "role": "hover" }` | `alt`, `color`, `role` optional |

- `role`: `primary` or `hover`. Anything else is ignored.
- `color`: must match a `merch_variants.color` string for the product (case-insensitive compare).
- Order matters: `images[0]` is the fallback primary and its `color` (if tagged) is the card's
  default selected colour.

**Everything reads through `lib/merchImages.ts`** (`normalizeImages`, `primaryImage`,
`hoverImage`, `galleryImages`, `defaultColor`, `swatchImage`). No component indexes the raw
array.

### Resolution rules

| Need | Rule |
|---|---|
| Card primary | first `role='primary'`, else `images[0]` |
| Card hover (crossfade) | first `role='hover'` **only**. No tag → no image change on hover (the text row still swaps to the size select, per the reference) |
| Colour selected | resolve primary/hover among images whose `color` matches first; fall back to the rules above when the colour has no tagged images |
| PDP gallery | selected colour's images first, then the rest, de-duplicated by URL |
| Swatch thumbnail | that colour's primary image, else a `colorHex` dot from `lib/merchCategories.ts` |
| Default colour | colour of `images[0]` if tagged, else the first active variant's colour |

### Tagging in admin

The images editor gets `color` and `role` per image plus a **Set as hover** shortcut (Part B).
A product needs exactly one hover image per colour to get a crossfade; extra `hover` tags are
ignored (first wins).

## 2. Asset sizes

All uploads go through the existing admin uploader (`apparel` bucket for products, `heroes`
for hero rows, `banners` for interstitials/tiles/covers) with `cacheControl: 31536000`.
WebP or JPEG; keep each under the bucket cap in `lib/admin/buckets.ts`.

| Asset | Ratio (measured) | Upload size | Where it renders |
|---|---|---|---|
| Product image (card + PDP) | **1:1** (reference cards are 343×343 at 1440, 175×175 at 390) | 1200×1200 | 4-up desktop / 3-up `md` / 2-up mobile, 13 px gutter |
| Collection cover (carousel card) | **4:5** (463×602 measured ≈ 0.77; 4:5 crops cleanly) | 1200×1500 | Collections carousel, `object-cover` |
| Category tile | **1:1**, two side-by-side (660×650 at 1440; 310×310 stacked at 390) | 1300×1300 | Home page category tiles; one asset serves both breakpoints |
| Interstitial banner, desktop | **2:1** (1400×700 at 1440, 20 px side margin) | 2400×1200 | Collection grid, full row, `insert_after` N |
| Interstitial banner, mobile | **~2:3** (366×564 at 390 ≈ 0.65) | 1080×1620 | `<picture>` source under 768 px |
| Collection banner (hero row) | unchanged — our hero system | per `docs/HERO-MEDIA.md` | `content_heroes.page = /apparel/collections/{slug}` (desktop + optional `media_url_mobile`) |
| Apparel home hero | unchanged — our hero system | per `docs/HERO-MEDIA.md` | `content_heroes.page = /apparel` |

Reference notes that drive Part C placement (not media, recorded here so the ratios have context):

- `+` quick-add: 22×22, bottom-left of the image, always visible on desktop and mobile.
- `Low Stock` badge: bottom-right of the image, ~70×19 pill.
- Swatches: 26 px circles under the price row.
- Collection title: overlaid bottom-left on the banner (65 px at 1440, 46 px at 390); tagline
  centered below the banner (37 px).
- Size picker: centered modal at desktop (image left, title/price/sizes/CTA right), bottom
  sheet at mobile; the card's `+` becomes `×` while open.
