import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import { SectionHeader } from "@/components/site/SectionHeader";
import { ApparelDetail } from "@/components/site/ApparelDetail";
import { getHeroesForPage, getMerchListingBySlug, getMerchListings, merchFromCents } from "@/lib/data";

/**
 * /apparel/[slug] — merch detail: gallery, variant picker, qty, Add to Cart
 * (intent only until checkout ships). Metadata + Product/Offer structured data
 * (merch pricing is fine — guardrail #2 covers cannabis products only).
 */

export const revalidate = 300;

export async function generateStaticParams() {
  const products = await getMerchListings();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getMerchListingBySlug(slug);
  if (!product) return {};
  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const title = `${product.name} — Apparel`;
  return {
    title,
    description:
      product.description ??
      `${product.name} — Private Stock merch & apparel${product.brand ? ` by ${product.brand}` : ""}.`,
    openGraph: { title, description: product.description ?? undefined, images: images[0] ? [images[0]] : undefined },
  };
}

const money = (c: number) => (c / 100).toFixed(2);

export default async function ApparelProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getMerchListingBySlug(slug);
  if (!product) notFound();
  const [heroes, all] = await Promise.all([getHeroesForPage("/apparel"), getMerchListings()]);
  const others = all.filter((p) => p.id !== product.id).slice(0, 6);
  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const active = product.merch_variants.filter((v) => v.is_active);
  const from = merchFromCents(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: images.length ? images : undefined,
    brand: { "@type": "Brand", name: product.brand ?? "Private Stock" },
    sku: active[0]?.sku,
    ...(active.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: money(Math.min(...active.map((v) => v.price_cents))),
            highPrice: money(Math.max(...active.map((v) => v.price_cents))),
            offerCount: active.length,
            availability: "https://schema.org/PreOrder",
          },
        }
      : {}),
  };

  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[35svh]" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <nav className="mb-8 font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">
          <Link href="/apparel" className="hover:text-ink">
            Apparel
          </Link>{" "}
          / <span className="text-ink">{product.name}</span>
          {from != null && <span className="sr-only"> from ${money(from)}</span>}
        </nav>
        <ApparelDetail product={product} />
      </section>

      {others.length > 0 && (
        <section className="border-t border-hairline">
          <div className="mx-auto max-w-screen-2xl px-6 py-12 md:px-12 md:py-14">
            <SectionHeader title="More Merch & Apparel" seeMoreHref="/apparel" />
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
              {others.map((p) => {
                const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
                const f = merchFromCents(p);
                return (
                  <ProductCard
                    key={p.id}
                    href={`/apparel/${p.slug}`}
                    imageUrl={imgs[0] ?? "/placeholders/merch-1.png"}
                    caption={`${p.name}${f != null ? ` · from $${money(f)}` : ""}`}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </main>
  );
}
