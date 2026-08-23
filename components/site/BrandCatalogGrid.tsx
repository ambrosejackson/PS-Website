import Link from "next/link";
import { ProductCard } from "@/components/site/ProductCard";
import { brandByName } from "@/lib/brands";
import type { CatalogProduct } from "@/lib/data";

/**
 * Live catalog grid for a brand page — reads the admin-curated catalog
 * (active, not quarantined, allowlisted) and links every card to its SEO
 * product page. `tone="dark"` for dark brand pages (SSS). Styled empty state
 * when the brand has nothing visible yet.
 */
export function BrandCatalogGrid({
  brandName,
  products,
  tone = "light",
  title = "Products",
  limit = 12,
  id = "catalog",
}: {
  brandName: string;
  products: CatalogProduct[];
  tone?: "light" | "dark";
  title?: string;
  limit?: number;
  id?: string;
}) {
  const brand = brandByName(brandName);
  const items = products.filter((p) => p.brand === brandName).slice(0, limit);
  const dark = tone === "dark";
  const ink = dark ? "text-white" : "text-ink";
  const sub = dark ? "text-white/60" : "text-neutral-500";

  return (
    <section id={id} className={dark ? "border-t border-white/10" : "border-t border-hairline"}>
      <div className="mx-auto max-w-screen-2xl px-6 py-14 md:px-12 md:py-20">
        <div className="flex items-baseline justify-between">
          <h2 className={`font-condensed text-[26px] font-bold uppercase tracking-tight md:text-[32px] ${ink}`}>
            {title}
          </h2>
          <Link
            href={`/products?brand=${encodeURIComponent(brandName)}`}
            className={`nav-underline font-condensed text-xs font-semibold uppercase tracking-wide ${ink}`}
          >
            VIEW ALL
          </Link>
        </div>
        {items.length > 0 ? (
          <div className={`mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6 ${dark ? "[&_p]:text-white/80" : ""}`}>
            {items.map((p) => (
              <ProductCard
                key={p.id}
                href={brand ? `/products/${brand.slug}/${p.slug}` : undefined}
                imageUrl={p.image_url ?? "/placeholders/product.png"}
                caption={p.name}
                track={`brand-catalog:${p.slug}`}
                hoverHint="Click for more info"
              />
            ))}
          </div>
        ) : (
          <div
            className={`mt-10 border border-dashed p-10 text-center ${
              dark ? "border-white/20" : "border-hairline"
            }`}
          >
            <p className={`font-condensed text-sm uppercase tracking-wide ${sub}`}>
              {brandName} products are being added to the catalog — check back soon.
            </p>
            <Link
              href="/store-locator"
              className={`mt-4 inline-block font-condensed text-xs font-semibold uppercase tracking-wide underline ${ink}`}
            >
              Find a store
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
