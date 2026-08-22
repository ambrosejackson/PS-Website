import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import { Footer } from "@/components/site/Footer";
import { TKHero } from "@/components/brand/terpkings/TKHero";
import { getHeroesForPage, pickHeroVideo } from "@/lib/data";
import { TK_HERO } from "@/lib/terpkings-content";
import "@/components/brand/terpkings/terpkings.css";

/**
 * TerpKings brand page — faithful recreation of the Claude Design export
 * (docs/reference/terpkings/terpkings-subpage.html): CRT hero, FILE 01–06
 * consoles, signal feed, JOIN THE COURT signup — under the shared brand-page
 * overlay header and the shared site footer.
 */

export const revalidate = 300;

// VT323 is scoped to this page only (exposed as --font-vt323 → .tk-mono).
const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

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
  const heroes = await getHeroesForPage("/terpkings");
  const heroVideo = pickHeroVideo(heroes);

  return (
    <main className={`tk-page ${vt323.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <TKHero videoUrl={heroVideo?.media_url ?? null} />

      <Footer />
    </main>
  );
}
