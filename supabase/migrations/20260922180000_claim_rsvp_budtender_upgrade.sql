-- claim_rsvp: upgrade an existing guest to budtender in place (Ambrose, 2026-09-22, D-098).
-- Before: a confirmed guest who re-submitted with "I'm a budtender" ticked got "already on
-- the list" and silently no plate. Now that re-submit upgrades the same row: budtender +
-- dispensary set, plate allocated (or waitlisted) under the same event-row lock, CRM re-sync
-- queued (psm_synced_at = null), returns upgraded = true. Same ticket token. Every other
-- repeat submit is unchanged (duplicate = true, nothing modified).
-- Backward compatible: same signature, one extra key in the returned jsonb.
-- Rollback: re-run the claim_rsvp definition from 20260922160000_events_rsvp.sql.
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
  v_upgrade boolean := false;
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
    -- Only one kind of repeat changes anything: a confirmed non-budtender who now says they are one.
    if p_is_budtender and not existing.is_budtender
       and coalesce(btrim(p_dispensary_name), '') <> '' and coalesce(btrim(p_dispensary_city), '') <> '' then
      v_upgrade := true;
    else
      return jsonb_build_object('id', existing.id, 'ticket_token', existing.ticket_token,
        'plate_status', existing.plate_status, 'plate_waitlist_position', existing.plate_waitlist_position,
        'duplicate', true, 'upgraded', false);
    end if;
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

  if v_upgrade then
    -- Keep the guest's name, phone, consent, ticket and check-in state; add the budtender details.
    update public.event_rsvps set
      is_budtender = true,
      dispensary_psm_account_id = p_dispensary_psm_account_id,
      dispensary_name = p_dispensary_name, dispensary_city = p_dispensary_city,
      plate_status = v_plate, plate_waitlist_position = v_pos,
      psm_synced_at = null, psm_sync_error = null
     where id = existing.id returning * into rec;
  elsif v_exists then
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
    'duplicate', false, 'upgraded', v_upgrade);
end $$;

revoke execute on function public.claim_rsvp(uuid,text,text,text,text,boolean,boolean,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.claim_rsvp(uuid,text,text,text,text,boolean,boolean,uuid,text,text,text) to service_role;
