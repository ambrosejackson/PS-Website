# W5 — Weekly auto-geocode of new retail accounts

**PSM-SIDE — do not run here.** Applies to PSM production (`skdhqrjxvhegbufykhyp`) via Supabase MCP `apply_migration`, only after Ambrose's explicit "proceed."

*Drafted 2026-10-21. Follows W1 (one-time Census backfill, 2026-08-30) and the 2026-10-21 top-up (16 rows, `geocode_source = 'census_batch_exact'`).*

## Why

W1 was a one-shot. Between 2026-09-14 and 2026-10-15, 21 accounts entered the publish set with addresses but no coordinates, so they listed on `/store-locator` without a map pin and would be invisible to a distance search. This job closes that gap on a schedule Ambrose chose: **weekly**, not nightly.

## What it does

Every **Sunday 08:00 UTC** (2 AM CT, nothing else runs then), `geocode_missing_retail_accounts()`:

1. Finds up to 25 company accounts with `latitude is null`, a non-empty `address_line1`, and no attempt in the last 30 days (so a permanently un-geocodable address is retried once a month, not every week).
2. Fires one `net.http_get` per row at the Census Bureau single-address endpoint (free, no key, no ToS limit on storing results). Request ids are stored in a small log table.
3. At **08:20 UTC** the same Sunday, `reconcile_retail_account_geocodes()` reads pg_net's responses, parses `result.addressMatches[0]`, and writes `latitude/longitude/geocode_source/geocoded_at` **only** when the Census match is `Exact` and inside the Illinois bounding box (lat 36.9–42.6, lng −91.6 to −87.0). Anything else is logged as a miss with the reason and left null.

The 13:20 UTC `publish-store-locator` run then carries the new pins to the site the same day.

**Never does:** overwrite an existing coordinate, alter an address, delete anything, or touch any table but `retail_accounts` (4 geocode columns) and the new log table.

## Blast radius

- New table `retail_account_geocode_log` (append-only audit; RLS on, company-member SELECT only).
- Two new functions, two new cron jobs.
- Up to 25 `retail_accounts` UPDATEs per week, each guarded by `latitude is null`.

## Rollback

```sql
select cron.unschedule('geocode-missing-retail-accounts-weekly');
select cron.unschedule('reconcile-retail-account-geocodes-weekly');
drop function public.reconcile_retail_account_geocodes();
drop function public.geocode_missing_retail_accounts();
drop table public.retail_account_geocode_log;
-- coordinates it wrote, if ever unwanted:
-- update public.retail_accounts set latitude=null, longitude=null, geocode_source=null, geocoded_at=null
--  where geocode_source = 'census_weekly_exact';
```

## Migration (`apply_migration`, name `retail_account_weekly_geocode`)

```sql
-- ---------- audit log ----------
create table if not exists public.retail_account_geocode_log (
  id bigint generated always as identity primary key,
  company_id uuid not null,
  retail_account_id uuid not null references public.retail_accounts(id) on delete cascade,
  net_request_id bigint,
  query_address text not null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  outcome text check (outcome in ('exact','non_exact','no_match','outside_il','http_error','no_response')),
  matched_address text,
  latitude double precision,
  longitude double precision,
  detail text
);
create index if not exists retail_account_geocode_log_account_idx
  on public.retail_account_geocode_log (retail_account_id, requested_at desc);

alter table public.retail_account_geocode_log enable row level security;
create policy "geocode log: company members read"
  on public.retail_account_geocode_log for select
  using (exists (select 1 from public.user_companies uc
                 where uc.user_id = auth.uid()
                   and uc.company_id = retail_account_geocode_log.company_id
                   and uc.is_active));

-- ---------- step 1: fire requests ----------
create or replace function public.geocode_missing_retail_accounts()
returns integer
language plpgsql
security definer
set search_path to 'public', 'extensions', 'net'
as $$
declare
  v_count integer := 0;
  r record;
  v_addr text;
  v_req bigint;
begin
  for r in
    select a.id, a.company_id, a.address_line1, a.city, a.state, a.zip
    from public.retail_accounts a
    where a.company_id = 'f730fddb-bcb0-464a-80ab-c2c6bf77ac1d'
      and a.latitude is null
      and nullif(trim(a.address_line1), '') is not null
      and nullif(trim(a.city), '') is not null
      and not exists (
        select 1 from public.retail_account_geocode_log l
        where l.retail_account_id = a.id
          and l.requested_at > now() - interval '30 days')
    order by a.updated_at desc
    limit 25
  loop
    v_addr := concat_ws(', ', trim(r.address_line1), trim(r.city),
                        coalesce(nullif(trim(r.state), ''), 'IL'), nullif(trim(r.zip), ''));
    v_req := net.http_get(
      url := 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress',
      params := jsonb_build_object('benchmark', 'Public_AR_Current',
                                   'format', 'json',
                                   'address', v_addr),   -- pg_net URL-encodes params
      timeout_milliseconds := 15000);
    insert into public.retail_account_geocode_log
      (company_id, retail_account_id, net_request_id, query_address)
    values (r.company_id, r.id, v_req, v_addr);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------- step 2: reconcile responses ----------
create or replace function public.reconcile_retail_account_geocodes()
returns integer
language plpgsql
security definer
set search_path to 'public', 'extensions', 'net'
as $$
declare
  v_written integer := 0;
  p record;
  v_body jsonb;
  v_match jsonb;
  v_lat double precision;
  v_lng double precision;
begin
  for p in
    select l.id, l.retail_account_id, l.net_request_id,
           r.status_code, r.content
    from public.retail_account_geocode_log l
    left join net._http_response r on r.id = l.net_request_id
    where l.resolved_at is null
      and l.requested_at > now() - interval '2 days'
  loop
    if p.status_code is null then
      if exists (select 1 from public.retail_account_geocode_log x
                 where x.id = p.id and x.requested_at < now() - interval '1 hour') then
        update public.retail_account_geocode_log
          set resolved_at = now(), outcome = 'no_response' where id = p.id;
      end if;
      continue;
    end if;

    if p.status_code not between 200 and 299 then
      update public.retail_account_geocode_log
        set resolved_at = now(), outcome = 'http_error',
            detail = 'HTTP ' || p.status_code where id = p.id;
      continue;
    end if;

    begin
      v_body := p.content::jsonb;
    exception when others then
      update public.retail_account_geocode_log
        set resolved_at = now(), outcome = 'http_error', detail = 'non-JSON body' where id = p.id;
      continue;
    end;

    v_match := v_body #> '{result,addressMatches,0}';
    if v_match is null then
      update public.retail_account_geocode_log
        set resolved_at = now(), outcome = 'no_match' where id = p.id;
      continue;
    end if;

    v_lng := (v_match #>> '{coordinates,x}')::double precision;
    v_lat := (v_match #>> '{coordinates,y}')::double precision;

    if not (v_lat between 36.9 and 42.6 and v_lng between -91.6 and -87.0) then
      update public.retail_account_geocode_log
        set resolved_at = now(), outcome = 'outside_il',
            matched_address = v_match ->> 'matchedAddress',
            latitude = v_lat, longitude = v_lng where id = p.id;
      continue;
    end if;

    -- Census onelineaddress returns only the best candidate; treat a returned
    -- match with a tigerLine id as the equivalent of the batch API's "Exact".
    if v_match -> 'tigerLine' is null then
      update public.retail_account_geocode_log
        set resolved_at = now(), outcome = 'non_exact',
            matched_address = v_match ->> 'matchedAddress',
            latitude = v_lat, longitude = v_lng where id = p.id;
      continue;
    end if;

    update public.retail_accounts
      set latitude = v_lat, longitude = v_lng,
          geocode_source = 'census_weekly_exact', geocoded_at = now()
      where id = p.retail_account_id and latitude is null;

    update public.retail_account_geocode_log
      set resolved_at = now(), outcome = 'exact',
          matched_address = v_match ->> 'matchedAddress',
          latitude = v_lat, longitude = v_lng where id = p.id;
    v_written := v_written + 1;
  end loop;
  return v_written;
end;
$$;

revoke execute on function public.geocode_missing_retail_accounts() from public, anon, authenticated;
revoke execute on function public.reconcile_retail_account_geocodes() from public, anon, authenticated;

-- ---------- schedule (weekly, Sunday) ----------
select cron.schedule('geocode-missing-retail-accounts-weekly', '0 8 * * 0',
                     $$select public.geocode_missing_retail_accounts();$$);
select cron.schedule('reconcile-retail-account-geocodes-weekly', '20 8 * * 0',
                     $$select public.reconcile_retail_account_geocodes();$$);

select pg_notify('pgrst', 'reload schema');
```

## Verification after apply

```sql
-- dry run, now (fires requests for the 5 current nulls):
select public.geocode_missing_retail_accounts();   -- expect 5
-- wait ~30s
select public.reconcile_retail_account_geocodes();  -- expect 0 (all five are known Census misses)
select retail_account_id, outcome, matched_address, detail
from public.retail_account_geocode_log order by requested_at desc limit 10;
select jobname, schedule from cron.job where jobname like '%geocode%';
```

## Known un-geocodable rows (as of 2026-10-21) — fix the CRM address instead

| Account | CRM address | Problem |
|---|---|---|
| Parkway Dispensary Tilton | 2 Donna Dr | Street not in Census TIGER; Ambrose can supply the pin by hand |
| Mystic Greenz Decatur | 5045 Indus Dr | No Census match |
| Mystic Greenz Olive Branch | 26650 IL-3 | Rural highway address; no match |
| Consume Itasca | 5 N 105 IL | DuPage grid address missing the road name (likely `5N105 IL Route 53`) |
| Trinity MMJ Peoria (West Glen) | W Glen Ave | No house number |

Also still wrong in CRM (geocoded by hand-corrected input on 2026-10-21): Mint Willowbrook `900 7th St` → `900 75th St`; Rise Effingham zip `62041` → `62401`; cities `Lovers Park`, `Village Of Lake In The Hills`.
