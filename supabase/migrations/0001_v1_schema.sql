-- Migration 0001 — PS-Website v1 schema (build plan §4)
-- Website Supabase project ONLY. Never applied to the PSM project.

create extension if not exists citext with schema extensions;

-- ===== Shared trigger: keep updated_at current =====
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ===== Published from PSM (public read, service-role write) =====
create table public.store_locations (
  id uuid primary key,                    -- = PSM retail_accounts.id
  name text not null,
  chain_name text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  latitude double precision,
  longitude double precision,
  phone text,
  menu_url text,
  brands text[] not null default '{}',
  last_delivery_within_90d boolean not null default false,
  availability_tier text check (availability_tier in ('live','recent','listed')),
  availability_checked_at timestamptz,
  published_at timestamptz not null default now()
);

create table public.product_availability (
  store_id uuid not null references public.store_locations(id) on delete cascade,
  brand text not null,
  product_name text not null,
  variant text not null default '',
  menu_product_url text,
  image_url text,
  checked_at timestamptz not null,
  primary key (store_id, brand, product_name, variant)
);
-- NO price columns. Ever. (Guardrail #2)

create index product_availability_brand_product_idx
  on public.product_availability (brand, product_name);

create table public.strains (
  id uuid primary key,
  our_name text not null,
  brand text,
  our_type text,
  lineage text,
  slug text unique,
  is_active boolean not null default true
);

-- ===== Product catalog (content-managed, synced from iHeartJane sheet) =====
create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  slug text unique not null,
  category text,
  format text,
  weight text,
  thc_range text,
  description text,
  image_url text,
  image_missing boolean not null default false,
  terpene_profile jsonb,                  -- [{name, note}] 2-3 dominant
  terp_category text,                     -- TerpKings: fruit/haze/gas/dessert/floral
  sheet_row_ref text,                     -- provenance to iHeartJane sheet
  is_active boolean not null default true,
  sort_order int,
  updated_at timestamptz not null default now()
);

create index catalog_products_brand_idx on public.catalog_products (brand);

create trigger catalog_products_set_updated_at
  before update on public.catalog_products
  for each row execute function public.set_updated_at();

-- ===== Subscribers & discount codes (service-role only) =====
create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext unique not null,
  persona text not null,                  -- from personas.ts map
  source_path text not null,              -- exact page at submit
  brand_context text,                     -- brand page if applicable
  consent_marketing boolean not null,
  consented_at timestamptz not null default now(),
  discount_code_id uuid,
  synced_to_psm_at timestamptz            -- set by PSM sync job
);

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.subscribers(id) on delete set null,
  stripe_promotion_code_id text not null,
  code text not null unique,
  pct int not null default 15,
  redeemed_at timestamptz,
  expires_at timestamptz
);

create index discount_codes_subscriber_id_idx on public.discount_codes (subscriber_id);

alter table public.subscribers
  add constraint subscribers_discount_code_fk
  foreign key (discount_code_id) references public.discount_codes(id) on delete set null;

create index subscribers_discount_code_id_idx on public.subscribers (discount_code_id);
create index subscribers_synced_idx on public.subscribers (synced_to_psm_at) where synced_to_psm_at is null;

-- ===== Merch commerce =====
create table public.merch_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  brand text,
  images jsonb not null default '[]',
  is_active boolean not null default true,
  fulfillment_provider text check (fulfillment_provider in ('printify','tapstitch')),
  provider_product_id text,
  sort_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger merch_products_set_updated_at
  before update on public.merch_products
  for each row execute function public.set_updated_at();

create table public.merch_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.merch_products(id) on delete cascade,
  sku text unique not null,
  size text,
  color text,
  price_cents int not null,
  stripe_price_id text,
  provider_variant_id text,
  is_active boolean not null default true
);

create index merch_variants_product_id_idx on public.merch_variants (product_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  stripe_payment_intent text,
  email extensions.citext,
  status text not null default 'paid'
    check (status in ('paid','submitted_to_provider','shipped','delivered','refunded')),
  subtotal_cents int,
  discount_cents int,
  shipping_cents int,
  total_cents int,
  shipping_address jsonb,
  promo_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.merch_variants(id),
  qty int not null,
  unit_price_cents int not null,
  provider_order_id text,
  tracking jsonb
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

-- ===== Content management (/admin) =====
create table public.content_heroes (
  id uuid primary key default gen_random_uuid(),
  page text not null,                     -- route the hero belongs to ('/', '/outfitters', ...)
  nav_target text,                        -- which right-nav hover triggers it (null = default asset)
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  theme text not null default 'dark' check (theme in ('light','dark')),  -- auto-computed, overridable
  is_default boolean not null default false,
  sort_order int,
  is_active boolean not null default true
);

create index content_heroes_page_idx on public.content_heroes (page);

create table public.content_banners (
  id uuid primary key default gen_random_uuid(),
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  link_url text,
  sort_order int,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  hero_image text,
  body_md text,
  published_at timestamptz,
  is_published boolean not null default false,
  seo jsonb
);

-- ===== Analytics (first-party only) =====
create table public.web_events (
  id bigint generated always as identity primary key,
  session_id text,
  path text,
  event_type text,
  element text,
  referrer text,
  utm jsonb,
  ts timestamptz not null default now()
);

create index web_events_ts_idx on public.web_events (ts);
create index web_events_session_idx on public.web_events (session_id);

-- ===== RLS posture (build plan §4) =====
-- Public SELECT on published + catalog + content tables.
-- Everything else is service-role / Edge-Function only (no policies = no anon access).

alter table public.store_locations      enable row level security;
alter table public.product_availability enable row level security;
alter table public.strains              enable row level security;
alter table public.catalog_products     enable row level security;
alter table public.merch_products       enable row level security;
alter table public.merch_variants       enable row level security;
alter table public.content_heroes       enable row level security;
alter table public.content_banners      enable row level security;
alter table public.blog_posts           enable row level security;
alter table public.subscribers          enable row level security;
alter table public.discount_codes       enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.web_events           enable row level security;

create policy "Public read" on public.store_locations
  for select to anon, authenticated using (true);

create policy "Public read" on public.product_availability
  for select to anon, authenticated using (true);

create policy "Public read active" on public.strains
  for select to anon, authenticated using (is_active);

create policy "Public read active" on public.catalog_products
  for select to anon, authenticated using (is_active);

create policy "Public read active" on public.merch_products
  for select to anon, authenticated using (is_active);

create policy "Public read active" on public.merch_variants
  for select to anon, authenticated using (is_active);

create policy "Public read active" on public.content_heroes
  for select to anon, authenticated using (is_active);

create policy "Public read active" on public.content_banners
  for select to anon, authenticated using (is_active);

create policy "Public read published" on public.blog_posts
  for select to anon, authenticated using (is_published);

-- subscribers, discount_codes, orders, order_items, web_events:
-- RLS enabled with NO policies — reachable only via service-role (server routes / Edge Functions).
