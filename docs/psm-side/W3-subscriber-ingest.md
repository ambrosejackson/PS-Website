# PSM-SIDE — do not run here

**Workstream W3 — `web_subscribers` ingest + CRM auto-promote** (Phase 2b dependency)
Run in the PSM project by Ambrose. The website's `subscribers` table is live now (writes happen via `/api/subscribe`); this workstream pulls those rows into PSM.

## 1. Migration (apply_migration, name: `create_web_subscribers`)

```sql
create table public.web_subscribers (
  id uuid primary key,                          -- = website subscribers.id (stable, idempotent ingest)
  company_id uuid not null default 'f730fddb-bcb0-464a-80ab-c2c6bf77ac1d',
  email text not null,
  persona text not null,                        -- 'Website Sign-up – {Brand}' (en dash)
  source_path text not null,
  brand_context text,
  consented_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  promoted_contact_id uuid references public.crm_contacts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index web_subscribers_company_email_idx on public.web_subscribers (company_id, email);

alter table public.web_subscribers enable row level security;
-- Standard PSM RLS pair:
create policy "Company members can view" on public.web_subscribers
  for select using (
    exists (select 1 from public.user_companies uc
            where uc.user_id = auth.uid() and uc.company_id = web_subscribers.company_id and uc.is_active)
  );
create policy "Managers can manage" on public.web_subscribers
  for all using (
    public.get_user_role_in_company(auth.uid(), company_id) in ('manager','director','admin','super_admin')
  ) with check (
    public.get_user_role_in_company(auth.uid(), company_id) in ('manager','director','admin','super_admin')
  );

select pg_notify('pgrst', 'reload schema');
```

(Verify the exact RLS helper signature/policy shape against an existing PSM table before applying — this follows the documented pattern, not copied prod DDL.)

## 2. PSM Edge Function `ingest_web_subscribers`

- Pulls from the **website** project's `subscribers` table using the website service key stored **PSM-side only** (Supabase secret on the PSM Edge Function — the reverse direction of the publish pipeline; the website never holds a PSM key).
- Query: website rows where `synced_to_psm_at is null`, upsert into `web_subscribers` by `id`, then write back `synced_to_psm_at = now()` on the website rows.
- Schedule: hourly is plenty.

## 3. Auto-promote job

For each `web_subscribers` row without `promoted_contact_id`: create/update `crm_contacts` per PSM's CRM conventions (dedupe by email within company), write the persona tag onto the contact record, set `promoted_contact_id`. Exact `crm_contacts` column mapping is PSM-internal — Ambrose defines it in the PSM project; the website only guarantees `email, persona, source_path, brand_context, consented_at`.
