import { SectionHeader } from "@/components/site/SectionHeader";
import { ProductCard } from "@/components/site/ProductCard";
import { merchFromCents, type MerchListing } from "@/lib/data";

/**
 * Merch & Apparel section per the reference screenshots: same section pattern
 * as the brand rows, cover image, name + from-price caption, each card linking
 * to /apparel/[slug]. Landing shows one row; /apparel shows the full grid.
 */
export function MerchGrid({
  products,
  limit = 12,
}: {
  products: MerchListing[];
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
            const from = merchFromCents(p);
            return (
              <ProductCard
                key={p.id}
                href={`/apparel/${p.slug}`}
                imageUrl={images[0] ?? "/placeholders/merch-1.png"}
                caption={`${p.name}${from != null ? ` · from $${(from / 100).toFixed(2)}` : ""}`}
                track={`merch-card:${p.slug}`}
                hoverHint="View"
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
