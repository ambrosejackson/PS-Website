-- Events + RSVPs + reminders + check-in staff (PRD claude/PRD-KICKBACK-RSVP.md Rev 3, D-090..D-097).
-- Additive only. Rollback (drops the whole feature, nothing else depends on it):
--   select cron.unschedule('event-jobs');   -- if scheduled (see docs/EVENTS-RUNBOOK.md)
--   drop table public.event_reminder_sends, public.event_reminders, public.event_rsvps,
--              public.dispensaries, public.staff_roles, public.events cascade;
--   drop function public.claim_rsvp, public.cancel_rsvp, public.release_waitlisted_plate,
--                 public.resolve_reminder_send_at, public.claim_due_reminders;
--
-- Every table: RLS on, NO policies. All reads/writes go through server code with the
-- service role (API routes / server actions that do their own authorization).

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  tagline text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Chicago',
  venue_name text,
  address text not null,
  map_url text,
  rsvp_open boolean not null default true,
  rsvp_closes_at timestamptz,               -- null = open through the event (D-018 in PRD)
  plate_cap int not null default 50 check (plate_cap >= 0),
  psm_qr_code_id uuid,                      -- PSM crm_qr_codes.id for "The Kickback 2026" (opaque here)
  email_from text not null default 'The Kickback <events@privatestock.co>',
  email_reply_to text not null default 'ambrose@privatestock.co',
  weather_note text,                        -- optional; merge field {weather_note}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
alter table public.events enable row level security;

-- ---------------------------------------------------------------------------
-- dispensaries — mirror of PSM's dispensary directory (public-safe columns only),
-- refreshed by /api/cron/event-jobs from PSM Edge Function `dispensary-directory`.
-- ---------------------------------------------------------------------------
create table public.dispensaries (
  psm_account_id uuid primary key,
  name text not null,
  city text,
  zip text,
  address text,
  license_number text,
  chain_name text,
  is_active boolean not null default true,
  refreshed_at timestamptz not null default now()
);
create index dispensaries_name_idx on public.dispensaries (lower(name));
alter table public.dispensaries enable row level security;

-- ---------------------------------------------------------------------------
-- event_rsvps
-- ---------------------------------------------------------------------------
create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  first_name text not null check (length(btrim(first_name)) between 1 and 80),
  last_name  text not null check (length(btrim(last_name)) between 1 and 80),
  email citext not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  confirmed_21 boolean not null check (confirmed_21),
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  is_budtender boolean not null default false,
  dispensary_psm_account_id uuid,           -- from the autocomplete; null when "Other"
  dispensary_name text,
  dispensary_city text,
  plate_status text not null default 'none' check (plate_status in ('none','confirmed','waitlisted')),
  plate_waitlist_position int,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  cancelled_at timestamptz,
  source text not null default 'web' check (source in ('web','walk_up','admin')),
  ticket_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  checked_in_at timestamptz,
  checked_in_by text,
  badge_verified_at timestamptz,
  badge_verified_by text,
  plate_redeemed_at timestamptz,
  plate_redeemed_by text,
  email_bounced boolean not null default false,
  confirmation_sent_at timestamptz,
  psm_contact_id uuid,
  psm_synced_at timestamptz,
  psm_sync_error text,
  psm_sync_attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, email),
  check (not is_budtender or (dispensary_name is not null and dispensary_city is not null)),
  check (plate_status = 'none' or is_budtender),
  check (plate_redeemed_at is null or badge_verified_at is not null)
);
create index event_rsvps_event_idx on public.event_rsvps (event_id, status);
create index event_rsvps_sync_idx on public.event_rsvps (psm_synced_at) where psm_synced_at is null;
create trigger event_rsvps_set_updated_at before update on public.event_rsvps
  for each row execute function public.set_updated_at();
alter table public.event_rsvps enable row level security;

-- ---------------------------------------------------------------------------
-- event_reminders + sends
-- ---------------------------------------------------------------------------
create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  channel text not null default 'email' check (channel in ('email','sms','both')),
  send_mode text not null default 'relative' check (send_mode in ('absolute','relative')),
  send_at timestamptz,                      -- absolute mode
  offset_days int,                          -- relative mode: days from the event's local date (-7, -1, 0, +1)
  local_time time,                          -- relative mode: wall-clock time in events.timezone
  audience text not null default 'all' check (audience in
    ('all','budtenders','plate_holders','plate_waitlist','checked_in','not_checked_in','opted_in')),
  is_marketing boolean not null default false,   -- true => only opted-in recipients, regardless of audience
  subject text not null,
  body_html text not null,
  enabled boolean not null default true,
  status text not null default 'scheduled' check (status in ('draft','scheduled','sending','sent','failed')),
  resolved_send_at timestamptz,
  sent_at timestamptz,
  recipient_count int,
  last_error text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (send_mode = 'absolute' and send_at is not null) or
    (send_mode = 'relative' and offset_days is not null and local_time is not null)
  )
);
create index event_reminders_due_idx on public.event_reminders (resolved_send_at) where status = 'scheduled' and enabled;
alter table public.event_reminders enable row level security;

create table public.event_reminder_sends (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.event_reminders(id) on delete cascade,
  rsvp_id uuid not null references public.event_rsvps(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email','sms')),
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued','sent','delivered','bounced','complained','failed')),
  error text,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (reminder_id, rsvp_id, channel)
);
create index event_reminder_sends_provider_idx on public.event_reminder_sends (provider_message_id);
alter table public.event_reminder_sends enable row level security;

-- ---------------------------------------------------------------------------
-- staff_roles — check-in-only staff (admins stay on ADMIN_ALLOWED_EMAILS)
-- ---------------------------------------------------------------------------
create table public.staff_roles (
  email citext primary key,
  role text not null default 'checkin' check (role in ('checkin')),
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.staff_roles enable row level security;

-- ---------------------------------------------------------------------------
-- Reminder send-time resolution (relative → absolute in the event's timezone)
-- ---------------------------------------------------------------------------
create or replace function public.resolve_reminder_send_at(r public.event_reminders)
returns timestamptz language sql stable set search_path = public, extensions as $$
  select case
    when r.send_mode = 'absolute' then r.send_at
    else (((e.starts_at at time zone e.timezone)::date + r.offset_days) + r.local_time) at time zone e.timezone
  end
  from public.events e where e.id = r.event_id
$$;

create or replace function public.event_reminders_resolve_trg()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  new.resolved_send_at := public.resolve_reminder_send_at(new);
  new.updated_at := now();
  return new;
end $$;
create trigger event_reminders_resolve before insert or update on public.event_reminders
  for each row execute function public.event_reminders_resolve_trg();

-- Moving an event re-times its unsent reminders.
create or replace function public.events_retime_reminders_trg()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.starts_at is distinct from old.starts_at or new.timezone is distinct from old.timezone then
    update public.event_reminders set updated_at = now()
     where event_id = new.id and status in ('draft','scheduled');
  end if;
  return new;
end $$;
create trigger events_retime_reminders after update on public.events
  for each row execute function public.events_retime_reminders_trg();

-- ---------------------------------------------------------------------------
-- claim_rsvp — race-safe create/reactivate + plate allocation
-- ---------------------------------------------------------------------------
create or replace function public.claim_rsvp(
  p_event_id uuid,
  p_first_name text, p_last_name text, p_email text, p_phone text,
  p_marketing_opt_in boolean,
  p_is_budtender boolean,
  p_dispensary_psm_account_id uuid, p_dispensary_name text, p_dispensary_city text,
  p_source text default 'web'
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ev public.events%rowtype;
  existing public.event_rsvps%rowtype;
  confirmed_plates int;
  v_plate text := 'none';
  v_pos int;
  rec public.event_rsvps%rowtype;
  v_exists boolean;
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found'; end if;
  if not ev.rsvp_open or (ev.rsvp_closes_at is not null and now() > ev.rsvp_closes_at) or now() > ev.ends_at then
    raise exception 'rsvp_closed';
  end if;

  select * into existing from public.event_rsvps
   where event_id = p_event_id and email = p_email::citext;
  v_exists := found;

  if v_exists and existing.status = 'confirmed' then
    return jsonb_build_object('id', existing.id, 'ticket_token', existing.ticket_token,
      'plate_status', existing.plate_status, 'plate_waitlist_position', existing.plate_waitlist_position,
      'duplicate', true);
  end if;

  if p_is_budtender then
    select count(*) into confirmed_plates from public.event_rsvps
     where event_id = p_event_id and status = 'confirmed' and plate_status = 'confirmed';
    if confirmed_plates < ev.plate_cap then
      v_plate := 'confirmed';
    else
      v_plate := 'waitlisted';
      select coalesce(max(plate_waitlist_position), 0) + 1 into v_pos from public.event_rsvps
       where event_id = p_event_id and plate_status = 'waitlisted';
    end if;
  end if;

  if v_exists then
    -- A cancelled RSVP re-registering: reactivate the same row (keeps ticket + history).
    update public.event_rsvps set
      first_name = p_first_name, last_name = p_last_name, phone = p_phone,
      marketing_opt_in = p_marketing_opt_in or marketing_opt_in,
      marketing_opt_in_at = case when p_marketing_opt_in and not marketing_opt_in then now() else marketing_opt_in_at end,
      is_budtender = p_is_budtender,
      dispensary_psm_account_id = p_dispensary_psm_account_id,
      dispensary_name = p_dispensary_name, dispensary_city = p_dispensary_city,
      plate_status = v_plate, plate_waitlist_position = v_pos,
      status = 'confirmed', cancelled_at = null,
      psm_synced_at = null, psm_sync_error = null
     where id = existing.id returning * into rec;
  else
    insert into public.event_rsvps (
      event_id, first_name, last_name, email, phone, confirmed_21,
      marketing_opt_in, marketing_opt_in_at, is_budtender,
      dispensary_psm_account_id, dispensary_name, dispensary_city,
      plate_status, plate_waitlist_position, source
    ) values (
      p_event_id, p_first_name, p_last_name, p_email, p_phone, true,
      p_marketing_opt_in, case when p_marketing_opt_in then now() end, p_is_budtender,
      p_dispensary_psm_account_id, p_dispensary_name, p_dispensary_city,
      v_plate, v_pos, p_source
    ) returning * into rec;
  end if;

  return jsonb_build_object('id', rec.id, 'ticket_token', rec.ticket_token,
    'plate_status', rec.plate_status, 'plate_waitlist_position', rec.plate_waitlist_position,
    'duplicate', false);
end $$;

-- cancel_rsvp — guest cancels via their ticket link. Frees a confirmed plate (no auto-promote, D4).
create or replace function public.cancel_rsvp(p_ticket_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare rec public.event_rsvps%rowtype;
begin
  update public.event_rsvps set
    status = 'cancelled', cancelled_at = now(),
    plate_status = 'none', plate_waitlist_position = null
   where ticket_token = p_ticket_token and status = 'confirmed' and checked_in_at is null
   returning * into rec;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'id', rec.id);
end $$;

-- release_waitlisted_plate — admin promotes one waitlisted budtender if a plate is free.
create or replace function public.release_waitlisted_plate(p_rsvp_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  rec public.event_rsvps%rowtype;
  ev public.events%rowtype;
  confirmed_plates int;
begin
  select * into rec from public.event_rsvps where id = p_rsvp_id;
  if not found or rec.plate_status <> 'waitlisted' or rec.status <> 'confirmed' then
    return jsonb_build_object('ok', false, 'reason', 'not_waitlisted');
  end if;
  select * into ev from public.events where id = rec.event_id for update;
  select count(*) into confirmed_plates from public.event_rsvps
   where event_id = rec.event_id and status = 'confirmed' and plate_status = 'confirmed';
  if confirmed_plates >= ev.plate_cap then
    return jsonb_build_object('ok', false, 'reason', 'no_plates_free');
  end if;
  update public.event_rsvps set plate_status = 'confirmed', plate_waitlist_position = null
   where id = p_rsvp_id;
  return jsonb_build_object('ok', true);
end $$;

-- claim_due_reminders — cron-safe: two overlapping runs can never both claim a reminder.
create or replace function public.claim_due_reminders()
returns setof public.event_reminders
language plpgsql security definer set search_path = public, extensions as $$
begin
  return query
  update public.event_reminders r set status = 'sending', updated_at = now()
   where r.id in (
     select id from public.event_reminders
      where status = 'scheduled' and enabled and resolved_send_at <= now()
      for update skip locked
   )
  returning r.*;
end $$;

revoke execute on function public.claim_rsvp(uuid,text,text,text,text,boolean,boolean,uuid,text,text,text) from public, anon, authenticated;
revoke execute on function public.cancel_rsvp(text) from public, anon, authenticated;
revoke execute on function public.release_waitlisted_plate(uuid) from public, anon, authenticated;
revoke execute on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_rsvp(uuid,text,text,text,text,boolean,boolean,uuid,text,text,text) to service_role;
grant execute on function public.cancel_rsvp(text) to service_role;
grant execute on function public.release_waitlisted_plate(uuid) to service_role;
grant execute on function public.claim_due_reminders() to service_role;

-- ---------------------------------------------------------------------------
-- Seed: The Kickback 2026 + default reminders (D-015). Bodies are editable in admin.
-- (Link text in two bodies was shortened in prod by UPDATE right after apply; this file shows the final text.)
-- ---------------------------------------------------------------------------
insert into public.events (slug, name, tagline, starts_at, ends_at, venue_name, address, map_url, plate_cap)
values (
  'kickback',
  'The Kickback',
  'Bud, Bombing & BBQ',
  '2026-10-25 13:00 America/Chicago',
  '2026-10-25 18:00 America/Chicago',
  'Behind Liberty Bank',
  '2929 W Fullerton Ave, Chicago, IL 60647',
  'https://www.google.com/maps/search/?api=1&query=2929+W+Fullerton+Ave+Chicago+IL+60647',
  50
);

insert into public.event_reminders (event_id, name, offset_days, local_time, audience, is_marketing, subject, body_html)
select e.id, v.name, v.offset_days, v.local_time::time, v.audience, v.is_marketing, v.subject, v.body_html
from public.events e,
(values
  ('One week out', -7, '10:00', 'all', false,
   'One week until The Kickback, {first_name}',
   '<p>Hey {first_name},</p><p>One week out. <strong>{event_name}: {event_tagline}</strong> is {event_date}, {event_time} at {address}.</p><p>Live graffiti battle, BBQ smoker + taco truck, DJs, a blunt-rolling class and a vendor row. Free parking lot on site. 21+ with a valid ID.</p>{plate_block}<p><a href="{ticket_link}">View your ticket</a></p>'),
  ('Day before', -1, '10:00', 'all', false,
   'Tomorrow: The Kickback, 1–6 PM',
   '<p>Hey {first_name},</p><p>See you tomorrow, {event_date}, {event_time} at {address} (<a href="{map_link}">map</a>). Free parking lot. Bring a valid ID — you must be 21+.</p>{plate_block}{weather_note}<p>Your ticket QR: <a href="{ticket_link}">open your ticket</a></p><p>Can''t make it? <a href="{cancel_link}">Cancel your RSVP</a> so someone else can get a plate.</p>'),
  ('Morning of', 0, '10:00', 'all', false,
   'Today: The Kickback, 1–6 PM',
   '<p>It''s today, {first_name}. Doors 1 PM at {address} (<a href="{map_link}">map</a>).</p>{plate_block}<p>Have your ticket QR ready: <a href="{ticket_link}">open your ticket</a></p>'),
  ('Thank you', 1, '11:00', 'checked_in', false,
   'Thanks for kicking it with us',
   '<p>{first_name}, thanks for pulling up to The Kickback. Photos and video from the day are coming soon on <a href="https://privatestock.co">privatestock.co</a> and our socials.</p>{rewards_block}')
) as v(name, offset_days, local_time, audience, is_marketing, subject, body_html)
where e.slug = 'kickback';
