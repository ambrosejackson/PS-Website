-- USPS shipping by ZIP via Shippo + pre-order date (PRD-USPS-SHIPPING-AND-COMIC-PREORDER, D-120..D-123).
-- All additive. Rollback: drop the nine columns.

alter table public.merch_variants
  add column weight_oz numeric(6,2),
  add column length_in numeric(5,2),
  add column width_in  numeric(5,2),
  add column height_in numeric(5,2);

comment on column public.merch_variants.weight_oz is 'Packed weight in ounces, used for USPS rate quotes. Null → store default.';

alter table public.merch_products
  add column ships_after date;

comment on column public.merch_products.ships_after is 'Pre-order: the date by which this product ships. Null = ships now.';

alter table public.orders
  add column shipping_service text,
  add column shipping_quote_id text,
  add column shipping_quote_fallback boolean not null default false,
  add column ships_after date;

comment on column public.orders.shipping_service is 'standard (USPS Ground Advantage) | priority (USPS Priority Mail) | null for pre-Shippo orders';
comment on column public.orders.shipping_quote_fallback is 'True when the Shippo quote failed and the flat fallback rate was charged.';
comment on column public.orders.ships_after is 'Latest ships_after across the order''s products at order time; the pre-order promise, frozen.';

select pg_notify('pgrst', 'reload schema');
