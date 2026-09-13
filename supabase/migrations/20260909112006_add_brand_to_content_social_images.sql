-- Migration 20260909112006 (add_brand_to_content_social_images) — applied to the linked website project via the
-- Supabase MCP in an earlier session and back-filled into the repo on 2026-09-13 from
-- supabase_migrations.schema_migrations so `supabase db push` sees a consistent history.
-- Content is the recorded statements, verbatim. Do not edit.

alter table public.content_social_images
  add column if not exists brand text;

comment on column public.content_social_images.brand is
  'Brand-page slug from the lib/brands.ts allowlist (e.g. terpkings). NULL = landing-page Follow Us strip.';
