import type { Metadata } from "next";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
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
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <h1 className="font-serif text-4xl tracking-[0.15em] text-neutral-900">
          APPAREL &amp; ACCESSORIES
        </h1>
        <p className="mt-3 max-w-xl text-sm text-neutral-500">
          The full shop — with secure checkout, Apple Pay, and Google Pay —
          opens soon. Newsletter members get a one-time 15% code.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
          {products.map((p) => {
            const images = Array.isArray(p.images) ? (p.images as string[]) : [];
            return (
              <div key={p.id}>
                <div className="aspect-square overflow-hidden rounded-sm bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[0] ?? "/placeholders/merch-1.svg"}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-3 text-sm tracking-wide text-neutral-800">
                  {p.name}
                </p>
                <p className="text-xs text-neutral-400">Coming soon</p>
              </div>
            );
          })}
        </div>
      </section>
      <Footer />
    </main>
  );
}
