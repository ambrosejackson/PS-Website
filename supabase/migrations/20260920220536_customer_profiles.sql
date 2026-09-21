-- Consumer account profiles (rewards Phase 4, PRD claude/PRD-REWARDS-SIGNUP-AND-HERO.md).
-- Applied to production 2026-09-20 via Supabase MCP as version 20260920220536.
-- Additive only. Rollback: drop table public.customer_profiles;
--
-- personal_email is an UNVERIFIED backup contact. Never use it in an auth or
-- order-matching predicate. The login email lives on auth.users.
-- No insert policy on purpose: rows are created only by the server (service role)
-- after the magic link is verified.

create table public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (length(btrim(first_name)) between 1 and 80),
  last_name  text not null check (length(btrim(last_name)) between 1 and 80),
  birth_month smallint check (birth_month between 1 and 12),
  birth_day   smallint check (birth_day between 1 and 31),
  zip text check (zip ~ '^\d{5}$'),
  personal_email citext check (personal_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  marketing_opt_in_at timestamptz,
  age_attested_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customer_profiles is
  'Consumer account profile (rewards Phase 4). personal_email is unverified backup contact only: never use it for auth or order matching.';

alter table public.customer_profiles enable row level security;

create policy "customer reads own profile" on public.customer_profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "customer updates own profile" on public.customer_profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create trigger customer_profiles_set_updated_at
  before update on public.customer_profiles
  for each row execute function public.set_updated_at();
