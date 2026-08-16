import { SectionHeader } from "@/components/site/SectionHeader";
import { ProductCard } from "@/components/site/ProductCard";
import type { MerchProduct } from "@/lib/data";

/**
 * Merch & Apparel section per the reference screenshots: same section pattern
 * as the brand rows, SKU-style captions (TS-03, JC-08, …). Landing shows one
 * row; /apparel shows the full multi-row grid.
 */
export function MerchGrid({
  products,
  limit = 12,
}: {
  products: MerchProduct[];
  limit?: number;
}) {
  if (products.length === 0) return null;
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-screen-2xl px-6 py-12 md:px-12 md:py-14">
        <SectionHeader title="Merch & Apparel" seeMoreHref="/apparel" />
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {products.slice(0, limit).map((p) => {
            const images = Array.isArray(p.images) ? (p.images as string[]) : [];
            return (
              <ProductCard
                key={p.id}
                href="/apparel"
                imageUrl={images[0] ?? "/placeholders/merch-1.png"}
                caption={p.name}
                track={`merch-card:${p.slug}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
