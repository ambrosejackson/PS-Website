-- Apparel shop home hero (D-071): the /apparel showcase renders the hero from
-- content_heroes page='/apparel' with the merch_settings copy overlaid. No row
-- has ever existed for that page (it rendered FALLBACK_HERO), so seed a
-- placeholder default — same media as the collection placeholders in 0011 — so
-- /admin/heroes has a row to replace and the overlay has something to sit on.
-- Timestamp version on purpose: keeps `supabase db push` ordering simple.

insert into public.content_heroes (page, media_url, media_type, theme, is_default, sort_order, is_active)
select '/apparel', '/placeholders/hero-default.webp', 'image', 'dark', true, 0, true
 where not exists (select 1 from public.content_heroes where page = '/apparel');

select pg_notify('pgrst', 'reload schema');
