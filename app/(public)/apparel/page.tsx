import type { Metadata } from "next";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import { getHeroesForPage, getMerchProducts } from "@/lib/data";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Apparel",
  description:
    "Private Stock merch and apparel — the full shop opens soon with secure checkout.",
};

export default async function ApparelPage() {
  const [heroes, products] = await Promise.all([
    getHeroesForPage("/apparel"),
    getMerchProducts(),
  ]);
  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[45svh]" />
      <section className="mx-auto max-w-screen-2xl px-6 py-14 md:px-12 md:py-20">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          APPAREL &amp; ACCESSORIES
        </h1>
        <p className="mt-3 max-w-xl text-sm text-neutral-500">
          The full shop — with secure checkout, Apple Pay, and Google Pay —
          opens soon. Newsletter members get a one-time 15% code.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {products.map((p) => {
            const images = Array.isArray(p.images) ? (p.images as string[]) : [];
            return (
              <ProductCard
                key={p.id}
                imageUrl={images[0] ?? "/placeholders/merch-1.svg"}
                caption={p.name}
              />
            );
          })}
        </div>
      </section>
      <Footer />
    </main>
  );
}
