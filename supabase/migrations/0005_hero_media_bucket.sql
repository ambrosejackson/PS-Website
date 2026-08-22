-- Hero media storage (build plan decision 3: content admin in website /admin).
-- Public bucket for hero images/videos managed from /admin/heroes.
-- Uploads happen ONLY through service-role signed upload URLs minted by the
-- admin server actions (staff allowlist checked there) — so no insert/update/
-- delete policies are granted to anon/authenticated. Public read is explicit.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hero-media',
  'hero-media',
  true,
  52428800,                                   -- 50 MB
  array['video/mp4', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read hero-media" on storage.objects;
create policy "Public read hero-media" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'hero-media');
