import type { Metadata } from "next";
import Link from "next/link";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import { SectionHeader } from "@/components/site/SectionHeader";
import { AvailabilityMap } from "@/components/site/AvailabilityMap";
import {
  FALLBACK_HERO,
  getCatalogProducts,
  getHeroesForPage,
  getStoreLocations,
} from "@/lib/data";

/**
 * TerpKings v1 SHELL (decision 7: skeleton now, full design later).
 * Space-purple hero from the Brand Book aesthetic, terpene-category chips,
 * catalog grid, live locator block, global footer.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "TerpKings",
  description:
    "TerpKings — choose your terpenes, discover your experience. Rosin pre-rolls, Astro vapes, and TerpBurstz gummies sorted by Fruit, Haze, Gas, Dessert, and Floral.",
  openGraph: {
    title: "TerpKings — Choose Your Terpenes",
    description: "Choose your terpenes. Discover your experience.",
  },
};

/** Brand Book terp-category palette (placeholder values until full design). */
const TERP_CATEGORIES = [
  { name: "Fruit", hex: "#ff6b9d" },
  { name: "Haze", hex: "#8b7bff" },
  { name: "Gas", hex: "#59d97e" },
  { name: "Dessert", hex: "#e0b36a" },
  { name: "Floral", hex: "#c88bd9" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Brand",
  name: "TerpKings",
  url: "https://privatestock.co/terpkings",
  parentOrganization: { "@type": "Organization", name: "Private Stock Cannabis Co." },
};

export default async function TerpKingsPage() {
  const [dbHeroes, products, allStores] = await Promise.all([
    getHeroesForPage("/terpkings"),
    getCatalogProducts("TerpKings"),
    getStoreLocations(),
  ]);
  const heroes =
    dbHeroes.length > 0
      ? dbHeroes
      : [
          {
            ...FALLBACK_HERO,
            id: "fallback-terpkings",
            page: "/terpkings",
            media_url: "/brand-pages/terpkings/hero.svg",
            theme: "dark" as const,
          },
        ];
  // Real logo (landed in public/brand-assets/, alongside the other brand marks).
  const logoSrc = "/brand-assets/terpkings-white.png";
  const stores = allStores.filter((s) => s.brands.includes("TerpKings"));

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HeroSwitcher heroes={heroes}>
        <div className="flex w-full flex-col items-center justify-center pb-24 text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="TerpKings" className="h-16 w-auto md:h-24" />
          <p className="mt-6 text-sm tracking-wide text-white/80 md:text-base">
            Choose your terpenes. Discover your experience.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {TERP_CATEGORIES.map((c) => (
              <Link
                key={c.name}
                href="/products?brand=TerpKings"
                className="rounded-full px-5 py-2 font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-950 transition-transform hover:scale-105"
                style={{ backgroundColor: c.hex }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </HeroSwitcher>

      <section className="mx-auto max-w-screen-2xl px-6 py-12 md:px-12 md:py-14">
        <SectionHeader
          title="Products"
          seeMoreHref="/products?brand=TerpKings"
          seeMoreLabel="VIEW ALL"
        />
        {products.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                href={`/products/terpkings/${p.slug}`}
                imageUrl={p.image_url ?? "/placeholders/product.svg"}
                caption={p.name}
                hoverHint="Click for more info"
              />
            ))}
          </div>
        ) : (
          <p className="mt-10 border border-dashed border-hairline p-10 text-center text-sm text-neutral-400">
            TerpKings products are coming to the catalog soon.
          </p>
        )}
      </section>

      <section className="border-t border-hairline bg-[#f7f5fb]">
        <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
          <h2 className="text-center font-condensed text-3xl font-bold uppercase tracking-tight text-ink">
            Find TerpKings Near You
          </h2>
          <p className="mt-3 text-center text-sm text-neutral-500">
            Available at select Illinois retailers.
          </p>
          <div className="mt-8">
            <AvailabilityMap stores={stores} />
          </div>
          {stores.length > 0 && (
            <ul className="mt-6 grid gap-2 text-center text-sm text-neutral-600 sm:grid-cols-2">
              {stores.map((s) => (
                <li key={s.id}>
                  {s.menu_url ? (
                    <a
                      href={s.menu_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nav-underline font-medium text-ink"
                    >
                      {s.name}
                    </a>
                  ) : (
                    s.name
                  )}{" "}
                  <span className="text-neutral-400">
                    · {s.city}, {s.state}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
