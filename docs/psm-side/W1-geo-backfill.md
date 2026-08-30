# PSM-SIDE — DONE 2026-08-30

**Workstream W1 — Geo backfill on `retail_accounts`.** Completed. Recorded here as the as-built account; the original Google-Places plan was superseded by **D-060**.

## What was applied

Migration `add_geo_columns_to_retail_accounts` (additive, all nullable):

```sql
alter table public.retail_accounts
  add column if not exists latitude       double precision,
  add column if not exists longitude      double precision,
  add column if not exists geocode_source text,   -- census | nominatim | nominatim_street | manual
  add column if not exists geocoded_at    timestamptz;
```

Then one guarded backfill (`... and a.latitude is null and a.longitude is null`), so re-running can only ever fill blanks — it cannot overwrite a corrected coordinate.

## Result — 56 of 59 active-stage accounts

| Source | Count | Precision |
|---|---|---|
| `census` | 49 | Rooftop / address-range. 41 exact, 8 normalised (e.g. `5001 N Clack St` → `5001 N CLARK ST`) |
| `nominatim` | 4 | House-number match (Bud & Ritas Wadsworth, Thrive Anna, Vertical Cary, Vertical Cairo) |
| `nominatim_street` | 3 | **Street centroid, not the building** — Bisa Lina Carol Stream, Mint Villa Park, Thrive Metropolis |
| *null* | 3 | Mint Willowbrook, Mystic Greenz Decatur, Parkway Dispensary Tilton |

Every point was checked against the Illinois bounding box (lat 36.9–42.6, lng −91.6–−87.0) before writing. No address was guessed.

## Still open — 3 accounts need a human coordinate

These three matched no geocoder. They still **list** on the locator; they just have no map pin.

| Account | CRM address | Note |
|---|---|---|
| Mint Willowbrook | `900 7th St, Willowbrook 60527` | OSM has "Mint Cannabis" on **75th Street** in Willowbrook. `7th` looks like a truncation of `75th` — verify, then fix the CRM address and re-run the backfill. |
| Mystic Greenz Decatur | `5045 Indus Dr, Decatur 62522` | CRM value was `5045 Indus Dr Decatur` (city duplicated in line 1); cleaned for geocoding, still no match. Likely too new for TIGER. |
| Parkway Dispensary Tilton | `2 Donna Dr, Tilton 61832` | Our own store — Ambrose can supply exact coordinates. |

To add one by hand:

```sql
update public.retail_accounts
set latitude = <lat>, longitude = <lng>, geocode_source = 'manual', geocoded_at = now()
where id = '<account id>';
```

## Address quality flags found along the way (CRM not modified)

Normalised for geocoding input only — the CRM rows were left untouched on purpose:

- `Dispensary 33 N. Clark` → `5001 N **Clack** St` (typo for Clark; Census corrected it)
- `Vertical Cairo` → `Washington Ave` with no house number (OSM POI says **300** Washington Ave)
- `Revolution Schaumburg` → `820 E Golf` (missing `Rd`)
- `Spark'd Winthrop` → city `Winthrop` (the town is **Winthrop Harbor**)
- `Bisa Lina Joliet` → `2121 W Jefferson` (missing `St`)
- `Sociale Dispensary` → trailing comma in `1036 W Higgins Rd,`
- `Vertical Cary` → `20 NW Hwy`; `Thrive Casey` → `912 N State HWY 49`

Fixing these in PSM is a small CRM hygiene task, not a blocker.
