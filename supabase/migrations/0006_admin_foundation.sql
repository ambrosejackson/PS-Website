-- Migration 0006 — /admin foundation (DECISIONS D-038..D-044).
-- Website Supabase project ONLY. Never applied to the PSM project.

-- ===== catalog_products: hybrid sheet-sync + manual (D-038) =====
alter table public.catalog_products
  add column source text not null default 'manual'
    check (source in ('sheet', 'manual')),
  add column synced_at timestamptz,
  add column sync_status text
    check (sync_status in ('ok', 'quarantined', 'missing_from_sheet')),
  add column quarantine_reason text;

-- Synced rows key on sheet_row_ref; enforce uniqueness for sheet-sourced rows.
create unique index catalog_products_sheet_row_ref_key
  on public.catalog_products (sheet_row_ref)
  where source = 'sheet' and sheet_row_ref is not null;

comment on column public.catalog_products.source is
  'sheet = owned by the iHeartJane sync (name/brand/category/format/weight/thc_range/image_url); manual = admin-authored. Admin always owns is_active/description/terpene_profile/terp_category/sort_order (D-038).';

-- ===== merch_products: hybrid manual fulfillment (D-040) =====
alter table public.merch_products
  drop constraint if exists merch_products_fulfillment_provider_check;
update public.merch_products
  set fulfillment_provider = 'self'
  where fulfillment_provider is null;
alter table public.merch_products
  alter column fulfillment_provider set default 'self',
  alter column fulfillment_provider set not null,
  add constraint merch_products_fulfillment_provider_check
    check (fulfillment_provider in ('self', 'printify', 'tapstitch'));

-- ===== orders: second processor, tax, manual fulfillment workflow (D-039/D-041) =====
alter table public.orders
  add column payment_provider text not null default 'stripe'
    check (payment_provider in ('stripe', 'paypal')),
  add column paypal_order_id text unique,
  add column tax_cents int not null default 0,
  add column fulfillment_status text not null default 'new'
    check (fulfillment_status in
      ('new', 'placed_with_provider', 'packed', 'shipped', 'delivered', 'canceled')),
  add column tracking jsonb,
  add column internal_note text;
-- No default going forward: every insert must name its rail explicitly.
alter table public.orders alter column payment_provider drop default;

create index orders_fulfillment_status_idx
  on public.orders (fulfillment_status, created_at desc);

-- ===== messages: single contact form, inquiry-typed (D-043) =====
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_type text not null check (inquiry_type in ('consumer', 'retailer', 'press')),
  name text not null,
  email extensions.citext not null,
  company text,
  body text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create index messages_status_created_idx on public.messages (status, created_at desc);
create index messages_inquiry_type_idx on public.messages (inquiry_type)
  where inquiry_type = 'retailer';   -- future PSM W3 ingest feed

-- No public read; insert via server route only (service role); admin read/update
-- via the server-side staff-allowlist pattern (service role after isAdminEmail).
alter table public.messages enable row level security;

-- ===== Storage buckets (public read; writes only via service-role signed
-- upload URLs minted by admin server actions after the staff-allowlist check —
-- the same pattern as 0005/hero-media, so no anon/authenticated write policies).
-- file_size_limit is the bucket's hard cap; the per-mime caps (images 10 MB,
-- heroes mp4 60 MB, banners mp4 30 MB) are enforced in lib/admin/buckets.ts on
-- both the client uploader and the signing action.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('heroes',   'heroes',   true, 62914560, array['image/jpeg','image/png','image/webp','video/mp4']),
  ('banners',  'banners',  true, 31457280, array['image/jpeg','image/png','image/webp','video/mp4']),
  ('blog',     'blog',     true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('products', 'products', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('apparel',  'apparel',  true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read admin media buckets" on storage.objects;
create policy "Public read admin media buckets" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('heroes', 'banners', 'blog', 'products', 'apparel'));
