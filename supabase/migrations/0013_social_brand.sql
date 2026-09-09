-- 0013: brand pools for the social tiles (D-064 strip + brand-page signal feeds).
-- NULL = landing-page FOLLOW US strip; a lib/brands.ts slug (e.g. 'terpkings')
-- scopes the tile to that brand page. Applied to prod via Supabase MCP 2026-09-09.
alter table public.content_social_images
  add column if not exists brand text;

comment on column public.content_social_images.brand is
  'Brand-page slug from the lib/brands.ts allowlist (e.g. terpkings). NULL = landing-page Follow Us strip.';
