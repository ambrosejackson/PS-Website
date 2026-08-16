import Link from "next/link";
import { ProductCard } from "@/components/site/ProductCard";
import { BRANDS, brandByName } from "@/lib/brands";
import type { CatalogProduct } from "@/lib/data";

/**
 * Landing brand sections, per the reference screenshots: one section per
 * ALLOWLISTED brand only (guardrail #3 — the reference's Kush League row is
 * intentionally absent). Condensed uppercase title left, SEE MORE right,
 * hairline rule between sections, 6-column product grid on white.
 */
export function BrandGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div id="brands">
      {BRANDS.map((brand) => {
        const brandProducts = products
          .filter((p) => p.brand === brand.name)
          .slice(0, 6);
        return (
          <section key={brand.slug} className="border-t border-hairline">
            <div className="mx-auto max-w-screen-2xl px-6 py-12 md:px-12 md:py-14">
              <div className="flex items-center justify-between">
                <Link href={`/${brand.slug}`} className="hover:opacity-70">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.logoOnLight}
                    alt={brand.name}
                    className="h-9 w-auto md:h-11"
                  />
                </Link>
                <Link
                  href={`/${brand.slug}`}
                  className="nav-underline font-condensed text-xs font-semibold uppercase tracking-wide text-ink"
                >
                  SEE MORE
                </Link>
              </div>
              {brandProducts.length > 0 ? (
                <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
                  {brandProducts.map((p) => {
                    const b = brandByName(p.brand);
                    return (
                      <ProductCard
                        key={p.id}
                        href={b ? `/products/${b.slug}/${p.slug}` : undefined}
                        imageUrl={p.image_url ?? "/placeholders/product.svg"}
                        caption={p.name}
                        track={`brand-row:${p.slug}`}
                        hoverHint="Click for more info"
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="mt-10 font-condensed text-sm uppercase tracking-wide text-neutral-400">
                  Products coming soon
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
