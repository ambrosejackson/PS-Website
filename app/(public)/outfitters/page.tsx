import type { Metadata } from "next";
import Link from "next/link";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/brand/Reveal";
import { OutfittersContactForm } from "@/components/brand/OutfittersContactForm";
import { brandByName } from "@/lib/brands";
import { FALLBACK_HERO, getCatalogProducts, getHeroesForPage } from "@/lib/data";

/**
 * Outfitters brand page — recreation of docs/reference/outfitters/ under the
 * global PS header (D-006). Near-black/gold/cream, ultra-letterspaced
 * condensed uppercase, gold diamond dividers, scroll-fade reveals. The
 * original HOME/ABOUT/COLLECTION/EXPERIENCE/CONTACT nav is not recreated;
 * sections flow as a one-pager.
 */

export const revalidate = 300;

const GOLD = "#b8860b";

export const metadata: Metadata = {
  title: "Outfitters",
  description:
    "Outfitters — redefining the cannabis experience. Inspired by the elegance and mystique of Chicago's roaring twenties. Premium flower, pre-rolls, and blunts.",
  openGraph: {
    title: "Outfitters — Redefining the Cannabis Experience",
    description:
      "Inspired by the elegance and mystique of Chicago's roaring twenties.",
    images: ["/brand-pages/outfitters/hero.jpg"],
  },
};

const VALUES = [
  {
    name: "Craftsmanship",
    line: "Upholding the highest standards of quality in every product",
  },
  {
    name: "Sophistication",
    line: "Celebrating elegance and the finer things in life",
  },
  {
    name: "Old School",
    line: "Drawing inspiration from the roaring twenties",
  },
];

const COLLECTION_BADGES = ["PREMIUM", "EXCLUSIVE", "BESTSELLER"];

const TRAITS = [
  { name: "Sophisticated", line: "Elegant and refined in every detail" },
  { name: "Luxurious", line: "Premium quality for discerning tastes" },
  { name: "Timeless", line: "Enduring appeal beyond trends" },
  { name: "Cultured", line: "Embracing rich historical heritage" },
  { name: "Mysterious", line: "Intrigue and allure in every experience" },
  { name: "Exclusive", line: "A sense of rarity and privilege" },
];

function Diamond() {
  return (
    <div className="mx-auto mt-4 flex items-center justify-center gap-3">
      <span className="h-px w-16" style={{ backgroundColor: `${GOLD}99` }} />
      <span
        className="h-2 w-2 rotate-45 border"
        style={{ borderColor: GOLD }}
      />
      <span className="h-px w-16" style={{ backgroundColor: `${GOLD}99` }} />
    </div>
  );
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Brand",
  name: "Outfitters",
  url: "https://privatestock.co/outfitters",
  parentOrganization: { "@type": "Organization", name: "Private Stock Cannabis Co." },
};

export default async function OutfittersPage() {
  const [dbHeroes, products] = await Promise.all([
    getHeroesForPage("/outfitters"),
    getCatalogProducts("Outfitters"),
  ]);
  const heroes =
    dbHeroes.length > 0
      ? dbHeroes
      : [
          {
            ...FALLBACK_HERO,
            id: "fallback-outfitters",
            page: "/outfitters",
            media_url: "/brand-pages/outfitters/hero.jpg",
            theme: "dark" as const,
          },
        ];
  const brandSlug = brandByName("Outfitters")!.slug;
  const featured = products.slice(0, 3);

  return (
    <main className="bg-[#faf8f4]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero — global PS header overlays (D-006) */}
      <HeroSwitcher heroes={heroes}>
        <div className="flex w-full flex-col items-center justify-center pb-16 text-center text-white">
          <h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-assets/outfitters-white.png"
              alt="Outfitters"
              className="w-80 max-w-[85vw] md:w-[36rem]"
            />
          </h1>
          <Diamond />
          <p className="mt-6 font-condensed text-lg uppercase tracking-[0.2em] text-white/90 md:text-xl">
            Redefining the Cannabis Experience
          </p>
          <p className="mt-3 text-sm text-white/70">
            Inspired by the elegance and mystique of Chicago&apos;s roaring
            twenties
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#collection"
              className="px-8 py-4 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-neutral-950 transition-colors hover:brightness-110"
              style={{ backgroundColor: GOLD }}
            >
              Explore Collection
            </a>
            <a
              href="#the-brand"
              className="border border-white px-8 py-4 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
            >
              Our Story
            </a>
          </div>
          <div className="mt-10 flex flex-col items-center">
            <span className="font-condensed text-[10px] uppercase tracking-[0.3em] text-white/60">
              Scroll
            </span>
            <span className="mt-2 h-10 w-px bg-white/50" />
          </div>
        </div>
      </HeroSwitcher>

      {/* THE BRAND */}
      <section id="the-brand" className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <Reveal>
            <h2 className="text-center font-condensed text-5xl font-semibold uppercase tracking-[0.25em] text-neutral-900">
              The Brand
            </h2>
            <Diamond />
          </Reveal>
          <div className="mt-14 grid gap-12 md:grid-cols-2">
            <Reveal>
              <h3
                className="font-condensed text-2xl font-semibold uppercase tracking-[0.1em]"
                style={{ color: GOLD }}
              >
                Mission
              </h3>
              <p className="mt-5 leading-relaxed text-neutral-700">
                Outfitters is dedicated to redefining the cannabis experience
                with a nod to the elegance and mystique of Chicago&apos;s rich
                history. Our mission is to curate high-end products that embody
                sophistication, craftsmanship, and a taste for the exceptional.
              </p>
              <p className="mt-4 leading-relaxed text-neutral-700">
                Inspired by the roaring twenties, we bring a speakeasy attitude
                to the modern cannabis world—where quality meets luxury, and
                every product promises a journey into the refined and the
                extraordinary.
              </p>
            </Reveal>
            <Reveal delayMs={120}>
              <h3
                className="font-condensed text-2xl font-semibold uppercase tracking-[0.1em]"
                style={{ color: GOLD }}
              >
                Vision
              </h3>
              <p className="mt-5 leading-relaxed text-neutral-700">
                We envision a future where the cannabis experience transcends
                the ordinary, embracing the glamour and allure of Chicago&apos;s
                storied past. Our vision is to be the epitome of sophistication
                in the cannabis industry.
              </p>
              <p className="mt-4 leading-relaxed text-neutral-700">
                As a beacon of elegance, Outfitters is committed to setting the
                standard for high-end cannabis products, where connoisseurs
                immerse themselves in the essence of a bygone era, celebrating
                life with a touch of class.
              </p>
            </Reveal>
          </div>

          {/* OUR VALUES */}
          <Reveal className="mt-16">
            <div className="bg-white p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)] md:p-14">
              <h3 className="text-center font-condensed text-2xl font-semibold uppercase tracking-[0.15em] text-neutral-900">
                Our Values
              </h3>
              <div className="mt-10 grid gap-10 text-center md:grid-cols-3">
                {VALUES.map((v) => (
                  <div key={v.name}>
                    <span
                      className="mx-auto flex h-14 w-14 rotate-45 items-center justify-center border"
                      style={{ borderColor: GOLD }}
                    >
                      <span className="-rotate-45 text-lg" style={{ color: GOLD }}>
                        ✦
                      </span>
                    </span>
                    <p className="mt-6 font-condensed text-lg font-semibold uppercase tracking-[0.1em] text-neutral-900">
                      {v.name}
                    </p>
                    <p className="mt-2 text-sm text-neutral-500">{v.line}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* THE COLLECTION — real catalog products in the reference card design */}
      <section id="collection" className="bg-[#f3efe7] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <h2 className="text-center font-condensed text-5xl font-semibold uppercase tracking-[0.25em] text-neutral-900">
              The Collection
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-center text-sm text-neutral-600">
              Experience our carefully curated selection of premium cannabis
              products, each embodying the spirit of refinement and excellence.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {featured.map((p, i) => (
              <Reveal key={p.id} delayMs={i * 120}>
                <div className="bg-white shadow-sm">
                  <div
                    className="relative flex aspect-[4/5] items-center justify-center border-b p-6"
                    style={{
                      borderColor: `${GOLD}55`,
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #f1ece1 0 14px, #ede7da 14px 28px)",
                    }}
                  >
                    <span
                      className="absolute right-3 top-3 px-3 py-1 font-condensed text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-950"
                      style={{ backgroundColor: GOLD }}
                    >
                      {COLLECTION_BADGES[i] ?? "PREMIUM"}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image_url ?? "/placeholders/product.png"}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-condensed text-lg font-semibold uppercase tracking-[0.08em] text-neutral-900">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {[p.category, p.weight].filter(Boolean).join(" · ")}
                    </p>
                    <Link
                      href={`/products/${brandSlug}/${p.slug}`}
                      className="mt-5 block border border-neutral-900 py-3 text-center font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white"
                    >
                      Discover More
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 text-center">
            <Link
              href="/products?brand=Outfitters"
              className="inline-block bg-neutral-950 px-10 py-4 font-condensed text-xs font-semibold uppercase tracking-[0.25em] text-white transition-colors hover:bg-neutral-800"
            >
              View Full Collection
            </Link>
          </Reveal>
        </div>
      </section>

      {/* THE EXPERIENCE */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <h2 className="text-center font-condensed text-5xl font-semibold uppercase tracking-[0.25em] text-neutral-900">
              The Experience
            </h2>
            <Diamond />
            <p className="mt-5 text-center text-sm text-neutral-600">
              Step into a world where the spirit of the roaring twenties meets
              modern luxury
            </p>
          </Reveal>
          <div className="mt-14 grid items-center gap-12 md:grid-cols-2">
            <Reveal>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand-pages/outfitters/speakeasy.jpg"
                  alt="Speakeasy lounge"
                  className="relative z-10 w-full object-cover"
                />
                <span
                  className="absolute -bottom-3 -right-3 h-full w-full border"
                  style={{ borderColor: `${GOLD}88` }}
                />
              </div>
            </Reveal>
            <div className="space-y-6">
              {TRAITS.map((t, i) => (
                <Reveal key={t.name} delayMs={i * 80}>
                  <div
                    className="border-l-2 pl-5"
                    style={{ borderColor: GOLD }}
                  >
                    <p className="font-condensed text-lg font-semibold uppercase tracking-[0.1em] text-neutral-900">
                      {t.name}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">{t.line}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Quote */}
          <Reveal className="mx-auto mt-20 max-w-3xl text-center">
            <span className="text-4xl" style={{ color: `${GOLD}aa` }}>
              &ldquo;
            </span>
            <p className="text-xl italic leading-relaxed text-neutral-700 md:text-2xl">
              At Outfitters, we believe in elevating moments, embracing the
              spirit of the Old School, and offering a curated collection for
              cannabis enthusiasts who appreciate the finer things in life.
            </p>
          </Reveal>
        </div>
      </section>

      {/* GET IN TOUCH */}
      <section className="bg-[#0d0c0a] py-20 text-[#f5f2ea] md:py-28">
        <div className="mx-auto max-w-3xl px-5">
          <Reveal>
            <h2 className="text-center font-condensed text-5xl font-semibold uppercase tracking-[0.25em]">
              Get In Touch
            </h2>
            <Diamond />
            <p className="mt-5 text-center text-sm text-neutral-400">
              Join us on a journey into refinement and extraordinary experiences
            </p>
          </Reveal>
          <Reveal className="mt-12">
            <OutfittersContactForm />
          </Reveal>
          <Reveal className="mt-12">
            {/* Real contact strip — placeholders per I-015 until Ambrose confirms */}
            <div className="grid grid-cols-2 divide-x divide-neutral-800 text-center">
              <div className="px-4">
                <p className="font-condensed text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  Location
                </p>
                <p className="mt-2 text-sm text-neutral-300">Chicago, IL</p>
              </div>
              <div className="px-4">
                <p className="font-condensed text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  Email
                </p>
                <p className="mt-2 text-sm text-neutral-300">
                  sales@privatestock.co
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
