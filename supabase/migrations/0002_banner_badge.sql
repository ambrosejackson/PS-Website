-- Optional corner badge ribbon on banner slides (docx banner reference).
alter table public.content_banners add column if not exists badge_text text;
