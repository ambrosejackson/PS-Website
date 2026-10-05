import Link from "next/link";
import type { BrandMerchCard } from "@/lib/brandMerch";
import { MERCH } from "@/lib/terpkings-content";
import { TKPlaceholder, TKSectionHead } from "./TKBits";

/**
 * FILE 05 // SUPPLY DROP — live TerpKings merch (merch_products.brand = "TerpKings")
 * + GET DROP ALERTS → #signup. Products with no active variant show INBOUND and
 * do not link; with no TerpKings merch at all the INBOUND placeholders render.
 */
export function TKMerch({ items = [] }: { items?: BrandMerchCard[] }) {
  return (
    <section
      id="merch"
      className="tk-gutter bg-[#0A0D06] py-[90px]"
      style={{
        borderTop: "1px solid rgba(168,198,78,.12)",
        borderBottom: "1px solid rgba(168,198,78,.12)",
      }}
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <TKSectionHead
            eyebrow="FILE 05 // SUPPLY DROP"
            title={<>Merch &amp; Accessories</>}
            align="left"
            titleSize="clamp(30px, 4.5vw, 52px)"
          />
          <a
            href="#signup"
            className="tk-mono tk-btn-outline rounded-[4px] px-6 py-[11px] text-[19px] tracking-[.1em]"
          >
            GET DROP ALERTS
          </a>
        </div>
        <div
          className="grid gap-[22px]"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        >
          {items.map((m) => {
            const tile = (
              <>
                <div className="relative h-[320px] overflow-hidden rounded-lg border-2 border-[#39422A] bg-[#0B0F07]">
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt={m.alt} className="h-full w-full object-cover" />
                  ) : (
                    <TKPlaceholder label={m.name} />
                  )}
                </div>
                <div className="tk-mono flex items-center justify-between gap-3">
                  <div className="text-[22px] uppercase tracking-[.1em] text-[#E8F0C8]">{m.name}</div>
                  <div className="shrink-0 text-[17px] tracking-[.14em] text-[#FFB000]">
                    {m.href && m.price ? m.price.toUpperCase() : "INBOUND"}
                  </div>
                </div>
              </>
            );
            return m.href ? (
              <Link key={m.id} href={m.href} className="flex flex-col gap-3">
                {tile}
              </Link>
            ) : (
              <div key={m.id} className="flex flex-col gap-3">
                {tile}
              </div>
            );
          })}
          {items.length === 0 && MERCH.map((m) => (
            <div key={m.slotId} className="flex flex-col gap-3">
              <div className="relative h-[320px] overflow-hidden rounded-lg border-2 border-[#39422A]">
                <TKPlaceholder label={m.placeholder} />
              </div>
              <div className="tk-mono flex items-center justify-between">
                <div className="text-[22px] uppercase tracking-[.1em] text-[#E8F0C8]">{m.name}</div>
                <div className="text-[17px] tracking-[.14em] text-[#FFB000]">INBOUND</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
