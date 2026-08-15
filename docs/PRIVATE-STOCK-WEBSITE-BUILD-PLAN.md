# Private Stock Website — Build Plan & Decision Record
*Prepared 2026-08-15 · Companion to PS-MANAGEMENT-CONTEXT.md (verified 2026-08-14)*

---

## 1. Locked Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Newsletter → PSM CRM | **Both:** website writes its own `subscribers` table → PSM-side ingest into new `web_subscribers` → auto-promote into `crm_contacts` via PSM logic |
| 2 | Brand page URLs | **Subpaths** (`privatestock.co/outfitters`, `/higherself`, `/savagesquadstrains`, `/terpkings`). Existing brand domains 301 to subpaths at cutover. **Kush League and Clusters are out of scope for now** — no pages, no nav/grid entries, no catalog rows |
| 3 | Admin split | **Fulfillment/orders/CRM in PSM** (new merch module). **Content admin in website `/admin`** (hero media, banner carousel, blog, apparel products/photos, brand page content) |
| 4 | Payment rail | **Stripe only** — cards + Apple Pay + Google Pay + Link + Cash App Pay (Klarna/Afterpay optional toggle). PayPal deferred; architecture allows bolt-on later |
| 5 | Rewards at launch | **Coming-soon page** with email capture (tagged `rewards-waitlist` persona). Full auth + rewards ships phase 4 after compliance review |
| 6 | 15% newsletter code | **Unique single-use Stripe promotion code generated per verified email**, first-use only, `restrictions: { first_time_transaction: true }`, not stackable (enforced by allowing only one promo per checkout session) |
| 7 | TerpKings brand page | **Skeleton page now** (hero + product grid from catalog data), full design later |
| 8 | Hero hover-swap | Header-nav hover swaps hero media; **returns to default after a short delay (~600ms grace)** when cursor leaves. Mobile always shows default. Videos supported |
| 9 | Header contrast | **Per-asset light/dark flag**, auto-computed from average luminance of the top band at upload, overridable in `/admin`. Header (logo, hamburger, nav) themes off the active hero asset |
| 10 | Blog at launch | Live with **2–3 placeholder posts**; each post = own SSG page (`/news/{slug}`) for SEO; `/news` index page |
| 11 | PRODUCTS page | **Full all-brands catalog** with filters (brand, category, type, terpene profile) at `/products`; every product has its own SEO page `/products/{brand}/{slug}` |
| 12 | Login + cart icons | **Visible day one** with empty states ("Shop opening soon" cart, login → rewards waitlist until phase 3/4) |

**Still needed from Ambrose (typed answers):**
1. **ABOUT and CONTACT page contents** (contact = retailer inquiry form → PSM pipeline + consumer contact form?).
2. Confirm the five Google Drive logo folders contain final approved files **including white/knockout versions** for dark heroes.

**Persona scheme (CONFIRMED):** every signup is tagged `Website Sign-up – {Brand}`, where {Brand} is determined by the page the visitor was on at submit. Brand pages map to their brand; every non-brand page maps to Private Stock.
| Signup source page | Persona tag |
|---|---|
| / (homepage), /apparel, /rewards, /news, /about, /contact, /products, /store-locator, footer/popup on any non-brand page | `Website Sign-up – Private Stock` |
| /outfitters (any depth) | `Website Sign-up – Outfitters` |
| /higherself | `Website Sign-up – Higher Self` |
| /savagesquadstrains | `Website Sign-up – Savage Squad Strains` |
| /terpkings | `Website Sign-up – TerpKings` |
| /products/{brand}/{slug} (brand product detail pages) | `Website Sign-up – {that Brand}` |

Implementation: `subscribers.persona` stores the full tag; `subscribers.brand_context` stores the brand alone (`Private Stock` for non-brand pages); `source_path` keeps the exact URL for audit. The PSM auto-promote job writes the persona tag onto the `crm_contacts` record.

---

## 2. Architecture

```
┌────────────────────────────┐        ┌─────────────────────────────┐
│ PSM prod Supabase          │        │ Website Supabase (NEW)      │
│ skdhqrjxvhegbufykhyp       │        │ (own project, branches OK)  │
│                            │        │                             │
│ retail_accounts ──┐        │        │ store_locations   (public)  │
│ deliveries ───────┼─ publish RPC ──►│ product_availability (pub)  │
│ menu_check_* ─────┤  (nightly +     │ strains           (public)  │
│ strain_names ─────┘   post-menu-    │                             │
│                       check runs)   │ subscribers    (write-only  │
│ web_subscribers ◄── ingest RPC ─────│   via Edge Fn)              │
│   └─ auto-promote → crm_contacts    │ discount_codes              │
│                            │        │ merch_* / orders / blog_*   │
│ Merch fulfillment module   │◄─sync──│ content_* (heroes/banners)  │
│ (reads website via service │        │ web_events (analytics)      │
│  key in PSM Edge Fns)      │        │                             │
└────────────────────────────┘        └─────────────────────────────┘
                                              ▲
                              Next.js App Router on Vercel
                              dev branch → preview · main → prod
```

**Iron rules carried over from PS-MANAGEMENT-CONTEXT.md:**
- Website NEVER holds a PSM key. All PSM data arrives via curated publish RPCs called by scheduled Edge Functions in the *website* project using a dedicated restricted key, or by scheduled Cowork task.
- Never publish: prices/MSRP/discounts from menu checks, delivery amounts/costs, tiers, contacts, W-9 anything. Product pages show *presence + menu link + image*, not price. (Price display revisit requires Ambrose sign-off — MAP/retailer-relations risk.)
- Company ID for any PSM-side row: `f730fddb-bcb0-464a-80ab-c2c6bf77ac1d`.
- PSM DDL via `apply_migration` only; `pg_notify('pgrst','reload schema')` after.

---

## 3. Repo & Project Structure

**GitHub repo: `PS-Website`** (separate from `PS-Management`)

```
ps-website/
├─ app/
│  ├─ (public)/
│  │  ├─ page.tsx                    # landing
│  │  ├─ [brand]/                    # /outfitters, /higherself, ...
│  │  │  ├─ page.tsx
│  │  │  └─ layout.tsx               # brand theme + conditional age gate
│  │  ├─ products/
│  │  │  ├─ page.tsx                 # all-brands catalog w/ filters
│  │  │  └─ [brand]/[slug]/page.tsx  # SEO product page + Buy Now locations + map
│  │  ├─ store-locator/page.tsx
│  │  ├─ apparel/                    # shop (jeeterapparel-style)
│  │  │  ├─ page.tsx
│  │  │  ├─ [slug]/page.tsx
│  │  │  ├─ cart/  checkout/  order/[id]/
│  │  ├─ rewards/page.tsx            # coming soon + capture
│  │  ├─ news/  about/  contact/
│  ├─ admin/                         # protected content admin (Supabase auth, staff allowlist)
│  │  ├─ heroes/  banners/  blog/  apparel/  catalog/  subscribers/
│  ├─ api/
│  │  ├─ stripe/webhook/route.ts
│  │  ├─ subscribe/route.ts          # signup → subscribers + code gen + email
│  │  └─ revalidate/route.ts         # ISR revalidation, called by publish job
├─ components/  (Header, DynamicContrast, HeroSwitcher, RotatingBanner,
│                FlipBook, BrandGrid, ProductCard, AvailabilityMap,
│                AgeGate, CookieConsent, NewsletterPopup, FollowUs, Footer)
├─ lib/  (supabase clients, stripe, luminance.ts, personas.ts)
├─ supabase/  (migrations, edge functions: publish-pull, subscriber-sync,
│              stripe-fulfillment, printify-sync)
└─ next.config.js                    # 301 map from WordPress inventory + brand domains
```

**Environments:** `dev` branch → Vercel preview + Supabase preview branch. `main` → production. All schema changes as tracked migrations; PRs from dev → main.

---

## 4. Website Supabase Schema (v1)

```sql
-- ===== Published from PSM (public read, service-role write) =====
create table store_locations (
  id uuid primary key,                    -- = PSM retail_accounts.id
  name text not null, chain_name text,
  address_line1 text, address_line2 text, city text, state text, zip text,
  latitude double precision, longitude double precision,
  phone text, menu_url text,
  brands text[] not null default '{}',
  last_delivery_within_90d boolean not null default false,
  availability_tier text,                 -- 'live' | 'recent' | 'listed'
  availability_checked_at timestamptz,
  published_at timestamptz not null default now()
);

create table product_availability (
  store_id uuid references store_locations(id),
  brand text not null, product_name text not null, variant text not null default '',
  menu_product_url text, image_url text,
  checked_at timestamptz not null,
  primary key (store_id, brand, product_name, variant)
);
-- NO price columns. Ever.

create table strains (
  id uuid primary key, our_name text not null, brand text,
  our_type text, lineage text, slug text unique, is_active bool default true
);

-- ===== Product catalog (content-managed, synced from iHeartJane sheet) =====
create table catalog_products (
  id uuid primary key default gen_random_uuid(),
  brand text not null, name text not null, slug text unique not null,
  category text, format text, weight text, thc_range text,
  description text, image_url text, image_missing bool default false,
  terpene_profile jsonb,                  -- [{name, note}] 2-3 dominant
  terp_category text,                     -- TerpKings: fruit/haze/gas/dessert/floral
  sheet_row_ref text,                     -- provenance to iHeartJane sheet
  is_active bool default true, sort_order int,
  updated_at timestamptz default now()
);
-- Synced on schedule from the iHeartJane master sheet (NOT live reads —
-- sheet is world-editable; sync job validates and quarantines bad rows).

-- ===== Subscribers & discount codes =====
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  persona text not null,                  -- from personas.ts map
  source_path text not null,              -- exact page at submit
  brand_context text,                     -- brand page if applicable
  consent_marketing bool not null,
  consented_at timestamptz not null default now(),
  discount_code_id uuid,
  synced_to_psm_at timestamptz            -- set by sync job
);

create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references subscribers(id),
  stripe_promotion_code_id text not null, code text not null unique,
  pct int not null default 15,
  redeemed_at timestamptz, expires_at timestamptz
);

-- ===== Merch commerce =====
create table merch_products (id uuid pk, name, slug unique, description,
  brand text, images jsonb, is_active bool, fulfillment_provider text,  -- 'printify'|'tapstitch'
  provider_product_id text, sort_order int, created_at, updated_at);
create table merch_variants (id uuid pk, product_id fk, sku unique, size, color,
  price_cents int, stripe_price_id text, provider_variant_id text, is_active bool);
create table orders (id uuid pk, stripe_session_id unique, stripe_payment_intent,
  email citext, status text,             -- paid|submitted_to_provider|shipped|delivered|refunded
  subtotal_cents, discount_cents, shipping_cents, total_cents,
  shipping_address jsonb, promo_code text, created_at, updated_at);
create table order_items (id uuid pk, order_id fk, variant_id fk, qty int,
  unit_price_cents int, provider_order_id text, tracking jsonb);

-- ===== Content management (/admin) =====
create table content_heroes (id uuid pk, page text, nav_target text,  -- which nav hover triggers it
  media_url text, media_type text check (media_type in ('image','video')),
  theme text check (theme in ('light','dark')),  -- auto-computed, overridable
  is_default bool, sort_order int, is_active bool);
create table content_banners (id uuid pk, media_url, media_type, link_url,
  sort_order int, is_active bool, starts_at, ends_at);
create table blog_posts (id uuid pk, title, slug unique, excerpt, hero_image,
  body_md text, published_at timestamptz, is_published bool, seo jsonb);

-- ===== Analytics =====
create table web_events (id bigint generated always as identity pk,
  session_id text, path text, event_type text, element text,
  referrer text, utm jsonb, ts timestamptz default now());
```

**RLS:** public `SELECT` on published + catalog + content tables; everything else service-role/Edge-Function only; `/admin` gated by Supabase Auth + staff email allowlist.

---

## 5. PSM-Side Workstream (done in the PSM project — production, follow PSM conventions)

**W1 — Geo backfill (BLOCKER for locator + product maps):**
1. Migration: add `latitude double precision`, `longitude double precision`, `google_place_id text` to `retail_accounts`.
2. One-time geocoding pass: match the 70 active account names (+ chain + market IL) against Google Places; write address_line1/city/state/zip + lat/lng + place_id; human review in PSM before commit.
3. Until complete, the website locator runs on mock data behind a feature flag.

**W2 — Publish RPC:** `publish_store_locator()` SECURITY DEFINER (revoke PUBLIC/anon/authenticated per PSM RPC pattern, grant to the dedicated publisher role). Returns three curated result sets:
- store_locations rows (active accounts with a delivery in last 90d; availability_tier derived: `live` if tier-1 menu platform w/ successful check ≤7d, `recent` if delivery ≤90d, else `listed`)
- product_availability rows (tier-1 accounts only, latest successful run, presence + URLs + image only)
- strains rows (`our_name, brand, our_type, lineage` — never source/original_name)
Website Edge Function `publish-pull` calls it nightly + after Sat/Wed menu-check runs, upserts, then hits `/api/revalidate`.

**W3 — Subscriber ingest:** PSM migration for `web_subscribers` (email, persona, source_path, brand_context, consented_at, promoted_contact_id, company_id = f730fddb…, standard RLS pair). PSM Edge Function `ingest_web_subscribers()` pulls new rows from the website project (service key stored PSM-side only), then auto-promote job creates/updates `crm_contacts` with persona tag per PSM's CRM conventions. Website marks `synced_to_psm_at`.

**W4 — Merch fulfillment module (phase 3):** PSM pages for orders/fulfillment reading the website project (service key in PSM Edge Functions), reusing PSM RLS/role gating/shadcn patterns.

---

## 6. Feature Notes

- **Brand scope (v1):** website surfaces **Outfitters, TerpKings, Higher Self, Savage Squad Strains only.** Kush League and Clusters are excluded everywhere — no brand pages, no rows in the landing brand grid, no `/products` filter entries, and the catalog-sheet sync and `publish-pull` upsert both filter them out (PSM-side data still includes them; the website simply skips those brands until Ambrose activates them via a `brands` allowlist config, which is the single switch to turn them on later).
- **Flip-book catalog:** Brand Book PDF pre-rendered to page images at build; page-flip component (drag or arrow, touch-enabled). Admin can upload a replacement PDF → re-render.
- **Product "Buy Now at the Below Locations":** dispensary list (name + address, both → `menu_product_url`) + "See Menu" button; MapLibre/Leaflet region map right side with hover/click pins from `product_availability` ⋈ `store_locations`. Tier-degradation: live stores show "as of {checked_at}"; others show "carried here recently" + store menu link.
- **Age gates:** main-site gate sets a shared first-party cookie; brand subpaths check it — direct/forwarded entry without cookie triggers the brand-styled gate. Newsletter popups same suppression logic (once per session, never over an unanswered age gate).
- **Cookie consent:** ConsentProvider gates all non-essential scripts; first-party analytics only (`web_events`).
- **SEO migration (pre-launch gate):** WordPress URL inventory → 301 map in `next.config.js`; titles/metas/sitemap/robots carried; LocalBusiness (stores) + Product structured data; brand-domain 301s at DNS cutover; WordPress stays live until map verified.
- **Header:** hamburger + large PS logo left, `BRANDS  STORE LOCATOR  YOUR REWARDS  [login] [cart]` right, underline hover animation, theme from active hero asset flag. Hamburger → full-screen menu: HOME, ABOUT, PRODUCTS, APPAREL, REWARDS, CONTACT. No top promo banners anywhere — banners live below heroes.
- **Stripe:** hosted Checkout; wallets (Apple/Google Pay/Link/Cash App) enabled; webhook `checkout.session.completed` → `orders` → provider submit (Printify/Tapstitch APIs) → tracking sync back. Merch storefront presentation kept clean of plant-touching commerce.

---

## 7. Build Phases

| Phase | Scope | Depends on |
|---|---|---|
| **0** | Repos, website Supabase project, Vercel dev/prod, CI, base schema, `/admin` shell | — |
| **1** | Landing page (hero switcher, banner, intro, flip-book, brand grid, news, follow, newsletter, footer), age gate, consent, analytics, brand skeletons, blog system, 301 map | Logo files from Drive |
| **2** | Store locator + product pages w/ availability + maps; publish pipeline live | **PSM W1 + W2** |
| **2b** | Newsletter → PSM CRM sync + unique code issuance | PSM W3 |
| **3** | Apparel shop: Stripe checkout, Printify/Tapstitch, PSM fulfillment module | PSM W4, Stripe account |
| **4** | Consumer auth + rewards (QR scan → points → merch redemption) | Compliance counsel sign-off (IL/NV) |

Brand page full designs (Outfitters/Higher Self/Savage Squad recreations) land across phases 1–2; TerpKings design slots in when ready.

---

## 8. Open Items

1. ABOUT + CONTACT page contents.
2. Drive logo folders: confirm white/knockout versions exist.
3. TerpKings design direction (later).
4. Stripe account + website Supabase project creation (greenfield).
5. Rewards compliance review before phase 4 redemption ships.
6. Price display on product pages stays OFF absent explicit sign-off.
