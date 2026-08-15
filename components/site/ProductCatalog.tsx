"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
    <label className="flex flex-col gap-1 text-xs tracking-widest text-neutral-500">
      {label.toUpperCase()}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-sm border border-neutral-300 bg-white px-2 text-sm tracking-normal text-neutral-900"
      >
        <option>{ALL}</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function ProductCatalog({ products }: { products: CatalogProduct[] }) {
  const [brand, setBrand] = useState(ALL);
  const [category, setCategory] = useState(ALL);
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

      <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
        {filtered.map((p) => {
          const b = brandByName(p.brand);
          if (!b) return null;
          return (
            <Link
              key={p.id}
              href={`/products/${b.slug}/${p.slug}`}
              className="group relative block"
              data-track={`product-card:${p.slug}`}
            >
              <div className="relative aspect-square overflow-hidden rounded-sm bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_url ?? "/placeholders/product.svg"}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span className="absolute inset-x-0 bottom-0 bg-neutral-950/70 py-2 text-center text-[10px] tracking-[0.25em] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  CLICK FOR MORE INFO
                </span>
              </div>
              <p className="mt-3 text-xs tracking-widest text-neutral-400">
                {p.brand.toUpperCase()}
              </p>
              <p className="text-sm tracking-wide text-neutral-800">{p.name}</p>
              <p className="text-xs text-neutral-400">
                {[p.category, p.weight].filter(Boolean).join(" · ")}
              </p>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full rounded border border-dashed p-10 text-center text-sm text-neutral-400">
            No products match those filters.
          </p>
        )}
      </div>
    </div>
  );
}
