import { PRODUCTS } from "@/lib/terpkings-content";
import { TKProductImage, TKScrews, TKSectionHead } from "./TKBits";

/** FILE 01 // THE ARSENAL — four field-issued units (exact export card spec). */
export function TKArsenal({ available }: { available: Record<string, boolean> }) {
  return (
    <section id="products" className="tk-gutter mx-auto max-w-[1280px] pb-[50px] pt-[110px]">
      <TKSectionHead
        eyebrow="FILE 01 // THE ARSENAL"
        title="Field-issued hardware"
        className="mb-[50px]"
      />
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        {PRODUCTS.map((pr) => (
          <div
            key={pr.code}
            className="tk-card relative flex flex-col overflow-hidden rounded-[10px] border-2 border-[#39422A]"
            style={{ background: "linear-gradient(180deg, #23291A, #12160B)" }}
          >
            <div className="tk-grain pointer-events-none absolute inset-0 rounded-[inherit] opacity-55" />
            <TKScrews />
            <div
              className="relative mx-4 mt-4 flex h-[250px] items-center justify-center overflow-hidden rounded-lg"
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 45%, #55663A 0%, #2A331A 60%, #10140A 100%)",
              }}
            >
              <TKProductImage
                src={pr.img}
                alt={pr.name}
                available={available[pr.img] ?? true}
                className="relative z-[1] max-h-[210px] max-w-[85%] object-contain"
                style={{ filter: "drop-shadow(0 14px 24px rgba(0,0,0,.6))" }}
              />
              <div className="tk-mono absolute right-3 top-2 z-[3] text-[14px] tracking-[.14em] text-[rgba(216,242,110,.55)]">
                {pr.code}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-[10px] border-t border-[rgba(168,198,78,.15)] px-[22px] pb-6 pt-5">
              <div className="tk-mono text-[16px] tracking-[.2em]" style={{ color: pr.color }}>
                {pr.tag}
              </div>
              <h3 className="m-0 text-[21px] font-extrabold uppercase text-[#E8F0C8]">{pr.name}</h3>
              <p className="tk-mono m-0 text-[18px] leading-[1.45] text-[#8A9E5C]">{pr.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
