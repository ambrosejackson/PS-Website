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
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <h1 className="font-serif text-4xl tracking-[0.15em] text-neutral-900">
          PRODUCTS
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
