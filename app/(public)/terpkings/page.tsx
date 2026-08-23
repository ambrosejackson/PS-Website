import type { Metadata } from "next";
import { Footer } from "@/components/site/Footer";
import { TKHero } from "@/components/brand/terpkings/TKHero";
import { TKArsenal } from "@/components/brand/terpkings/TKArsenal";
import { TKCatalog } from "@/components/brand/terpkings/TKCatalog";
import { TKComic } from "@/components/brand/terpkings/TKComic";
import { TKDossiers } from "@/components/brand/terpkings/TKDossiers";
import { TKScanner } from "@/components/brand/terpkings/TKScanner";
import { TKMerch } from "@/components/brand/terpkings/TKMerch";
import { TKLocator } from "@/components/brand/terpkings/TKLocator";
import { TKSignalFeed } from "@/components/brand/terpkings/TKSignalFeed";
import { TKSignup } from "@/components/brand/terpkings/TKSignup";
import { vt323 } from "@/components/brand/terpkings/tk-font";
import { getCatalogProducts, getHeroesForPage, pickHeroVideo } from "@/lib/data";
import { PRODUCTS, TERPS, TK_HERO } from "@/lib/terpkings-content";
import { assetAvailability } from "@/lib/terpkings-assets";
import "@/components/brand/terpkings/terpkings.css";

/**
 * TerpKings brand page — faithful recreation of the Claude Design export
 * (docs/reference/terpkings/terpkings-subpage.html): CRT hero, FILE 01–06
 * consoles, signal feed, JOIN THE COURT signup — under the shared brand-page
 * overlay header and the shared site footer.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "TerpKings — Rulers of Flavor",
  description: TK_HERO.tagline,
  openGraph: {
    title: "TerpKings — Rulers of Flavor | Private Stock",
    description: TK_HERO.tagline,
    images: [{ url: "/brand-pages/terpkings/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TerpKings — Rulers of Flavor | Private Stock",
    description: TK_HERO.tagline,
    images: ["/brand-pages/terpkings/og.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Brand",
  name: "TerpKings",
  url: "https://privatestock.co/terpkings",
  logo: "https://privatestock.co/brand-assets/terpkings/terpkings-logo.png",
  slogan: TK_HERO.tagline,
  parentOrganization: { "@type": "Organization", name: "Private Stock Cannabis Co." },
};

export default async function TerpKingsPage() {
  const [heroes, catalog] = await Promise.all([
    getHeroesForPage("/terpkings"),
    getCatalogProducts("TerpKings"),
  ]);
  const heroVideo = pickHeroVideo(heroes);
  // Optional renders: real file if present, brand placeholder if not.
  const available = assetAvailability([
    ...PRODUCTS.map((p) => p.img),
    ...TERPS.map((t) => t.img),
  ]);

  return (
    <main className={`tk-page ${vt323.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <TKHero videoUrl={heroVideo?.media_url ?? null} posterUrl={heroVideo?.poster_url ?? null} />
      <TKArsenal available={available} />
      <TKCatalog products={catalog} />
      <TKComic />
      <TKDossiers />
      <TKScanner available={available} />
      <TKMerch />
      <TKLocator />
      <TKSignalFeed />
      <TKSignup />

      <Footer />
    </main>
  );
}
