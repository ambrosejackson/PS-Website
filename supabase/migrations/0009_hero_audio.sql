-- Hero audio autoplay + click-to-mute (D-050..D-055) + mobile variant (§7).
-- Feature is generic and per-asset opt-in (D1): new columns on content_heroes,
-- toggled from /admin/heroes. Only the page's DEFAULT hero ever plays audio (D4);
-- the DB enforces at most one autoplay-audio hero per page.

alter table public.content_heroes
  add column has_audio        boolean  not null default false,
  add column audio_autoplay   boolean  not null default false,
  add column audio_volume     smallint not null default 70,
  add column media_url_mobile text;

comment on column public.content_heroes.has_audio is
  'Admin-set: the video asset carries an audio track (best-effort pre-filled client-side on upload).';
comment on column public.content_heroes.audio_autoplay is
  'Play the audio track on the page (default hero only; muted-autoplay fallback when the browser blocks).';
comment on column public.content_heroes.audio_volume is
  'Playback volume 0-100 (clamped; never 1.0 by default — D6).';
comment on column public.content_heroes.media_url_mobile is
  'Optional smaller encode served via <source media="(max-width: 767px)">.';

alter table public.content_heroes
  add constraint content_heroes_audio_volume_range
    check (audio_volume between 0 and 100);

-- Autoplay audio only makes sense on a video that actually has an audio track.
alter table public.content_heroes
  add constraint content_heroes_audio_requires_video
    check (not audio_autoplay or (media_type = 'video' and has_audio));

-- At most one autoplay-audio hero per page.
create unique index content_heroes_one_audio_per_page
  on public.content_heroes (page) where audio_autoplay;

-- ===== Backfill =====
-- Both TerpKings videos were probed and carry AAC stereo audio. NOTE: page
-- values are stored WITH the leading slash ('/terpkings'), unlike the task
-- brief's draft SQL.
update public.content_heroes
   set has_audio = true
 where page = '/terpkings' and media_type = 'video';

update public.content_heroes
   set audio_autoplay = true, audio_volume = 70
 where page = '/terpkings' and media_type = 'video' and is_default;

select pg_notify('pgrst','reload schema');
