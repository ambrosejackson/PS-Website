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
