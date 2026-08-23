import type { Metadata } from "next";
import Link from "next/link";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import { getHeroesForPage, getMerchListings, merchFromCents } from "@/lib/data";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Apparel",
  description:
    "Private Stock merch and apparel — tees, hoodies, hats and accessories from Private Stock, Outfitters, TerpKings, Higher Self and Savage Squad Strains.",
};

export default async function ApparelPage() {
  const [heroes, products] = await Promise.all([getHeroesForPage("/apparel"), getMerchListings()]);
  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[45svh]" />
      <section className="mx-auto max-w-screen-2xl px-6 py-14 md:px-12 md:py-20">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          APPAREL &amp; ACCESSORIES
        </h1>
        <p className="mt-3 max-w-xl text-sm text-neutral-500">
          Secure checkout with Apple Pay, Google Pay, cards and PayPal is launching shortly.
          Newsletter members get a one-time 15% code.
        </p>
        {products.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {products.map((p) => {
              const images = Array.isArray(p.images) ? (p.images as string[]) : [];
              const from = merchFromCents(p);
              return (
                <ProductCard
                  key={p.id}
                  href={`/apparel/${p.slug}`}
                  imageUrl={images[0] ?? "/placeholders/merch-1.png"}
                  caption={`${p.name}${from != null ? ` · from $${(from / 100).toFixed(2)}` : ""}`}
                  track={`apparel-card:${p.slug}`}
                  hoverHint="View"
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-10 border border-dashed border-hairline p-12 text-center">
            <p className="font-condensed text-sm uppercase tracking-wide text-neutral-400">
              The first drop is being stitched — check back soon.
            </p>
            <Link href="/#newsletter" className="mt-4 inline-block font-condensed text-xs font-semibold uppercase tracking-wide text-ink underline">
              Get drop alerts
            </Link>
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
