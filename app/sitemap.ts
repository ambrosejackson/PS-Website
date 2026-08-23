import type { MetadataRoute } from "next";
import { BRANDS, brandByName } from "@/lib/brands";
import { getCatalogProducts, getMerchListings, getPublishedPosts } from "@/lib/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privatestock.co";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts, merch] = await Promise.all([
    getCatalogProducts(),
    getPublishedPosts(),
    getMerchListings(),
  ]);

  const staticPaths = [
    "",
    "/products",
    "/store-locator",
    "/apparel",
    "/rewards",
    "/news",
    "/about",
    "/contact",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const brandPaths = BRANDS.map((b) => ({
    url: `${SITE_URL}/${b.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const productPaths = products.flatMap((p) => {
    const brand = brandByName(p.brand);
    return brand
      ? [
          {
            url: `${SITE_URL}/products/${brand.slug}/${p.slug}`,
            changeFrequency: "weekly" as const,
            priority: 0.8,
          },
        ]
      : [];
  });

  const postPaths = posts.map((post) => ({
    url: `${SITE_URL}/news/${post.slug}`,
    lastModified: post.published_at ?? undefined,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const apparelPaths = merch.map((m) => ({
    url: `${SITE_URL}/apparel/${m.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPaths, ...brandPaths, ...productPaths, ...apparelPaths, ...postPaths];
}
