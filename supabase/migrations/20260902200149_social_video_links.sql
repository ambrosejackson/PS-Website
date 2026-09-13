-- Migration 20260902200149 (social_video_links) — applied to the linked website project via the
-- Supabase MCP in an earlier session and back-filled into the repo on 2026-09-13 from
-- supabase_migrations.schema_migrations so `supabase db push` sees a consistent history.
-- Content is the recorded statements, verbatim. Do not edit.

-- Social strip: post links + video tiles (D-068; revises D-064 "no post links").
-- Additive: three nullable/defaulted columns, bucket now also takes MP4 <= 20 MB.

alter table public.content_social_images
  add column if not exists link_url text,
  add column if not exists media_type text not null default 'image',
  add column if not exists poster_url text;

alter table public.content_social_images
  drop constraint if exists content_social_images_media_type_check;
alter table public.content_social_images
  add constraint content_social_images_media_type_check
  check (media_type in ('image', 'video'));

update storage.buckets
   set file_size_limit = 20971520,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4']
 where id = 'social';
