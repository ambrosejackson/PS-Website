import Link from "next/link";
import type { CatalogProduct } from "@/lib/data";
import { TKScrews } from "./TKBits";

/**
 * Live catalog for the TerpKings page — the admin-curated catalog_products rows
 * for TerpKings (active, not quarantined), rendered in the page's console
 * language so the export design stays intact. Sits under FILE 01 (the
 * marketing arsenal) as "ACTIVE UNITS IN CATALOG"; each card links to the SEO
 * product page. Not part of the export — added for the products wiring (D-046).
 */
const TERP_COLORS: Record<string, string> = {
  gas: "#F7931E",
  haze: "#FF2E2E",
  dessert: "#F473B9",
  fruit: "#4A90E2",
  floral: "#8E5BC0",
};

export function TKCatalog({ products }: { products: CatalogProduct[] }) {
  const items = products.filter((p) => p.brand === "TerpKings");
  return (
    <section id="catalog" className="tk-gutter mx-auto max-w-[1280px] pb-[60px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="tk-mono text-[20px] tracking-[.24em] text-[#FFB000]">
          FILE 01-B // ACTIVE UNITS IN CATALOG
        </div>
        <Link
          href="/products?brand=TerpKings"
          className="tk-mono tk-btn-outline rounded-[4px] px-5 py-[9px] text-[17px] tracking-[.1em]"
        >
          VIEW ALL IN CATALOG
        </Link>
      </div>
      {items.length === 0 ? (
        <div
          className="tk-mono rounded-[8px] border border-dashed px-6 py-8 text-center text-[18px] tracking-[.1em] text-[#5B6E35]"
          style={{ borderColor: "rgba(168,198,78,.35)", background: "rgba(168,198,78,.04)" }}
        >
          &gt; NO UNITS DECLASSIFIED YET — CHECK BACK SOON.
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
        >
          {items.map((p) => {
            const accent = (p.terp_category && TERP_COLORS[p.terp_category]) || "#A8C64E";
            return (
              <Link
                key={p.id}
                href={`/products/terpkings/${p.slug}`}
                className="tk-card relative flex flex-col overflow-hidden rounded-[8px] border border-[#39422A] no-underline"
                style={{ background: "linear-gradient(180deg, #1A1F12, #0F120A)" }}
              >
                <div className="tk-grain pointer-events-none absolute inset-0 rounded-[inherit] opacity-40" />
                <TKScrews size={6} inset={{ x: 8, y: 6 }} />
                <div
                  className="relative mx-3 mt-3 flex aspect-square items-center justify-center overflow-hidden rounded-[6px]"
                  style={{
                    background:
                      "radial-gradient(ellipse 80% 70% at 50% 45%, #3E4A26 0%, #1F2614 60%, #0B0F07 100%)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url ?? "/placeholders/product.png"}
                    alt={p.name}
                    loading="lazy"
                    className="max-h-[80%] max-w-[80%] object-contain"
                    style={{ filter: "drop-shadow(0 10px 18px rgba(0,0,0,.6))" }}
                  />
                </div>
                <div className="relative flex flex-col gap-1 px-3 pb-3 pt-2">
                  {p.terp_category && (
                    <span className="tk-mono text-[13px] uppercase tracking-[.2em]" style={{ color: accent }}>
                      {p.terp_category}
                    </span>
                  )}
                  <span className="text-[13px] font-bold uppercase leading-tight text-[#E8F0C8]">{p.name}</span>
                  <span className="tk-mono text-[14px] text-[#8A9E5C]">
                    {[p.format, p.weight].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
