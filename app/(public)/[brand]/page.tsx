import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { NewsletterSection } from "@/components/site/NewsletterSection";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import { SectionHeader } from "@/components/site/SectionHeader";
import { BRAND_SLUGS, brandBySlug } from "@/lib/brands";
import {
  FALLBACK_HERO,
  getCatalogProducts,
  getHeroesForPage,
} from "@/lib/data";

/**
 * Brand skeleton pages (decision 7 / kickoff 1.5): same header/hero pattern,
 * product grid from catalog_products. Full brand-site recreations land in
 * phases 1–2. Only allowlisted brand slugs build (guardrail #3) — everything
 * else 404s via dynamicParams=false.
 */

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return BRAND_SLUGS.map((brand) => ({ brand }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = brandBySlug(slug);
  if (!brand) return {};
  return {
    title: brand.name,
    description: `${brand.name} — ${brand.tagline} A Private Stock Cannabis Co. brand.`,
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: slug } = await params;
  const brand = brandBySlug(slug);
  if (!brand) notFound();

  const [dbHeroes, products] = await Promise.all([
    getHeroesForPage(`/${brand.slug}`),
    getCatalogProducts(brand.name),
  ]);

  const heroes =
    dbHeroes.length > 0
      ? dbHeroes
      : [
          {
            ...FALLBACK_HERO,
            id: `fallback-${brand.slug}`,
            page: `/${brand.slug}`,
            media_url: `/placeholders/hero-${brand.slug}.svg`,
          },
        ];

  return (
    <main>
      <HeroSwitcher heroes={heroes}>
        <div className="w-full px-6 pb-16 text-white md:px-12">
          <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight md:text-6xl">
            {brand.name}
          </h1>
          <p className="mt-3 font-condensed text-sm font-semibold uppercase tracking-wide text-white/70">
            {brand.tagline}
          </p>
        </div>
      </HeroSwitcher>

      <section className="mx-auto max-w-screen-2xl px-6 py-12 md:px-12 md:py-14">
        <SectionHeader
          title="Products"
          seeMoreHref="/products"
          seeMoreLabel="VIEW ALL BRANDS"
        />
        {products.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                href={`/products/${brand.slug}/${p.slug}`}
                imageUrl={p.image_url ?? "/placeholders/product.svg"}
                caption={p.name}
                hoverHint="Click for more info"
              />
            ))}
          </div>
        ) : (
          <p className="mt-10 border border-dashed border-hairline p-10 text-center text-sm text-neutral-400">
            {brand.name} products are coming to the catalog soon.
          </p>
        )}
      </section>

      <NewsletterSection />
      <Footer />
    </main>
  );
}
