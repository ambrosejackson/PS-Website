import Image from "next/image";
import Link from "next/link";
import type { ShopTile } from "@/lib/merch/queries";
import { tabLabel } from "@/lib/merchCategories";

/**
 * Category feature tiles (§6.2 #7, D-081): two side-by-side near-square tiles
 * on desktop (660×650 measured at 1440), stacked on mobile. Label + "View
 * products" bottom-left; the whole tile links to /apparel/shop?tab={tab}.
 */
export function CategoryTiles({ tiles }: { tiles: ShopTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <section aria-label="Shop by category" className="px-3 md:px-10">
      <ul className="grid gap-[13px] md:grid-cols-2 md:gap-10">
        {tiles.map((t, i) => {
          const label = t.label ?? tabLabel(t.tab) ?? t.tab;
          return (
            <li key={t.tab}>
              <Link href={`/apparel/shop?tab=${encodeURIComponent(t.tab)}`} className="group relative block aspect-square w-full overflow-hidden bg-[#f0f0f0]">
                <Image
                  src={t.image_url}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority={i < 2 ? false : undefined}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-6 pb-6 pt-16">
                  <p className="font-condensed text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">{label}</p>
                  <span className="mt-1 inline-block border-b border-white font-condensed text-xs font-bold uppercase tracking-[0.14em] text-white">View products</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
