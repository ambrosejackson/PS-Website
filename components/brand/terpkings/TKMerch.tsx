import { MERCH } from "@/lib/terpkings-content";
import { TKPlaceholder, TKSectionHead } from "./TKBits";

/** FILE 05 // SUPPLY DROP — merch grid (INBOUND) + GET DROP ALERTS → #signup. */
export function TKMerch() {
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
          {MERCH.map((m) => (
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
