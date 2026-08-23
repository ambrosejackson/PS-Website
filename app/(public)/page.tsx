import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { RotatingBanner } from "@/components/site/RotatingBanner";
import { IntroSection } from "@/components/site/IntroSection";
import { BrandsShowcase } from "@/components/site/BrandsShowcase";
import { BrandGrid } from "@/components/site/BrandGrid";
import { MerchGrid } from "@/components/site/MerchGrid";
import { InTheNews } from "@/components/site/InTheNews";
import { FollowUs } from "@/components/site/FollowUs";
import { NewsletterSection } from "@/components/site/NewsletterSection";
import { Footer } from "@/components/site/Footer";
import {
  getBanners,
  getCatalogProducts,
  getHeroesForPage,
  getMerchListings,
  getPublishedPosts,
} from "@/lib/data";

export const revalidate = 300;

export default async function LandingPage() {
  const [heroes, banners, products, merch, posts] = await Promise.all([
    getHeroesForPage("/"),
    getBanners(),
    getCatalogProducts(),
    getMerchListings(),
    getPublishedPosts(3),
  ]);

  return (
    <main className="bg-white">
      <HeroSwitcher heroes={heroes} />
      {/* Banners live BELOW the hero — never above or over it (guardrail #4) */}
      <RotatingBanner slides={banners} />
      {/* Intro carries the only on-page pointer to the catalog modal (D-021) */}
      <IntroSection />
      {/* The flip-book section's replacement — black, no divider rules (D-022) */}
      <BrandsShowcase />
      <BrandGrid products={products} />
      <MerchGrid products={merch} />
      <InTheNews posts={posts} />
      <FollowUs />
      <NewsletterSection />
      <Footer />
    </main>
  );
}
