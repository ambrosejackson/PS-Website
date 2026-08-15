# PSM-SIDE — do not run here

**Workstream W1 — Geo backfill on `retail_accounts`** (BLOCKER for the website store locator + product maps)
Run in the PSM project (`skdhqrjxvhegbufykhyp`) by Ambrose, via Supabase MCP `apply_migration`, following PSM conventions (PS-MANAGEMENT-CONTEXT §5). Production database — treat accordingly.

## 1. Migration (apply_migration, name: `add_geo_columns_to_retail_accounts`)

```sql
alter table public.retail_accounts
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists google_place_id text;

select pg_notify('pgrst', 'reload schema');
```

No RLS changes needed — columns inherit the table's existing policies.

## 2. One-time geocoding pass (process, not SQL)

1. Export the 70 active accounts: `select id, name, chain_id from retail_accounts where is_active and company_id = 'f730fddb-bcb0-464a-80ab-c2c6bf77ac1d';`
2. Match name (+ chain name + market `IL`) against Google Places Text Search; collect `formatted_address` components, `place_id`, lat/lng.
3. **Human review in PSM before commit** — verify each match (dispensary names are ambiguous; chains have many locations).
4. Write back via `execute_sql` UPDATEs: `address_line1`, `city`, `state`, `zip`, `latitude`, `longitude`, `google_place_id`. Verify column names against `information_schema.columns` first.

## 3. Acceptance criteria (website side unblocks when true)

- ≥ 60 of 70 active accounts have non-null `latitude`, `longitude`, `address_line1`, `city`, `zip`.
- `google_place_id` stored for auditability.
- Until then, the website locator runs on mock data behind `MOCK_PSM_DATA=true`.
