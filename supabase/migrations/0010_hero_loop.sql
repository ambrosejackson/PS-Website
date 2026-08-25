-- Hero video looping toggle (D-057).
--
-- Video heroes have always been rendered with the HTML `loop` attribute
-- hard-coded on. The TerpKings hero now carries a music bed (0009), and a music
-- bed that restarts every 101 seconds is a different thing from ambient motion —
-- so looping becomes a per-asset admin choice.
--
-- Additive and behaviour-preserving: default true means every existing row keeps
-- looping exactly as it does today. False = play through once and hold the final
-- frame (no auto-replay); the client also stops re-issuing play() on an ended
-- non-looping hero when the tab regains focus or the visitor unmutes.

alter table public.content_heroes
  add column video_loop boolean not null default true;

comment on column public.content_heroes.video_loop is
  'Video heroes only: loop playback. False = play once and hold the final frame (no auto-replay).';

select pg_notify('pgrst','reload schema');
