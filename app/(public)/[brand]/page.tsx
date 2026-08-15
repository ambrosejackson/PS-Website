import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { NewsletterSection } from "@/components/site/NewsletterSection";
import { Footer } from "@/components/site/Footer";
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
        <div className="w-full px-5 pb-16 text-white md:px-10">
          <h1 className="font-serif text-4xl tracking-[0.2em] md:text-6xl">
            {brand.name.toUpperCase()}
          </h1>
          <p className="mt-3 text-sm tracking-widest text-white/70">
            {brand.tagline.toUpperCase()}
          </p>
        </div>
      </HeroSwitcher>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl tracking-[0.18em] text-neutral-900 md:text-3xl">
            PRODUCTS
          </h2>
          <Link
            href="/products"
            className="nav-underline text-xs font-medium tracking-[0.2em] text-neutral-900"
          >
            VIEW ALL BRANDS
          </Link>
        </div>
        {products.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
            {products.map((p) => (
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
                <p className="text-xs text-neutral-400">
                  {[p.category, p.weight].filter(Boolean).join(" · ")}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded border border-dashed p-10 text-center text-sm text-neutral-400">
            {brand.name} products are coming to the catalog soon.
          </p>
        )}
      </section>

      <div style={{ backgroundColor: brand.accentHex }} className="h-1 w-full" />
      <NewsletterSection />
      <Footer />
    </main>
  );
}
