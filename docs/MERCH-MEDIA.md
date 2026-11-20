# Merch media — images contract, tagging, asset sizes

Applies to the apparel shop (`/apparel`, `/apparel/shop`, `/apparel/collections/{slug}`,
`/apparel/{slug}`) and `/admin/apparel`. Ratios below were **measured on the reference site**
(jeeterapparel.com, captured 2026-09-13 at 1440 and 390, see
`docs/reference/jeeterapparel/2026-09-13/`) and supersede the brief's guesses (D-081).
Hero media is the one exception: our hero system and its ratios are unchanged
(see `docs/HERO-MEDIA.md`).

## 1. `merch_products.images` (jsonb)

An **ordered** array. Each entry is one of:

| Shape | Example | Notes |
|---|---|---|
| bare string | `"https://…/apparel/ps-polo/…webp"` | every row written before 2026-09-13; still valid |
| object | `{ "url": "…", "alt": "Back view", "color": "NAVY BLUE", "role": "hover" }` | `alt`, `color`, `role` optional |

- `role`: `hover`, or the legacy `primary`. Anything else is ignored.
  - **`primary` is legacy (D-144, 2026-11-20):** still read by `primaryImage()` / `galleryImages()`
    for rows that carry it, but the admin never writes it — a loaded `primary` is saved back as
    `null`. Do not add new `primary` tags.
- `color`: must match a `merch_variants.color` string for the product (case-insensitive compare).
- **Order is the single source of truth for the main image.** `images[0]` is the cover (grid card,
  product page, Open Graph / JSON-LD, admin thumbnail) and its `color` (if tagged) is the card's
  default selected colour. Within a colour, the first image tagged with that colour is that
  colour's main image.

**Everything reads through `lib/merchImages.ts`** (`normalizeImages`, `primaryImage`,
`hoverImage`, `galleryImages`, `defaultColor`, `swatchImage`). No component indexes the raw
array.

### Resolution rules

| Need | Rule |
|---|---|
| Card primary | `images[0]` (a legacy `role='primary'` still wins when present) |
| Card hover (crossfade) | first `role='hover'` **only**. No tag → no image change on hover (the text row still swaps to the size select, per the reference) |
| Colour selected | resolve primary/hover among images whose `color` matches first; fall back to the rules above when the colour has no tagged images |
| PDP gallery | selected colour's images first, then the rest, de-duplicated by URL; within each group a legacy `primary` leads (D-144 backstop) |
| Swatch thumbnail | that colour's primary image, else a `colorHex` dot from `lib/merchCategories.ts` |
| Default colour | colour of `images[0]` if tagged, else the first active variant's colour |

### Tagging in admin

The images editor (`/admin/apparel/{id}`) sets order, `color` and `role` per image:

- **Make cover** (every image except the first) moves that image to position 0; drag-and-drop does
  the same. If the moved image was tagged `hover`, the tag is cleared — the cover cannot also be the
  hover image (`hoverImage()` skips a hover whose URL equals the primary).
- The role select offers only `—` and `hover`. **Set as hover** makes an image the only hover image
  for its colour. A product needs exactly one hover image per colour to get a crossfade; extra
  `hover` tags are ignored (first wins). The hover swap shows on shop grid cards only, not on the
  product page.
- Saving stays on the editor and shows a green confirmation (D-144); the form remounts with the
  saved rows so newly added variants carry their ids on the next save.

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
