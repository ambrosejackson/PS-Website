-- INDICA / SATIVA / HYBRID chip on product detail pages (docx Jeeter reference).
alter table public.catalog_products
  add column if not exists strain_type text
  check (strain_type in ('indica','sativa','hybrid'));
