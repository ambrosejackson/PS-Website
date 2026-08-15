import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { MerchProduct } from "@/lib/data";

/** Merch & Apparel preview grid — placeholder products until the Stripe shop ships. */
export function MerchGrid({ products }: { products: MerchProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="flex items-end justify-between">
        <h2 className="font-serif text-3xl tracking-[0.18em] text-neutral-900 md:text-4xl">
          MERCH &amp; APPAREL
        </h2>
        <Button
          render={<Link href="/apparel">See More</Link>}
          variant="outline"
        />
      </div>
      <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
        {products.slice(0, 4).map((p) => {
          const images = Array.isArray(p.images) ? (p.images as string[]) : [];
          return (
            <Link key={p.id} href="/apparel" className="group block">
              <div className="aspect-square overflow-hidden rounded-sm bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[0] ?? "/placeholders/merch-1.svg"}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-3 text-sm tracking-wide text-neutral-800">
                {p.name}
              </p>
              <p className="text-xs text-neutral-400">Coming soon</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
