import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { AvailabilityMap } from "@/components/site/AvailabilityMap";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { brandByName, brandBySlug } from "@/lib/brands";
import {
  getAvailabilityForProduct,
  getCatalogProductBySlug,
  getCatalogProducts,
  getHeroesForPage,
} from "@/lib/data";

/**
 * SEO product page (decision 11 + docx reference layout): image zoom, terpene
 * profile, description, More from {Brand}, and "Buy Now at the Below
 * Locations" from availability data. Presence + menu links + images only —
 * NEVER prices (guardrail #2).
 */

export const revalidate = 300;

export async function generateStaticParams() {
  const products = await getCatalogProducts();
  return products.flatMap((p) => {
    const brand = brandByName(p.brand);
    return brand ? [{ brand: brand.slug, slug: p.slug }] : [];
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} — ${product.brand}`,
    description:
      product.description ??
      `${product.name} by ${product.brand}, a Private Stock Cannabis Co. brand.`,
    openGraph: {
      title: `${product.name} — ${product.brand}`,
      description: product.description ?? undefined,
      images: product.image_url ? [product.image_url] : undefined,
    },
  };
}

interface TerpeneEntry {
  name?: string;
  note?: string;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ brand: string; slug: string }>;
}) {
  const { brand: brandSlug, slug } = await params;
  const brand = brandBySlug(brandSlug);
  const product = await getCatalogProductBySlug(slug);
  if (!brand || !product || brandByName(product.brand)?.slug !== brand.slug) {
    notFound();
  }

  const [heroes, availability, moreFromBrand] = await Promise.all([
    getHeroesForPage(`/${brand.slug}`),
    getAvailabilityForProduct(product.brand, product.name),
    getCatalogProducts(product.brand),
  ]);

  const terps = (
    Array.isArray(product.terpene_profile) ? product.terpene_profile : []
  ) as TerpeneEntry[];
  const others = moreFromBrand.filter((p) => p.id !== product.id).slice(0, 4);
  const stores = availability.map((a) => a.store);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    description: product.description ?? undefined,
    image: product.image_url ?? undefined,
    category: product.category ?? undefined,
  };

  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[35svh]" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:gap-16 md:py-24">
        <div className="group overflow-hidden rounded-sm bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image_url ?? "/placeholders/product.svg"}
            alt={product.name}
            className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>

        <div>
          <Link
            href={`/${brand.slug}`}
            className="text-xs tracking-[0.25em] text-neutral-400 hover:text-neutral-900"
          >
            {product.brand.toUpperCase()}
          </Link>
          <h1 className="mt-2 font-serif text-4xl text-neutral-900">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {[product.category, product.format, product.weight]
              .filter(Boolean)
              .join(" · ")}
            {product.thc_range ? ` · THC ${product.thc_range}` : ""}
          </p>

          {terps.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold tracking-[0.25em] text-neutral-400">
                TERPENE PROFILE
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {terps.map((t) => (
                  <span
                    key={t.name}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-700"
                  >
                    {t.name}
                    {t.note ? ` · ${t.note}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold tracking-[0.25em] text-neutral-400">
                DESCRIPTION
              </h2>
              <p className="mt-3 leading-relaxed text-neutral-600">
                {product.description}
              </p>
            </div>
          )}

          <div className="mt-8">
            <Button
              render={<Link href={`/${brand.slug}`}>More from {product.brand}</Link>}
              variant="outline"
            />
          </div>
        </div>
      </section>

      <section className="border-t bg-neutral-50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-serif text-2xl tracking-[0.15em] text-neutral-900 md:text-3xl">
            BUY NOW AT THE BELOW LOCATIONS
          </h2>
          {availability.length > 0 ? (
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <ul className="divide-y">
                {availability.map(({ availability: a, store }) => {
                  const live = store.availability_tier === "live";
                  const menuHref = a.menu_product_url ?? store.menu_url;
                  return (
                    <li
                      key={store.id}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div>
                        {menuHref ? (
                          <a
                            href={menuHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-underline text-sm font-medium text-neutral-900"
                          >
                            {store.name}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-neutral-900">
                            {store.name}
                          </span>
                        )}
                        <p className="text-xs text-neutral-500">
                          {[store.address_line1, store.city, store.state]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <p className="mt-1 text-[11px] text-neutral-400">
                          {live
                            ? `On the menu as of ${new Date(a.checked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                            : "Carried here recently"}
                        </p>
                      </div>
                      {menuHref && (
                        <Button
                          size="sm"
                          variant="outline"
                          render={
                            <a
                              href={menuHref}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              See Menu
                            </a>
                          }
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
              <AvailabilityMap stores={stores} />
            </div>
          ) : (
            <p className="mt-8 rounded border border-dashed p-10 text-center text-sm text-neutral-400">
              Live availability connects with the store data feed — meanwhile,
              find a store on the{" "}
              <Link href="/store-locator" className="underline">
                store locator
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {others.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <h2 className="font-serif text-2xl tracking-[0.15em] text-neutral-900">
            MORE FROM {product.brand.toUpperCase()}
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            {others.map((p) => (
              <Link
                key={p.id}
                href={`/products/${brand.slug}/${p.slug}`}
                className="group block"
              >
                <div className="aspect-square overflow-hidden rounded-sm bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url ?? "/placeholders/product.svg"}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 text-sm tracking-wide text-neutral-800">
                  {p.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
