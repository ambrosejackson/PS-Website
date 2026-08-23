-- Migration 0007 — real merch commerce (D-039..D-042): pending-order flow shared
-- by Stripe Checkout and PayPal, line-item snapshots for fulfillment, customer
-- identity for the no-auth order lookup.
-- Website Supabase project ONLY. Never applied to the PSM project.

-- Orders are created PENDING when a checkout starts (either rail) and flipped to
-- paid by the Stripe webhook / PayPal capture; 'failed' for abandoned/declined.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending','paid','submitted_to_provider','shipped','delivered','refunded','failed'));
alter table public.orders alter column status set default 'pending';

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists paypal_capture_id text,
  add column if not exists stripe_tax_calculation_id text,   -- PayPal rail: Stripe Tax calc used for parity
  add column if not exists discount_code_id uuid references public.discount_codes(id) on delete set null,
  add column if not exists paid_at timestamptz,
  add column if not exists shipped_at timestamptz;

create index if not exists orders_email_idx on public.orders (email);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- Snapshots so the admin / emails never depend on a product still existing.
alter table public.order_items
  add column if not exists product_id uuid references public.merch_products(id) on delete set null,
  add column if not exists title text,
  add column if not exists sku text,
  add column if not exists variant_label text,
  add column if not exists fulfillment_provider text,
  add column if not exists image_url text;

-- Keep the variant FK, but don't block deleting a variant that was ordered.
alter table public.order_items drop constraint if exists order_items_variant_id_fkey;
alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.merch_variants(id) on delete set null;
