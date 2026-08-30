# PSM-SIDE — BUILT 2026-08-30 (design superseded by D-058)

**Workstream W2 — publishing PSM data to the website.** The original pull-RPC design in this file is **dead**: the website was never going to be allowed a PSM key (guardrail #1), so the direction was inverted. PSM pushes. This is the as-built record and the runbook.

## What exists in PSM now

| Object | Purpose |
|---|---|
| `v_publish_stores` (view) | The 53 publishable dispensaries. Delivery-backed inclusion, menu-check tiering (D-059). |
| `v_publish_availability` (view) | 443 product-presence rows for the 20 stores with a fresh successful check. `match_confidence in ('high','medium')`. |
| `publish_store_locator()` | SECURITY DEFINER. Serialises both views and `net.http_post`s them to the website. Revoked from public/anon/authenticated. |
| `reconcile_website_publish_log()` | pg_net is async — this reads `net._http_response` and closes the loop so a failed publish is visible. |
| `website_publish_log` (table) | One row per run: counts, HTTP status, response, ok. |
| Vault `website_publish_url` | `https://privatestock.co/api/psm/publish` |
| Vault `website_publish_secret` | Must equal Vercel's `PSM_PUBLISH_SECRET`. |
| cron `reconcile-website-publish-log` | `*/15 * * * *`, **active**. |
| cron `publish-store-locator` | **NOT YET SCHEDULED** — see below. |

### Tiering (D-059)

```
live    = menu_check_account_state.last_status = 'ok'
          AND last_checked_at >= now() - 7 days
          AND ≥1 allowlisted-brand finding at that check          → 21 stores
recent  = delivery within 90 days, not live                        → 32 stores
listed  = reserved (active account, delivery 90–180d)              → 6, unpublished
```

`brands` per store: distinct allowlisted brands from findings in the last 180 days, falling back to `brand_sales_order_items` matched on a normalised `customer_name` against `retail_accounts.name` + `retail_account_aliases`.

### Never published

No `menu_price`, `menu_msrp`, `discount_pct`, `discount_bucket`, `order_amount`, `est_cost`, `actual_cost`, `tier`, `w9_*`, `license_number`, or `delivery_scheduling_*` appears in either view. The receiver rejects the entire POST if a key matching `/price|msrp|discount|cost|amount|w9|licen|scheduling|contact/i` shows up — so a future PSM-side column cannot start leaking quietly.

## Runbook

**Enable the schedule** — run once, after the website PR is merged and `privatestock.co` serves `/api/psm/publish`:

```sql
select cron.schedule(
  'publish-store-locator',
  '20 0,13,17,20 * * *',                      -- UTC, ~20 min after each menu-check window
  $$select public.publish_store_locator();$$
);
```

**Publish on demand:**

```sql
select public.publish_store_locator();
```

**Check the last few runs:**

```sql
select ran_at, store_count, availability_count, http_status, ok, error_message
from public.website_publish_log order by ran_at desc limit 10;
```

**Pause it** (does not drop anything):

```sql
select cron.unschedule('publish-store-locator');
```

**Point it at a Vercel preview instead of production** (for testing a PR):

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'website_publish_url'),
  'https://<preview-deployment>.vercel.app/api/psm/publish');
```

**Rotate the shared secret** — update Vercel's `PSM_PUBLISH_SECRET`, redeploy, then:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'website_publish_secret'), '<new value>');
```

## Failure behaviour

- Zero stores in the view → logged as `ok=false`, **nothing is POSTed**. The public locator cannot be emptied by a broken upstream run.
- Non-2xx from the website → `reconcile_website_publish_log()` records the status and body within 15 minutes.
- No response at all within an hour → the row is closed out as `ok=false, 'no response from pg_net'`.

## Not in scope

`strains` publishing (feeds product pages, not the locator) is still unbuilt; the 8 duplicate Eschelon-New rows need cleanup first.
