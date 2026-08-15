# Claude Code Kickoff — paste the block below as your first message

## Before you run it (one-time, ~15 min, Ambrose does these)
1. Create GitHub repo `PS-Website` (private, empty) and clone it locally.
2. Copy into the repo: `CLAUDE.md` (root), `docs/PRIVATE-STOCK-WEBSITE-BUILD-PLAN.md`, `docs/PS-MANAGEMENT-CONTEXT.md`, `docs/Private_Stock_website_build.docx` (original spec), `docs/July-13-Brand-Book-Private-Stock.pdf`.
3. Create the NEW website Supabase project (any name, e.g. `ps-website`) in the same org. Note the project ref + anon key + service role key. Do NOT reuse the PSM project.
4. Create the Vercel project linked to the repo; set `dev` as a preview branch and `main` as production.
5. Download the brand logo files (including white/knockout versions) from the five Google Drive folders into `public/brand-assets/` — or leave it and Claude Code will scaffold with placeholders and swap later.
6. Have handy: website Supabase URL + keys (Claude Code will tell you exactly where each goes; service role key is server-only).

---

## PASTE THIS INTO CLAUDE CODE:

Read `CLAUDE.md`, then read `docs/PRIVATE-STOCK-WEBSITE-BUILD-PLAN.md` and `docs/PS-MANAGEMENT-CONTEXT.md` in full before writing anything. Confirm back to me, in one short list, the hard guardrails you'll operate under.

Then execute **Phase 0** and **Phase 1** of the build plan:

### Phase 0 — Foundation
1. Scaffold Next.js (App Router, TypeScript, Tailwind, shadcn/ui) matching the repo structure in build-plan §3. Set up `dev`/`main` branches, lint/typecheck CI, and Vercel config.
2. Initialize Supabase in-repo and write migration 0001 implementing the full v1 schema from build-plan §4 (published tables, catalog_products, subscribers, discount_codes, merch_*, orders, content_*, blog_posts, web_events) with the RLS posture specified there. Apply to the website project and generate types.
3. Create `lib/brands.ts` allowlist (`Outfitters, TerpKings, Higher Self, Savage Squad Strains`), `lib/personas.ts` implementing the `Website Sign-up – {Brand}` mapping from build-plan §1, and `lib/luminance.ts` (average-luminance top-band computation for hero theme flags).
4. Build the protected `/admin` shell (Supabase Auth email allowlist — start with ambrose@privatestock.co) with empty sections: Heroes, Banners, Blog, Apparel, Catalog, Subscribers.
5. Seed dev data: 4 hero assets (placeholders), 3 banner slides, 3 placeholder blog posts, and mock rows for `store_locations` + `product_availability` behind a `MOCK_PSM_DATA` flag so Phase-2 UI can be built before the PSM geo backfill lands.

### Phase 1 — Landing page + site shell
Build to the specs in build-plan §6 and the reference screenshots described in `docs/Private_Stock_website_build.docx`:
1. **Header** (every page): hamburger + large PS logo left; `BRANDS  STORE LOCATOR  YOUR REWARDS  [login] [cart]` right; overlays a full-bleed hero flush to viewport top; underline hover animation; theme (white/black) driven by the active hero asset's light/dark flag. Hamburger opens the full-screen menu: HOME, ABOUT, PRODUCTS, APPAREL, REWARDS, CONTACT.
2. **Hero switcher**: default hero (image or video) per page from `content_heroes`; hovering a right-nav item swaps to that item's mapped hero and stays while hovered; returns to default after ~600ms once the cursor leaves; mobile always shows default.
3. Landing sections in order: auto-rotating banner (images/videos from `content_banners`) → "A Dedication to the Exceptional" intro (exact copy from the docx) with media placeholder → **flip-book catalog** (pre-render the Brand Book PDF pages at build; drag or arrow page-turn, touch-enabled) → brand product grid (allowlisted brands only, rows like the reference screenshot, brand name → brand page) → Merch & Apparel grid (placeholder products) → In the News (3 placeholder posts, each with its own `/news/{slug}` page) → FOLLOW US (Instagram + Facebook buttons only, scrolling image strip) → newsletter signup block → full footer.
4. **Age gate** (21+, cookie), **cookie consent** (ConsentProvider gating non-essential scripts), **newsletter popup** (15% merch code; wire the `/api/subscribe` route to insert into `subscribers` with persona/brand_context/source_path and generate a unique single-use Stripe promotion code — stub the Stripe call behind an env flag until the Stripe account exists), first-party `web_events` tracking.
5. **Brand skeleton pages** at `/outfitters`, `/higherself`, `/savagesquadstrains`, `/terpkings`: same header/hero pattern, brand-styled age gate on direct entry (cookie-suppressed otherwise), brand-styled newsletter popup, product grid from `catalog_products` (empty state OK). Full brand-site recreations come next phase.
6. `/products` all-brands catalog page with brand/category/type filters; `/products/{brand}/{slug}` SEO product page shell (detail layout per the docx reference: image zoom on hover, terpene profile, description, "More from {Brand}", and a "Buy Now at the Below Locations" section rendering from the MOCK availability data + a placeholder map component).
7. `/rewards` coming-soon page with email capture (persona `Website Sign-up – Private Stock`), `/store-locator` page shell on mock data, `/about` and `/contact` placeholder pages (content TBD from Ambrose), 404, sitemap, robots, and the `next.config.js` 301-map scaffold (empty map + TODO for the WordPress URL inventory).

### Rules of engagement for this session
- Work on `dev`. One commit per numbered item above minimum; push so I can watch the Vercel preview.
- Anything that requires the PSM project (geo migration, publish RPC, subscriber ingest) — output the SQL/spec into `docs/psm-side/` clearly labeled "PSM-SIDE — do not run here," and stop.
- When you hit a decision the docs don't answer, ask me with concrete options.
- Finish by giving me: the preview URL checklist of what to verify, the list of PSM-side files you produced, and what Phase 2 is blocked on.
