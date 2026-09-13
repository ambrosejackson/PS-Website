import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import type { CollectionPage } from "@/lib/merch/queries";
import { CollectionGrid } from "./CollectionGrid";
import { ShippingLine } from "./ShippingLine";
import { ShopSubNav, type SubNavCollection } from "./ShopSubNav";

/**
 * Shared layout for /apparel/shop and /apparel/collections/[slug] (§6.3,
 * D-073): hero (our hero system, unchanged) with the title overlaid
 * bottom-left → shipping line → sticky sub-nav filtering in place → tagline
 * centered → grid with interstitials → Load more → footer.
 */
export function GridPage({
  data,
  title,
  tagline,
  collections,
  basePath,
  tab,
  brand,
}: {
  data: CollectionPage;
  title: string;
  tagline?: string | null;
  collections: SubNavCollection[];
  basePath: string;
  tab: string | null;
  brand: string | null;
}) {
  const hero = data.hero.find((h) => h.is_default) ?? data.hero[0];
  const light = hero?.theme === "light";
  return (
    <main>
      <HeroSwitcher heroes={data.hero} heightClassName="h-[45svh] md:h-[60svh]">
        <div className="pointer-events-none w-full px-5 pb-6 md:px-10 md:pb-10">
          <h1
            className={`font-condensed text-[46px] font-bold uppercase leading-none tracking-tight md:text-[65px] ${
              light ? "text-ink" : "text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]"
            }`}
          >
            {title}
          </h1>
        </div>
      </HeroSwitcher>
      <ShippingLine />
      <ShopSubNav mode="grid" collections={collections} basePath={basePath} activeTab={tab} activeBrand={brand} />
      <section className="px-3 pb-16 pt-8 md:px-5 md:pb-24 md:pt-10">
        {tagline && <h2 className="mb-8 text-center font-condensed text-[28px] font-bold uppercase tracking-tight text-ink md:text-[37px]">{tagline}</h2>}
        <CollectionGrid
          products={data.products}
          banners={data.banners}
          filter={{ slug: data.collection.slug, tab, brand }}
          page={data.page}
          hasMore={data.hasMore}
          emptyMessage={tab || brand ? "No products match this filter." : "Nothing here yet — check back soon."}
        />
      </section>
      <Footer />
    </main>
  );
}
