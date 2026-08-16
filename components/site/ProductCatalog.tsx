"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/site/ProductCard";
import { brandByName } from "@/lib/brands";
import type { CatalogProduct } from "@/lib/data";

/** All-brands catalog with brand / category / type / terpene filters (decision 11). */

const ALL = "All";

function uniqueValues(
  products: CatalogProduct[],
  pick: (p: CatalogProduct) => string | null | undefined,
): string[] {
  return [...new Set(products.map(pick).filter((v): v is string => !!v))].sort();
}

function terpenes(p: CatalogProduct): string[] {
  if (!Array.isArray(p.terpene_profile)) return [];
  return (p.terpene_profile as { name?: string }[])
    .map((t) => t.name)
    .filter((n): n is string => !!n);
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 border border-hairline bg-white px-2 font-sans text-sm normal-case tracking-normal text-ink"
      >
        <option>{ALL}</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function ProductCatalog({
  products,
  initialBrand,
  initialCategory,
}: {
  products: CatalogProduct[];
  initialBrand?: string;
  initialCategory?: string;
}) {
  const [brand, setBrand] = useState(initialBrand ?? ALL);
  const [category, setCategory] = useState(initialCategory ?? ALL);
  const [format, setFormat] = useState(ALL);
  const [terp, setTerp] = useState(ALL);

  const brands = uniqueValues(products, (p) => p.brand);
  const categories = uniqueValues(products, (p) => p.category);
  const formats = uniqueValues(products, (p) => p.format);
  const allTerps = useMemo(
    () => [...new Set(products.flatMap(terpenes))].sort(),
    [products],
  );

  const filtered = products.filter(
    (p) =>
      (brand === ALL || p.brand === brand) &&
      (category === ALL || p.category === category) &&
      (format === ALL || p.format === format) &&
      (terp === ALL || terpenes(p).includes(terp)),
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <FilterSelect label="Brand" value={brand} options={brands} onChange={setBrand} />
        <FilterSelect label="Category" value={category} options={categories} onChange={setCategory} />
        <FilterSelect label="Type" value={format} options={formats} onChange={setFormat} />
        <FilterSelect label="Terpene" value={terp} options={allTerps} onChange={setTerp} />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {filtered.map((p) => {
          const b = brandByName(p.brand);
          if (!b) return null;
          return (
            <div key={p.id}>
              <p className="mb-2 text-center font-condensed text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                {p.brand}
              </p>
              <ProductCard
                href={`/products/${b.slug}/${p.slug}`}
                imageUrl={p.image_url ?? "/placeholders/product.svg"}
                caption={p.name}
                track={`product-card:${p.slug}`}
                hoverHint="Click for more info"
              />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full border border-dashed border-hairline p-10 text-center text-sm text-neutral-400">
            No products match those filters.
          </p>
        )}
      </div>
    </div>
  );
}
