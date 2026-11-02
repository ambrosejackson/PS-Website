-- Analytics P2 (admin dashboard PRD, Phase 2; D-140).
-- APPLIED to the website Supabase project on 2026-11-02 by Ambrose via the Supabase SQL editor.
--
-- PURPOSE
--   1. Extend first-party web_events with a visitor id, device class, brand
--      context and an event-specific jsonb payload, so product_view /
--      add_to_cart / checkout_start / purchase can be captured and attributed.
--   2. Record refunds on orders (Stripe charge.refunded) so dashboard revenue
--      can net them out, and keep the web session / visitor that placed an
--      order so the server-side `purchase` event can be attributed on both
--      payment rails (PayPal has no free-form metadata; Stripe metadata is a copy).
--   3. Daily rollups (America/Chicago days) feeding the Phase 3 analytics page,
--      written by /api/cron/analytics-rollup, which also purges raw rows > 90 days.
--
-- OBJECTS CREATED / ALTERED (all additive; nothing dropped or rewritten)
--   web_events          + visitor_id text, device text, brand text, props jsonb
--   web_events_type_ts_idx  index on web_events (event_type, ts)
--                       (web_events_ts_idx on (ts) already exists from 0001_v1_schema.sql)
--   orders              + refunded_cents integer not null default 0, refunded_at timestamptz,
--                         web_session_id text, web_visitor_id text
--   web_events_daily    new table, RLS enabled, no policies (service role only)
--
-- ROLLBACK (run in this order)
--   drop table if exists public.web_events_daily;
--   drop index if exists public.web_events_type_ts_idx;
--   alter table public.web_events
--     drop column if exists visitor_id,
--     drop column if exists device,
--     drop column if exists brand,
--     drop column if exists props;
--   alter table public.orders
--     drop column if exists refunded_cents,
--     drop column if exists refunded_at,
--     drop column if exists web_session_id,
--     drop column if exists web_visitor_id;

-- web_events --------------------------------------------------------------
alter table public.web_events
  add column if not exists visitor_id text,
  add column if not exists device text,        -- 'mobile' | 'tablet' | 'desktop'
  add column if not exists brand text,         -- path-prefix brand (outfitters|terpkings|higherself|savagesquadstrains|apparel); null for landing/other
  add column if not exists props jsonb;        -- event-specific payload (product_id, order_id, cents); never PII

create index if not exists web_events_type_ts_idx on public.web_events (event_type, ts);

-- orders ------------------------------------------------------------------
alter table public.orders
  add column if not exists refunded_cents integer not null default 0,  -- cumulative, assigned from Stripe charge.amount_refunded
  add column if not exists refunded_at timestamptz,
  add column if not exists web_session_id text,                        -- web_events.session_id at checkout start
  add column if not exists web_visitor_id text;                        -- web_events.visitor_id at checkout start

-- daily rollups (Chicago days) ---------------------------------------------
create table if not exists public.web_events_daily (
  day        date    not null,
  brand      text    not null default '',   -- '' when web_events.brand is null
  path       text    not null,
  event_type text    not null,
  events     integer not null default 0,
  sessions   integer not null default 0,    -- count(distinct session_id)
  visitors   integer not null default 0,    -- count(distinct visitor_id)
  primary key (day, brand, path, event_type)
);

alter table public.web_events_daily enable row level security;  -- service role only, no policies
