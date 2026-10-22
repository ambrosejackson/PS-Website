-- Catalog image pipeline (2026-10): /admin/products becomes the source of truth
-- for product images. Renditions live in the `products` bucket under
-- catalog/{productId}/{hash}/{400|800|1600}.webp (lib/catalog/product-image.ts).

alter table public.catalog_products
  add column if not exists image_storage_path text,
  add column if not exists image_error text,
  add column if not exists image_source_url text;

-- Preserve every current external/local image reference for rollback.
update public.catalog_products
   set image_source_url = image_url
 where image_source_url is null
   and image_url is not null and image_url <> '';

comment on column public.catalog_products.image_storage_path is
  'Storage folder in bucket products holding 400/800/1600.webp, e.g. catalog/{productId}/{hash}. Null = no processed image.';
comment on column public.catalog_products.image_error is
  'Last image pipeline failure for this product (admin-visible). Null when the last run succeeded.';
comment on column public.catalog_products.image_source_url is
  'Original image reference before the 2026-10 Storage import. Audit/rollback only.';

-- Originals are staged in products/_staging/{uuid}.{ext} and resized server-side;
-- the pipeline caps sources at 15 MB, so the bucket cap moves from 10 MB to match.
update storage.buckets
   set file_size_limit = 15728640
 where id = 'products';
