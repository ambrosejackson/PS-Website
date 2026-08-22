import { IG } from "@/lib/terpkings-content";
import { TKPlaceholder } from "./TKBits";

/** SIGNAL FEED — @TERPKINGSOFFICIAL strip: five square slots + FOLLOW →. */
export function TKSignalFeed() {
  return (
    <section className="tk-gutter mx-auto max-w-[1240px] pb-[90px] pt-[50px]" aria-label="Instagram">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <h2 className="tk-mono m-0 text-[26px] tracking-[.12em] text-[#A8C64E]">
          {`// SIGNAL FEED — ${IG.handle}`}
        </h2>
        <a
          href={IG.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tk-mono tk-link text-[19px] tracking-[.12em]"
        >
          FOLLOW →
        </a>
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
      >
        {IG.slots.map((slot) => (
          <div
            key={slot}
            className="aspect-square overflow-hidden rounded-[6px] border-2 border-[#39422A]"
          >
            <TKPlaceholder label="IG post" />
          </div>
        ))}
      </div>
    </section>
  );
}
