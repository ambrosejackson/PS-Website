-- Migration 20260902134332 (social_media) — applied to the linked website project via the
-- Supabase MCP in an earlier session and back-filled into the repo on 2026-09-13 from
-- supabase_migrations.schema_migrations so `supabase db push` sees a consistent history.
-- Content is the recorded statements, verbatim. Do not edit.

-- Social Media strip (D-064): admin-uploaded images that scroll in the landing
-- page FOLLOW US marquee and open in a lightbox with IG/FB CTAs. Images do NOT
-- link to posts (Ambrose, 2026-09-02); the goal is the click-through buttons.
-- Additive only — new table + new bucket. Rollback: drop table, delete bucket.

create table if not exists public.content_social_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists content_social_images_order_idx
  on public.content_social_images (is_active, sort_order);

alter table public.content_social_images enable row level security;

drop policy if exists "Public read active" on public.content_social_images;
create policy "Public read active" on public.content_social_images
  for select to anon, authenticated using (is_active = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('social', 'social', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read social bucket" on storage.objects;
create policy "Public read social bucket" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'social');
