-- Website catalog synced from PS Management (M1). PRD: PS Management Project
-- claude/website-catalog-sync-prd-2026-10-23.md. Additive: 4 nullable columns + widened source check.
-- APPLIED to ihurvtxmcyahvtcydmnf on 2026-10-23 via MCP apply_migration (name: catalog_products_psm_sync_columns).
-- Rollback: supabase/manual/20261023_rollback_catalog_products_psm_sync_columns.sql

alter table public.catalog_products
  add column psm_sku_id uuid unique,          -- product_skus.id in PS Management; the durable link
  add column psm_image_url text,              -- plain public object URL in PSM Storage (render URLs derived in the app)
  add column lineage text,
  add column psm_synced_at timestamptz;

alter table public.catalog_products
  drop constraint catalog_products_source_check,
  add constraint catalog_products_source_check check (source in ('sheet', 'manual', 'psm'));

comment on column public.catalog_products.psm_sku_id is 'PS Management product_skus.id. When set, name/description/category/format/weight/strain_type/lineage/is_active/psm_image_url are managed by the PSM publish and read-only in /admin/products.';
