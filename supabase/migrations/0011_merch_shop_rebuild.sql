-- Migration 0011 — Apparel shop rebuild, Part A (Jeeter-structure; D-071..D-080).
-- Website Supabase project ONLY (ihurvtxmcyahvtcydmnf). Never applied to the PSM project.
--
-- Introspected 2026-09-13 before writing (information_schema.columns, linked project):
--   merch_products : id name slug description brand images is_active fulfillment_provider
--                    provider_product_id sort_order created_at updated_at
--   merch_variants : id product_id sku size color price_cents stripe_price_id
--                    provider_variant_id is_active
--   content_heroes : id page nav_target media_url media_type theme is_default sort_order
--                    is_active poster_url has_audio audio_autoplay audio_volume
--                    media_url_mobile video_loop
-- Nothing added below already exists. Everything here is ADDITIVE and safe against the
-- code currently on main: no existing column changes type or nullability, `images`
-- is left untouched (production still reads it as string[]; lib/merchImages.ts will
-- normalise both shapes), and the only data writes are backfills of new columns.
--
-- Hero page keys: content_heroes.page is a ROUTE with a leading slash everywhere in
-- this codebase ('/', '/terpkings', '/apparel'): getHeroesForPage(page) queries it,
-- revalidateFor({kind:'heroes', page}) revalidates it as a path, and /admin/heroes
-- uses page.slice(1) as the storage folder. The brief's draft key 'apparel:{slug}'
-- would break all three, so hero_page is derived from the slug as a real route:
--   'all'  -> '/apparel/shop'          (the reserved shop-all row, D-078)
--   others -> '/apparel/collections/{slug}'

-- ===== Collections (D-071) =====
create table public.merch_collections (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tagline         text,                      -- collection page subhead ("Shop the Look")
  subtitle        text,                      -- carousel card subtitle ("Collaboration")
  cover_image_url text,                      -- Collections carousel card (never set on 'all')
  hero_page       text not null generated always as (
                    case when slug = 'all' then '/apparel/shop'
                         else '/apparel/collections/' || slug end
                  ) stored,                  -- content_heroes.page key (see header note)
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint merch_collections_window_check
    check (starts_at is null or ends_at is null or starts_at < ends_at)
);

comment on table public.merch_collections is
  'Apparel collections (D-071). Row slug=''all'' is reserved for the shop-all grid: editable, never deletable, never in the carousel (D-078).';
comment on column public.merch_collections.hero_page is
  'Derived route key for content_heroes.page: /apparel/shop for the reserved ''all'' row, else /apparel/collections/{slug}.';

create index merch_collections_active_sort_idx
  on public.merch_collections (sort_order) where is_active;

create trigger merch_collections_set_updated_at
  before update on public.merch_collections
  for each row execute function public.set_updated_at();

-- Reserved row for the shop-all grid (D-078); never shown in the carousel.
insert into public.merch_collections (name, slug, tagline, sort_order, is_active)
values ('All apparel', 'all', null, -1, true);

-- Launch collections (confirmed by Ambrose 2026-09-13).
insert into public.merch_collections (name, slug, tagline, sort_order) values
  ('Private Stock Essentials', 'essentials', 'Shop the essentials', 0),
  ('Fall 2026 Drop',           'fall-2026',  'Shop the drop',       1);

-- ===== Editorial interstitial banners (collection-scoped, D-078) =====
create table public.merch_collection_banners (
  id               uuid primary key default gen_random_uuid(),
  collection_id    uuid not null references public.merch_collections(id) on delete cascade,
  insert_after     int not null check (insert_after > 0),   -- product index the banner follows
  media_url        text not null,
  media_url_mobile text,
  media_type       text not null default 'image' check (media_type in ('image','video')),
  link_url         text,
  alt              text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

comment on table public.merch_collection_banners is
  'Full-row editorial images spliced into a collection grid after product N (insert_after). /apparel/shop uses the banners of the reserved ''all'' collection (D-078).';

-- Covers the FK and the grid query (collection, ordered by position).
create index merch_collection_banners_collection_idx
  on public.merch_collection_banners (collection_id, insert_after);

-- ===== Category feature tiles on the home page (§1a #7) =====
create table public.merch_tab_tiles (
  tab         text primary key,             -- must match a TABS slug in lib/merchCategories.ts
  image_url   text not null,
  label       text,                          -- defaults to the tab label when null
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

comment on table public.merch_tab_tiles is
  'Home-page category tiles, one per sub-nav tab (lib/merchCategories.ts TABS). Link target is /apparel/shop?tab={tab}.';

-- ===== Home-page settings singleton (D-079) =====
create table public.merch_settings (
  id                     boolean primary key default true check (id),   -- exactly one row
  hero_headline          text,
  hero_subline           text,
  hero_cta_label         text default 'View more',
  hero_cta_url           text,               -- usually /apparel/collections/{slug}
  featured_collection_id uuid references public.merch_collections(id) on delete set null,
  featured_cta_label     text default 'Available now',
  new_releases_count     int not null default 12
                         check (new_releases_count between 4 and 24),
  updated_at             timestamptz not null default now()
);

comment on table public.merch_settings is
  'Single-row settings for the /apparel showcase home (D-079). Hero MEDIA still comes from content_heroes page=''/apparel''; this row holds the copy, CTA, featured collection and New Releases count.';

create trigger merch_settings_set_updated_at
  before update on public.merch_settings
  for each row execute function public.set_updated_at();

insert into public.merch_settings
  (id, hero_headline, hero_subline, hero_cta_label, hero_cta_url, featured_collection_id)
values
  (true, 'Fall 2026 Drop', 'Private Stock Apparel', 'View more', '/apparel/collections/fall-2026',
   (select id from public.merch_collections where slug = 'essentials'));

-- ===== Products (D-072 category, D-074 stock threshold, D-080 released_at) =====
alter table public.merch_products
  add column if not exists collection_id       uuid references public.merch_collections(id) on delete set null,
  add column if not exists category            text,
  add column if not exists low_stock_threshold int not null default 3 check (low_stock_threshold >= 0),
  add column if not exists released_at         timestamptz;

comment on column public.merch_products.category is
  'Fine-grained category (nine values); validated in lib/merchCategories.ts + the admin select, grouped into sub-nav tabs by config (D-072). Not a DB enum on purpose.';
comment on column public.merch_products.low_stock_threshold is
  'Low Stock badge when any tracked variant has 0 < stock_qty <= threshold (D-074). Default 3.';
comment on column public.merch_products.released_at is
  'Drives New Releases ordering (D-080). Admin-editable; defaults to created_at so a re-import or edit never reshuffles the row.';

update public.merch_products set released_at = created_at where released_at is null;
alter table public.merch_products
  alter column released_at set default now(),
  alter column released_at set not null;

-- Product slugs that would shadow the new routes (D-071). Admin validation rejects
-- them too; this is the backstop. All 8 existing slugs pass.
alter table public.merch_products
  add constraint merch_products_slug_not_reserved
  check (slug not in ('shop', 'collections', 'cart', 'checkout', 'order'));

-- Grid ordering is (sort_order, released_at desc); storefront reads active rows only.
create index if not exists merch_products_collection_idx
  on public.merch_products (collection_id, sort_order, released_at desc);
create index if not exists merch_products_category_idx
  on public.merch_products (category);
create index if not exists merch_products_released_idx
  on public.merch_products (released_at desc) where is_active;

-- Put every existing product into Essentials so the home page is populated on the
-- first preview (Ambrose, 2026-09-13).
update public.merch_products
   set collection_id = (select id from public.merch_collections where slug = 'essentials')
 where collection_id is null;

-- ===== Variants: optional stock (D-074) =====
alter table public.merch_variants
  add column if not exists stock_qty int check (stock_qty is null or stock_qty >= 0);

comment on column public.merch_variants.stock_qty is
  'null = made to order (Printify/Tapstitch), never badged; a number = tracked, admin-entered in v1 (D-074).';

-- ===== Default hero rows for the new hero pages =====
-- Placeholder media, same shape as the landing default row, so /admin/heroes can
-- replace them immediately. (There is no content_heroes row for '/apparel' today —
-- that page renders FALLBACK_HERO — so nothing existing is copied.)
insert into public.content_heroes (page, media_url, media_type, theme, is_default, sort_order, is_active)
select c.hero_page, '/placeholders/hero-default.webp', 'image', 'dark', true, 0, true
  from public.merch_collections c
 where not exists (select 1 from public.content_heroes h where h.page = c.hero_page);

-- ===== RLS: public SELECT mirrors merch_products; writes are service-role only =====
alter table public.merch_collections        enable row level security;
alter table public.merch_collection_banners enable row level security;
alter table public.merch_tab_tiles          enable row level security;
alter table public.merch_settings           enable row level security;

create policy "Public read active" on public.merch_collections
  for select to anon, authenticated using (is_active);

create policy "Public read active" on public.merch_collection_banners
  for select to anon, authenticated using (is_active);

create policy "Public read active" on public.merch_tab_tiles
  for select to anon, authenticated using (is_active);

create policy "Public read" on public.merch_settings
  for select to anon, authenticated using (true);

select pg_notify('pgrst', 'reload schema');
