-- POD providers (D-145..D-150): two more vendor keys, a per-product size chart image,
-- and a settings table for the vendors Ambrose places orders with by hand.
-- Additive. Apply in the Supabase SQL editor; rollback at the bottom.

begin;

alter table merch_products drop constraint merch_products_fulfillment_provider_check;
alter table merch_products add constraint merch_products_fulfillment_provider_check
  check (fulfillment_provider in ('self','printify','tapstitch','nycfactory','podpartner'));
alter table merch_products add column size_chart_image jsonb;

create table fulfillment_providers (
  key text primary key,
  label text not null,
  dashboard_url text,
  production_days_min int,
  production_days_max int,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into fulfillment_providers (key, label, dashboard_url) values
  ('tapstitch','Tapstitch','https://www.tapstitch.com/account/dashboard'),
  ('nycfactory','NYC Factory POD','https://pod.nycfactoryinc.com/app'),
  ('podpartner','PODpartner','https://www.podpartner.com/user/store'),
  ('printify','Printify','https://printify.com/app');
alter table fulfillment_providers enable row level security;

commit;

-- ROLLBACK:
-- drop table fulfillment_providers;
-- alter table merch_products drop column size_chart_image;
-- alter table merch_products drop constraint merch_products_fulfillment_provider_check;
-- alter table merch_products add constraint merch_products_fulfillment_provider_check
--   check (fulfillment_provider in ('self','printify','tapstitch'));
--   (fails if any product is saved as nycfactory/podpartner — set those to 'self' first)
