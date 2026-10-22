import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { ProductAvailability } from "@/components/site/ProductAvailability";
import { ProductCard } from "@/components/site/ProductCard";
import { SectionHeader } from "@/components/site/SectionHeader";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { brandByName, brandBySlug } from "@/lib/brands";
import { showRealAvailability } from "@/lib/showRealAvailability";
import {
  getAvailabilityForProduct,
  getCatalogProductBySlug,
  getCatalogProducts,
  getHeroesForPage,
  getStoresForBrand,
} from "@/lib/data";
import { strainDisplayName } from "@/lib/strainKey";

/**
 * SEO product page (decision 11 + docx reference layout): image zoom, terpene
 * profile, description, More from {Brand}, and "Buy Now at the Below
 * Locations" from availability data, matched at the STRAIN level via the
 * generated strain_key columns (D-118) and rendered by ProductAvailability
 * with the shared ZIP → distance search. Presence + menu links + images only —
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

const STRAIN_CHIP: Record<string, string> = {
  indica: "bg-purple-700",
  sativa: "bg-amber-500",
  hybrid: "bg-green-700",
};

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

  const [heroes, availability, moreFromBrand, brandStores] = await Promise.all([
    getHeroesForPage(`/${brand.slug}`),
    getAvailabilityForProduct(product),
    getCatalogProducts(product.brand),
    getStoresForBrand(product.brand),
  ]);

  const terps = (
    Array.isArray(product.terpene_profile) ? product.terpene_profile : []
  ) as TerpeneEntry[];
  const others = moreFromBrand.filter((p) => p.id !== product.id).slice(0, 4);

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
        {/* docx Jeeter reference: name/details LEFT, large product image RIGHT */}
        <div className="group flex items-center justify-center overflow-hidden bg-white md:order-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image_url ?? "/placeholders/product.png"}
            alt={product.name}
            className="aspect-square w-full object-contain transition-transform duration-700 group-hover:scale-110"
          />
        </div>

        <div className="md:order-1">
          <Link
            href={`/${brand.slug}`}
            className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400 hover:text-ink"
          >
            {product.brand}
          </Link>
          <h1 className="mt-2 font-condensed text-3xl font-bold uppercase leading-tight tracking-tight text-ink md:text-4xl">
            {product.name}
          </h1>
          {product.strain_type && (
            <span
              className={`mt-3 inline-block px-3 py-1 font-condensed text-xs font-bold uppercase tracking-wide text-white ${
                STRAIN_CHIP[product.strain_type] ?? "bg-neutral-600"
              }`}
            >
              {product.strain_type}
            </span>
          )}
          {product.terp_category && (
            <span className="ml-2 mt-3 inline-block border border-hairline px-3 py-1 font-condensed text-xs font-bold uppercase tracking-wide text-caption">
              {product.terp_category}
            </span>
          )}
          <p className="mt-3 text-sm text-neutral-500">
            {[product.category, product.format, product.weight]
              .filter(Boolean)
              .join(" · ")}
            {product.thc_range ? ` · THC ${product.thc_range}` : ""}
          </p>

          {terps.length > 0 && (
            <div className="mt-8">
              <h2 className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Terpene Profile
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {terps.map((t) => (
                  <span
                    key={t.name}
                    className="border border-hairline px-3 py-1 font-condensed text-xs font-semibold uppercase tracking-wide text-caption"
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
              <h2 className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Description
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

      {/* Hidden entirely on production while the site runs on mock PSM data (lib/showRealAvailability.ts). */}
      {showRealAvailability() && (
      <section className="border-t border-hairline py-14 md:py-20">
        <div className="mx-auto max-w-screen-2xl px-6 md:px-12">
          <h2 className="font-condensed text-[24px] font-bold uppercase tracking-tight text-ink md:text-[30px]">
            Buy Now at the Below Locations
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-neutral-500">
            Dispensaries whose menus list {strainDisplayName(product.name)} by {product.brand}, in any size.
            Your size is marked; others are shown so you can call ahead.
          </p>
          <ProductAvailability
            strainName={strainDisplayName(product.name)}
            brand={product.brand}
            brandSlug={brand.slug}
            stores={availability}
            brandStores={brandStores}
          />
        </div>
      </section>
      )}

      {others.length > 0 && (
        <section className="border-t border-hairline">
          <div className="mx-auto max-w-screen-2xl px-6 py-12 md:px-12 md:py-14">
            <SectionHeader
              title={`More from ${product.brand}`}
              seeMoreHref={`/${brand.slug}`}
            />
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
              {others.map((p) => (
                <ProductCard
                  key={p.id}
                  href={`/products/${brand.slug}/${p.slug}`}
                  imageUrl={p.image_url ?? "/placeholders/product.png"}
                  caption={p.name}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
