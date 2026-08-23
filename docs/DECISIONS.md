# DECISIONS.md — running decision log

Append every decision Ambrose makes in-session. Newest at the bottom.

## 2026-08-15 — Phase 0/1 build session

**Decisions made by Ambrose:**
- D-001: Website Supabase project is `ihurvtxmcyahvtcydmnf` (privatestock.co website; separate from PSM).
- D-002: Migration applied via Supabase CLI (`supabase login` + `link` + `db push`) after the MCP OAuth client was rejected ("Unrecognized client_id"); CLI stays the applier for now.
- D-003: Service role key handled by Ambrose only — Vercel env (`SUPABASE_SERVICE_ROLE_KEY`, Production + Preview, Sensitive) and local `.env.local`. Never in chat or committed files.

**Implementation choices made by Claude (flag to Ambrose if wrong):**
- I-001: Env naming follows current Supabase convention: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (matches PSM's publishable-key naming).
- I-002: `/admin` auth = email + password sign-in (Supabase Auth user created in dashboard) + `ADMIN_ALLOWED_EMAILS` env allowlist (default `ambrose@privatestock.co`). Magic links skipped for now (preview-URL redirect allowlisting friction).
- I-003: Brand Book pre-rendered to 44 committed JPEGs (`public/brand-book/`, ~9.5 MB) via `scripts/render-brand-book.mjs`; re-run the script when the PDF changes.
- I-004: Newsletter code format `PS15-XXXXXX` (unambiguous alphabet); Stripe promotion-code creation stubbed (`stripe_promotion_code_id = 'stub_pending_stripe'`) until `STRIPE_ENABLED=true` in phase 3. Duplicate signups return the existing code.
- I-005: Rewards waitlist uses the standard persona `Website Sign-up – Private Stock` per kickoff item 7 (supersedes the earlier `rewards-waitlist` tag idea in decision 5 of the build plan).
- I-006: Placeholder brand accents/taglines in `lib/brands.ts` and placeholder wordmark logo (inline SVG, currentColor) until Drive logo files land in `public/brand-assets/`.
- I-007: Hero hover-swap keeps the swapped asset while the cursor is over the nav item OR the hero itself; reverts ~600ms after leaving (reconciles build-plan decision 8 with the docx wording).
- I-008: `product_availability` PK uses `variant text not null default ''` (build-plan §4 version, which supersedes the generated-column sketch in PS-MANAGEMENT-CONTEXT §6).
- I-009: Mock PSM rows live in the real website DB with fixed `00000000-…` UUIDs, gated by `MOCK_PSM_DATA=true`; the publish pipeline will delete/replace them.
- I-010: First-party analytics send only after explicit consent "Accept"; age-gate + consent cookies are the only pre-consent cookies.

## 2026-08-15 — Design correction session (lovable screenshots)

**Decisions made by Ambrose:**
- D-004: Reference design = docs/reference/lovable/ screenshots. Everything BELOW the hero adopts that design system (white ground, hairline rules, condensed uppercase type, navy captions, 6-col product grids). The HEADER/HERO stays exactly as built per guardrail #5 — do NOT adopt the screenshots' white header bar or their nav labels (ABOUT US / DISPENSARY LOCATIONS / …).
- D-005: The screenshots show a Kush League row; the brand allowlist exclusion still stands. Copy the layout language only, with the four allowlisted brands.

**Implementation choices (flag if wrong):**
- I-011: Condensed face = Oswald (next/font, weights 500–700); Cormorant serif removed. Caption color sampled as dark navy `#24334a` (token `--color-caption`, easy to adjust).
- I-012: Seed catalog renamed to screenshot-style product names (6 per brand; Savage Squad names invented in the same style — not visible in screenshots). Merch seed renamed to SKU-style codes (TS-03, JC-08, …) since the screenshots caption merch with codes.

## 2026-08-15 — Full audit pass (lovable refs + docx images)

- A-01 (header/logo): `public/brand-assets/` did NOT exist despite being referenced as the real logo location. Created placeholder badge files at the canonical paths (`private-stock-white.svg`, `private-stock-black.png` via scripts/render-logo-png.mjs) — dropping the real Drive exports in with the same filenames swaps them site-wide with no code change. Header logo enlarged; black variant wired to light-themed heroes. Fullscreen menu restructured to the docx Jeeter reference (X top-left + logo, left-aligned link column, IG/FB icons below).
- A-02 (hero): fixed stay-while-hovered bug — a swap now persists while the cursor is anywhere over the hero (mousemove cancels the pending revert); leaving the hero section is the single ~600ms revert trigger.
- A-03 (banner): rebuilt as inset rounded card with optional corner badge ribbon per the docx Jeeter "Summer Essentials" reference; migration 0002 adds `content_banners.badge_text`. Confirmed no banner renders above any hero sitewide.
- A-04 (intro): verified verbatim copy + media placeholder — no change.
- A-05 (flip-book): converted to a pop-out — inline cover preview + OPEN THE BRAND BOOK button opens a full-screen overlay with the 44-page flip book (per-page arrows, drag/touch, keyboard, single-page mobile).
- A-06 (brand grid): screenshot-compare passed (titles/SEE MORE/hairlines/6-col cards/navy captions, four allowlisted brands); correction — brand name in the section title now links to the brand page.
- A-07 (merch grid): landing section now multi-row (12 SKU-caption cards, matching the docx/lovable multi-row reference); SEE MORE -> /apparel verified.
- A-08 (news): verified — landing card row (image/excerpt/READ MORE -> per-post SEO page), SEE MORE -> /news index listing all published posts, each with its own SSG page. No change.
- A-09 (FOLLOW US): social buttons corrected to pill shape with icon + label per the docx reference STRUCTURE (IG + FB only), kept in the light design system; scrolling strip unchanged.
- A-10 (newsletter): rebuilt as the docx split reference — lifestyle photo left (placeholder slot for the tracksuit shot at /placeholders/newsletter-photo.svg), black panel right with large JOIN OUR NEWSLETTER, one-line copy, inline email + cream Subscribe; same subscribers/persona/discount flow; 15% one-time/non-stackable messaging present in section, popup, and consent line.
- A-11 (product cards/detail): all catalog cards now have zoom + CLICK FOR MORE INFO hover; detail layout flipped to docx Jeeter reference (name/details left, large image right); added colored INDICA/SATIVA/HYBRID chip via migration 0003 catalog_products.strain_type (seeded on all 24 products); Buy Now list (name + See Menu both link to the store's product menu) with region map on the right verified.
- A-12 (gates/popups): verified — shared 21+ cookie across brand subpaths with brand-styled gate on direct entry; consent banner gated behind the age gate; popup once-per-session regardless of dismiss/answer, permanent after subscribe, never over an unanswered gate. No change.

## 2026-08-15 — Brand-site recreation session

**Ambrose's override rules (supersede the reference sites):**
- D-006 (A): Brand pages use the GLOBAL PS header over the brand hero; original site navs are not recreated; sections flow as a one-pager. Internal section-jumps only if proposed and approved.
- D-007 (B): Nothing renders above any hero. The SSS star-ticker marquee moves directly BELOW the SSS hero.
- D-008 (C): Newsletter offer is 15% off merch & apparel (one-time, non-stackable) — Higher Self's live "25% OFF ALL MERCH" ticker copy corrected to 15%.
- D-009 (D): Reference sites' hardcoded store lists replaced by our live availability/locator components (brand-filtered, MOCK_PSM_DATA until the publish pipeline).
- D-010 (E): Brand pages end with the global site footer; reference footers absorbed. SSS compliance paragraph kept as a brand-page block above the global footer (legally required copy).
- D-011 (F): Media pulled directly from Ambrose's own live sites into public/brand-pages/{brand}/; unpullable assets get labeled placeholders (list in session summary).

**Implementation notes:**
- I-013: Assets recovered — SSS: all 11 (incl. hero video + poster + merch shots + 4 YouTube IDs from the live embed). Higher Self: 7 (lifestyle-hero, logo, category shots, merch banner, both lifestyle photos). Outfitters: hero + speakeasy photos (base64-embedded in the live HTML, decoded). MISSING: TerpKings white logo (text placeholder used), Outfitters collection product photos (live site itself uses placeholder cards).
- I-014: Brand fonts (approximations): Higher Self = Poppins + Caveat script; SSS = Archivo Black display + mono labels; Outfitters = Oswald ultra-letterspaced. Swap when brand font files land.
- I-015: contact_messages table (migration 0004, service-role only RLS) + POST /api/contact + /admin/messages list; Outfitters contact strip uses placeholder sales@privatestock.co + Chicago, IL until Ambrose confirms (fake info@outfitters.com / +1 312 555-0100 dropped).

## 2026-08-15 — Header redesign (solid white bar)

**Decisions made by Ambrose:**
- D-012: The header becomes a SOLID WHITE bar that SITS ABOVE the hero (not overlaying it), all content black — hamburger, `private-stock-black.png` badge, condensed uppercase nav — per `docs/reference/lovable/01-header-hero.png`. This **reverses decision 9 and the original guardrail #5** ("overlaid on a full-bleed hero … white text with per-asset light/dark theme switching") for every non-brand page. Nav labels and order are unchanged (BRANDS / STORE LOCATOR / YOUR REWARDS / login / cart) — the reference's own labels are still not adopted (D-004 stands).
- D-013 (clarification, mid-session): **Brand landing pages are EXCLUDED from D-012.** `/outfitters`, `/higherself`, `/terpkings`, `/savagesquadstrains` keep the transparent overlay header on a top-flush hero, including the per-asset light/dark theme switching. Because of this, decision 9's contrast logic is NOT dead and `lib/luminance.ts` + `content_heroes.theme` remain live — the solid bar simply never reads the flag.
- D-014: Product detail pages (`/products/[brand]/[slug]`) count as product pages, not brand pages — they get the white bar. (Assumed from Ambrose's own enumeration, which listed "brand pages" and "product pages" separately; flag if wrong.)

**Implementation choices (flag if wrong):**
- I-016: One `Header` component with `variant="solid" | "overlay"` (solid is the default) rather than two components, so the structure/labels/hover behavior physically cannot drift between the two treatments.
- I-017: Solid-bar metrics read off the reference proportionally: bar `h-16` mobile / `h-24` desktop, logo `h-10`/`h-14`, nav `text-[12px]` at `tracking-[0.16em]`, inner rail `mx-auto max-w-screen-2xl px-6 md:px-12` so the logo lines up with the section content below it (same rail as BrandGrid/Footer).
- I-018: In solid mode the header + hero are wrapped in a `flex flex-col` div that carries the page's `heightClassName`, so the bar and hero TOGETHER fill the intended height (e.g. `h-svh` on the landing page) instead of the hero pushing a full viewport below the bar. Overlay mode is byte-for-byte the old layout.
- I-019: Hero hover-swap preserved in both modes — the mousemove/mouseleave revert handlers moved from the `<section>` to that wrapper, so the hovered region is still "nav item + hero" and the ~600ms revert fires only when the cursor leaves both. Mobile still shows the default asset only.
- I-020: 404 gained the header (it previously had none) and is now `flex min-h-svh flex-col` with the dark panel as `flex-1`.

## 2026-08-16 — Mobile header + fullscreen menu

**Decisions made by Ambrose:**
- D-015: The closed header and the open menu must be positionally identical — the hamburger and the X occupy the exact same x/y, and the logo neither moves nor resizes when the menu toggles. Left cluster sits on the normal page gutter, not centered.
- D-016: Mobile sizing bumps — the closed-header logo adopts the size it rendered at inside the open menu, then BOTH grow 20%; fullscreen menu item text and the IG/FB icons also grow 20%. The hamburger/X glyph keeps its current size.
- D-017: The fullscreen menu becomes a LEFT DRAWER on mobile (~83% of viewport) over a dimmed page, instead of covering the full viewport. Menu items share the hamburger/logo left gutter; social icons stay below CONTACT. From `md` up it stays full-bleed as before.

**Implementation choices (flag if wrong):**
- I-021: Bar geometry (height, gutter, gap, icon box, logo size) now lives in `components/site/header-chrome.ts` and is imported by BOTH `Header` and `FullscreenMenu`. The two states drifted precisely because each hard-coded its own values; a single source makes re-drift impossible. `FullscreenMenu` takes the header `variant` so brand pages' overlay header stays matched too.
- I-022: The hamburger (`h-6 md:h-7`) and the X (`h-7 md:h-8`) were DIFFERENT sizes. D-015 (same position) requires one box, so both now use the hamburger's size — the X shrinks 4px. Flag if you wanted the larger glyph instead; the header bar was treated as the anchor since it matches the lovable reference.
- I-023: D-016 scoped to mobile. Menu logo was `h-16` (64px) → both header and menu are now `h-[4.8rem]` (76.8px = 64 × 1.2). Desktop is untouched: header stays `md:h-16` (64px) in a 112px bar, so the MENU's desktop logo dropped `md:h-24` → `md:h-16` to match the header (that also removes a desktop-side jump that existed before).
- I-024: The mobile bar grew `h-[72px]` → `h-24` (96px) because a 76.8px logo does not fit a 72px bar. Consequence: mobile heroes lose 24px of height (header + hero still total one viewport). Desktop bar unchanged at 112px.
- I-025: Menu item text `text-3xl`→`text-4xl` (30→36px) mobile, `md:text-4xl`→`md:text-[2.7rem]` (36→43.2px); social icons `h-6`→`h-[1.8rem]` (24→28.8px). Menu nav gutter `px-8 md:px-24` → `px-6 md:px-12` to sit on the same left gutter as the hamburger/logo.
- I-026: Drawer is `w-[83%] max-w-[26rem] md:w-full md:max-w-none` with a `bg-black/60` backdrop that closes on tap (mobile only). The max-width cap keeps it drawer-shaped on large phones/small tablets below the `md` breakpoint.

**Verified** (real render at true viewport widths via same-origin iframes, closed + open states measured simultaneously):
- 375 / 390 / 430px: hamburger and X rects IDENTICAL `[28, 36, 24, 24]`; header logo and menu logo IDENTICAL `[72, 9.6, 76.8, 76.8]` — zero movement on toggle.
- Logo fits the 96px bar with 9.6px clearance top and bottom; no horizontal overflow at any width.
- Menu items render at 36px, single line each (40px tall), widest right edge 176.8px inside a 298.8–356.9px drawer.
- Brand/overlay header (/outfitters at 375px) also matches between states, with its own geometry unchanged (104px row, 64px logo, 28px glyph).
- Desktop (1920px) header unchanged: 112px bar, 64px logo, 28px glyph, nav 12px.

## 2026-08-16 (later) — Header sizing correction

The first pass of D-015/D-016 got the anchor backwards and scaled the wrong text.
Ambrose's correction, which supersedes those entries:

- D-018: **The expanded menu's old row is the ANCHOR, not the header.** The closed
  header's hamburger + logo move to where the X + logo used to sit — 20px gutter
  on mobile / 40px desktop, `py-5`, no `max-w-screen-2xl` rail, bar height derived
  from the logo. (The first pass did the reverse: it dragged the menu onto the
  header's reference-matched rail.)
- D-019: **+20% applies to the HEADER's nav text and login/cart icons** (12→14.4px,
  20→24px mobile / 22→26.4px desktop), which the first pass missed. The fullscreen
  menu's item text and IG/FB icons keep the +20% already applied — Ambrose chose
  "keep both" when asked.
- D-020: **Logo = the size it rendered at next to the X, +20%**, at BOTH breakpoints:
  mobile 64→76.8px, desktop 96→115.2px. Ambrose chose "desktop follows too" when
  asked, accepting that the desktop bar grows 112→155.2px and therefore **no longer
  matches the lovable reference's header proportions**. CLAUDE.md guardrail #5 now
  records this so a future session doesn't "restore" the shorter bar.

**Implementation notes:**
- I-027: Because both variants now use the same bar wrapper, `barClass`, `iconClass`
  and `iconStroke` collapsed to constants; `clusterClass`, `logoClass`, `navTextClass`
  and `navIconClass` stay variant-keyed. Solid hamburger adopted the old X's glyph
  (`h-7 md:h-8`, stroke 1.25) so it lands on the X's exact pixel.
- I-028: Brand/overlay pages were left entirely alone (bar 104px, logo 64px, glyph
  28px, nav 13px/20px icons) — they were excluded from the white-bar work and stay
  excluded from these bumps.
- I-029: Dropping `max-w-screen-2xl` means the right-hand nav now sits on the 40px
  viewport gutter on desktop rather than a centered 1536px rail. That follows from
  D-018 (the cluster must sit on the viewport gutter) — flag if the right side
  should keep the old rail.
- I-030: The hamburger's Y moves 38→44.4px on mobile relative to the old X. That is
  unavoidable: a 20%-taller logo grows the row it is vertically centred in. X and
  hamburger remain identical to each other, which is the invariant that matters.

**Verified** (both states rendered simultaneously, real viewports via same-origin iframes):
- 375 / 390 / 430px: hamburger and X identical `[24, 44.4, 28, 28]`; header and menu
  logos identical `[76, 20, 76.8, 76.8]` — x/y match the old menu row exactly; bar
  116.8px; nav icons 24px; drawer 83%; menu items 36px on the 20px gutter, single
  line, no overflow.
- 1440px: bar 155.2px; logo `[100, 20, 115.2, 115.2]`; glyph `[44, 61.6, 32, 32]`;
  nav text 14.4px visible; nav icons 26.4px; gutters 40px both sides.
- /outfitters at 375px: unchanged (bar 104px, glyph `[24,38,28,28]`, logo `[72,20,64,64]`),
  and still matched between closed and open states.

## 2026-08-16 — Landing restructure: CATALOG modal + Private Stock Brands section

- D-021: **"BRANDS" in the header is now "CATALOG", and it opens the Brand Book
  flip-book in a full-screen modal** instead of navigating to `/#brands`. The
  inline Brand Book section is gone from the landing page. Hover still swaps the
  hero (the seeded asset's `nav_target` stays `BRANDS`; the nav item carries a
  `heroTarget` alias so no data migration is needed). Modal: dark backdrop,
  close X, ESC and backdrop-click to close, body scroll locked while open.
- D-022: **New "PRIVATE STOCK BRANDS" section** takes the flip-book's place —
  full-bleed black, no divider rules, centered white heading, one row per brand
  alternating image-left / image-right, no product thumbnails. Order is editorial
  (Outfitters, Higher Self, TerpKings, Savage Squad Strains) and deliberately
  differs from `lib/brands.ts` order; descriptions are verbatim Brand Book copy.
  Each row has exactly two buttons: BUY NOW → `/store-locator?brand={slug}`,
  LEARN MORE → `/{slug}`.
- D-023: **`/store-locator` accepts `?brand={slug}`** and filters the list AND the
  map on load, with brand filter chips (ALL BRANDS + the four allowlisted brands).
  Unknown slugs fall back to "all" rather than rendering an empty page.
- D-024: **The intro section carries the landing page's only visual pointer to the
  catalog** — a "VIEW THE BRAND BOOK" outline button under the body copy, opening
  the same modal.

**Implementation notes:**
- I-031: Modal state lives in `components/site/catalog-context.tsx`, mounted once
  per public page in `app/(public)/layout.tsx`, so ANY trigger opens the same
  overlay. `useCatalog()` is safe outside the provider (reports unavailable) and
  both triggers degrade to a `/#brands` link when the rendered brand book is
  missing. `BrandBookSection.tsx` (the old inline cover + pop-out) was deleted.
- I-032: **Why drag was broken:** `FlipBook` listened for `pointerdown`/`pointerup`
  only — no `setPointerCapture`, no `draggable={false}` on the page images. The
  browser's native image drag hijacked the gesture, so the `pointerup` never
  arrived and nothing turned. Now: one captured pointer stream
  (down/move/up/cancel), a 6px axis lock (vertical intent hands the gesture back
  to the scroller), the book follows the pointer, and release past 48px snaps
  forward/back — anything shorter springs back, which is what keeps a click from
  reading as a drag. Arrows `stopPropagation` on pointerdown; keyboard arrows work
  on the focused book and, in the modal, at window level.
- I-033: `/store-locator` is now dynamically rendered (it reads `searchParams`),
  where it used to be static. Content still server-renders in the HTML, so SEO is
  unaffected; flag if the ISR cache matters more than the deep link.
- I-034: TerpKings has no photography in `public/brand-pages/terpkings/` (only a
  synthetic gradient SVG), so its row uses the labeled placeholder
  `/placeholders/hero-terpkings.png`. Swap when real art lands.
- I-035: The first `BrandGrid` row dropped its `border-t border-hairline` — it now
  butts against the black section, where a hairline reads as a grey line.

**Verified** (dev server, real Chrome; mobile via a 390px same-origin iframe):
- Desktop 1568px: CATALOG opens the modal; mouse drag left turns 1 → 2–3, drag
  right turns back, a 25px drag does nothing; arrow keys, arrow buttons, ESC and
  backdrop-click all work; `body.overflow` restores on close; hover on CATALOG
  still cross-fades the hero.
- Mobile 390px: single page; touch-pointer swipe left 1 → 2, swipe right back,
  short swipe no-ops; scroll locked. All four brand rows stack image-then-text.
- Intro "VIEW THE BRAND BOOK" opens the same modal and drag works from there too.
- `/store-locator?brand=outfitters` → 3 Outfitters stores, OUTFITTERS chip active,
  map plotted from the filtered set.
- Section order: hero → banner → intro → PRIVATE STOCK BRANDS → brand grid →
  Merch & Apparel → In the News → Follow Us → Newsletter → Footer.

## 2026-08-16 — Intro section: cultivation video

- D-025: **The intro section's static CULTIVATION placeholder is now a silent
  4:5 portrait video loop** (`/videos/intro-cultivation.mp4`), autoplay + muted +
  loop + playsInline + `preload="metadata"`, no controls. Layout is unchanged:
  copy and VIEW THE BRAND BOOK left, media right; on mobile it stacks below the
  copy at the same 4:5.
- D-026: **prefers-reduced-motion: reduce swaps the whole `<video>` for the
  poster still**, so the file never plays — and never downloads past metadata —
  for those users.

**Implementation notes:**
- I-036: The committed source was `intro-cultivation.mp4.mov` — 2160×2700 H.264
  at 22 Mbps, 33.5 MB, with an unused AAC track. Re-encoded to the filename the
  spec asked for: 1080×1350 (still exactly 4:5), CRF 26, preset slow, High@4.0,
  yuv420p, `-movflags +faststart`, audio stripped (`-an`) → **5.4 MB**. The .mov
  was removed. 1080 wide is ~1.5× the largest CSS width the column ever gets
  (688px at 1568px viewport).
- I-037: Poster is frame 1 at the same 1080×1350 (`-q:v 4`, 98 KB). It is real
  grow-room content, not a black fade-in frame, so nothing flashes empty.
- I-038: Because the container ratio (4:5) exactly matches the source ratio,
  `object-cover` crops nothing — letterboxing is impossible at any width.
- I-039: ffmpeg was not installed on this machine; added via `scoop install
  ffmpeg` (user-scope, no admin).

**Verified** (dev server, real Chrome; mobile via a 390px same-origin iframe):
- Desktop 1568px: media box 688×860 = ratio 0.800, `object-fit: cover`, poster
  painted, layout unchanged.
- Mobile 390px: box 323×404 = ratio 0.800, copy above the media (stacks below).
- Element attributes at runtime: autoplay ✓ muted ✓ loop ✓ playsInline ✓
  controls ✗ preload=metadata ✓ poster ✓.
- **NOT verified: actual playback.** This Chrome profile never reaches
  `loadedmetadata` for ANY mp4 — including `sss-hero.mp4`, already live on the
  site — even from a plain range-serving static server and even from a fully
  downloaded blob URL. The decoder is stalled in this browser, not in the file:
  ffprobe confirms H.264 High@4.0 / yuv420p / faststart moov. Needs a playback
  check on the Vercel preview.
- D-027: **Intro media height capped at 430px, with the 4:5 lock kept** — so the
  box shrinks to 344×430 and centers in the column rather than cropping to a
  letterbox slice. Ambrose chose "keep 4:5, shrink the box" when asked; the
  alternative (full 688px width, ratio 1.6, portrait cropped top and bottom) was
  rejected. Expressed as `max-w-[344px]` because 430 × 4/5 = 344 — capping the
  WIDTH bounds the height without a `max-height` overriding `aspect-ratio`.
  Mobile (323px column, 404px tall) is already under the cap and unchanged.
  Corners rounded `rounded-xl` (14px); the wrapper's existing `overflow-hidden`
  clips the video to it.
- D-028: **CATALOG added to the hamburger menu**, between PRODUCTS and APPAREL.
  The header's CATALOG item is `hidden md:inline-block`, so without this entry
  the catalog was unreachable on mobile anywhere except the landing page's intro
  link. Clicking it closes the drawer and opens the same modal; it degrades to
  the `/#brands` link when the brand book isn't rendered, same as the header.

## 2026-08-22 — TerpKings full brand page (replaces the v1 shell)

- D-029: **/terpkings is now the full TerpKings page** recreated from the Claude
  Design export `docs/reference/terpkings/terpkings-subpage.html` (CRT hero,
  FILE 01–06 consoles, SIGNAL FEED, JOIN THE COURT) under the shared overlay
  header and the shared site footer. All copy, hex values, specs, dossiers, lab
  readings and keyframes (`tkFlicker/tkStatic/tkBlink/tkMarquee/tkHum/tkRollbar`)
  are verbatim in `lib/terpkings-content.ts` + `components/brand/terpkings/`.
- D-030: **`content_heroes.page` for TerpKings is `"/terpkings"`** (leading
  slash), matching the existing convention (`'/'`, `/outfitters`, …) and
  `getHeroesForPage("/terpkings")`. The hero plays the page's DEFAULT video row
  (`pickHeroVideo`: default video, else first active video); no video row →
  gradient-only CRT exactly like the export's fallback. `HERO_TINT_OPACITY = 0.6`
  (named constant in `TKHero.tsx`) drives both the multiply tint and the screen
  highlight the video sits behind.
- D-031: **Hero media pipeline** — migration `0005_hero_media_bucket.sql`
  creates the public `hero-media` bucket (50 MB, mp4/jpeg/png/webp; applied to
  the website project). `/admin/heroes` mints a service-role signed upload URL,
  the browser PUTs straight to Storage (bypasses Vercel's request-body limit),
  then the row is inserted (one default per page) and the page revalidated.
  Rows can be made default / toggled active / re-themed / deleted.
- D-032: **Age gate on /terpkings is the export's "TERPKINGS OS v2.6 — SECURITY
  CHECKPOINT" terminal**, but it reads/writes the shared `ps_age_verified`
  cookie (guardrail #6), never the export's `tk_age_ok` localStorage. `[N] ABORT`
  shows an in-terminal "> ACCESS DENIED" line (site convention) instead of the
  export's redirect to google.com.
- D-033: **Headlines use the site's default sans (Geist) at weight 800** rather
  than loading the export's Poppins; VT323 is the only page-specific font, loaded
  with next/font/google and scoped (`--font-vt323` on the page `<main>`; the TK
  gate/popup apply it on their own roots and are mounted via `next/dynamic`).
- D-034: **JOIN THE COURT posts to `/api/subscribe`** (persona
  `Website Sign-up – TerpKings`, brand_context `TerpKings`, source_path
  `/terpkings`). The API requires consent, so a 21+/marketing-consent checkbox
  was added in terminal style (the export had none). Success renders
  "♛ TRANSMISSION CONFIRMED. LONG LIVE THE KINGS." and the one-time merch code.
  The 15% popup on /terpkings is a TK-terminal variant with the same suppression
  rules as every brand page.
- D-035: **FILE 06 ► SCAN navigates to `/store-locator?zip={value}`** (empty
  input keeps "> ERROR: ENTER COORDINATES FIRST."). `/store-locator` does not yet
  filter by `?zip` — follow-up once the live store feed lands.
- D-036: **Export footer dropped** — the shared Footer already carries the 21+ /
  keep-out-of-reach compliance line, so the export's TK footer + its longer
  compliance sentence (kept in `COMPLIANCE_LINE`) are not rendered.

**Implementation notes:**
- I-040: Textures converted to webp q80 (grain 1.59 MB → 314 KB, wood 1.73 MB →
  352 KB). Drip-pack + tube renders were 3000² PNGs on WHITE grounds; the white
  was removed by an edge-connected flood fill (threshold 232) before the webp
  encode so the renders float on the card's radial green. `rosin-vapes.png`
  disappeared from the folder mid-session (no webp made) → placeholder until it
  is re-dropped. Optional renders are existence-checked at build
  (`lib/terpkings-assets.ts`) and fall back to `TKPlaceholder`.
- I-041: Verified in headless Chrome over CDP (the Claude Chrome extension was
  not connected): desktop 1440 + mobile 390 full-page captures, no console
  errors; profile switch, dossier select, edu panel, locator/signup validation,
  VT323 resolution, `<title>` and og:image all checked. Lazy images below the
  fold don't appear in beyond-viewport captures — not a page bug.
- D-037: **Landing "Private Stock Brands" tiles are drop-in files** —
  `public/brand-assets/{slug}/{slug}-brand-tile.webp` (or `.png`) is used when
  present, else the row's legacy image. TerpKings row now uses
  `terpkings-brand-tile.webp` (converted from the 1080² PNG, 1.16 MB → 59 KB).
  Same 4:3 `object-cover` crop as the other rows (a square source loses ~12%
  top and bottom).
- I-042: Ambrose replaced the TerpKings brand tile with a 400×300 PNG (194 KB,
  under the 300 KB webp threshold) and removed the earlier webp; the row now
  references `terpkings-brand-tile.png` directly (D-037 lookup finds it either
  way). `rosin-vapes.png` (168 KB, white ground) re-landed → white knocked out
  and encoded as `rosin-vapes.webp` (20 KB), which `PRODUCTS[2].img` already
  pointed at, so UNIT TK-03 now shows the render instead of the placeholder.
- I-043: `<html data-scroll-behavior="smooth">` (root layout) — Next 16 stopped
  overriding CSS `scroll-behavior: smooth` during SPA navigations, so the
  TerpKings page's smooth in-page anchors made every route change INTO
  /terpkings animate from the previous scroll offset (landing "Learn More"
  appeared to load mid-page and scroll up). The attribute restores the
  pre-16 behavior: instant top on navigation, smooth for #anchors.
