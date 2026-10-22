-- Strain-level matching between the catalog and the published menu data (PRD-PRODUCT-PAGE-AVAILABILITY, D-118).
-- Both sides normalize to a brand-agnostic strain key so product pages can join on (brand, strain_key).
-- Keep the vocabulary identical to lib/strainKey.ts.

-- Normalizes a catalog or menu product name to a brand-agnostic strain key.
-- Mirrors lib/strainKey.ts; keep the two vocabularies identical.
create or replace function public.strain_key(p_name text)
returns text
language plpgsql
immutable
parallel safe
as $$
declare
  s text := coalesce(p_name, '');
  fmt constant text :=
    '(?<![a-z0-9])(liquid diamonds?|all ?in ?one|aio|astro vape|live astro|live atro|premium astro|astro|'
    || 'premium flower|premium smalls|premium|small batch flower|small batch|smalls|popcorn|flower|'
    || 'vape stone|stone|vape cartridge|vape cart|cartridge|cart|disposable|vape|preroll pack|pre ?rolls?|preroll|'
    || 'infused blunt|blunt|glass tip|hash infused|hash|live resin|reserve|prepack|pre pack|infused|blowout sale!?|'
    || 'top shelf|diamond|each|pack|pk|hybrid|indica|sativa|'
    || '[0-9]+(\.[0-9]+)?\s*(mg|ml|g|oz)|[0-9]+\s*(pk|pack|ct)|1/[248]oz)(?![a-z0-9])';
begin
  -- Pipe-delimited ALL-CAPS category tags from one menu platform: "Magic Melonade | FRUIT | Liquid Diamonds".
  -- Case-sensitive on purpose so "Razz Gas" / "Forbidden Fruit" survive.
  s := regexp_replace(s, '\|\s*(FRUIT|GAS|DESSERT|FLORAL|HAZE)\s*(?=\||$)', '|', 'g');
  s := translate(lower(s), 'çáíéóú', 'caieou');
  s := regexp_replace(s, '\[[^\]]*\]', ' ', 'g');          -- [3.5g] [GAS]
  s := regexp_replace(s, '\([^)]*\)', ' ', 'g');           -- (Sativa)
  s := regexp_replace(s, '(higher self|savage squad strains|savage squad|terp kings|terpkings|outfitters)', ' ', 'g');
  s := regexp_replace(s, '[|/,:–—-]', ' ', 'g');
  s := regexp_replace(s, fmt, ' ', 'g');
  s := regexp_replace(s, fmt, ' ', 'g');                   -- second pass for adjacent tokens
  return regexp_replace(s, '[^a-z0-9]+', '', 'g');
end;
$$;

alter table public.catalog_products
  add column strain_key text generated always as (public.strain_key(name)) stored;

alter table public.product_availability
  add column strain_key text generated always as (public.strain_key(product_name)) stored;

create index catalog_products_brand_strain_idx
  on public.catalog_products (brand, strain_key);

create index product_availability_brand_strain_idx
  on public.product_availability (brand, strain_key);

select pg_notify('pgrst', 'reload schema');
