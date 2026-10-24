-- ROLLBACK for 20261023190000_catalog_products_psm_sync_columns.sql (website project ihurvtxmcyahvtcydmnf).
-- Run by hand only. Drops the PSM link columns and restores the original 2-value source check.
-- NOTE: any row with source = 'psm' must be deleted or re-sourced first, or the check will fail.

begin;
alter table public.catalog_products
  drop constraint catalog_products_source_check;
update public.catalog_products set source = 'manual' where source = 'psm';
alter table public.catalog_products
  add constraint catalog_products_source_check check (source in ('sheet', 'manual'));
alter table public.catalog_products
  drop column psm_synced_at,
  drop column lineage,
  drop column psm_image_url,
  drop column psm_sku_id;
commit;
