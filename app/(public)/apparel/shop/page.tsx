import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GridPage } from "@/components/shop/GridPage";
import { isTab, tabLabel } from "@/lib/merchCategories";
import { getActiveCollections, getCollectionPage, SHOP_ALL_SLUG } from "@/lib/merch/queries";

/**
 * /apparel/shop — the shop-all grid (D-071). Filters (?tab=, ?brand=) and
 * ?page= are read from the URL, so this route renders per request; the
 * unfiltered data is cached by Supabase/CDN and admin saves still call
 * revalidatePath. Interstitials come from the reserved 'all' collection (D-078).
 */

type Search = { tab?: string; brand?: string; page?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const { tab } = await searchParams;
  const label = tab && isTab(tab) ? tabLabel(tab) : null;
  return {
    title: label ? `${label} — Apparel` : "Shop all — Apparel",
    description: "Private Stock merch and apparel — tees, hoodies, hats and accessories from Private Stock, Outfitters, TerpKings, Higher Self and Savage Squad Strains.",
    alternates: { canonical: "/apparel/shop" },
  };
}

export default async function ShopAllPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const tab = sp.tab && isTab(sp.tab) ? sp.tab : null;
  const brand = sp.brand ? sp.brand.slice(0, 40) : null;
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));
  const [data, collections] = await Promise.all([getCollectionPage({ slug: SHOP_ALL_SLUG, tab, brand, page }), getActiveCollections()]);
  if (!data) notFound();
  return (
    <GridPage
      data={data}
      title="Apparel"
      tagline={null}
      collections={collections.filter((c) => c.slug !== SHOP_ALL_SLUG).map((c) => ({ name: c.name, slug: c.slug }))}
      basePath="/apparel/shop"
      tab={tab}
      brand={brand}
    />
  );
}
