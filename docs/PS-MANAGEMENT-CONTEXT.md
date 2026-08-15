# PS Management — Integration Context for the Privatestock.co Website Project

**Purpose of this document:** You are working in the **Private Stock Website** project — building a new public-facing website for privatestock.co (Next.js, replacing WordPress). This document is your complete reference for **PS Management (PSM)**, the separate internal operations app that the website will integrate with. Everything here was verified against the production database on 2026-08-14. Do not guess at PSM schema, IDs, or conventions — if something you need isn't in this document, ask Ambrose to pull it from the PSM project rather than assuming.

---

## 1. Who / What / Why

- **Ambrose Jackson** — CEO of Private Stock LLC and subsidiary PS Management. Sole decision-maker. Based in Chicago, IL. Prefers exact commands, exact paths, exact values, options presented clearly when tradeoffs exist.
- **Private Stock LLC** owns the cannabis brand IP: **Savage Squad Strains, TerpKings, Outfitters, Higher Self, Kush League, Clusters**.
- **PS Management** is the management company (dispensaries, a manufacturing facility, a cultivation facility, brand sales/support) and the name of the internal React/TypeScript operations app at **privatestockmanagement.com**.
- **Privatestock.co** is the consumer/brand-facing domain (currently WordPress, registered at GoDaddy). The new website replaces it.

**Division of responsibility (agreed architecture):**
- The **website** is the public storefront: brand pages, strain library, store locator / where-to-buy, merch shop, rewards, content.
- **PSM** is the back office: all admin, fulfillment, inventory management, order management, and reporting UIs live in PSM, not on the website. Do not build a second admin app.

---

## 2. PSM Tech Stack & Infrastructure Identifiers

| Item | Value |
|---|---|
| Frontend | React + TypeScript + Vite (SPA, behind login) |
| UI | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| **Production Supabase project** | `skdhqrjxvhegbufykhyp` → https://skdhqrjxvhegbufykhyp.supabase.co |
| Supabase org ID | `vmqxpzgzrstiflbyhvhf` |
| **Company ID (Private Stock Cannabis Co.)** | `f730fddb-bcb0-464a-80ab-c2c6bf77ac1d` — nearly every PSM table is scoped by `company_id`; any row written for the website integration must use this exact UUID. (An old ID starting `03a44f23` circulates in stale notes — it does **not** exist in prod and will fail FK constraints.) |
| Hosting | Vercel, auto-deploys PSM on `git push origin main` |
| PSM repo | GitHub `PS-Management` |
| PSM env var name | `VITE_SUPABASE_PUBLISHABLE_KEY` (not `VITE_SUPABASE_ANON_KEY`) |

**Critical operational fact: PSM has NO dev branch.** All schema changes go directly to production via Supabase MCP `apply_migration`. `npm run dev` in PSM hits live prod data. Treat every PSM database operation as a production operation.

---

## 3. The #1 Integration Rule — Read This Before Writing Any Code

**The website must NEVER connect directly to the PSM production database (`skdhqrjxvhegbufykhyp`) with an anon key.**

That database contains payroll entries, CRM contacts, wholesale pricing, delivery costs, and field-sales data. Known open security items in PSM as of this writing: seven views missing `security_invoker` (bypass RLS), and a `payroll_entries` SELECT policy open to all company members. Exposing this project to anonymous internet traffic turns any RLS gap into a public breach.

**Agreed pattern: the website gets its OWN Supabase project.** Data flows between the two projects only through controlled, curated publish jobs:

```
PSM prod (skdhqrjxvhegbufykhyp)          Website Supabase project (new)
─────────────────────────────            ──────────────────────────────
retail_accounts ─┐
deliveries ──────┼─► nightly publish ──► store_locations   (public read)
menu_check_* ────┘   (Edge Function     product_availability (public read)
strain_names ──────►  or scheduled  ──► strains             (public read)
                      Cowork task)
                                    ◄── merch orders, rewards events,
PSM (new admin pages) ◄── sync ─────    web analytics (website writes,
                                        PSM reads for admin/reporting)
```

- Publish only the columns the public needs (see §6). Never publish delivery volumes, order amounts, costs, tiers, or contact info — a scraper reading the store locator API would otherwise get the entire wholesale account map and reorder cadence.
- The reverse direction (merch orders, rewards, analytics into PSM admin views) can be a scheduled sync or a PSM page that reads the website project directly with a service-role key stored server-side in PSM's Edge Functions — decide when building the fulfillment module.
- The website project gets its own auth (consumer accounts). PSM auth (staff accounts) stays completely separate. Do not attempt to share Supabase Auth between them.

---

## 4. Verified PSM Schemas (as of 2026-08-14, production)

These are the tables the website integration reads from or relates to. Column lists were pulled from `information_schema.columns` — they are exact.

### 4.1 `retail_accounts` — canonical dispensary identity (the source for the store locator)

```
id uuid PK · company_id uuid · name text · tier text · is_active bool
license_number text · phone text
address_line1 text · address_line2 text · city text · state text · zip text
market text (NOT NULL — currently all rows = 'IL')
account_type text · stage text · stage_changed_at timestamptz
online_menu_url text · delivery_scheduling_url text
delivery_scheduling_contact_name / _email / _phone text
chain_id uuid FK → retail_account_chains
w9_path · w9_uploaded_at · w9_uploaded_by (NEVER publish)
created_by · created_at · updated_at
```

**⚠️ CRITICAL DATA GAPS (verified 2026-08-14):**
- **There are NO latitude/longitude columns**, and **0 of 70 active accounts have `address_line1` + `city` populated.** The store locator cannot be built from current data. Prerequisites, in order: (1) a PSM migration adding `latitude`/`longitude` (and probably `google_place_id`) to `retail_accounts`; (2) an address backfill — likely a one-time geocoding pass matching account names against Google Places, human-reviewed in PSM; (3) then the publish job. Surface this to Ambrose as the first workstream — the website's locator UI can be built against a mock of the publish table in parallel.
- 55 of 70 active accounts have `online_menu_url`; 16 do not (known CRM gap).
- 62 distinct accounts received deliveries in the last 90 days — that's the "actively carrying our products" set the locator should show.
- All accounts are `market = 'IL'` today. Nevada exists on the ops side but has no retail accounts in this table yet — design the locator schema with `market`/state from day one.

### 4.2 `deliveries` — wholesale delivery log (drives "carried here recently")

```
id uuid PK · company_id · order_group_id uuid
retail_account_id uuid FK → retail_accounts (nullable — some legacy rows only have text)
dispensary_location text (legacy free-text account name)
order_amount numeric · delivery_date date · date_order_received date
date_stickered_labeled date · pickup_time text · est_arrival_time text
delivery_lead_time_days int · transport_company text
est_cost / est_cost_pct_of_revenue / actual_cost / actual_cost_pct_of_revenue / est_cost_variance numeric
source text · created_by · created_at · updated_at
```

**For the website, the ONLY signal to extract is:** `retail_account_id` + `max(delivery_date)` per account (filter e.g. last 90 days). Everything else on this table (amounts, costs, transport) is commercially sensitive and must never leave PSM. Note `retail_account_id` is nullable — join on it, ignore rows where it's null.

### 4.3 `brand_sales_order_items` — wholesale line items from Distru

```
line_item_id uuid PK · company_id · order_id · order_number · order_date date
delivery_date date · status text · product_name · product_sku · brand text (NOT NULL)
sku_family text (NOT NULL) · strain text · category · subcategory
customer_name text (= dispensary) · quantity · returned_quantity · unit_price · line_total
sales_rep · created_at · updated_at
```

Useful to the website only as a secondary signal for "which brands/SKUs does each store carry." **Do not publish prices, quantities, or totals.** Also note: the automated Distru feed is **currently broken** (emailed reports arrive with zero data rows; last good data ~Jul 30, 2026, backfilled manually). Don't build anything that assumes this table is current until Ambrose confirms the pipeline is fixed.

### 4.4 `menu_check_findings` / `menu_check_runs` / `menu_check_account_state` — live retail menu intelligence

The `menu-accuracy-check` automation runs **Saturdays & Wednesdays 1:00 AM CT** and harvests every Private Stock brand product listed on dispensary online menus. This is the engine behind a "Where to Buy — in stock now" feature; it ran as recently as 2026-08-14.

`menu_check_findings` (per product per store per run):
```
id · run_id FK · company_id · retail_account_id · retail_account_name
menu_url · menu_platform · brand · brand_alias_matched
menu_product_name · menu_product_url · menu_image_url · menu_variant
menu_price numeric · menu_msrp numeric
discount_pct · discount_bucket · needs_manual_check   ← GENERATED/STORED COLUMNS — never write to these
price_status (NOT NULL) · price_notes · image_status (NOT NULL) · image_notes
match_confidence ∈ {high, medium, low, none}
sheet_tab · sheet_row · sheet_match_value · sheet_image_url · manual_check_reason
review_status · reviewed_by · reviewed_at · review_note · checked_at · created_at
```

`menu_check_runs`: run metadata — `status ∈ {running, success, partial, error}`, `lookback_days`, `accounts_in_scope/checked/skipped`, `products_checked`, `products_priced`, `image_mismatch_count`, `manual_check_count`.

`menu_check_account_state`: per-account platform info — `menu_platform`, `menu_api_endpoint`, `menu_store_key`, `last_checked_at`, `last_status`, `consecutive_failures`, `is_excluded`.

**Platform coverage reality (do not overstate freshness on the website):**
| Tier | Platforms | Accounts | Coverage |
|---|---|---|---|
| 1 — headless API | Sweed (38), Mosaic (6) | 44 | Reliable, unattended |
| 2 — browser required | Dutchie (22), Jane (4), Weedmaps/Blaze (2) | 28 | Only when Chrome-attended runs happen |
| 3 — blocked | Consume (Sucuri CAPTCHA, 6), Mint (JS interstitial, 3), Vertical (1) | 10 | Never |
| — | no `online_menu_url` | 16 | Skipped |

A "where to buy with live availability" feature is honest for ~44 accounts; the rest should degrade gracefully to "carried here recently" (from deliveries) with a link to the store's menu (`online_menu_url`). Show a per-store "as of {last checked}" timestamp.

**Hard-won technical constraints (don't re-litigate):** `dutchie.com` / `api.dutchie.com` / `api.iheartjane.com` return Cloudflare 403 for all datacenter IPs regardless of headers. CAPTCHA bypass is permanently off the table. Sweed API: `POST {origin}/_api/Products/GetProductList` with `storeId` in a **header** (not body), body `{"page":1,"pageSize":500,"filters":{"brand":[ids]}}`. Mosaic API: `POST https://api.mosaic.green/v1.0/cms/{merchantId}/{storeId}/product-list`, body `{"patient_type":"RECREATIONAL","page":1,"limit":500}`, image key is `src` not `url`. Sweed brand IDs at Parkway: Higher Self 4846, Kush League 4865, Outfitters 4896, Savage Squad 16000, Terpkings 4924 (brand IDs may differ per store).

### 4.5 `strain_names` — strain directory (source for the website's strain library)

```
id · company_id · source text · original_name text (NOT NULL) · original_type text
lineage text · our_name text · brand text · our_type text · notes text
sort_order int · is_active bool · created_by · created_at · updated_at
```

93 active rows seeded from seven source sheets (Oregonix, Eschelon-Old, Eschelon-New, Cresco, PharmaCann, Galaxy Labs, PTS). **Known data issue:** the last 8 Eschelon-New rows duplicate the Galaxy Labs sheet — one set is wrong and pending deletion. For the website, publish `our_name`, `brand`, `our_type`, `lineage` (curated) — not `source`/`original_name` (those reveal genetics sourcing). Strain pages are the site's biggest SEO surface; people search strain names constantly.

### 4.6 `retail_account_chains`

```
id · company_id · name · notes · created_by · created_at · updated_at
```
16 chains covering 59 of 70 accounts. Useful for grouping locator results ("all Zen Leaf locations").

### 4.7 Tables the website must never touch, publish, or reference

`payroll_entries`, `crm_contacts` / `crm_contact_accounts`, `retail_account_notes`, `field_activities` and all `field_activity_*` tables, `worklist_*`, `production_*`, `retail_sales_hourly`, anything with costs/margins/W-9s, and the Data Registry tables. If a website feature seems to need one of these, stop and redesign — the answer is a curated publish table, not broader access.

---

## 5. PSM Database Conventions (follow these for any PSM-side work)

The website project will occasionally need PSM-side changes (the lat/lng migration, publish function, merch admin tables). When Ambrose does that work — in the PSM project or via Supabase MCP from any project — these conventions apply:

- **DDL via `apply_migration`** (tracked in migration history); **DML/verification via `execute_sql`**. After migrations: `SELECT pg_notify('pgrst', 'reload schema');`
- `execute_sql` returns only the **last** statement's result in multi-statement blocks, and each call is a separate connection (no shared transaction state across calls).
- Always verify column names via `information_schema.columns` before DML — wrong names can fail silently.
- Constraint discovery requires **both** `pg_constraint` AND `pg_indexes` (unique indexes from `CREATE UNIQUE INDEX` don't appear in `pg_constraint`).
- **RLS pattern:** one SELECT policy for active company members (`user_companies.is_active = true`), one ALL policy for manager/director/admin/super_admin via helper `get_user_role_in_company(auth.uid(), company_id)`. Views need `security_invoker = true`.
- **SECURITY DEFINER RPCs:** `REVOKE EXECUTE FROM PUBLIC, anon, authenticated;` then `GRANT EXECUTE TO authenticated;` Adding a defaulted param to an existing function creates an ambiguous overload — `DROP FUNCTION` with the old arg list first.
- Generated/stored columns (`discount_pct`, `discount_bucket`, `needs_manual_check` on `menu_check_findings`) — never write to them.
- PSM roles: `super_admin` (Ambrose) > `admin` > `director` > `manager` > `user`.

**The website's own Supabase project is NOT bound by PSM's "no dev branch" constraint** — it's greenfield; use branches/preview environments freely there. The constraint applies only to `skdhqrjxvhegbufykhyp`.

---

## 6. Recommended Publish Schema (website project, public-read tables)

Starting point for the nightly publish job — adjust during build:

```sql
-- store_locations: one row per active retail account carrying PS brands
create table store_locations (
  id uuid primary key,                    -- = retail_accounts.id (stable join key)
  name text not null,
  chain_name text,
  address_line1 text, address_line2 text,
  city text, state text, zip text,
  latitude double precision, longitude double precision,
  phone text,
  menu_url text,                          -- = online_menu_url
  brands text[] not null default '{}',    -- brands seen at this store (from menu checks / order items)
  last_delivery_within_90d boolean not null default false,
  availability_tier text,                 -- 'live' | 'recent' | 'listed'  (drives UI honesty)
  availability_checked_at timestamptz,
  published_at timestamptz not null default now()
);

-- product_availability: per store × product, tier-1 accounts only
create table product_availability (
  store_id uuid references store_locations(id),
  brand text not null,
  product_name text not null,
  variant text,
  menu_product_url text,
  image_url text,
  checked_at timestamptz not null,
  primary key (store_id, brand, product_name, coalesce_variant text generated always as (coalesce(variant,'')) stored
) );
-- NOTE: publish product presence + link + image. Do NOT publish menu_price/menu_msrp/discount_pct —
-- price display on a brand site invites MAP/relationship problems with retail partners. Revisit only
-- with Ambrose's explicit sign-off.

-- strains: from strain_names (our_name, brand, our_type, lineage only)
```

Publish mechanics: a scheduled Edge Function in the **website** project pulls from PSM via a PSM-side SECURITY DEFINER RPC (e.g. `publish_store_locator()`) called with a dedicated service key — or a scheduled Cowork task does the transfer. Either way, PSM exposes exactly one curated read surface, not table access.

---

## 7. Website → PSM Direction (merch, rewards, analytics)

- **Merch store:** Stripe Checkout (hosted page; Stripe prohibits THC products — **merch only**, keep the merch entity presentation clean of plant-touching commerce). Webhook `checkout.session.completed` → writes `orders` / `order_items` in the website project. Fulfillment UI is built **in PSM** as a new module (`merch_products`, `merch_variants`, `merch_inventory`, `orders`, `order_items`, `shipments`), reusing PSM's existing RLS pattern, role gating, and shadcn components. Shippo/EasyPost for labels.
- **Rewards:** consumer auth in the website project. Mechanic: QR on packaging → scan → points (PSM already has a QR Codes feature under Resources — generation side is half built). Redeem for merch/swag only, never cannabis (IL/NV inducement rules — compliance counsel reviews redemption logic before launch).
- **Analytics:** first-party `web_events` table in the website project (session_id, path, event_type, element, ts, referrer, UTM). Reporting dashboard built in PSM alongside sales data. Cookie consent = a `ConsentProvider` that gates script injection (nothing non-essential loads pre-consent, choice in a first-party cookie); first-party-only analytics keeps the consent story simple and avoids GA cannabis-ToS friction.
- **Retailer inquiry form** → writes into PSM `retail_accounts` at the earliest pipeline `stage` (stage history is trigger-populated via `retail_account_stage_history` — just set `stage`, the trigger logs it). Route through a PSM Edge Function, not direct table access.

---

## 8. Website Stack Decisions Already Made

- **Next.js (App Router) on Vercel** — not Vite — because the public site needs SSR/SSG for SEO. Tailwind + shadcn/ui carry over from PSM muscle memory.
- **Age gate (21+)** on entry; required for cannabis marketing and ad platforms.
- **SEO migration is mandatory pre-launch:** export the full WordPress URL inventory (Search Console / Screaming Frog), build a 301 map into `next.config.js`, carry over titles/metas/sitemap/robots, add LocalBusiness + Product structured data.
- Planned feature set beyond the basics: strain library (§4.5), COA/batch lookup, events calendar (pop-ups — PSM already tracks these as Brands Sales metrics), budtender education portal (PSM tracks "# Budtender Educations Completed"), email/SMS capture (Surfside is the measured channel in PSM).
- Phasing: (1) marketing site + content + consent + analytics + redirects → (2) store locator + availability feed → (3) auth + merch + Stripe → (4) rewards + PSM fulfillment module.

---

## 9. External Systems Reference

| System | Role | Notes |
|---|---|---|
| **Distru** | Wholesale order system → `brand_sales_order_items` | Feed currently broken (0-row emailed reports); manual backfill through Jul 30, 2026 |
| **Sweed** | POS at Parkway Tilton; menu platform at 38 accounts | Hourly retail sales feed into PSM `retail_sales_hourly` |
| **iHeartJane master product sheet** | Google Sheet `1vYYvhaWUPfqAe1NmKihdxNeBs-AizutQG0Bbnoyffao`, owned by Pierce at iHeartJane | 220 product rows across Higher Self, Outfitters, Savage Squad, TerpKings; 85 rows (39%) missing image links; sharing is "Anyone with link — Editor" (known risk). This is the reference source for product names/images — relevant when building website product pages. |
| **GoDaddy** | privatestock.co registrar | DNS cutover to Vercel at launch; keep WordPress live until 301 map is verified |
| **Cowork** | Scheduled automation platform | Runs menu-accuracy-check (Sat/Wed 1AM CT) and sweed-hourly-tracker |
| **Vercel** | Hosts PSM; will host the website as a separate project | Never edit PSM's Vercel env vars from the website project |

## 10. Open Items That Affect the Website (status as of 2026-08-14)

1. **Address/geo backfill on `retail_accounts`** — blocker for the locator; no addresses, no lat/lng columns. First PSM-side workstream.
2. Distru sales pipeline broken — don't rely on `brand_sales_order_items` freshness.
3. 16 accounts lack `online_menu_url`; 10 accounts on permanently-blocked menu platforms — locator must degrade gracefully.
4. `strain_names` has 8 known-duplicate rows pending cleanup.
5. Website Supabase project, Stripe account, and analytics schema don't exist yet — all greenfield.
6. Compliance review needed before rewards redemption logic ships (IL + NV).

---

*Verified against production `skdhqrjxvhegbufykhyp` on 2026-08-14. If PSM schema changes after this date, re-verify with `information_schema.columns` before building against it.*
