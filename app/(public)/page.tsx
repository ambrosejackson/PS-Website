import { readFile } from "node:fs/promises";
import path from "node:path";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { RotatingBanner } from "@/components/site/RotatingBanner";
import { IntroSection } from "@/components/site/IntroSection";
import { FlipBook } from "@/components/site/FlipBook";
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
  getMerchProducts,
  getPublishedPosts,
} from "@/lib/data";

export const revalidate = 300;

async function getBrandBookManifest() {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "public/brand-book/manifest.json"),
      "utf8",
    );
    return JSON.parse(raw) as { pageCount: number; aspectRatio: number };
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const [heroes, banners, products, merch, posts, brandBook] =
    await Promise.all([
      getHeroesForPage("/"),
      getBanners(),
      getCatalogProducts(),
      getMerchProducts(),
      getPublishedPosts(3),
      getBrandBookManifest(),
    ]);

  return (
    <main className="bg-white">
      <HeroSwitcher heroes={heroes} />
      {/* Banners live BELOW the hero — never above or over it (guardrail #4) */}
      <RotatingBanner slides={banners} />
      <IntroSection />
      {brandBook && (
        <section className="border-t border-hairline">
          <div className="mx-auto max-w-screen-2xl px-6 py-12 md:px-12 md:py-14">
            <h2 className="text-center font-condensed text-[26px] font-bold uppercase tracking-tight text-ink md:text-[32px]">
              The Brand Book
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-neutral-500">
              Flip through the Private Stock product catalog.
            </p>
            <div className="mt-10">
              <FlipBook
                pageCount={brandBook.pageCount}
                aspectRatio={brandBook.aspectRatio}
              />
            </div>
          </div>
        </section>
      )}
      <BrandGrid products={products} />
      <MerchGrid products={merch} />
      <InTheNews posts={posts} />
      <FollowUs />
      <NewsletterSection />
      <Footer />
    </main>
  );
}
