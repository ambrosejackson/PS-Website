# PSM-SIDE — do not run here

**Workstream W2 — `publish_store_locator()` RPC** (feeds the website's `store_locations`, `product_availability`, `strains` tables)
Run in the PSM project by Ambrose after W1 completes. Follows the PSM SECURITY DEFINER pattern (PS-MANAGEMENT-CONTEXT §5). Depends on: W1 (lat/lng), a dedicated `website_publisher` role/key decision.

## Contract (what the website expects)

Three result sets, called nightly + after Sat/Wed menu-check runs by the website Edge Function `publish-pull` (to be built in the website project, Phase 2):

1. **stores** → upserted into website `store_locations`
   - Source: `retail_accounts` (active, company_id `f730fddb-bcb0-464a-80ab-c2c6bf77ac1d`) with a delivery in the last 90 days (join `deliveries` on `retail_account_id`, ignore null FKs), plus chain name from `retail_account_chains`.
   - Columns: `id, name, chain_name, address_line1, address_line2, city, state, zip, latitude, longitude, phone, online_menu_url as menu_url, brands (text[] — distinct brands from latest successful menu-check findings, fallback brand_sales_order_items), last_delivery_within_90d, availability_tier, availability_checked_at`.
   - `availability_tier` derivation: `'live'` if tier-1 menu platform (Sweed/Mosaic) with successful check ≤ 7 days; `'recent'` if delivery ≤ 90 days; else `'listed'`.
   - **NEVER include:** delivery amounts/costs, tier, W-9 anything, contacts, delivery-scheduling fields.

2. **availability** → upserted into website `product_availability`
   - Source: `menu_check_findings` from the latest successful run per tier-1 account, `match_confidence in ('high','medium')`.
   - Columns: `retail_account_id as store_id, brand, menu_product_name as product_name, coalesce(menu_variant,'') as variant, menu_product_url, menu_image_url as image_url, checked_at`.
   - **NEVER include:** `menu_price`, `menu_msrp`, `discount_pct`, `discount_bucket`, or any price-derived column. The website schema has no price columns by design.

3. **strains** → upserted into website `strains`
   - Source: `strain_names` where `is_active`.
   - Columns: `id, our_name, brand, our_type, lineage`. **NEVER `source` / `original_name`** (genetics sourcing).
   - Note: 8 known-duplicate Eschelon-New rows pending cleanup — exclude or clean before first publish.

## Security skeleton (PSM conventions)

```sql
create or replace function public.publish_store_locator()
returns ... -- three result sets: implement as three functions or one returning jsonb
language sql
security definer
set search_path = public
as $$ ... $$;

revoke execute on function public.publish_store_locator() from public, anon, authenticated;
-- grant execute only to the dedicated publisher role used by the website Edge Function key.
select pg_notify('pgrst', 'reload schema');
```

Recommendation: three functions (`publish_stores()`, `publish_availability()`, `publish_strains()`) returning `setof jsonb` — simpler to consume from the Edge Function than one multi-set RPC. If replacing an existing function with new defaulted params, `DROP FUNCTION` with the old arg list first (ambiguous-overload gotcha).

## Brand filtering

Publish ALL brands (including Kush League/Clusters) — the **website** filters to its allowlist on upsert (`lib/brands.ts` is the single switch). This keeps the PSM side stable when brands activate.
