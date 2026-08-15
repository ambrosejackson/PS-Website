import Link from "next/link";
import { BRANDS } from "@/lib/brands";
import type { CatalogProduct } from "@/lib/data";

/**
 * Landing brand section — one row per ALLOWLISTED brand only (guardrail #3).
 * Brand name links to the brand page; product thumbnails from catalog_products.
 */
export function BrandGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <section id="brands" className="bg-neutral-950 py-20 text-white md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="font-serif text-3xl tracking-[0.18em] md:text-4xl">
          OUR BRANDS
        </h2>
        <div className="mt-12 flex flex-col divide-y divide-white/10">
          {BRANDS.map((brand) => {
            const brandProducts = products
              .filter((p) => p.brand === brand.name)
              .slice(0, 4);
            return (
              <div
                key={brand.slug}
                className="group grid items-center gap-6 py-10 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <Link
                    href={`/${brand.slug}`}
                    className="nav-underline font-serif text-2xl tracking-[0.2em] md:text-3xl"
                  >
                    {brand.name.toUpperCase()}
                  </Link>
                  <p className="mt-2 text-sm text-white/50">
                    Explore {brand.name} →
                  </p>
                </div>
                <div className="flex gap-3">
                  {brandProducts.length > 0
                    ? brandProducts.map((p) => (
                        <Link
                          key={p.id}
                          href={`/products/${brand.slug}/${p.slug}`}
                          className="block h-20 w-20 overflow-hidden rounded-sm bg-white/5 transition-transform hover:scale-105 md:h-24 md:w-24"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image_url ?? "/placeholders/product.svg"}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        </Link>
                      ))
                    : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
