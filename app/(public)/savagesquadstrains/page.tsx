import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/brand/Reveal";
import { SSSHero } from "@/components/brand/SSSHero";
import { SSSVideos } from "@/components/brand/SSSVideos";
import { getStoreLocations } from "@/lib/data";
import { InstagramIcon } from "@/components/site/social-icons";

/**
 * Savage Squad Strains — recreation of docs/reference/savagesquadstrains/
 * under the global PS header (D-006). Black + fire-orange gradients, huge
 * stacked display type with glow. Star ticker sits BELOW the hero (D-007);
 * hardcoded dispensary grid replaced by our live availability data (D-009);
 * compliance paragraph kept above the global footer (D-010).
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Savage Squad Strains",
  description:
    "Not a brand. A movement. Savage Squad Strains — premium cannabis flower and pre-rolls from the legacy of Chicago drill and the vision of Fredo Santana. Est. 2013.",
  openGraph: {
    title: "Savage Squad Strains — Not a Brand. A Movement.",
    description:
      "Premium cannabis flower and pre-rolls. Hit different. Est. Chicago 2013.",
    images: ["/brand-pages/savagesquadstrains/hero-poster.jpg"],
  },
};

const TICKER =
  "★ NOW AVAILABLE ★ 3.5G FLOWER ★ 7G FLOWER ★ 1G PRE-ROLLS ★ CHICAGO ILLINOIS ★ EST. 2013 ";

const PRODUCTS = [
  {
    eyebrow: "FLOWER",
    name: "3.5G EIGHTH",
    netWt: "Net Wt. 3.5g (0.125oz)",
    description:
      "Mylar-bag flower with our signature chain-drip artwork. The classic eighth for the pocket.",
    image: "/brand-pages/savagesquadstrains/product-8th.png",
  },
  {
    eyebrow: "FLOWER · HEAVY",
    name: "7G QUARTER",
    netWt: "Net Wt. 7g (0.25oz)",
    description:
      "Twice the weight, half the worry. The SSS quarter in our gold-chain medallion mylar.",
    image: "/brand-pages/savagesquadstrains/product-7g.png",
  },
  {
    eyebrow: "PRE-ROLL",
    name: "1G PRE-ROLL",
    netWt: "Net Wt. 0.75g (0.0267oz)",
    description:
      "Glass-tube, single 1g pre-roll. All flower. No shake. Ready to spark.",
    image: "/brand-pages/savagesquadstrains/product-preroll.png",
  },
];

const MERCH = [
  {
    name: "SSS TEE",
    caption: "CHICAGO ILLINOIS · EST. 2013",
    image: "/brand-pages/savagesquadstrains/merch-tee-v2.png",
  },
  {
    name: "SSS HOODIE",
    caption: "ACID WASH · HEAVYWEIGHT COTTON",
    image: "/brand-pages/savagesquadstrains/merch-hoodie-v2.png",
  },
  {
    name: "SSS TRUCKER",
    caption: "CLASSIC FIT · SNAPBACK",
    image: "/brand-pages/savagesquadstrains/merch-hat-v2.png",
  },
];

const COMPLIANCE =
  "For use only by adults 21 years of age and older. Keep out of reach of children. This product has intoxicating effects and may be habit-forming. Cannabis can impair concentration, coordination, and judgment. Do not operate a vehicle or machinery under the influence of this drug. There may be health risks associated with the consumption of this product. For use only by adults 21 and older. This product is manufactured and distributed in Illinois in compliance with the Cannabis Regulation and Tax Act (CRTA) and IDFPR regulations.";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Brand",
  name: "Savage Squad Strains",
  url: "https://privatestock.co/savagesquadstrains",
  logo: "https://privatestock.co/brand-pages/savagesquadstrains/logo-sss.png",
  parentOrganization: { "@type": "Organization", name: "Private Stock Cannabis Co." },
};

function GradientWord({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-[#ff6a00] to-[#ffb347] bg-clip-text text-transparent [filter:drop-shadow(0_0_18px_rgba(255,106,0,0.45))]">
      {children}
    </span>
  );
}

export default async function SavageSquadPage() {
  const allStores = await getStoreLocations();
  const stores = allStores.filter((s) =>
    s.brands.includes("Savage Squad Strains"),
  );

  return (
    <main className="bg-[#0d0a08] text-[#f3efe9]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SSSHero />

      {/* Star ticker — moved BELOW the hero per D-007 */}
      <div className="overflow-hidden bg-gradient-to-r from-[#ff6a00] to-[#ffb347] py-2">
        <div className="ps-ticker flex w-max">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="whitespace-nowrap font-mono text-xs font-bold uppercase tracking-[0.2em] text-neutral-950"
            >
              {TICKER}
              {TICKER}
            </span>
          ))}
        </div>
      </div>

      {/* NOT A BRAND. A MOVEMENT. */}
      <section className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <Reveal>
          <h2 className="font-display text-5xl uppercase leading-[1.02] md:text-7xl">
            Not a<br />
            Brand.
            <br />
            <GradientWord>
              A<br />
              Movement.
            </GradientWord>
          </h2>
        </Reveal>
        <Reveal className="mt-10">
          <p className="max-w-2xl font-semibold leading-relaxed text-white/85">
            Savage Squad Strains was built from the legacy of Chicago drill
            pioneers and the vision of Fredo Santana to continue a movement
            that changed music, fashion, and cannabis culture worldwide.
            Established in 2013 during the rise of Chief Keef and Fredo
            Santana&apos;s global influence, the brand represents authenticity,
            creativity, and the lifestyle that inspired an entire generation.
          </p>
        </Reveal>
        <Reveal className="mt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-pages/savagesquadstrains/fredo-santana.png"
            alt="Fredo Santana"
            className="w-full rounded-sm object-cover"
          />
        </Reveal>
        <Reveal className="mt-10">
          <p className="max-w-2xl font-semibold leading-relaxed text-white/85">
            More than just cannabis, Savage Squad Strains stands as a cultural
            symbol rooted in quality, loyalty, and self-expression — connecting
            millions of supporters across music, streetwear, and premium
            cannabis culture through a legacy that continues to inspire around
            the world.
          </p>
        </Reveal>

        {/* Stat row */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { big: "2013", label: "EST. CHICAGO, IL" },
            { big: "03", label: "PRODUCT FORMATS" },
            { big: "∞", label: "REAL ONES ONLY" },
          ].map((s) => (
            <div
              key={s.label}
              className="border-y border-white/10 py-6 text-center sm:text-left"
            >
              <p className="font-display text-5xl">
                <GradientWord>{s.big}</GradientWord>
              </p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-white/50">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* NOW AVAILABLE */}
      <section id="sss-drop" className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
        <Reveal>
          <h2 className="text-center font-display text-5xl uppercase md:text-7xl">
            Now <GradientWord>Available</GradientWord>
          </h2>
          <p className="mt-3 text-center text-sm text-white/60">
            Premium cannabis flower and pre-rolls. Hit different.
          </p>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.name} delayMs={i * 120}>
              <div className="flex h-full flex-col rounded-lg border border-white/10 bg-[#161210] p-6">
                <div className="flex h-56 items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={p.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-[#ff8b2e]">
                  {p.eyebrow}
                </p>
                <h3 className="mt-2 font-display text-3xl uppercase leading-tight">
                  {p.name}
                </h3>
                <p className="mt-1 font-mono text-xs text-white/40">{p.netWt}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/70">
                  {p.description}
                </p>
                <a
                  href="#find-sss"
                  className="mt-5 inline-block w-max border-b border-[#ff8b2e] pb-1 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:text-[#ff8b2e]"
                >
                  Find in Store →
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* LONG LIVE FREDO */}
      <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
        <Reveal>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-pages/savagesquadstrains/long-live-fredo.png"
            alt="Long Live Fredo"
            className="mx-auto w-full max-w-3xl"
          />
        </Reveal>
        <Reveal className="mt-12">
          <SSSVideos />
        </Reveal>
      </section>

      {/* LIMITED MERCH — our /apparel collection (D-011: not savagesquad.shop) */}
      <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
        <Reveal>
          <h2 className="text-center font-display text-5xl uppercase md:text-7xl">
            Limited <GradientWord>Merch</GradientWord>
          </h2>
          <p className="mt-3 text-center text-sm text-white/60">
            Heavyweight pieces. Limited runs.
          </p>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {MERCH.map((m, i) => (
            <Reveal key={m.name} delayMs={i * 120}>
              <Link
                href="/apparel"
                className="block overflow-hidden rounded-lg bg-white"
              >
                <div className="flex h-72 items-center justify-center bg-neutral-100 p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image}
                    alt={m.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="bg-[#161210] p-5">
                  <p className="font-display text-lg uppercase text-white">
                    {m.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
                    {m.caption}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* GET IT AT A LICENSED DISPENSARY — live availability (D-009) */}
      <section id="find-sss" className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
        <Reveal>
          <h2 className="text-center font-display text-4xl uppercase leading-tight md:text-6xl">
            Get It At A <GradientWord>Licensed Dispensary</GradientWord>
          </h2>
          <p className="mt-3 text-center text-sm text-white/60">
            Savage Squad Strains is currently available at select Illinois
            dispensaries.
          </p>
        </Reveal>
        {stores.length > 0 ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stores.map((s, i) => (
              <Reveal key={s.id} delayMs={i * 90}>
                <div className="flex h-full flex-col items-center rounded-lg border border-[#ff8b2e]/25 bg-gradient-to-b from-[#1b130c] to-[#241207] p-6 text-center shadow-[0_0_30px_rgba(255,106,0,0.08)]">
                  <p className="font-display text-xl uppercase leading-tight">
                    {s.name.replace("Mock Dispensary — ", "")}
                  </p>
                  <p className="mt-3 flex-1 font-mono text-[11px] uppercase leading-relaxed tracking-[0.15em] text-white/50">
                    {[s.address_line1, `${s.city}, ${s.state} ${s.zip}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {s.menu_url ? (
                    <a
                      href={s.menu_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 bg-gradient-to-r from-[#ff6a00] to-[#ffb347] px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-neutral-950 shadow-[0_0_24px_rgba(255,106,0,0.45)] transition-transform hover:scale-[1.03]"
                    >
                      Shop Now
                    </a>
                  ) : (
                    <span className="mt-5 border border-white/20 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                      Menu Soon
                    </span>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-12 rounded-lg border border-dashed border-white/20 p-10 text-center font-mono text-sm text-white/50">
            Dispensary list goes live with the store data feed.
          </p>
        )}
        <Reveal className="mt-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
            More locations dropping. Follow the socials for updates.
          </p>
          <a
            href="https://www.instagram.com/savagesquadstrains"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 border-b border-[#ff8b2e] pb-1 font-mono text-xs font-bold uppercase tracking-[0.25em] text-white hover:text-[#ff8b2e]"
          >
            <InstagramIcon className="h-4 w-4" /> Instagram →
          </a>
        </Reveal>
      </section>

      {/* Compliance block (D-010 — legally required copy, kept above global footer) */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-4xl px-6 py-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-pages/savagesquadstrains/logo-sss.png"
            alt="Savage Squad Strains"
            className="h-12 w-auto"
          />
          <p className="mt-6 font-mono text-[11px] leading-relaxed text-white/50">
            {COMPLIANCE}
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
