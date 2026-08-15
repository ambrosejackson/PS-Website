import type { Metadata } from "next";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { ProductCatalog } from "@/components/site/ProductCatalog";
import { Footer } from "@/components/site/Footer";
import { getCatalogProducts, getHeroesForPage } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Products",
  description:
    "The full Private Stock catalog — Outfitters, TerpKings, Higher Self, and Savage Squad Strains. Filter by brand, category, type, and terpene profile.",
};

export default async function ProductsPage() {
  const [heroes, products] = await Promise.all([
    getHeroesForPage("/products"),
    getCatalogProducts(),
  ]);

  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[45svh]" />
      <section className="mx-auto max-w-screen-2xl px-6 py-14 md:px-12 md:py-20">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          Products
        </h1>
        <p className="mt-3 max-w-xl text-sm text-neutral-500">
          Every product across our brands. Availability and where-to-buy live on
          each product page.
        </p>
        <div className="mt-10">
          <ProductCatalog products={products} />
        </div>
      </section>
      <Footer />
    </main>
  );
}
