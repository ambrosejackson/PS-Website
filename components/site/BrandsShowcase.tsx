import Link from "next/link";
import { BRANDS, type BrandSlug } from "@/lib/brands";
import { publicAssetExists } from "@/lib/terpkings-assets";

/**
 * PRIVATE STOCK BRANDS (D-022) — the landing section that replaced the inline
 * Brand Book flip-book. Full-bleed black, no divider rules, one row per
 * allowlisted brand alternating image left / image right (RYTHM + Dogwalkers
 * reference layout, our black ground and condensed type). No product
 * thumbnails here — the brand product grid below already carries those.
 */

/** Editorial order Ambrose set — NOT lib/brands.ts order. */
const SHOWCASE_ORDER: readonly BrandSlug[] = [
  "outfitters",
  "higherself",
  "terpkings",
  "savagesquadstrains",
];

/**
 * Drop-in brand tiles (D-037): if
 * public/brand-assets/{slug}/{slug}-brand-tile.webp (or .png) exists it is used;
 * otherwise the row falls back to the image below. Rendered 4:3, object-cover.
 */
function brandTile(slug: BrandSlug, fallback: string): string {
  for (const ext of ["webp", "png"]) {
    const url = `/brand-assets/${slug}/${slug}-brand-tile.${ext}`;
    if (publicAssetExists(url)) return url;
  }
  return fallback;
}

/** Verbatim from the Brand Book — do not paraphrase without Ambrose. */
const COPY: Record<BrandSlug, { image: string; description: string }> = {
  outfitters: {
    image: "/brand-pages/outfitters/hero.jpg",
    description:
      "Refined by rebellion. Crafted without compromise. Born in Chicago and inspired by the sophistication of the 1920s speakeasy era, Outfitters pairs premium Illinois-grown craft flower with exceptional presentation — for those who understand that luxury is found in the details.",
  },
  higherself: {
    image: "/brand-pages/higherself/lifestyle-hero.jpg",
    description:
      "An invitation to be more present. Born from the Chicagoland communities where cannabis and mindfulness come together, Higher Self is a curated collection crafted for intentional consumption — with a portion of every purchase funding free mental health and wellness programming.",
  },
  terpkings: {
    image: "/brand-assets/terpkings/terpkings-brand-tile.webp",
    description:
      "Choose your terpenes. Discover your experience. Every TerpKings product is categorized by our proprietary terpene color system — Fruit, Haze, Gas, Dessert, and Floral — so you can explore cannabis by flavor and aroma instead of THC percentage alone.",
  },
  savagesquadstrains: {
    image: "/brand-pages/savagesquadstrains/hero-poster.jpg",
    description:
      "Not a brand. A movement. Built from the legacy of Chicago drill pioneers and the vision of Fredo Santana, S.S.S. represents authenticity, creativity, and the culture that inspired a generation — delivering top-shelf exotic flower to the fanbase that started it all.",
  },
};

// Derived from the allowlist (guardrail #3): brands added there but not yet
// ordered here still render, at the end.
const ROWS = [
  ...SHOWCASE_ORDER.map((slug) => BRANDS.find((b) => b.slug === slug)),
  ...BRANDS.filter((b) => !SHOWCASE_ORDER.includes(b.slug)),
].filter((b) => b !== undefined);

export function BrandsShowcase() {
  return (
    <section className="bg-neutral-950 text-white">
      <div className="mx-auto max-w-screen-2xl px-6 py-20 md:px-12 md:py-28">
        <h2 className="text-center font-condensed text-[30px] font-bold uppercase tracking-tight md:text-[44px]">
          Private Stock Brands
        </h2>

        <div className="mt-16 flex flex-col gap-20 md:mt-24 md:gap-32">
          {ROWS.map((brand, i) => {
            const copy = COPY[brand.slug];
            // Odd rows flip on desktop; mobile always stacks image → text.
            const imageRight = i % 2 === 1;
            return (
              <div
                key={brand.slug}
                className="grid items-center gap-8 md:grid-cols-2 md:gap-16 lg:gap-24"
              >
                <div className={imageRight ? "md:order-2" : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brandTile(brand.slug, copy?.image ?? "/placeholders/hero-default.webp")}
                    alt={brand.name}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <div className={imageRight ? "md:order-1" : undefined}>
                  <h3 className="font-condensed text-[26px] font-bold uppercase tracking-tight md:text-[36px]">
                    {brand.name}
                  </h3>
                  {copy && (
                    <p className="mt-5 max-w-prose leading-relaxed text-white/70">
                      {copy.description}
                    </p>
                  )}
                  <div className="mt-8 flex flex-wrap gap-4">
                    <Link
                      href={`/store-locator?brand=${brand.slug}`}
                      className="inline-flex items-center bg-white px-7 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-neutral-950 transition-colors hover:bg-white/80"
                    >
                      Buy Now
                    </Link>
                    <Link
                      href={`/${brand.slug}`}
                      className="inline-flex items-center border border-white/60 px-7 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-neutral-950"
                    >
                      Learn More
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
