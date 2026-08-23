-- Migration 0008 — first-frame poster for video heroes (loading experience):
-- painted immediately, the video fades in over it once it starts playing.
alter table public.content_heroes add column if not exists poster_url text;
comment on column public.content_heroes.poster_url is
  'First-frame webp captured client-side at upload (video heroes only); painted before the video plays.';
