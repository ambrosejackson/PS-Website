import type { Metadata } from "next";
import Link from "next/link";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { CategoryTiles } from "@/components/shop/CategoryTiles";
import { CollectionGrid } from "@/components/shop/CollectionGrid";
import { CollectionsCarousel } from "@/components/shop/CollectionsCarousel";
import { ShippingLine } from "@/components/shop/ShippingLine";
import { ShopSubNav } from "@/components/shop/ShopSubNav";
import { getApparelHome } from "@/lib/merch/queries";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Apparel",
  description:
    "Private Stock merch and apparel — tees, hoodies, hats and accessories from Private Stock, Outfitters, TerpKings, Higher Self and Savage Squad Strains.",
  alternates: { canonical: "/apparel" },
};

/**
 * /apparel — showcase home (§6.2, D-071): hero with the merch_settings copy
 * overlaid (whole hero links to the CTA URL when set) → shipping line →
 * sub-nav → New Releases → featured collection → Collections carousel →
 * category tiles → footer. Sections with nothing to show render nothing.
 * Our hero system and ratios are unchanged (D-073).
 */
export default async function ApparelPage() {
  const home = await getApparelHome();
  const s = home.settings;
  const hero = home.hero.find((h) => h.is_default) ?? home.hero[0];
  const light = hero?.theme === "light";
  const ctaUrl = s?.hero_cta_url?.trim() || null;
  const hasCopy = !!(s?.hero_headline || s?.hero_subline || (ctaUrl && s?.hero_cta_label));

  const overlayInner = (
    <div className="w-full px-5 pb-8 md:px-10 md:pb-12">
      {s?.hero_headline && (
        <p className={`font-condensed text-[42px] font-bold uppercase leading-none tracking-tight md:text-[64px] ${light ? "text-ink" : "text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]"}`}>
          {s.hero_headline}
        </p>
      )}
      {s?.hero_subline && <p className={`mt-2 text-sm md:text-base ${light ? "text-ink/80" : "text-white/90"}`}>{s.hero_subline}</p>}
      {ctaUrl && (
        <span className={`mt-4 inline-block font-condensed text-xs font-bold uppercase tracking-[0.16em] ${light ? "text-ink" : "text-white"}`}>
          {s?.hero_cta_label || "View more"}
          <span aria-hidden className={`mt-1 block h-px w-full ${light ? "bg-ink" : "bg-white"}`} />
        </span>
      )}
    </div>
  );

  return (
    <main>
      <HeroSwitcher heroes={home.hero} heightClassName="h-[60svh] md:h-[75svh]">
        {hasCopy &&
          (ctaUrl ? (
            <Link href={ctaUrl} className="pointer-events-auto flex h-full w-full items-end" aria-label={`${s?.hero_headline ?? "Apparel"} — ${s?.hero_cta_label || "View more"}`}>
              {overlayInner}
            </Link>
          ) : (
            <div className="pointer-events-none flex h-full w-full items-end">{overlayInner}</div>
          ))}
      </HeroSwitcher>
      <ShippingLine />
      <ShopSubNav mode="home" collections={home.collections.map((c) => ({ name: c.name, slug: c.slug }))} />

      <section aria-labelledby="new-releases" className="px-3 pt-10 md:px-5 md:pt-14">
        <h2 id="new-releases" className="mb-6 text-center font-condensed text-[28px] font-bold uppercase tracking-tight text-ink md:text-[37px]">
          New Releases
        </h2>
        <CollectionGrid products={home.newReleases} emptyMessage="The first drop is being stitched — check back soon." />
      </section>

      {home.featured && home.featured.products.length > 0 && (
        <section aria-labelledby="featured-collection" className="px-3 pt-16 md:px-5 md:pt-24">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 id="featured-collection" className="font-condensed text-[28px] font-bold uppercase tracking-tight text-ink md:text-[37px]">
              {home.featured.collection.name} Collection
            </h2>
            <Link href={`/apparel/collections/${home.featured.collection.slug}`} className="nav-underline font-condensed text-xs font-bold uppercase tracking-[0.14em] text-ink">
              {s?.featured_cta_label || "Available now"}
            </Link>
          </div>
          <CollectionGrid products={home.featured.products} />
        </section>
      )}

      {home.collections.length > 0 && (
        <div className="pt-16 md:pt-24">
          <CollectionsCarousel collections={home.collections} />
        </div>
      )}

      {home.tiles.length > 0 && (
        <div className="pt-16 md:pt-24">
          <CategoryTiles tiles={home.tiles} />
        </div>
      )}

      <div className="pb-16 md:pb-24" />
      <Footer />
    </main>
  );
}
