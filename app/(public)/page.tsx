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
    <main>
      <HeroSwitcher heroes={heroes} />
      {/* Banners live BELOW the hero — never above or over it (guardrail #4) */}
      <RotatingBanner slides={banners} />
      <IntroSection />
      {brandBook && (
        <section className="bg-neutral-50 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center font-serif text-3xl tracking-[0.18em] text-neutral-900 md:text-4xl">
              THE BRAND BOOK
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-sm text-neutral-500">
              Flip through the Private Stock product catalog.
            </p>
            <div className="mt-12">
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
