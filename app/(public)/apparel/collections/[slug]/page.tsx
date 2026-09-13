import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GridPage } from "@/components/shop/GridPage";
import { isTab, tabLabel } from "@/lib/merchCategories";
import { getActiveCollections, getCollectionBySlug, getCollectionPage, SHOP_ALL_SLUG } from "@/lib/merch/queries";

/**
 * /apparel/collections/[slug] — one collection's grid (D-071). The reserved
 * 'all' slug lives at /apparel/shop and 404s here. Inactive / out-of-window
 * collections 404 (D-078 window rule). Filters and ?page= come from the URL.
 */

type Search = { tab?: string; brand?: string; page?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  if (slug === SHOP_ALL_SLUG) return {};
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};
  const label = tab && isTab(tab) ? tabLabel(tab) : null;
  const title = `${collection.name}${label ? ` · ${label}` : ""} — Apparel`;
  return {
    title,
    description: collection.tagline ? `${collection.name} — ${collection.tagline}. Private Stock apparel.` : `${collection.name} — Private Stock apparel.`,
    alternates: { canonical: `/apparel/collections/${collection.slug}` },
    openGraph: { title, images: collection.cover_image_url ? [collection.cover_image_url] : undefined },
  };
}

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  if (slug === SHOP_ALL_SLUG) notFound();
  const tab = sp.tab && isTab(sp.tab) ? sp.tab : null;
  const brand = sp.brand ? sp.brand.slice(0, 40) : null;
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));
  const [data, collections] = await Promise.all([getCollectionPage({ slug, tab, brand, page }), getActiveCollections()]);
  if (!data) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: data.collection.name,
    description: data.collection.tagline ?? undefined,
    url: `/apparel/collections/${data.collection.slug}`,
    hasPart: data.products.slice(0, 24).map((p) => ({ "@type": "Product", name: p.name, url: `/apparel/${p.slug}` })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GridPage
        data={data}
        title={data.collection.name}
        tagline={data.collection.tagline}
        collections={collections.filter((c) => c.slug !== SHOP_ALL_SLUG).map((c) => ({ name: c.name, slug: c.slug }))}
        basePath={`/apparel/collections/${data.collection.slug}`}
        tab={tab}
        brand={brand}
      />
    </>
  );
}
