import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { BrandGalleryHero } from "@/components/site/BrandGalleryHero";
import { StoreLocatorHero } from "@/components/site/StoreLocatorHero";
import { RewardsHero } from "@/components/site/RewardsHero";
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
  getSocialImages,
} from "@/lib/data";

export const revalidate = 300;

export default async function LandingPage() {
  const [heroes, banners, products, merch, posts, social] = await Promise.all([
    getHeroesForPage("/"),
    getBanners(),
    getCatalogProducts(),
    getMerchListings(),
    getPublishedPosts(3),
    getSocialImages(),
  ]);

  return (
    <main className="bg-white">
      {/* All three nav hover-swaps are built components, not admin images:
          BRANDS → Brand Gallery Hero (D-082), STORE LOCATOR → Store Locator Hero,
          YOUR REWARDS → the /rewards hero in fill mode. Only the default stays admin-managed. */}
      <HeroSwitcher
        heroes={heroes}
        navTargetNodes={{
          BRANDS: <BrandGalleryHero />,
          "STORE LOCATOR": <StoreLocatorHero />,
          "YOUR REWARDS": <RewardsHero fill />,
        }}
      />
      {/* Banners live BELOW the hero — never above or over it (guardrail #4) */}
      <RotatingBanner slides={banners} />
      {/* Intro carries the only on-page pointer to the catalog modal (D-021) */}
      <IntroSection />
      {/* The flip-book section's replacement — black, no divider rules (D-022) */}
      <BrandsShowcase />
      <BrandGrid products={products} />
      <MerchGrid products={merch} />
      <InTheNews posts={posts} />
      <FollowUs images={social} />
      <NewsletterSection />
      <Footer />
    </main>
  );
}
