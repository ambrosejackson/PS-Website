import type { Metadata } from "next";
import { BrandCatalogGrid } from "@/components/site/BrandCatalogGrid";
import { getCatalogProducts } from "@/lib/data";
import Link from "next/link";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { HigherSelfLocator } from "@/components/brand/HigherSelfLocator";
import { FALLBACK_HERO, getHeroesForPage, getStoreLocations } from "@/lib/data";

/**
 * Higher Self brand page — recreation of docs/reference/higherself/ under the
 * global PS header (D-006). Sky-blue/white, Poppins, pill buttons, rounded
 * cards. Sections flow as a one-pager; the original Shop/About/Learn/Community
 * nav is intentionally not recreated.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Higher Self",
  description:
    "Premium cannabis products crafted for your Higher Self. Intentional consumption with mindfulness at the core — flower, pre-rolls, and vapes across Illinois.",
  openGraph: {
    title: "Higher Self — Premium Cannabis, Mindfully Crafted",
    description:
      "Experience intentional consumption with mindfulness at the core.",
    images: ["/brand-pages/higherself/lifestyle-hero.jpg"],
  },
};

const CATEGORY_CARDS = [
  {
    title: "Flower",
    description: "Premium craft-grown flower quantities 3.5g, 7g, 14g, and 28g",
    image: "/brand-pages/higherself/flower-category.webp",
    href: "/products?brand=Higher+Self&category=Flower",
  },
  {
    title: "Pre-rolls",
    description: "Perfectly portioned pre-rolls for balanced consumption",
    image: null, // reference card uses an icon circle, not a photo
    href: "/products?brand=Higher+Self&category=Pre-Rolls",
  },
  {
    title: "Vapes",
    description: "High-quality vapes for on-the-go convenience",
    image: "/brand-pages/higherself/vapes-category.jpeg",
    href: "/products?brand=Higher+Self&category=Vapes",
  },
];

const TERPENES = [
  {
    name: "Myrcene",
    emoji: "🥭",
    description:
      "Earthy, musky aroma. Known for relaxing, calming effects that support rest and recovery.",
    effects: "Effects: Calming, Sedating",
  },
  {
    name: "Limonene",
    emoji: "🍋",
    description:
      "Bright citrus notes. Uplifting and energizing, perfect for creative flow and focus.",
    effects: "Effects: Uplifting, Energizing",
  },
  {
    name: "Caryophyllene",
    emoji: "🌶️",
    description:
      "Spicy, peppery profile. Unique for its potential anti-inflammatory properties.",
    effects: "Effects: Balanced, Soothing",
  },
];

const COMMUNITY_BULLETS = [
  "Partnership with The 1937 Foundation for mental wellness",
  "Community food drives and wellness events",
  "Supporting local social equity cultivators",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Brand",
  name: "Higher Self",
  url: "https://privatestock.co/higherself",
  logo: "https://privatestock.co/brand-pages/higherself/logo.png",
  parentOrganization: { "@type": "Organization", name: "Private Stock Cannabis Co." },
};

export default async function HigherSelfPage() {
  const catalog = await getCatalogProducts("Higher Self");
  const [dbHeroes, allStores] = await Promise.all([
    getHeroesForPage("/higherself"),
    getStoreLocations(),
  ]);
  const heroes =
    dbHeroes.length > 0
      ? dbHeroes
      : [
          {
            ...FALLBACK_HERO,
            id: "fallback-higherself",
            page: "/higherself",
            media_url: "/brand-pages/higherself/lifestyle-hero.jpg",
            theme: "light" as const,
          },
        ];
  const stores = allStores.filter((s) => s.brands.includes("Higher Self"));

  return (
    <main className="bg-white font-poppins">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero — global PS header overlays (D-006); giant sky-blue script over lifestyle photo */}
      {/* Brand landing page — keeps the transparent overlay header (D-012). */}
      <HeroSwitcher heroes={heroes} overlayHeader>
        <div className="flex w-full flex-col items-center justify-center pb-24 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-assets/higherself-blue.svg"
            alt="higher self"
            className="w-72 max-w-[80vw] drop-shadow-sm md:w-[42rem]"
          />
          <p className="mt-6 max-w-xl px-6 text-sm text-neutral-600 md:text-base">
            Premium cannabis products crafted for your Higher Self.
            <br />
            Experience intentional consumption with mindfulness at the core.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#shop-higher-self"
              className="rounded-full bg-[#8fd0f8] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6bbdf0]"
            >
              Explore the Collection →
            </a>
            <Link
              href="/about"
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            >
              Our Story
            </Link>
          </div>
        </div>
      </HeroSwitcher>

      {/* Ticker — 15% offer per D-008 (live site's 25% copy corrected) */}
      <div className="bg-[#8fd0f8] py-2.5 text-center text-sm font-medium text-white">
        ✦ 15% OFF MERCH &amp; APPAREL when you sign up for our newsletter ✦
      </div>

      {/* Shop Higher Self */}
      <section id="shop-higher-self" className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <h2 className="text-center text-4xl font-bold text-neutral-800">
          Shop Higher Self
        </h2>
        <p className="mt-3 text-center text-neutral-500">
          Discover our premium selection of craft-grown flower, pre-rolls, and
          vapes
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {CATEGORY_CARDS.map((card) => (
            <div
              key={card.title}
              className="flex flex-col rounded-2xl border border-[#e8f4fc] bg-[#f7fbfe] p-4 shadow-sm"
            >
              <div className="flex h-64 items-center justify-center overflow-hidden rounded-xl bg-white">
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.image}
                    alt={card.title}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#bfe3fa] to-[#c9c4f5] text-3xl">
                    🌿
                  </span>
                )}
              </div>
              <h3 className="mt-6 text-center text-2xl font-bold text-neutral-800">
                {card.title}
              </h3>
              <p className="mt-2 flex-1 text-center text-sm text-neutral-500">
                {card.description}
              </p>
              <Link
                href={card.href}
                className="mt-5 block rounded-xl bg-[#8fd0f8] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#6bbdf0]"
              >
                View More
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/products?brand=Higher+Self"
            className="inline-block rounded-full border border-neutral-200 bg-white px-7 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            View All Products
          </Link>
        </div>
      </section>

      {/* Live catalog (admin-curated catalog_products) — D-046 */}
      <BrandCatalogGrid brandName="Higher Self" products={catalog} title="Higher Self Products" />

      {/* Shop Exclusive Merch banner */}
      <section className="mx-auto max-w-6xl px-5 pb-16 md:pb-24">
        <Link
          href="/apparel"
          className="group relative block overflow-hidden rounded-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-pages/higherself/merch-banner.png"
            alt="Higher Self merch"
            className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 text-white">
            <p className="text-3xl font-bold md:text-4xl">Shop Exclusive Merch</p>
            <p className="mt-1 text-sm">Click to explore our collection</p>
          </div>
        </Link>
      </section>

      {/* Pathway to Presence */}
      <section className="bg-gradient-to-b from-[#eaf6fd] to-[#dff0fb] py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-[1.2fr_1fr] md:gap-16">
          <div>
            <h2 className="text-4xl font-bold leading-tight text-neutral-800">
              Cannabis as a Pathway to Presence
            </h2>
            <p className="mt-5 text-lg text-neutral-600">
              Cannabis isn&apos;t just a product—it&apos;s a pathway to
              creativity, presence, and deeper connection with your Higher
              Self.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              Born from the safe spaces across Chicagoland where cannabis meets
              wellness—yoga, sound baths, meditation—Higher Self is more than a
              brand. We&apos;re a movement toward intentional consumption,
              supporting mental health through our partnership with The 1937
              Foundation.
            </p>
            <Link
              href="/about"
              className="mt-7 inline-block rounded-full bg-[#8fd0f8] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6bbdf0]"
            >
              Learn Our Story →
            </Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-pages/higherself/lifestyle-3.jpg"
            alt="Higher Self lifestyle"
            className="mx-auto max-h-[420px] w-auto rounded-2xl object-cover shadow-lg"
          />
        </div>
      </section>

      {/* Understanding Terpenes */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <h2 className="text-center text-4xl font-bold text-neutral-800">
          Understanding Terpenes
        </h2>
        <p className="mt-3 text-center text-neutral-500">
          The aromatic compounds that shape your experience
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TERPENES.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-neutral-100 bg-white p-8 text-center shadow-sm"
            >
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#bfe3fa] to-[#c9c4f5] text-2xl">
                {t.emoji}
              </span>
              <h3 className="mt-5 text-xl font-bold text-neutral-800">
                {t.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                {t.description}
              </p>
              <p className="mt-3 text-sm font-medium text-[#6bbdf0]">
                {t.effects}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/news"
            className="inline-block rounded-full border border-neutral-200 bg-white px-7 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Explore Cannabis Education
          </Link>
        </div>
      </section>

      {/* Giving Back */}
      <section className="mx-auto max-w-6xl px-5 pb-16 md:pb-24">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-pages/higherself/lifestyle-4.jpg"
            alt="Higher Self community"
            className="mx-auto max-h-[440px] w-auto rounded-2xl object-cover shadow-lg"
          />
          <div>
            <span className="inline-block rounded-full bg-[#e5dcf8] px-4 py-1.5 text-xs font-semibold tracking-wide text-[#7460b8]">
              COMMUNITY FIRST
            </span>
            <h2 className="mt-4 text-4xl font-bold leading-tight text-neutral-800">
              Giving Back to Our Community
            </h2>
            <p className="mt-4 text-neutral-500">
              A portion of every Higher Self purchase supports free mental
              health and wellness activities throughout Chicago.
            </p>
            <ul className="mt-6 space-y-3">
              {COMMUNITY_BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-neutral-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8fd0f8] text-[10px] text-white">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href="/news"
              className="mt-8 inline-block rounded-full bg-[#8fd0f8] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6bbdf0]"
            >
              See Our Impact
            </Link>
          </div>
        </div>
      </section>

      {/* Find Higher Self Near You — live locator (D-009) */}
      <section className="bg-gradient-to-b from-[#eaf6fd] to-[#dff0fb] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-4xl font-bold text-neutral-800">
            Find Higher Self Near You
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-neutral-500">
            Available at select retailers across Illinois. Find your nearest
            location and elevate your experience today.
          </p>
          <div className="mt-10">
            <HigherSelfLocator stores={stores} />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
